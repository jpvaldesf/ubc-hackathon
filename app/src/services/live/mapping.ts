/**
 * Pure mapping from the backend lease (docs/API.md) to the UI's Lease and Proposal.
 *
 * Rules:
 * - Nothing is invented. Proposal versions do not exist in the API, so `version` stays undefined.
 * - A transfer counts as confirmed only when the matching timeline step carries a tx. The API says
 *   writes return after the tx is mined, so a timeline tx is final; with no tx, nothing is confirmed.
 * - allowedActions are derived from status + the viewer's dev identity using the rules in docs/API.md
 *   (accept/appeal: tenant on `proposed`). That only decides which buttons show; the server still
 *   enforces them (403 / 409).
 * - The tenant never sees a landlord draft, and the landlord's draft-editing flow has no matching
 *   endpoint (edits are applied only at /report/send), so a proposal exists only once it was sent.
 */
import { propertyFromAddress } from '../../demo/demoProperty';
import type { ApiFinding, ApiLease, ApiStatus, DevUserId } from './api';
import type {
  AllowedAction,
  AnalysisState,
  CaptureState,
  Finding,
  Lease,
  Operation,
  Participant,
  Phase,
  Proposal,
  Role,
  Stage,
  UploadedPhoto,
  WaitingOn,
} from '../types';

/** What the adapter knows about the backend beyond a single lease response. */
export interface MapContext {
  /** Backend base URL; relative /files/... photo paths resolve against it. */
  apiUrl: string;
  /** True only when /health matched the expected Arc testnet chain and escrow. */
  chainVerified: boolean;
  /** The one explorer origin accepted for proof links. */
  explorer: string;
}

const NO_CONTEXT: MapContext = { apiUrl: '', chainVerified: false, explorer: 'https://explorer.testnet.arc.io' };

/** Only paths under /files/ with no traversal are accepted; anything else is not shown. */
export function resolvePhotoUrl(path: string, apiUrl: string, sha256?: string): string | undefined {
  if (!apiUrl || !/^\/files\/[A-Za-z0-9_\-./]+$/.test(path) || path.includes('..')) return undefined;
  const url = `${apiUrl.replace(/\/+$/, '')}${path}`;
  // A retake keeps the same URL, so the content hash is added as a cache-buster (a changed photo means a new hash).
  return sha256 && /^[0-9a-f]{64}$/i.test(sha256) ? `${url}?v=${sha256.slice(0, 16)}` : url;
}

/**
 * A transaction counts as real proof only if the server's chain checked out AND the explorer link points at the
 * single accepted explorer for exactly this hash. The lease response has no network field, so this is the
 * strongest check available from the API alone; a fake chain configured with the real explorer would not be caught.
 */
export function genuineTxUrl(tx: { hash: string; explorer_url: string } | null | undefined, ctx: MapContext): string | undefined {
  if (!tx || !ctx.chainVerified || !/^https:\/\//.test(ctx.explorer)) return undefined;
  if (!/^0x[0-9a-fA-F]{64}$/.test(tx.hash)) return undefined;
  return tx.explorer_url === `${ctx.explorer.replace(/\/+$/, '')}/tx/${tx.hash}` ? tx.explorer_url : undefined;
}

export const UNITS_PER_CENT = 10_000n; // docs/API.md: 1 cent = 10_000 USDC base units (6 decimals)

export function centsToUnits(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`Invalid cents amount: ${cents}`);
  return (BigInt(cents) * UNITS_PER_CENT).toString();
}

export function roleOf(userId: DevUserId): Role {
  return userId === 'landlord_demo' ? 'landlord' : 'tenant';
}

const PROPOSAL_STATUSES: ApiStatus[] = ['proposed', 'settled', 'appealed', 'resolved'];

