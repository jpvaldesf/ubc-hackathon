/**
 * Wire types and HTTP client for the frozen backend API (docs/API.md, D-005).
 * Only fields this adapter reads are typed. Amounts are integer cents.
 *
 * X-User-Id is the backend's DEVELOPMENT identity header (server/README.md). It is not
 * authentication: anyone can send any value. It must not be treated as production auth.
 */
import { ServiceError, type ErrorCode } from '../errors';

export type ApiStatus =
  | 'created'
  | 'funded'
  | 'move_in_recorded'
  | 'move_out_recorded'
  | 'analyzing'
  | 'report_draft'
  | 'proposed'
  | 'settled'
  | 'appealed'
  | 'resolved';

export interface ApiTx {
  hash: string;
  explorer_url: string;
}

export interface ApiFinding {
  id: string;
  room: string;
  item: string;
  before_photo: string;
  after_photo: string;
  category: string;
  description: string;
  confidence: number;
  cost_cents: number;
  edited_by_landlord?: boolean;
  original_cost_cents?: number;
}

export interface ApiLease {
  lease_id: string;
  status: ApiStatus;
  address: string;
  tenant: { id: string; name: string };
  landlord: { id: string; name: string };
  deposit_cents: number;
  demo_scale: number;
  escrow_balance_cents: number;
  appeal_deadline: string | null;
  photos: { in: unknown[]; out: unknown[] };
  report: {
    report_id: string | null;
    report_hash: string | null;
    sent_by: string | null;
    findings: ApiFinding[];
    total_deduction_cents: number;
    error: string | null;
  } | null;
  payout: { to_tenant_cents: number | null; to_landlord_cents: number | null; pending_cents: number | null };
  timeline: { step: string; at: string; label: string; tx: ApiTx | null }[];
}

export type DevUserId = 'tenant_demo' | 'landlord_demo';

const CODE_MAP: Record<string, { code: ErrorCode; retryable: boolean }> = {
  not_allowed: { code: 'unauthorized', retryable: false },
  wrong_state: { code: 'invalid_state', retryable: false },
  bad_request: { code: 'validation', retryable: false },
  not_found: { code: 'service_failure', retryable: false },
  chain_error: { code: 'service_failure', retryable: true },
  vision_error: { code: 'service_failure', retryable: true },
};

/** Plain-language text for the codes users can realistically hit. The server's own message is kept for the rest. */
const FRIENDLY: Record<string, string> = {
  wrong_state: 'This deposit has already moved on, so that action is no longer available. The page will refresh with the latest status.',
  not_allowed: "Your account can't do that on this deposit.",
};

export interface ApiClient {
  get(path: string): Promise<unknown>;
  post(path: string, userId: DevUserId, body: unknown): Promise<unknown>;
}

/** Backend errors have the shape { error: { code, message } }. Anything else becomes a generic retryable failure. */
export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch): ApiClient {
  const base = baseUrl.replace(/\/+$/, '');

  async function request(path: string, init: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, init);
    } catch {
      throw new ServiceError('service_failure', "We couldn't reach the server. Check your connection and try again.", true);
    }
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      /* non-JSON body: handled below */
    }
    if (response.ok) return payload;
    const err = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    if (err?.code && typeof err.message === 'string') {
      const mapped = CODE_MAP[err.code] ?? { code: 'service_failure' as ErrorCode, retryable: response.status >= 500 };
      throw new ServiceError(mapped.code, FRIENDLY[err.code] ?? err.message, mapped.retryable);
    }
    throw new ServiceError('service_failure', 'Something went wrong on the server. Try again.', response.status >= 500);
  }

  return {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, userId, body) =>
      request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify(body),
      }),
  };
}
