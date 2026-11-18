import { describe, expect, it } from 'vitest';
import { archiveSession, loadArchive, loadSession, newSession, saveSession } from './demoSession';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe('demo sessions', () => {
  it('start at Setup with no lease id and nothing simulated', () => {
    expect(newSession('tenant')).toMatchObject({ role: 'tenant', leaseId: null, simulated: [], moveOutOpened: false });
  });

  it('survive a refresh and ignore corrupt or unsafe stored data', () => {
    const store = memory();
    const s = { ...newSession('landlord'), leaseId: 'l_abc123' };
    saveSession(store, s);
    expect(loadSession(store, 'tenant')).toEqual(s);
    store.setItem('deposit-keeper.demo.session', JSON.stringify({ ...s, leaseId: '../etc' }));
    expect(loadSession(store, 'tenant').leaseId).toBeNull();
    store.setItem('deposit-keeper.demo.session', '{nope');
    expect(loadSession(store, 'landlord').role).toBe('landlord');
  });

  it('archives a finished session without losing earlier ones, and skips sessions with no lease', () => {
    const store = memory();
    archiveSession(store, newSession('tenant')); // never got a lease
    expect(loadArchive(store)).toEqual([]);
    archiveSession(store, { ...newSession('tenant'), leaseId: 'l_1' });
    archiveSession(store, { ...newSession('landlord'), leaseId: 'l_2' });
    expect(loadArchive(store).map((a) => a.leaseId)).toEqual(['l_2', 'l_1']);
  });

  it('works with no storage at all', () => {
    expect(loadSession(null, 'tenant').leaseId).toBeNull();
    expect(archiveSession(null, { ...newSession('tenant'), leaseId: 'l_1' }).map((a) => a.leaseId)).toEqual(['l_1']); // kept in memory only
  });
});
