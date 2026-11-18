import { describe, expect, it } from 'vitest';
import { DEMO_LEASE } from '../../services/live/demoLease';
import { offersSamplePhotos, samplePhotoUrl } from './samplePhotos';

const legacy = ['Living room wall, wide shot', 'Living room floor and wall', 'White brick wall below the light switch', 'Bedroom corner (lamp on/off)', 'Wall above the bed (picture hooks)'];
const demoShots = legacy.map((label, i) => ({ id: `s${i + 1}`, room: 'x', label }));
const freshShots = DEMO_LEASE.shot_list.map((s) => ({ id: s.shot_id, room: s.room, label: s.label }));

describe('sample photos', () => {
  it('are never offered in the fresh apartment scenario', () => {
    expect(offersSamplePhotos(freshShots)).toBe(false);
  });

  it('are offered only for the legacy demo shot list', () => {
    expect(offersSamplePhotos(demoShots)).toBe(true);
    expect(offersSamplePhotos(demoShots.slice(0, 4))).toBe(false);
    expect(offersSamplePhotos(demoShots.map((s, i) => (i === 2 ? { ...s, label: 'Closet door' } : s)))).toBe(false);
  });

  it('map each shot to its pair: before for move-in, after for move-out', () => {
    expect(samplePhotoUrl('s3', 'in')).toBe('/demo-photos/p3_before.jpg');
    expect(samplePhotoUrl('s4', 'out')).toBe('/demo-photos/p5_after.jpg');
    expect(samplePhotoUrl('s5', 'out')).toBe('/demo-photos/p7_after.jpg');
    expect(() => samplePhotoUrl('s9', 'in')).toThrow();
  });
});
