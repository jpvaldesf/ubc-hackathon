/**
 * PROPOSED service contract, owned by the frontend lane until the team agrees on it.
 * Nothing here is an implemented backend or contract claim. Do not copy into
 * docs/API.md or shared/ without a team decision (/decide).
 *
 * Authority rule: the server decides roles, allowed actions, totals and transfer
 * status. The frontend renders what it is given and never invents policy.
 */
import type { BaseUnits } from '../lib/money';
import type { Funds } from '../lib/funds';

export type Role = 'tenant' | 'landlord';

/** The five milestones shown to people. Display only; it never lets anyone skip a step. */
export type Stage = 'setup' | 'move_in' | 'active' | 'move_out' | 'settlement';

/**
 * Finer lifecycle code (PROPOSED, pending agreement with the backend and contract owners).
 * Kept separate from payment/job status, which lives on Operation.
 */
export type Phase = 'active' | 'move_out' | 'proposal_submitted' | 'accepted' | 'disputed' | 'settled';

export type AllowedAction =
  | 'pay_deposit'
  | 'request_move_out'
  | 'edit_proposal'
  | 'submit_proposal'
  | 'accept_proposal'
  | 'dispute_proposal';

/** What the lease is waiting for. The frontend maps these codes to plain-language copy. */
export type WaitingFor = 'move_out_proposal' | 'tenant_response' | 'transfer_confirmation' | 'dispute_ruling';

export interface WaitingOn {
  actor: Role | 'system' | 'reviewer';
  awaiting: WaitingFor;
}

export interface Participant {
  id: string;
  role: Role;
  displayName: string;
}

export type OperationStatus = 'pending' | 'succeeded' | 'failed' | 'unknown';

export interface Operation {
  id: string;
  kind: 'refund' | 'landlord_payout';
  amount: BaseUnits;
  status: OperationStatus;
  /** Present only when a real transaction exists. Sample mode never sets it. */
  txHash?: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  text: string;
}

export interface EvidenceEntry {
  id: string;
  label: string;
  detail: string;
}

export interface Deadline {
  label: string;
  at: string;
}

export interface Lease {
  id: string;
  property: import('../demo/demoProperty').PropertyInfo;
  /** Live mode only: the backend's own lease status (docs/API.md state machine), used by demo-only controls. */
  serverStatus?: string;
  participants: Participant[];
  viewer: { userId: string; role: Role };
  asset: { symbol: string; displayName: string };
  stage: Stage;
  phase: Phase;
  moveOutRequestedOn?: string;
  /** What THIS viewer may do now. The UI shows actions from this list only. */
  allowedActions: AllowedAction[];
  /** Roles authorized to request move-out, so the overview can say who can start it. */
  moveOutAuthorizedRoles: Role[];
  waitingOn?: WaitingOn;
  funds: Funds;
  operations: Operation[];
  /** Set when the viewer's next step exists in the product but is not connected to the backend yet. Shown before any attempt. */
  unavailableNotice?: string;
  /** Only deadlines supplied by agreed policy. Empty means show none. */
  deadlines: Deadline[];
  events: ActivityEvent[];
  evidence: EvidenceEntry[];
  /** Links to real transactions. Only set when the transaction is verified as belonging to the configured network. */
  proofs?: ProofLink[];
  /** Why proof links are missing when the server reported transactions that could not be verified as real. */
  proofNote?: string;
  /** Live mode only: shot list and photos. Absent in sample mode. */
  capture?: CaptureState;
  /** Live mode only: AI comparison state. Absent in sample mode. */
  analysis?: AnalysisState;
}

export type PhotoPhase = 'in' | 'out';

/** One entry of the lease's shot list: where in the unit to take a photo. */
export interface PhotoShot {
  id: string;
  room: string;
  label: string;
}

/** A photo the backend already holds. `src` is absolute and carries a cache-busting version. */
export interface UploadedPhoto {
  photoId: string;
  shotId: string;
  src: string;
  sha256: string;
}

/** Everything the photo screen needs, from GET /leases/{id}. Live mode only. */
export interface CaptureState {
  shots: PhotoShot[];
  photos: Record<PhotoPhase, UploadedPhoto[]>;
  /** The phase that accepts uploads right now (move-in when funded, move-out after move-in is recorded); null otherwise. */
  openPhase: PhotoPhase | null;
  /** True once the phase was committed (locked). */
  committed: Record<PhotoPhase, boolean>;
}

/** The AI comparison, from GET /leases/{id}. Live mode only. */
export interface AnalysisState {
  /** `running` while the server compares photos; poll until it ends. */
  state: 'idle' | 'running';
  /** Only the landlord can start it, and only at move_out_recorded. */
  canStart: boolean;
  progress?: { shotsDone: number; shotsTotal: number; currentRoom: string | null };
  /** Set when the last attempt failed; the landlord can retry. */
  error?: string;
}

export interface UploadResult {
  photoId: string;
  shotId: string;
  phase: PhotoPhase;
  src: string;
  shotsUploaded: number;
  shotsTotal: number;
}

