import { ServiceError } from '../errors';
import type { DepositService } from '../types';
import { createApiClient, type ApiClient, type ApiLease, type DevUserId } from './api';
import { mapLease, mapProposal, type StagedEdits } from './mapping';
import { UNITS_PER_CENT } from './mapping';

/**
 * Live adapter for the frozen API (docs/API.md). Calls the backend for:
 *   getLease / getProposal -> GET /leases/{id}
 *   acceptProposal         -> POST /leases/{id}/accept
 *   disputeProposal        -> POST /leases/{id}/appeal
 *   submitProposal         -> POST /leases/{id}/report/send  (landlord "Send report")
 *   saveProposalDraft      -> no endpoint: edits (lower or remove only) are staged in this
 *                             browser and sent with the report; a reload discards them
 * NOT connected (no endpoint, fails with `integration_blocked` instead of pretending): requestMoveOut.
 * It never falls back to sample data. Idempotency keys and proposal versions are not part of
 * the API, so they are not sent; the server's state machine rejects a repeat with 409.
 */
const POLL_MS = 5000;
const TERMINAL = new Set(['settled', 'resolved']);

function blocked(capability: string): never {
  throw new ServiceError('integration_blocked', `${capability} isn't connected to the backend yet.`);
}

function leasePath(leaseId: string, suffix = ''): string {
  if (!/^[A-Za-z0-9_-]+$/.test(leaseId)) throw new ServiceError('validation', 'That lease id is not valid.');
  return `/leases/${leaseId}${suffix}`;
}

export interface LiveOptions {
  baseUrl: string;
  userId: DevUserId;
  client?: ApiClient;
}

export function createLiveService({ baseUrl, userId, client = createApiClient(baseUrl) }: LiveOptions): DepositService {
  let lastStatus: string | undefined;
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
    async getLease(leaseId) {
      return mapLease(await fetchLease(leaseId), userId);
    },
    async getProposal(leaseId) {
      return mapProposal(await fetchLease(leaseId), userId, staged.get(leaseId));
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
      const proposal = mapProposal(lease, userId, current);
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
    subscribe(listener) {
      const timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        if (lastStatus && TERMINAL.has(lastStatus)) return;
        listener();
      }, POLL_MS);
      return () => {
        clearInterval(timer);
      };
    },
  };
}
