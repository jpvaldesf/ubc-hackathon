import { describe, expect, it } from 'vitest';
import { buildScenario, selectLease, selectProposal } from '../../services/sample/engine';
import type { AnalysisState, CaptureState, Lease, PhotoPhase, Role, UploadedPhoto } from '../../services/types';
import {
  analysisCopy,
  capturePhaseCopy,
  doneHint,
  idleCopy,
  pageSections,
  progressText,
  shotRows,
  uploadCount,
  validateFile,
} from './describeCapture';

const now = new Date('2026-11-16T12:00:00.000Z');

const shots = [
  { id: 's1', room: 'Living room', label: 'Wall by the window' },
  { id: 's2', room: 'Kitchen', label: 'Counter and backsplash' },
  { id: 's3', room: 'Bedroom', label: 'Carpet by the closet' },
];

function photo(shotId: string): UploadedPhoto {
  return { photoId: `p_${shotId}`, shotId, src: `http://127.0.0.1:8000/files/${shotId}.jpg?v=1`, sha256: 'x' };
}

function capture(openPhase: PhotoPhase | null, committed: { in: boolean; out: boolean }, photos: Partial<Record<PhotoPhase, UploadedPhoto[]>> = {}): CaptureState {
  return { shots, photos: { in: photos.in ?? [], out: photos.out ?? [] }, openPhase, committed };
}

const idle: AnalysisState = { state: 'idle', canStart: false };

/** A sample lease with live-only capture data added, the way the live adapter would supply it. */
function liveLease(role: Role, cap: CaptureState | undefined, analysis: AnalysisState | undefined = idle): Lease {
  return { ...selectLease(buildScenario('active', now), role), capture: cap, analysis };
}

describe('shotRows and uploadCount', () => {
  it('matches photos to shots by id, in shot-list order', () => {
    const cap = capture('in', { in: false, out: false }, { in: [photo('s3'), photo('s1')] });
    const rows = shotRows(cap, 'in');
    expect(rows.map((r) => r.shot.id)).toEqual(['s1', 's2', 's3']);
    expect(rows.map((r) => r.photo?.photoId)).toEqual(['p_s1', undefined, 'p_s3']);
    expect(uploadCount(cap, 'in')).toEqual({ uploaded: 2, total: 3 });
  });

  it('does not count photos for shots that are not on the list, or photos of the other phase', () => {
    const cap = capture('out', { in: true, out: false }, { in: [photo('s1'), photo('s2'), photo('s3')], out: [photo('s9')] });
    expect(uploadCount(cap, 'out')).toEqual({ uploaded: 0, total: 3 });
  });
});

describe('pageSections', () => {
  it('opens move-in capture once the deposit is paid, with nothing to compare', () => {
    const s = pageSections(liveLease('tenant', capture('in', { in: false, out: false })), null);
    expect(s).toMatchObject({ available: true, capturePhase: 'in', analysis: null, reviewReady: false });
  });

  it('opens move-out capture after move-in is recorded', () => {
    expect(pageSections(liveLease('landlord', capture('out', { in: true, out: false })), null).capturePhase).toBe('out');
  });

  it('offers the comparison to the landlord only, after move-out is recorded', () => {
    const cap = capture(null, { in: true, out: true });
    const landlord = pageSections(liveLease('landlord', cap, { state: 'idle', canStart: true }), null);
    expect(landlord).toMatchObject({ capturePhase: null, analysis: 'start', canRunAnalysis: true });

    const tenantLease = liveLease('tenant', cap, { state: 'idle', canStart: false });
    const tenant = pageSections(tenantLease, null);
    expect(tenant).toMatchObject({ capturePhase: null, analysis: null, canRunAnalysis: false });
    expect(idleCopy(tenantLease, tenant).body).toContain('Waiting on your landlord');
  });

  it('shows progress while running, for either role', () => {
    const cap = capture(null, { in: true, out: true });
    for (const role of ['tenant', 'landlord'] as const) {
      expect(pageSections(liveLease(role, cap, { state: 'running', canStart: false }), null).analysis).toBe('running');
    }
  });

  it('shows a failure, and only the landlord gets Try again', () => {
    const cap = capture(null, { in: true, out: true });
    const landlordState: AnalysisState = { state: 'idle', canStart: true, error: 'The photo comparison timed out.' };
    const tenantState: AnalysisState = { state: 'idle', canStart: false, error: 'The photo comparison timed out.' };
    expect(pageSections(liveLease('landlord', cap, landlordState), null).analysis).toBe('failed');
    expect(analysisCopy(landlordState, 'failed', 'landlord').button).toBe('Try again');
    const tenant = analysisCopy(tenantState, 'failed', 'tenant');
    expect(tenant.button).toBeUndefined();
    expect(tenant.body).toContain('Your landlord can try again.');
  });

  it('handles sample mode, which has no capture data, without crashing', () => {
    const lease = selectLease(buildScenario('active', now), 'tenant');
    const s = pageSections(lease, null);
    expect(s).toMatchObject({ available: false, capturePhase: null, analysis: null });
    expect(idleCopy(lease, s).body).toContain("isn't available");
  });

  it('points to the review once a report exists and nothing else is open', () => {
    const state = buildScenario('move_out', now);
    const lease = liveLease('landlord', capture(null, { in: true, out: true }));
    const s = pageSections(lease, selectProposal(state, 'landlord'));
    expect(s.reviewReady).toBe(true);
    expect(idleCopy(lease, s)).toMatchObject({ title: 'Report ready', body: expect.stringContaining('ready for your review') });
  });

  it('says the report was sent once the lease is in settlement', () => {
    const state = buildScenario('move_out', now);
    const lease = { ...liveLease('landlord', capture(null, { in: true, out: true })), stage: 'settlement' as const };
    const s = pageSections(lease, selectProposal(state, 'landlord'));
    expect(idleCopy(lease, s).title).toBe('Report sent');
  });

  it('names what is recorded instead of "nothing to photograph" after the photos are done', () => {
    const tenant = liveLease('tenant', capture(null, { in: true, out: true }));
    expect(idleCopy(tenant, pageSections(tenant, null)).title).toBe('Photos recorded');
    const movedIn = liveLease('tenant', capture(null, { in: true, out: false }));
    expect(idleCopy(movedIn, pageSections(movedIn, null)).title).toBe('Move-in photos recorded');
  });
});

