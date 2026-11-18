import { describe, expect, it } from 'vitest';
import { DEMO_LEASE } from '../../services/live/demoLease';
import { guideForShot, REFERENCE_GUIDES } from './referenceGuides';

describe('reference guides', () => {
  it('map the five demo shots to the five reference photos by the existing shot ids', () => {
    const shots = DEMO_LEASE.shot_list.map((s) => ({ id: s.shot_id, room: s.room, label: s.label }));
    expect(shots.map((s) => guideForShot(s)?.shotId)).toEqual(['s1', 's2', 's3', 's4', 's5']);
    expect(new Set(REFERENCE_GUIDES.map((g) => g.src)).size).toBe(5);
  });
  it('give no reference to a shot whose label is not the guided one (e.g. the server default list)', () => {
    expect(guideForShot({ id: 's2', room: 'living room', label: 'Carpet, toward window' })).toBeUndefined();
  });
});
