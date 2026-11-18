import type { PhotoPhase, PhotoShot } from '../../services/types';
import { DEMO_LEASE } from '../../services/live/demoLease';

/**
 * Staged sample photos for the demo lease, so a judge can run the whole path without photographing a room. They are
 * the tested AI set, not the guided-step reference photos (those live in public/reference and are never uploaded).
 * Files live in app/public/demo-photos, byte-identical to the set the AI was tested on (GPS checked: none).
 * Shot → pair: s1=p1, s2=p2, s3=p3 (wall mark, damage), s4=p5 (lighting only), s5=p7 (nail holes, normal wear).
 */
const PAIR_FOR_SHOT: Record<string, string> = { s1: 'p1', s2: 'p2', s3: 'p3', s4: 'p5', s5: 'p7' };

/** Offered only when the lease uses exactly the demo shot list, so the photos match what each shot asks for. */
export function offersSamplePhotos(shots: PhotoShot[]): boolean {
  const demo = DEMO_LEASE.shot_list;
  return shots.length === demo.length && shots.every((s, i) => s.id === demo[i].shot_id && s.label === demo[i].label);
}

export function samplePhotoUrl(shotId: string, phase: PhotoPhase): string {
  const pair = PAIR_FOR_SHOT[shotId];
  if (!pair) throw new Error(`No sample photo for shot ${shotId}`);
  return `/demo-photos/${pair}_${phase === 'in' ? 'before' : 'after'}.jpg`;
}