describe('copy', () => {
  it('reports comparison progress with the current room, and without one', () => {
    const withRoom = analysisCopy({ state: 'running', canStart: false, progress: { shotsDone: 2, shotsTotal: 5, currentRoom: 'Kitchen' } }, 'running', 'landlord');
    expect(withRoom.body).toBe('Comparing photos: 2 of 5 done. Now checking: Kitchen.');
    const noRoom = analysisCopy({ state: 'running', canStart: false, progress: { shotsDone: 0, shotsTotal: 5, currentRoom: null } }, 'running', 'landlord');
    expect(noRoom.body).not.toContain('Now checking');
    expect(withRoom.button).toBeUndefined();
  });

  it('counts photos and says how many are missing', () => {
    expect(progressText(3, 5)).toBe('3 of 5 photos added');
    expect(doneHint(4, 5)).toBe('Add 1 more photo to finish.');
    expect(doneHint(2, 5)).toBe('Add 3 more photos to finish.');
    expect(doneHint(5, 5)).toBeNull();
  });

  it('uses plain language with no crypto words, for either role', () => {
    const banned = /wallet|chain|token|usdc|gas|hash|onchain|crypto|blockchain/i;
    const texts: string[] = [];
    for (const phase of ['in', 'out'] as const) texts.push(...Object.values(capturePhaseCopy(phase)));
    const states: AnalysisState[] = [
      { state: 'idle', canStart: true },
      { state: 'running', canStart: false, progress: { shotsDone: 1, shotsTotal: 3, currentRoom: 'Kitchen' } },
      { state: 'running', canStart: false },
      { state: 'idle', canStart: true, error: 'The comparison failed.' },
    ];
    for (const role of ['tenant', 'landlord'] as const) {
      for (const section of ['start', 'running', 'failed'] as const) {
        for (const a of states) texts.push(...Object.values(analysisCopy(a, section, role)).filter((v): v is string => typeof v === 'string'));
      }
      for (const cap of [undefined, capture(null, { in: false, out: false }), capture(null, { in: true, out: false }), capture(null, { in: true, out: true })]) {
        const lease = liveLease(role, cap);
        texts.push(...Object.values(idleCopy(lease, pageSections(lease, null))));
      }
    }
    texts.push(progressText(1, 3), doneHint(1, 3) ?? '', validateFile({ type: 'image/heic', size: 1 }) ?? '');
    for (const text of texts) expect(text).not.toMatch(banned);
  });
});

describe('validateFile', () => {
  it('accepts JPEG, PNG, and an unknown type (the service checks the file itself)', () => {
    for (const type of ['image/jpeg', 'image/png', '']) expect(validateFile({ type, size: 1000 })).toBeNull();
  });

  it('rejects other formats and photos over 25 MB before any upload', () => {
    expect(validateFile({ type: 'image/heic', size: 1000 })).toBe('Choose a JPEG or PNG photo.');
    expect(validateFile({ type: 'image/gif', size: 1000 })).toBe('Choose a JPEG or PNG photo.');
    expect(validateFile({ type: 'image/jpeg', size: 26 * 1024 * 1024 })).toContain('over 25 MB');
  });
});
