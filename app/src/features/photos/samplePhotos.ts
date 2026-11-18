import type { PhotoPhase, PhotoShot } from '../../services/types';

/**
 * Staged sample photos for the demo lease, so a judge can run the whole path without photographing a room. They are
 * the tested AI set, not the guided-step reference photos (those live in public/reference and are never uploaded).
 * Files live in app/public/demo-photos, byte-identical to the set the AI was tested on (GPS checked: none).
 * Shot → pair: s1=p1, s2=p2, s3=p3 (wall mark, damage), s4=p5 (lighting only), s5=p7 (nail holes, normal wear).
 */
const PAIR_FOR_SHOT: Record<string, string> = { s1: 'p1', s2: 'p2', s3: 'p3', s4: 'p5', s5: 'p7' };

/**
 * The shot list older demo leases were created with (the tested AI photos match these spots). The fresh apartment
 * scenario has different shots, so it never offers these photos: its evidence is only what the tenant uploads.
 */
const LEGACY_DEMO_SHOTS = [
  { id: 's1', label: 'Living room wall, wide shot' },
  { id: 's2', label: 'Living room floor and wall' },
  { id: 's3', label: 'White brick wall below the light switch' },
  { id: 's4', label: 'Bedroom corner (lamp on/off)' },
  { id: 's5', label: 'Wall above the bed (picture hooks)' },
];

/** Offered only on older demo leases that use exactly the legacy shot list. */
export function offersSamplePhotos(shots: PhotoShot[]): boolean {
  return shots.length === LEGACY_DEMO_SHOTS.length && shots.every((s, i) => s.id === LEGACY_DEMO_SHOTS[i].id && s.label === LEGACY_DEMO_SHOTS[i].label);
}

export function samplePhotoUrl(shotId: string, phase: PhotoPhase): string {
  const pair = PAIR_FOR_SHOT[shotId];
  if (!pair) throw new Error(`No sample photo for shot ${shotId}`);
  return `/demo-photos/${pair}_${phase === 'in' ? 'before' : 'after'}.jpg`;
}
