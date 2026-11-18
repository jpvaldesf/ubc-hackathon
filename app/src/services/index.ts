import { createLiveService, type LiveService, type SimulatedStepKind } from './live';
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
  /** Live mode only. The development identity (X-User-Id) is demo identity, not authentication. */
  live?: {
    apiUrl: string;
    getUserId(): DevUserId;
    setUserId(id: DevUserId): void;
    resetSession(id: DevUserId): void;
    simulate(step: SimulatedStepKind, leaseId: string): Promise<void>;
  };
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

/** Remembers the choice for this tab and drops a stale ?as= so a reload doesn't undo the switch. */
function rememberIdentity(id: DevUserId) {
  try {
    sessionStorage.setItem(IDENTITY_KEY, id);
    const url = new URL(window.location.href);
    if (url.searchParams.has('as')) {
      url.searchParams.delete('as');
      window.history.replaceState(window.history.state, '', url.toString());
    }
  } catch {
    /* storage or history unavailable: the in-memory identity still switches */
  }
}

/** Adapter is chosen explicitly. Default is sample; there is no silent fallback from live to sample. */
export function createServices(): ServiceBundle {
  const adapter = import.meta.env.VITE_ADAPTER === 'live' ? 'live' : 'sample';
  if (adapter === 'live') {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
    const service: LiveService = createLiveService({
      baseUrl: apiUrl,
      userId: devIdentity(),
      demoToken: import.meta.env.VITE_DEMO_TOKEN?.trim() || undefined,
      explorer: import.meta.env.VITE_EXPLORER_URL ?? undefined,
      expectedChainId: import.meta.env.VITE_CHAIN_ID ? Number(import.meta.env.VITE_CHAIN_ID) : undefined,
    });
    return {
      service,
      live: {
        apiUrl,
        getUserId: () => service.getUserId(),
        setUserId(id) {
          rememberIdentity(id);
          service.setUserId(id);
        },
        resetSession(id) {
          rememberIdentity(id);
          service.resetSession(id);
        },
        simulate: (step, leaseId) => service.simulate(step, leaseId),
      },
    };
  }
  const { service, controls } = createSampleService();
  return { service, sampleControls: controls, defaultLeaseId: SAMPLE_LEASE_ID };
}

export type { SampleControls };