function stageAndPhase(status: ApiStatus): { stage: Stage; phase: Phase } {
  switch (status) {
    case 'created':
      return { stage: 'setup', phase: 'active' };
    case 'funded':
      return { stage: 'move_in', phase: 'active' };
    case 'move_in_recorded':
      return { stage: 'active', phase: 'active' };
    case 'move_out_recorded':
    case 'analyzing':
    case 'report_draft':
      return { stage: 'move_out', phase: 'move_out' };
    case 'proposed':
      return { stage: 'settlement', phase: 'proposal_submitted' };
    case 'appealed':
    case 'resolved':
      return { stage: 'settlement', phase: 'disputed' };
    case 'settled':
      return { stage: 'settlement', phase: 'settled' };
  }
}

function stepTx(lease: ApiLease, step: string) {
  return lease.timeline.find((t) => t.step === step && t.tx)?.tx ?? undefined;
}

function chargedFindings(lease: ApiLease): ApiFinding[] {
  return (lease.report?.findings ?? []).filter((f) => f.cost_cents > 0);
}

/** Landlord edits staged in the browser until the report is sent. The API applies edits only at /report/send. */
export type StagedEdits = Map<string, { included?: boolean; cents?: number }>;

export function mapLease(api: ApiLease, viewerId: DevUserId, ctx: MapContext = NO_CONTEXT): Lease {
  const role = roleOf(viewerId);
  const { stage, phase } = stageAndPhase(api.status);
  const proposed = PROPOSAL_STATUSES.includes(api.status);
  const proposeTx = stepTx(api, 'proposed');
  const settleTx = api.status === 'settled' ? stepTx(api, 'settled') : undefined;

  const toTenant = proposed && proposeTx ? (api.payout.to_tenant_cents ?? 0) : 0;
  const toLandlord = settleTx ? (api.payout.to_landlord_cents ?? 0) : 0;
  // Held comes straight from the server's escrow balance; before the deposit it is 0, so the
  // "original" is whatever is actually accounted for and the numbers always reconcile.
  const held = api.escrow_balance_cents;
  const original = held + toTenant + toLandlord;

  const operations: Operation[] = [];
  if (proposeTx && toTenant > 0) {
    operations.push({ id: `refund-${api.lease_id}`, kind: 'refund', amount: centsToUnits(toTenant), status: 'succeeded' });
  }
  if (settleTx && toLandlord > 0) {
    operations.push({ id: `payout-${api.lease_id}`, kind: 'landlord_payout', amount: centsToUnits(toLandlord), status: 'succeeded' });
  }

  const participants: Participant[] = [
    { id: api.tenant.id, role: 'tenant', displayName: api.tenant.name },
    { id: api.landlord.id, role: 'landlord', displayName: api.landlord.name },
  ];

  let allowedActions: AllowedAction[] = [];
  if (role === 'tenant' && api.status === 'proposed' && (api.report?.total_deduction_cents ?? 0) > 0) {
    allowedActions = ['accept_proposal', 'dispute_proposal'];
  } else if (role === 'tenant' && api.status === 'created') {
    allowedActions = ['pay_deposit']; // POST /deposit; the server still enforces it
  } else if (role === 'landlord' && api.status === 'report_draft') {
    allowedActions = ['edit_proposal', 'submit_proposal']; // POST /report/send; the server still enforces it
  }

  let waitingOn: WaitingOn | undefined;
  if (api.status === 'report_draft') waitingOn = { actor: 'landlord', awaiting: 'move_out_proposal' };
  else if (api.status === 'proposed' && (api.report?.total_deduction_cents ?? 0) > 0) waitingOn = { actor: 'tenant', awaiting: 'tenant_response' };
  else if (api.status === 'appealed') waitingOn = { actor: 'reviewer', awaiting: 'dispute_ruling' };

  const uploaded = (photos: ApiLease['photos']['in']): UploadedPhoto[] =>
    photos.flatMap((p) => {
      const src = resolvePhotoUrl(p.url, ctx.apiUrl, p.sha256);
      return src ? [{ photoId: p.photo_id, shotId: p.shot_id, src, sha256: p.sha256 ?? '' }] : [];
    });
  const OUT_COMMITTED: ApiStatus[] = ['move_out_recorded', 'analyzing', 'report_draft', 'proposed', 'settled', 'appealed', 'resolved'];
  const capture: CaptureState = {
    shots: (api.shot_list ?? []).map((s) => ({ id: s.shot_id, room: s.room, label: s.label })),
    photos: { in: uploaded(api.photos.in), out: uploaded(api.photos.out) },
    openPhase: api.status === 'funded' ? 'in' : api.status === 'move_in_recorded' ? 'out' : null,
    committed: { in: !['created', 'funded'].includes(api.status), out: OUT_COMMITTED.includes(api.status) },
  };
  const analysis: AnalysisState = {
    state: api.status === 'analyzing' ? 'running' : 'idle',
    canStart: role === 'landlord' && api.status === 'move_out_recorded',
    progress:
      api.status === 'analyzing' && api.progress
        ? { shotsDone: api.progress.shots_done, shotsTotal: api.progress.shots_total, currentRoom: api.progress.current_room }
        : undefined,
    error: api.status === 'move_out_recorded' && api.report?.error ? api.report.error : undefined,
  };

  const evidence = [
    { id: 'in', label: 'Move-in photos', detail: `${api.photos.in.length} recorded${stepTx(api, 'move_in_recorded') ? ', fingerprint saved' : ''}` },
    { id: 'out', label: 'Move-out photos', detail: `${api.photos.out.length} recorded${stepTx(api, 'move_out_recorded') ? ', fingerprint saved' : ''}` },
  ];
  if (api.report?.report_hash) evidence.push({ id: 'report', label: 'Report fingerprint', detail: api.report.report_hash });

  const eventText = (t: ApiLease['timeline'][number]) =>
    t.step === 'proposed' && role === 'landlord' && api.payout.to_tenant_cents != null
      ? `$${(api.payout.to_tenant_cents / 100).toFixed(2)} sent to ${api.tenant.name}`
      : t.label;
  const withTx = api.timeline.filter((t) => t.tx);
  const proofs = api.timeline.flatMap((t, order) => {
    if (!t.tx) return [];
    const url = genuineTxUrl(t.tx, ctx);
    return url ? [{ id: `${t.step}-${order}`, label: eventText(t), url, step: t.step, at: t.at, order }] : [];
  });
  const proofNote =
    withTx.length > proofs.length
      ? "Transaction links are hidden because these transactions could not be verified as real Arc testnet transactions, so they are not blockchain proof."
      : undefined;

  return {
    id: api.lease_id,
    property: propertyFromAddress(api.address),
    participants,
    viewer: { userId: viewerId, role },
    asset: { symbol: 'USDC', displayName: 'test USDC' },
    stage,
    phase,
    allowedActions,
    moveOutAuthorizedRoles: [],
    waitingOn,
    funds: {
      original: centsToUnits(original),
      returnedConfirmed: centsToUnits(toTenant),
      returnedPending: '0',
      paidToLandlordConfirmed: centsToUnits(toLandlord),
      paidToLandlordPending: '0',
      held: centsToUnits(held),
    },
    operations,
    deadlines:
      api.status === 'proposed' && api.appeal_deadline ? [{ label: 'Appeal window ends', at: api.appeal_deadline }] : [],
    // The server words the proposed step for the tenant ("sent to you"); eventText says who it went to for the landlord.
    events: api.timeline.map((t, i) => ({ id: `${t.step}-${i}`, at: t.at, text: eventText(t) })),
    evidence,
    proofs,
    proofNote,
    capture,
    analysis,
  };
}

