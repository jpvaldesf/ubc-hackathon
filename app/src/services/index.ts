import { createLiveService } from './live';
import type { DevUserId } from './live/api';
import { SAMPLE_LEASE_ID } from './sample/engine';
import { createSampleService, type SampleControls } from './sample';
import type { DepositService } from './types';

export interface ServiceBundle {
  service: DepositService;
  /** Present only in sample mode. Live mode never offers persona or simulation controls. */
  sampleControls?: SampleControls;
  /** Where "/" goes. Undefined in live mode: the API has no lease list, so the user enters a server-issued lease id. */
  defaultLeaseId?: string;
  /** Live mode only: the development identity sent as X-User-Id. Not authentication. */
  live?: { userId: DevUserId; apiUrl: string };
}

const IDENTITY_KEY = 'deposit-keeper.live.user';

/** Dev identity: `?as=tenant_demo|landlord_demo` once, then remembered for the tab. Defaults to the tenant. */
function devIdentity(): DevUserId {
  const valid = (v: string | null): v is DevUserId => v === 'tenant_demo' || v === 'landlord_demo';
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('as');
    if (valid(fromUrl)) {
      sessionStorage.setItem(IDENTITY_KEY, fromUrl);
      return fromUrl;
    }
    const stored = sessionStorage.getItem(IDENTITY_KEY);
    if (valid(stored)) return stored;
  } catch {
    /* storage unavailable: fall through to the default */
  }
  return 'tenant_demo';
}

/** Adapter is chosen explicitly. Default is sample; there is no silent fallback from live to sample. */
export function createServices(): ServiceBundle {
  const adapter = import.meta.env.VITE_ADAPTER === 'live' ? 'live' : 'sample';
  if (adapter === 'live') {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
    const userId = devIdentity();
    return { service: createLiveService({ baseUrl: apiUrl, userId }), live: { userId, apiUrl } };
  }
  const { service, controls } = createSampleService();
  return { service, sampleControls: controls, defaultLeaseId: SAMPLE_LEASE_ID };
}

export type { SampleControls };
