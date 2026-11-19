import { describe, expect, it } from 'vitest';
import { DEMO_LEASE } from '../../services/live/demoLease';
import { offersSamplePhotos, samplePhotoUrl } from './samplePhotos';

const demoShots = [1, 2, 3, 4, 5].map((n) => ({ id: `s${n}`, room: 'x', label: `Shot ${n}` }));
const freshShots = DEMO_LEASE.shot_list.map((s) => ({ id: s.shot_id, room: s.room, label: s.label }));

describe('sample photos', () => {
  it('are offered on the Marks Tower demo lease shot list', () => {
    expect(offersSamplePhotos(freshShots)).toBe(true);
  });

  it('are offered only for exactly the shots s1 to s5', () => {
    expect(offersSamplePhotos(demoShots)).toBe(true);
    expect(offersSamplePhotos(demoShots.slice(0, 4))).toBe(false);
    expect(offersSamplePhotos(demoShots.map((s, i) => (i === 2 ? { ...s, id: 'closet' } : s)))).toBe(false);
  });

  it('map each shot to its pair: before for move-in, after for move-out', () => {
    expect(samplePhotoUrl('s3', 'in')).toBe('/demo-photos/p3_before.jpg');
    expect(samplePhotoUrl('s4', 'out')).toBe('/demo-photos/p5_after.jpg');
    expect(samplePhotoUrl('s5', 'out')).toBe('/demo-photos/p7_after.jpg');
    expect(() => samplePhotoUrl('s9', 'in')).toThrow();
  });
});
