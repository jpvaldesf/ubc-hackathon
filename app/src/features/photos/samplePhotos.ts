import type { PhotoPhase, PhotoShot } from '../../services/types';

/**
 * Staged sample photos for the demo lease, so a judge can run the whole path without photographing a room. They are
 * the tested AI set, not the guided-step reference photos (those live in public/reference and are never uploaded).
 * Files live in app/public/demo-photos, byte-identical to the set the AI was tested on (GPS checked: none).
 * Shot → pair: s1=p1, s2=p2, s3=p3 (blue paint streak on the wall, damage), s4=p5 (lighting only, no damage), s5=p7 (pin/nail holes, normal wear).
 */
const PAIR_FOR_SHOT: Record<string, string> = { s1: 'p1', s2: 'p2', s3: 'p3', s4: 'p5', s5: 'p7' };

/** The five shot ids the demo lease uses (and the backend supports). The sample photos are keyed by these ids, not by the labels. */
const DEMO_SHOT_IDS = ['s1', 's2', 's3', 's4', 's5'];

/** Offered on any lease whose shot list is exactly s1 to s5, in order: the Marks Tower dorm shots and the older demo leases alike. */
export function offersSamplePhotos(shots: PhotoShot[]): boolean {
  return shots.length === DEMO_SHOT_IDS.length && shots.every((s, i) => s.id === DEMO_SHOT_IDS[i]);
}

export function samplePhotoUrl(shotId: string, phase: PhotoPhase): string {
  const pair = PAIR_FOR_SHOT[shotId];
  if (!pair) throw new Error(`No sample photo for shot ${shotId}`);
  return `/demo-photos/${pair}_${phase === 'in' ? 'before' : 'after'}.jpg`;
}