function photoFor(photoId: string, label: string, api: ApiLease, ctx: MapContext) {
  const found = [...api.photos.in, ...api.photos.out].find((p) => p.photo_id === photoId);
  const src = found ? resolvePhotoUrl(found.url, ctx.apiUrl, found.sha256) : undefined;
  return src
    ? ({ kind: 'image', src, alt: `${label} photo`, caption: photoId } as const)
    : ({ kind: 'placeholder', alt: `${label} photo not available`, caption: photoId } as const);
}

function mapFinding(f: ApiFinding, api: ApiLease, ctx: MapContext): Finding {
  const edited = f.edited_by_landlord && f.original_cost_cents != null ? ` Lowered by the landlord from $${(f.original_cost_cents / 100).toFixed(2)}.` : '';
  return {
    id: f.id,
    label: `${f.room}: ${f.item}`,
    observation: f.description,
    amount: centsToUnits(f.cost_cents),
    rationale: `Found by comparing move-in and move-out photos (confidence ${Math.round(f.confidence * 100)}%).${edited}`,
    included: true,
    photoPair: { moveIn: photoFor(f.before_photo, 'Move-in', api, ctx), moveOut: photoFor(f.after_photo, 'Move-out', api, ctx) },
  };
}

/** $0 findings (normal wear, or a charge lowered to $0). Context only: not deductions, not editable. */
function noChargeFindings(api: ApiLease, ctx: MapContext): Finding[] {
  return (api.report?.findings ?? [])
    .filter((f) => f.cost_cents === 0)
    .map((f) => ({
      ...mapFinding(f, api, ctx),
      included: false,
      tag: f.category === 'normal_wear' ? 'Normal wear' : 'No charge',
    }));
}

