import { describe, expect, it } from 'vitest';
import { DEMO_LEASE } from '../../services/live/demoLease';
import { guideForShot, REFERENCE_GUIDES } from './referenceGuides';

describe('reference guides (kept for older Example Apartment leases only)', () => {
  it('map the legacy Example Apartment shots by id and label', () => {
    const legacy = REFERENCE_GUIDES.map((g) => ({ id: g.shotId, room: g.room, label: g.label }));
    expect(legacy.map((s) => guideForShot(s)?.shotId)).toEqual(['s1', 's2', 's3', 's4', 's5']);
    expect(new Set(REFERENCE_GUIDES.map((g) => g.src)).size).toBe(5);
  });
  it('give the Marks Tower demo no stock reference: move-in is your own photo, move-out references it', () => {
    const shots = DEMO_LEASE.shot_list.map((s) => ({ id: s.shot_id, room: s.room, label: s.label }));
    expect(shots.map((s) => guideForShot(s))).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });
  it('give no reference to a shot whose label is not the guided one (e.g. the server default list)', () => {
    expect(guideForShot({ id: 's2', room: 'living room', label: 'Carpet, toward window' })).toBeUndefined();
  });
});
