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
import type { ApiFinding, ApiLease, ApiStatus, DevUserId } from './api';
import type {
  AllowedAction,
  Finding,
  Lease,
  Operation,
  Participant,
  Phase,
  Proposal,
  Role,
  Stage,
  WaitingOn,
} from '../types';

const UNITS_PER_CENT = 10_000n; // docs/API.md: 1 cent = 10_000 USDC base units (6 decimals)

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

export function mapLease(api: ApiLease, viewerId: DevUserId): Lease {
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
    operations.push({ id: `refund-${api.lease_id}`, kind: 'refund', amount: centsToUnits(toTenant), status: 'succeeded', txHash: proposeTx.hash });
  }
  if (settleTx && toLandlord > 0) {
    operations.push({ id: `payout-${api.lease_id}`, kind: 'landlord_payout', amount: centsToUnits(toLandlord), status: 'succeeded', txHash: settleTx.hash });
  }

  const participants: Participant[] = [
    { id: api.tenant.id, role: 'tenant', displayName: api.tenant.name },
    { id: api.landlord.id, role: 'landlord', displayName: api.landlord.name },
  ];

  const allowedActions: AllowedAction[] =
    role === 'tenant' && api.status === 'proposed' && (api.report?.total_deduction_cents ?? 0) > 0
      ? ['accept_proposal', 'dispute_proposal']
      : [];

  let waitingOn: WaitingOn | undefined;
  if (api.status === 'report_draft') waitingOn = { actor: 'landlord', awaiting: 'move_out_proposal' };
  else if (api.status === 'proposed' && (api.report?.total_deduction_cents ?? 0) > 0) waitingOn = { actor: 'tenant', awaiting: 'tenant_response' };
  else if (api.status === 'appealed') waitingOn = { actor: 'reviewer', awaiting: 'dispute_ruling' };

  let unavailableNotice: string | undefined;
  if (['created', 'funded', 'move_in_recorded'].includes(api.status)) {
    unavailableNotice = 'Paying the deposit, taking photos and requesting move-out are not available in the app yet.';
  } else if (role === 'landlord' && ['move_out_recorded', 'analyzing', 'report_draft'].includes(api.status)) {
    unavailableNotice = 'Running the photo comparison and sending the report are not available in the app yet.';
  }

  const evidence = [
    { id: 'in', label: 'Move-in photos', detail: `${api.photos.in.length} recorded${stepTx(api, 'move_in_recorded') ? ', fingerprint saved' : ''}` },
    { id: 'out', label: 'Move-out photos', detail: `${api.photos.out.length} recorded${stepTx(api, 'move_out_recorded') ? ', fingerprint saved' : ''}` },
  ];
  if (api.report?.report_hash) evidence.push({ id: 'report', label: 'Report fingerprint', detail: api.report.report_hash });

  return {
    id: api.lease_id,
    property: { label: api.address },
    participants,
    viewer: { userId: viewerId, role },
    asset: { symbol: 'USDC', displayName: 'test USDC' },
    stage,
    phase,
    allowedActions,
    moveOutAuthorizedRoles: [],
    waitingOn,
    unavailableNotice,
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
    events: api.timeline.map((t, i) => ({
      id: `${t.step}-${i}`,
      at: t.at,
      // The server words this step for the tenant ("sent to you"); say who it went to for the landlord.
      text:
        t.step === 'proposed' && role === 'landlord' && api.payout.to_tenant_cents != null
          ? `$${(api.payout.to_tenant_cents / 100).toFixed(2)} sent to ${api.tenant.name}`
          : t.label,
    })),
    evidence,
  };
}

function mapFinding(f: ApiFinding): Finding {
  const edited = f.edited_by_landlord && f.original_cost_cents != null ? ` Lowered by the landlord from $${(f.original_cost_cents / 100).toFixed(2)}.` : '';
  return {
    id: f.id,
    label: `${f.room}: ${f.item}`,
    observation: f.description,
    amount: centsToUnits(f.cost_cents),
    rationale: `Found by comparing move-in and move-out photos (confidence ${Math.round(f.confidence * 100)}%).${edited}`,
    included: true,
    // Photos exist at /files/... but the UI only renders placeholders today.
    photoPair: {
      moveIn: { kind: 'placeholder', alt: `Move-in photo ${f.before_photo}`, caption: f.before_photo },
      moveOut: { kind: 'placeholder', alt: `Move-out photo ${f.after_photo}`, caption: f.after_photo },
    },
  };
}

/** Null until the report has been sent (see the rules at the top). Only charged findings are listed. */
export function mapProposal(api: ApiLease): Proposal | null {
  if (!api.report || !PROPOSAL_STATUSES.includes(api.status)) return null;
  const sent = api.timeline.find((t) => t.step === 'proposed');
  const items = chargedFindings(api).map(mapFinding);
  const total = api.report.total_deduction_cents;
  return {
    id: api.report.report_id ?? `report-${api.lease_id}`,
    status: 'submitted',
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
