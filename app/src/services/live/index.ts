import { ServiceError } from '../errors';
import type { CommitResult, DepositResult, DepositService, PhotoPhase, UploadResult } from '../types';
import { createApiClient, type ApiClient, type ApiLease, type DevUserId } from './api';
import { DEMO_LEASE } from './demoLease';
import { genuineTxUrl, mapLease, mapProposal, resolvePhotoUrl, UNITS_PER_CENT, type MapContext, type StagedEdits } from './mapping';

/**
 * Live adapter for the frozen API (docs/API.md). Calls the backend for:
 *   getLease / getProposal -> GET /leases/{id}
 *   acceptProposal         -> POST /leases/{id}/accept
 *   disputeProposal        -> POST /leases/{id}/appeal
 *   submitProposal         -> POST /leases/{id}/report/send  (landlord "Send report")
 *   saveProposalDraft      -> no endpoint: edits (lower or remove only) are staged in this
 *                             browser and sent with the report; a reload discards them
 *   uploadPhoto            -> PUT  /leases/{id}/photos/{in|out}/{shot_id}  (multipart `file`)
 *   commitPhotos           -> POST /leases/{id}/photos/{in|out}/commit
 *   startReport            -> POST /leases/{id}/report  (landlord; 202, then poll GET)
 *   payDeposit             -> POST /leases/{id}/deposit  (tenant, status `created`)
 * NOT connected (no endpoint, fails with `integration_blocked` instead of pretending): requestMoveOut.
 * It never falls back to sample data. Idempotency keys and proposal versions are not part of
 * the API, so they are not sent; the server's state machine rejects a repeat with 409.
 */
const POLL_MS = 5000;
/** docs/API.md: poll every 2 s while the AI comparison runs. */
const ANALYSIS_POLL_MS = 2000;
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const TERMINAL = new Set(['settled', 'resolved']);

function blocked(capability: string): never {
  throw new ServiceError('integration_blocked', `${capability} isn't connected to the backend yet.`);
}

/** Checks the first bytes, not file.type (browsers guess it, and HEIC can arrive labelled as a JPEG). */
async function looksLikeJpegOrPng(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b);
  return jpeg || png;
}

function photoPath(leaseId: string, phase: PhotoPhase, shotId: string): string {
  if (phase !== 'in' && phase !== 'out') throw new ServiceError('validation', 'Unknown photo phase.');
  if (!/^[A-Za-z0-9_-]+$/.test(shotId)) throw new ServiceError('validation', 'That shot id is not valid.');
  return leasePath(leaseId, `/photos/${phase}/${shotId}`);
}

function leasePath(leaseId: string, suffix = ''): string {
  if (!/^[A-Za-z0-9_-]+$/.test(leaseId)) throw new ServiceError('validation', 'That lease id is not valid.');
  return `/leases/${leaseId}${suffix}`;
}

export interface LiveOptions {
  baseUrl: string;
  userId: DevUserId;
  /** D-012 demo token, sent as X-Demo-Token on writes. Omit when the server runs in open mode. */
  demoToken?: string;
  client?: ApiClient;
  /** The one explorer origin accepted for proof links. */
  explorer?: string;
  /** Chain id /health must report before transaction links are shown. */
  expectedChainId?: number;
}

export type LiveService = DepositService & {
  /** The development identity sent as X-User-Id. Not authentication. */
  getUserId(): DevUserId;
  /** Switches the dev identity and makes every subscriber refetch. */
  setUserId(id: DevUserId): void;
  /**
   * Starts over for a new demo session: switches identity, drops cached requests, staged edits and the polling
   * state of the old session, and makes subscribers refetch. Never calls the backend and never moves money.
   */
  resetSession(id: DevUserId): void;
  /**
   * Demo-only: performs the OTHER participant's next step by sending the real supported request with that
   * participant's dev identity. On a live server these are real requests (and real testnet transactions for deposit,
   * report send and accept). The caller must label them as simulated and run them only on an explicit click.
   */
  simulate(step: SimulatedStepKind, leaseId: string): Promise<void>;
};

export type SimulatedStepKind = 'pay_deposit' | 'start_report' | 'send_report' | 'accept' | 'appeal';