function applyStaged(f: ApiFinding, staged?: StagedEdits) {
  const edit = staged?.get(f.id);
  const cents = edit?.cents !== undefined ? Math.min(edit.cents, f.cost_cents) : f.cost_cents;
  return { included: edit?.included ?? true, cents };
}

/**
 * A proposal exists once the report was sent. The landlord also gets the AI draft (`report_draft`) to
 * review; the tenant never sees a draft. Draft totals are a preview of what /report/send will do:
 * the server recomputes and returns the real figures.
 */
export function mapProposal(api: ApiLease, viewerId: DevUserId = 'tenant_demo', staged?: StagedEdits, ctx: MapContext = NO_CONTEXT): Proposal | null {
  if (api.report && api.status === 'report_draft' && roleOf(viewerId) === 'landlord') return mapDraft(api, staged, ctx);
  if (!api.report || !PROPOSAL_STATUSES.includes(api.status)) return null;
  const sent = api.timeline.find((t) => t.step === 'proposed');
  const items = chargedFindings(api).map((f) => mapFinding(f, api, ctx));
  const total = api.report.total_deduction_cents;
  return {
    id: api.report.report_id ?? `report-${api.lease_id}`,
    status: 'submitted',
    noChargeItems: noChargeFindings(api, ctx),
    submittedAt: sent?.at,
    submittedBy: api.report.sent_by === 'auto' ? 'Automatic send after 48 hours' : api.landlord.name,
    items,
    deductionTotal: centsToUnits(total),
    refundAmount: centsToUnits(api.payout.to_tenant_cents ?? 0),
    history: {
      original: {
        source: 'analysis',
        items: chargedFindings(api).map((f) => ({
          id: f.id,
          label: `${f.room}: ${f.item}`,
          amount: centsToUnits(f.original_cost_cents ?? f.cost_cents),
          rationale: f.description,
        })),
      },
      revisions: [],
    },
  };
}

function mapDraft(api: ApiLease, staged: StagedEdits | undefined, ctx: MapContext): Proposal {
  const findings = chargedFindings(api);
  const items = findings.map((f) => {
    const { included, cents } = applyStaged(f, staged);
    return { ...mapFinding({ ...f, cost_cents: cents }, api, ctx), included };
  });
  const total = Math.min(
    findings.reduce((sum, f) => {
      const { included, cents } = applyStaged(f, staged);
      return included ? sum + cents : sum;
    }, 0),
    api.deposit_cents,
  );
  return {
    id: api.report?.report_id ?? `report-${api.lease_id}`,
    status: 'draft',
    noChargeItems: noChargeFindings(api, ctx),
    items,
    deductionTotal: centsToUnits(total),
    refundAmount: centsToUnits(api.deposit_cents - total),
    history: {
      original: {
        source: 'analysis',
        items: findings.map((f) => ({ id: f.id, label: `${f.room}: ${f.item}`, amount: centsToUnits(f.cost_cents), rationale: f.description })),
      },
      revisions: [],
    },
    draftRules: { editReason: false, lowerOnly: true },
  };
}
