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

export interface ApiPhoto {
  photo_id: string;
  shot_id: string;
  sha256?: string;
  /** Relative, e.g. /files/l_7f3a/in/s1.jpg. Resolve against the backend address. */
  url: string;
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
  shot_list?: { shot_id: string; room: string; label: string }[];
  photos: { in: ApiPhoto[]; out: ApiPhoto[] };
  progress?: { shots_done: number; shots_total: number; current_room: string | null } | null;
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

/** `keepServerMessage`: show the server's own text (for example "Missing shots: s2, s3") instead of the generic wording. */
export interface CallOptions {
  keepServerMessage?: boolean;
}

export interface ApiClient {
  get(path: string): Promise<unknown>;
  post(path: string, userId: DevUserId, body: unknown, options?: CallOptions): Promise<unknown>;
  /** Multipart upload. The browser sets Content-Type (with the boundary) and Content-Length; we set neither. */
  put(path: string, userId: DevUserId, body: FormData, options?: CallOptions): Promise<unknown>;
}

/** Backend errors have the shape { error: { code, message } }. Anything else becomes a generic retryable failure. */
export function createApiClient(baseUrl: string, fetchImpl: typeof fetch = fetch): ApiClient {
  const base = baseUrl.replace(/\/+$/, '');

  async function request(path: string, init: RequestInit, options: CallOptions = {}): Promise<unknown> {
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
      throw new ServiceError(mapped.code, (options.keepServerMessage ? undefined : FRIENDLY[err.code]) ?? err.message, mapped.retryable);
    }
    throw new ServiceError('service_failure', 'Something went wrong on the server. Try again.', response.status >= 500);
  }

  return {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, userId, body, options) =>
      request(
        path,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': userId }, body: JSON.stringify(body) },
        options,
      ),
    // No Content-Type here on purpose: fetch derives the multipart boundary from the FormData.
    put: (path, userId, body, options) => request(path, { method: 'PUT', headers: { 'X-User-Id': userId }, body }, options),
  };
}
