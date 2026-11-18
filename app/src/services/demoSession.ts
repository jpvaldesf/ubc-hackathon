/**
 * Demo sessions. A session is one fresh run of the demo for one role: it starts at Setup with no lease, gets
 * a server-issued lease id when its first step runs, and is remembered for this browser tab so a refresh keeps
 * the same lease and stage. Switching role or restarting starts a new session; the old one is archived (the
 * lease, its photos and its transactions stay on the server untouched).
 */
export type DemoRole = 'tenant' | 'landlord';

export interface SimulatedStep {
  at: string;
  /** Plain words, e.g. "Jane Doe sent the report". Always a demo-only counterpart action. */
  text: string;
}

export interface DemoSession {
  role: DemoRole;
  /** Server-issued. Null until the first step has run: nothing acts on a lease that does not exist yet. */
  leaseId: string | null;
  startedAt: string;
  /** Demo-only record of counterpart steps this session simulated, shown so they are never mistaken for the user's own. */
  simulated: SimulatedStep[];
  /** UI-only: the demo "lease term ends" control was used, so the move-out step is open. The backend has no such call. */
  moveOutOpened: boolean;
  /** Tenant sessions: the invitation to the prepared lease was opened with Review lease (or the lease came from a link). */
  invitationOpened: boolean;
}

export interface ArchivedSession {
  role: DemoRole;
  leaseId: string;
  startedAt: string;
  endedAt: string;
}

type Store = Pick<Storage, 'getItem' | 'setItem'> | null;
const CURRENT_KEY = 'deposit-keeper.demo.session';
const ARCHIVE_KEY = 'deposit-keeper.demo.archive';
const MAX_ARCHIVE = 20;

export function newSession(role: DemoRole, now: Date = new Date()): DemoSession {
  return { role, leaseId: null, startedAt: now.toISOString(), simulated: [], moveOutOpened: false, invitationOpened: false };
}

function isSession(value: unknown): value is DemoSession {
  const v = value as DemoSession | null;
  return (
    !!v &&
    (v.role === 'tenant' || v.role === 'landlord') &&
    (v.leaseId === null || (typeof v.leaseId === 'string' && /^[A-Za-z0-9_-]+$/.test(v.leaseId))) &&
    typeof v.startedAt === 'string' &&
    Array.isArray(v.simulated) &&
    typeof v.moveOutOpened === 'boolean' &&
    (v.invitationOpened === undefined || typeof v.invitationOpened === 'boolean')
  );
}

export function loadSession(store: Store, fallbackRole: DemoRole): DemoSession {
  try {
    const raw = store?.getItem(CURRENT_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      // A session saved before invitations existed has no flag; its lease was already in use, so treat it as opened.
      if (isSession(parsed)) return { ...parsed, invitationOpened: parsed.invitationOpened ?? true };
    }
  } catch {
    /* unavailable or corrupt: start fresh */
  }
  return newSession(fallbackRole);
}

export function saveSession(store: Store, session: DemoSession): void {
  try {
    store?.setItem(CURRENT_KEY, JSON.stringify(session));
  } catch {
    /* in-memory session still works */
  }
}

export function loadArchive(store: Store): ArchivedSession[] {
  try {
    const raw = store?.getItem(ARCHIVE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (a): a is ArchivedSession => !!a && (a.role === 'tenant' || a.role === 'landlord') && typeof a.leaseId === 'string' && /^[A-Za-z0-9_-]+$/.test(a.leaseId),
      );
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Adds a finished session to the archive (newest first). Sessions that never got a lease are not worth keeping. Nothing on the server is touched. */
export function archiveSession(store: Store, session: DemoSession, now: Date = new Date()): ArchivedSession[] {
  const archive = loadArchive(store);
  if (!session.leaseId) return archive;
  const next = [{ role: session.role, leaseId: session.leaseId, startedAt: session.startedAt, endedAt: now.toISOString() }, ...archive.filter((a) => a.leaseId !== session.leaseId)].slice(
    0,
    MAX_ARCHIVE,
  );
  try {
    store?.setItem(ARCHIVE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