export interface CommitResult {
  /** The lease status after the commit (`move_in_recorded` or `move_out_recorded`). */
  status: string;
  /** Set only when the transaction is verified as a real one on the configured network. */
  proof?: ProofLink;
}

/** `proof` is set only when the transaction is verified as a real Arc testnet one. */
export interface DepositResult {
  proof?: ProofLink;
}

export interface ProofLink {
  id: string;
  label: string;
  url: string;
  /** The lifecycle step this transaction belongs to, when the adapter knows it (live mode). */
  step?: string;
  /** When the transaction happened (ISO), from the server's timeline. */
  at?: string;
  /** Position in the server's event order, used to break ties between equal timestamps. */
  order?: number;
}

export type Photo =
  | { kind: 'placeholder'; alt: string; caption: string }
  /** A real photo served by the backend. `src` is already an absolute URL. */
  | { kind: 'image'; src: string; alt: string; caption: string };

export interface PhotoPair {
  moveIn: Photo;
  moveOut: Photo;
  /** Highlight regions are shown only when the backend supplies valid coordinates. */
}

export interface Finding {
  id: string;
  label: string;
  observation: string;
  amount: BaseUnits;
  rationale: string;
  included: boolean;
  photoPair: PhotoPair;
  /** Short label for $0 findings, such as "Normal wear". */
  tag?: string;
}

export interface OriginalFinding {
  id: string;
  label: string;
  amount: BaseUnits;
  rationale: string;
}

export interface Revision {
  id: string;
  at: string;
  by: string;
  summary: string;
}

export interface ProposalHistory {
  /** Kept separate from human edits. In sample mode this is a fixture, not AI output. */
  original: { source: 'sample_fixture' | 'analysis'; items: OriginalFinding[] };
  revisions: Revision[];
}

export interface Dispute {
  id: string;
  proposalVersion: number;
  itemIds: string[];
  reason: string;
  submittedAt: string;
  status: 'awaiting_review';
  ruling?: string;
}

export interface Proposal {
  id: string;
  /** Absent when the backend has no proposal versions (the live adapter never invents one). */
  version?: number;
  status: 'draft' | 'submitted';
  submittedAt?: string;
  submittedBy?: string;
  items: Finding[];
  deductionTotal: BaseUnits;
  refundAmount: BaseUnits;
  history: ProposalHistory;
  dispute?: Dispute;
  /**
   * Live backend only: what a landlord may change in a draft (docs/API.md, D-004). Charges can only
   * be lowered or removed, and the AI's reason is fixed. Absent in sample mode (everything editable).
   */
  draftRules?: { editReason: false; lowerOnly: true };
  /** Findings that carry no charge (normal wear). Shown for context; never counted as deductions and never editable. */
  noChargeItems?: Finding[];
}

export interface DraftEdit {
  itemId: string;
  included?: boolean;
  amount?: BaseUnits;
  rationale?: string;
}

export interface DisputeInput {
  itemIds: string[];
  reason: string;
}

export interface DepositService {
  readonly mode: 'sample' | 'live';
  getLease(leaseId: string): Promise<Lease>;
  /** Null when the viewer has no proposal to see (the tenant never sees a landlord draft). */
  getProposal(leaseId: string): Promise<Proposal | null>;
  requestMoveOut(leaseId: string, idempotencyKey: string): Promise<void>;
  saveProposalDraft(leaseId: string, edits: DraftEdit[]): Promise<Proposal>;
  submitProposal(leaseId: string, version: number | undefined, idempotencyKey: string): Promise<void>;
  acceptProposal(leaseId: string, version: number | undefined, idempotencyKey: string): Promise<void>;
  disputeProposal(leaseId: string, version: number | undefined, input: DisputeInput, idempotencyKey: string): Promise<void>;
  /**
   * Live mode only (sample mode throws `integration_blocked`). Uploads one shot (PUT), or replaces it on a retake.
   * JPEG or PNG, at most 25 MB. Either persona may upload while the phase is open.
   */
  uploadPhoto(leaseId: string, phase: PhotoPhase, shotId: string, file: Blob): Promise<UploadResult>;
  /** Live mode only. The "Done" call for a phase: locks the photos and records their fingerprint onchain. */
  commitPhotos(leaseId: string, phase: PhotoPhase): Promise<CommitResult>;
  /** Live mode only (sample mode throws `integration_blocked`). Tenant pays the deposit into escrow (POST /deposit). */
  payDeposit(leaseId: string): Promise<DepositResult>;
  /**
   * Live mode only (sample mode throws `integration_blocked`). Creates a fresh $10 demo lease as the landlord
   * (POST /leases, one real testnet tx) with the demo shot list, and returns its id. Counts toward the daily cap.
   */
  createDemoLease(): Promise<{ leaseId: string }>;
  /** Live mode only. Landlord starts the AI comparison (returns once it is queued); poll via getLease. */
  startReport(leaseId: string): Promise<void>;
  /** Optional change notification (sample adapter now; live adapter may poll later). */
  subscribe?(listener: () => void): () => void;
}