export function createLiveService({
  baseUrl,
  userId: initialUserId,
  demoToken,
  client = createApiClient(baseUrl, fetch, demoToken),
  explorer = 'https://explorer.testnet.arc.io',
  expectedChainId = 5042002,
}: LiveOptions): LiveService {
  let userId = initialUserId;
  let lastStatus: string | undefined;
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  // /health is the only place the API names the chain. Cache a successful check; retry after a failure.
  let verified: Promise<boolean> | undefined;
  function chainVerified(): Promise<boolean> {
    verified ??= (client.get('/health') as Promise<{ ok?: boolean; chain_id?: number; escrow?: string }>)
      .then((h) => h.ok === true && h.chain_id === expectedChainId && /^0x[0-9a-fA-F]{40}$/.test(h.escrow ?? ''))
      .catch(() => false)
      .then((ok) => {
        if (!ok) verified = undefined;
        return ok;
      });
    return verified;
  }
  const context = async (): Promise<MapContext> => ({ apiUrl: baseUrl, chainVerified: await chainVerified(), explorer });

  const inflight = new Map<string, Promise<ApiLease>>();
  const staged = new Map<string, StagedEdits>();

  // getLease and getProposal load together; share one request.
  function fetchLease(leaseId: string): Promise<ApiLease> {
    const existing = inflight.get(leaseId);
    if (existing) return existing;
    const request = (client.get(leasePath(leaseId)) as Promise<ApiLease>)
      .then((lease) => {
        lastStatus = lease.status;
        return lease;
      })
      .finally(() => inflight.delete(leaseId));
    inflight.set(leaseId, request);
    return request;
  }

  return {
    mode: 'live',
    getUserId: () => userId,
    setUserId(id) {
      userId = id;
      listeners.forEach((l) => l());
    },
    resetSession(id) {
      userId = id;
      inflight.clear();
      staged.clear();
      // Back to the slow default poll; the shared poll loop itself keeps running for whoever subscribes next.
      lastStatus = undefined;
      listeners.forEach((l) => l());
    },
    async simulate(step, leaseId) {
      const opts = { keepServerMessage: true } as const;
      switch (step) {
        case 'pay_deposit':
          await client.post(leasePath(leaseId, '/deposit'), 'tenant_demo', {}, opts);
          break;
        case 'start_report':
          await client.post(leasePath(leaseId, '/report'), 'landlord_demo', {}, opts);
          break;
        case 'send_report':
          // Sent as drafted: the simulated landlord makes no edits.
          await client.post(leasePath(leaseId, '/report/send'), 'landlord_demo', {}, opts);
          break;
        case 'accept':
          await client.post(leasePath(leaseId, '/accept'), 'tenant_demo', {}, opts);
          break;
        case 'appeal': {
          const lease = await fetchLease(leaseId);
          const ids = (lease.report?.findings ?? []).filter((f) => f.cost_cents > 0).map((f) => f.id);
          if (ids.length === 0) throw new ServiceError('validation', 'There is no deduction to dispute.');
          await client.post(leasePath(leaseId, '/appeal'), 'tenant_demo', { finding_ids: ids, reason: 'Simulated dispute (demo only).' }, opts);
          break;
        }
      }
      inflight.delete(leaseId);
      listeners.forEach((l) => l());
    },
    async getLease(leaseId) {
      const [lease, ctx] = await Promise.all([fetchLease(leaseId), context()]);
      return mapLease(lease, userId, ctx);
    },
    async getProposal(leaseId) {
      const [lease, ctx] = await Promise.all([fetchLease(leaseId), context()]);
      return mapProposal(lease, userId, staged.get(leaseId), ctx);
    },
    requestMoveOut: async () => blocked('Requesting move-out'),
    async saveProposalDraft(leaseId, edits) {
      const lease = await fetchLease(leaseId);
      const byId = new Map((lease.report?.findings ?? []).map((f) => [f.id, f]));
      const current: StagedEdits = new Map(staged.get(leaseId));
      for (const edit of edits) {
        const finding = byId.get(edit.itemId);
        if (!finding) throw new ServiceError('validation', 'That charge is not part of this report.');
        if (edit.rationale !== undefined) {
          throw new ServiceError('validation', "The reason comes from the photo comparison and can't be edited.");
        }
        const next = { ...current.get(edit.itemId) };
        if (edit.included !== undefined) next.included = edit.included;
        if (edit.amount !== undefined) {
          let units: bigint;
          try {
            units = BigInt(edit.amount);
          } catch {
            throw new ServiceError('validation', 'Enter a valid amount.');
          }
          if (units < 0n) throw new ServiceError('validation', 'Enter a valid amount.');
          if (units % UNITS_PER_CENT !== 0n) throw new ServiceError('validation', 'Use whole cents.');
          const cents = Number(units / UNITS_PER_CENT);
          if (cents > finding.cost_cents) {
            throw new ServiceError('validation', 'A charge can only be lowered, not raised above the original amount.');
          }
          next.cents = cents;
        }
        current.set(edit.itemId, next);
      }
      staged.set(leaseId, current);
      const proposal = mapProposal(lease, userId, current, await context());
      if (!proposal) throw new ServiceError('invalid_state', 'There is no draft report to edit.');
      return proposal;
    },
    async submitProposal(leaseId) {
      const lease = await fetchLease(leaseId);
      const edits = staged.get(leaseId) ?? new Map();
      const remove_finding_ids: string[] = [];
      const lower_costs: Record<string, number> = {};
      for (const f of lease.report?.findings ?? []) {
        const edit = edits.get(f.id);
        if (edit?.included === false) remove_finding_ids.push(f.id);
        else if (edit?.cents !== undefined && edit.cents < f.cost_cents) lower_costs[f.id] = edit.cents;
      }
      await client.post(leasePath(leaseId, '/report/send'), userId, { remove_finding_ids, lower_costs });
      staged.delete(leaseId);
    },
    async acceptProposal(leaseId) {
      await client.post(leasePath(leaseId, '/accept'), userId, {});
    },
    async disputeProposal(leaseId, _version, input) {
      await client.post(leasePath(leaseId, '/appeal'), userId, { finding_ids: input.itemIds, reason: input.reason });
    },
    async uploadPhoto(leaseId, phase, shotId, file): Promise<UploadResult> {
      const path = photoPath(leaseId, phase, shotId);
      if (file.size === 0) throw new ServiceError('validation', 'That photo is empty. Choose another one.');
      if (file.size > MAX_PHOTO_BYTES) throw new ServiceError('validation', 'That photo is larger than 25 MB.');
      if (!(await looksLikeJpegOrPng(file))) {
        throw new ServiceError('validation', 'Photos must be JPEG or PNG. HEIC is not supported; on iPhone, take the photo in the browser or choose a JPEG.');
      }
      const form = new FormData();
      form.append('file', file, 'photo');
      const r = (await client.put(path, userId, form, { keepServerMessage: true })) as {
        photo_id: string;
        shot_id: string;
        phase: PhotoPhase;
        url: string;
        sha256: string;
        shots_uploaded: number;
        shots_total: number;
      };
      const src = resolvePhotoUrl(r.url, baseUrl, r.sha256);
      if (!src) throw new ServiceError('service_failure', 'The server returned a photo address we could not use.', true);
      return { photoId: r.photo_id, shotId: r.shot_id, phase, src, shotsUploaded: r.shots_uploaded, shotsTotal: r.shots_total };
    },
    async commitPhotos(leaseId, phase): Promise<CommitResult> {
      if (phase !== 'in' && phase !== 'out') throw new ServiceError('validation', 'Unknown photo phase.');
      const r = (await client.post(leasePath(leaseId, `/photos/${phase}/commit`), userId, {}, { keepServerMessage: true })) as {
        status: string;
        tx?: { hash: string; explorer_url: string } | null;
      };
      const url = genuineTxUrl(r.tx, await context());
      return { status: r.status, proof: url ? { id: `commit-${phase}`, label: `Move-${phase} photos recorded`, url } : undefined };
    },
    async payDeposit(leaseId): Promise<DepositResult> {
      const r = (await client.post(leasePath(leaseId, '/deposit'), userId, {}, { keepServerMessage: true })) as {
        tx?: { hash: string; explorer_url: string } | null;
      };
      const url = genuineTxUrl(r.tx, await context());
      return { proof: url ? { id: 'deposit', label: 'Deposit paid', url } : undefined };
    },
    async createDemoLease() {
      // Always as the landlord: only the landlord creates leases, whichever identity is selected.
      const r = (await client.post('/leases', 'landlord_demo', DEMO_LEASE, { keepServerMessage: true })) as { lease_id?: string };
      if (!r?.lease_id || !/^[A-Za-z0-9_-]+$/.test(r.lease_id)) throw new ServiceError('service_failure', "The demo deposit wasn't created. Try again.", true);
      return { leaseId: r.lease_id };
    },
    async startReport(leaseId) {
      await client.post(leasePath(leaseId, '/report'), userId, {}, { keepServerMessage: true });
    },
    subscribe(listener) {
      listeners.add(listener);
      // One shared poll for all subscribers: every 2 s while the AI comparison runs (docs/API.md), otherwise every 5 s.
      const tick = () => {
        if (listeners.size === 0) {
          timer = undefined;
          return;
        }
        if (!(typeof document !== 'undefined' && document.hidden) && !(lastStatus && TERMINAL.has(lastStatus))) {
          listeners.forEach((l) => l());
        }
        timer = setTimeout(tick, lastStatus === 'analyzing' ? ANALYSIS_POLL_MS : POLL_MS);
      };
      timer ??= setTimeout(tick, lastStatus === 'analyzing' ? ANALYSIS_POLL_MS : POLL_MS);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      };
    },
  };
}
