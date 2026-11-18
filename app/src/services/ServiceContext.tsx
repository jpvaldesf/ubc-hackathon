import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  archiveSession,
  loadArchive,
  loadSession,
  newSession,
  saveSession,
  type ArchivedSession,
  type DemoRole,
  type DemoSession,
} from './demoSession';
import { createServices, type ServiceBundle } from './index';

interface DemoSessionApi {
  /** The current demo session: role, server-issued lease id (null until the first step ran), simulated steps. */
  session: DemoSession;
  /** Earlier sessions, newest first. Their leases, photos and transactions are untouched on the server. */
  archive: ArchivedSession[];
  /** True while the first step of a fresh session is creating the lease. */
  starting: boolean;
  /** Shows the same lease as the other participant: the lease, photos, findings and transactions are untouched. */
  switchRole(role: DemoRole): void;
  /** The only reset: starts a fresh demo at Setup for the current role. The previous lease record is archived, never deleted. */
  restart(): void;
  /** Creates the lease for this session. Returns the server-issued id, or null if the session was replaced meanwhile. */
  startLease(): Promise<string | null>;
  /** Opens a lease from a link as the current session (same role), without creating anything. */
  adoptLease(leaseId: string, role: DemoRole): void;
  /** Records a simulated step, but only if the session it was started in is still the current one. */
  recordSimulated(text: string, startedAt: string): void;
  openMoveOut(): void;
  /** The tenant pressed Review lease on the invitation. */
  openInvitation(): void;
}

interface ServiceContextValue {
  bundle: ServiceBundle;
  /** Bumps whenever data may have changed, so screens reload. */
  revision: number;
  refresh: () => void;
  demo: DemoSessionApi;
}

const ServiceContext = createContext<ServiceContextValue | null>(null);

const idOf = (role: DemoRole) => (role === 'landlord' ? 'landlord_demo' : 'tenant_demo');
const roleOf = (id: string): DemoRole => (id === 'landlord_demo' ? 'landlord' : 'tenant');

function tabStore(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}
function longStore(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [bundle] = useState<ServiceBundle>(createServices);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => bundle.service.subscribe?.(refresh), [bundle, refresh]);

  const [session, setSessionState] = useState<DemoSession>(() => loadSession(tabStore(), bundle.live ? roleOf(bundle.live.getUserId()) : 'tenant'));
  const [archive, setArchive] = useState<ArchivedSession[]>(() => loadArchive(longStore()));
  const [starting, setStarting] = useState(false);
  // Every reset bumps the epoch. A request that started under an older epoch is discarded when it returns.
  const epoch = useRef(0);
  const sessionRef = useRef(session);
  // One lease creation per session: a second call while it is in flight (StrictMode, double click) gets the same promise.
  const startRef = useRef<{ epoch: number; promise: Promise<string | null> } | null>(null);

  const setSession = useCallback((next: DemoSession) => {
    sessionRef.current = next;
    setSessionState(next);
    saveSession(tabStore(), next);
  }, []);

  const begin = useCallback(
    (role: DemoRole) => {
      epoch.current += 1;
      setStarting(false);
      setArchive(archiveSession(longStore(), sessionRef.current));
      bundle.live?.resetSession(idOf(role));
      setSession(newSession(role));
    },
    [bundle, setSession],
  );

  const demo = useMemo<DemoSessionApi>(
    () => ({
      session,
      archive,
      starting,
      switchRole(role) {
        const current = sessionRef.current;
        if (role === current.role) return;
        // Same lease, other view: refetch with the other identity. No new session, no epoch bump, nothing is sent.
        bundle.live?.switchIdentity(idOf(role));
        setSession({ ...current, role });
      },
      restart: () => begin(sessionRef.current.role),
      startLease() {
        if (startRef.current && startRef.current.epoch === epoch.current) return startRef.current.promise;
        const mine = epoch.current;
        setStarting(true);
        const entry: { epoch: number; promise: Promise<string | null> } = { epoch: mine, promise: Promise.resolve(null) };
        entry.promise = (async () => {
          try {
            const { leaseId } = await bundle.service.createDemoLease();
            if (mine !== epoch.current) {
              // The user restarted or switched while this was in flight. The lease exists on the server; keep it in the archive.
              setArchive(archiveSession(longStore(), { ...newSession(sessionRef.current.role), leaseId }));
              return null;
            }
            setSession({ ...sessionRef.current, leaseId });
            return leaseId;
          } finally {
            if (mine === epoch.current) setStarting(false);
            if (startRef.current === entry) startRef.current = null;
          }
        })();
        startRef.current = entry;
        return entry.promise;
      },
      adoptLease(leaseId, role) {
        if (!/^[A-Za-z0-9_-]+$/.test(leaseId)) return;
        const current = sessionRef.current;
        if (current.leaseId === leaseId) {
          // Same lease: only the viewing role can differ (a link with ?as=). Progress is kept.
          if (current.role !== role) {
            bundle.live?.switchIdentity(idOf(role));
            setSession({ ...current, role });
          }
          return;
        }
        if (current.leaseId) setArchive(archiveSession(longStore(), current));
        epoch.current += 1;
        bundle.live?.resetSession(idOf(role));
        setSession({ ...newSession(role), leaseId, invitationOpened: true });
      },
      recordSimulated(text, startedAt) {
        const current = sessionRef.current;
        if (current.startedAt !== startedAt) return; // the user restarted or switched meanwhile
        setSession({ ...current, simulated: [...current.simulated, { at: new Date().toISOString(), text }] });
      },
      openInvitation() {
        setSession({ ...sessionRef.current, invitationOpened: true });
      },
      openMoveOut() {
        setSession({ ...sessionRef.current, moveOutOpened: true });
      },
    }),
    [session, archive, starting, bundle, begin, setSession],
  );

  const value = useMemo(() => ({ bundle, revision, refresh, demo }), [bundle, revision, refresh, demo]);
  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
}

export function useServices(): ServiceContextValue {
  const value = useContext(ServiceContext);
  if (!value) throw new Error('useServices must be used inside ServiceProvider');
  return value;
}
