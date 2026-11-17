import { pluralize } from '../../lib/format';
import type { AnalysisState, CaptureState, Lease, PhotoPhase, PhotoShot, Proposal, Role, UploadedPhoto } from '../../services/types';

/** The server accepts JPEG and PNG only (checked again by magic bytes in the service). */
export const ACCEPTED_TYPES: readonly string[] = ['image/jpeg', 'image/png'];
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',');
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

export interface ShotRow {
  shot: PhotoShot;
  photo?: UploadedPhoto;
}

/** One row per shot on the lease's list, with the photo already uploaded for it (if any). */
export function shotRows(capture: CaptureState, phase: PhotoPhase): ShotRow[] {
  const byShot = new Map(capture.photos[phase].map((photo) => [photo.shotId, photo]));
  return capture.shots.map((shot) => ({ shot, photo: byShot.get(shot.id) }));
}

/** How many shots on the list have a photo. Photos for shots not on the list are not counted. */
export function uploadCount(capture: CaptureState, phase: PhotoPhase): { uploaded: number; total: number } {
  const rows = shotRows(capture, phase);
  return { uploaded: rows.filter((row) => row.photo).length, total: rows.length };
}

export type AnalysisSection = 'running' | 'failed' | 'start' | null;

export interface PageSections {
  /** False in sample mode, where the lease carries no capture data. */
  available: boolean;
  /** The phase taking photos right now, or null. */
  capturePhase: PhotoPhase | null;
  analysis: AnalysisSection;
  /** Only the landlord can start (or retry) the comparison. */
  canRunAnalysis: boolean;
  /** A report exists and nothing on this screen is open: point to the review. */
  reviewReady: boolean;
}

/**
 * Which parts of the screen to show. Capture shows only while a phase is open. The comparison has its
 * own section because it starts after move-out photos are locked, when no phase is open any more.
 */
export function pageSections(lease: Lease, proposal: Proposal | null): PageSections {
  const capturePhase = lease.capture?.openPhase ?? null;
  const analysis = lease.analysis;
  let section: AnalysisSection = null;
  if (analysis?.state === 'running') section = 'running';
  else if (analysis?.error) section = 'failed';
  else if (analysis?.canStart) section = 'start';
  return {
    available: lease.capture !== undefined,
    capturePhase,
    analysis: section,
    canRunAnalysis: analysis?.canStart ?? false,
    reviewReady: proposal !== null && capturePhase === null && section === null,
  };
}

export function capturePhaseCopy(phase: PhotoPhase): { title: string; lead: string } {
  return phase === 'in'
    ? {
        title: 'Move-in photos',
        lead: 'Take one photo of each spot on the list. Together they record the condition of the home on move-in day.',
      }
    : {
        title: 'Move-out photos',
        lead: 'Take the same spots from the same angle as at move-in, so each pair can be compared.',
      };
}

export function progressText(uploaded: number, total: number): string {
  return `${uploaded} of ${total} photos added`;
}

/** Why Done is not available yet, or null when every shot has a photo. */
export function doneHint(uploaded: number, total: number): string | null {
  const missing = total - uploaded;
  return missing > 0 ? `Add ${pluralize(missing, 'more photo')} to finish.` : null;
}

export interface AnalysisCopy {
  title: string;
  body: string;
  /** Present only when this viewer can act. */
  button?: string;
}

export function analysisCopy(analysis: AnalysisState, section: Exclude<AnalysisSection, null>, role: Role): AnalysisCopy {
  switch (section) {
    case 'running': {
      const progress = analysis.progress;
      if (!progress) return { title: 'Comparing photos', body: 'Comparing move-in and move-out photos…' };
      const room = progress.currentRoom ? ` Now checking: ${progress.currentRoom}.` : '';
      return {
        title: 'Comparing photos',
        body: `Comparing photos: ${progress.shotsDone} of ${progress.shotsTotal} done.${room}`,
      };
    }
    case 'failed':
      return {
        title: "The comparison didn't finish",
        body: role === 'landlord' ? (analysis.error ?? 'Something went wrong.') : `${analysis.error ?? 'Something went wrong.'} Your landlord can try again.`,
        button: analysis.canStart ? 'Try again' : undefined,
      };
    case 'start':
      return {
        title: 'Compare the photos',
        body: 'Compares each move-in photo with its move-out photo and drafts a report. You review the draft before anything is sent.',
        button: analysis.canStart ? 'Analyze photos' : undefined,
      };
  }
}

/** What the screen says when nothing here is open. */
export function idleCopy(lease: Lease, sections: PageSections): { title: string; body: string } {
  if (!sections.available) return { title: 'Nothing to photograph right now', body: "Taking photos isn't available in this preview." };
  const tenant = lease.viewer.role === 'tenant';
  if (sections.reviewReady) {
    return {
      title: 'Report ready',
      body: tenant
        ? 'The photos have been compared. Your landlord reviews the report before sending it to you.'
        : 'The photos have been compared and the report is ready for your review.',
    };
  }
  const committed = lease.capture!.committed;
  if (committed.out) {
    return {
      title: 'Photos recorded',
      body: tenant
        ? 'Move-in and move-out photos are recorded. Waiting on your landlord to compare them.'
        : 'Move-in and move-out photos are recorded.',
    };
  }
  if (committed.in) return { title: 'Move-in photos recorded', body: 'Move-out photos open when move-out starts.' };
  return { title: 'Nothing to photograph yet', body: 'Photos open once the deposit is paid.' };
}

/** A friendly message before any upload, or null. An empty type passes: the service checks the bytes. */
export function validateFile(file: { type: string; size: number }): string | null {
  if (file.type !== '' && !ACCEPTED_TYPES.includes(file.type)) return 'Choose a JPEG or PNG photo.';
  if (file.size > MAX_PHOTO_BYTES) return 'This photo is over 25 MB. Choose a smaller one.';
  return null;
}
