import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoEvidenceNote } from '../../components/PropertyHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ServiceError } from '../../services/errors';
import { useMutation } from '../../services/hooks';
import { useServices } from '../../services/ServiceContext';
import type { CaptureState, PhotoPhase, ProofLink } from '../../services/types';
import { useLeaseContext } from '../lease/LeaseLayout';
import { offersSamplePhotos, samplePhotoUrl } from './samplePhotos';
import {
  ACCEPT_ATTR,
  analysisCopy,
  capturePhaseCopy,
  doneHint,
  idleCopy,
  pageSections,
  progressText,
  shotRows,
  uploadCount,
  validateFile,
  type AnalysisSection as AnalysisSectionKind,
  type ShotRow,
} from './describeCapture';

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Recorded {
  phase: PhotoPhase;
  proof?: ProofLink;
}

/**
 * Move-in and move-out photos, one shot at a time, then (landlord) the AI comparison.
 * Rendered at /leases/:leaseId/photos; everything comes from the lease context.
 */
export function PhotoCapturePage() {
  const { lease, proposal } = useLeaseContext();
  const sections = pageSections(lease, proposal);
  // Kept at page level: committing closes the phase, which removes the capture section.
  const [recorded, setRecorded] = useState<Recorded | null>(null);

  const phase = sections.capturePhase;
  const idle = idleCopy(lease, sections);
  const { title, lead } = phase
    ? capturePhaseCopy(phase)
    : sections.analysis
      ? { title: 'Photo comparison', lead: 'Move-in and move-out photos are recorded.' }
      : { title: idle.title, lead: idle.body };

  return (
    <div className="review stack">
      <Link className="back-link" to={`/leases/${lease.id}`}>
        <BackIcon />
        Back to overview
      </Link>
      <div className="page-title">
        <h1 className="page-title__heading" tabIndex={-1}>
          {title}
        </h1>
        <p className="review-property">{lease.property.label}</p>
        <p className="lead">{lead}</p>
        <DemoEvidenceNote lease={lease} />
      </div>

      {recorded && (
        <section className="proof" aria-label="Photos recorded">
          <h2 className="proof__title">{recorded.phase === 'in' ? 'Move-in photos recorded' : 'Move-out photos recorded'}</h2>
          {recorded.proof && (
            <ul className="proof__list">
              <li className="proof__item">
                <span>{recorded.proof.label}</span>
                <a
                  href={recorded.proof.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View proof: ${recorded.proof.label} (opens the block explorer)`}
                >
                  View proof
                </a>
              </li>
            </ul>
          )}
        </section>
      )}

      {phase && lease.capture && (
        <CaptureSection key={phase} capture={lease.capture} phase={phase} onRecorded={(proof) => setRecorded({ phase, proof })} />
      )}

      {sections.analysis && <AnalysisSection section={sections.analysis} />}

      {!phase && !sections.analysis && sections.reviewReady && (
        <div className="button-row">
          <Link className="button button--primary" to={`/leases/${lease.id}/review`}>
            See the report
          </Link>
        </div>
      )}
    </div>
  );
}

function CaptureSection({ capture, phase, onRecorded }: { capture: CaptureState; phase: PhotoPhase; onRecorded: (proof?: ProofLink) => void }) {
  const { service } = useServices().bundle;
  const { lease, reloadNow } = useLeaseContext();
  const upload = useMutation();
  const commit = useMutation();
  const [activeShot, setActiveShot] = useState<string | null>(null);
  const [fileError, setFileError] = useState<{ shotId: string; message: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const rows = shotRows(capture, phase);
  const { uploaded, total } = uploadCount(capture, phase);
  const hint = doneHint(uploaded, total);
  const busy = upload.pending || commit.pending;
  const phaseName = phase === 'in' ? 'move-in' : 'move-out';
  const current = rows.find((row) => row.shot.id === selected) ?? rows.find((row) => !row.photo) ?? rows[0];

  const onFile = async (shotId: string, file: File) => {
    const invalid = validateFile(file);
    if (invalid) {
      setFileError({ shotId, message: invalid });
      return;
    }
    setFileError(null);
    setActiveShot(shotId);
    const wasEmpty = !rows.find((row) => row.shot.id === shotId)?.photo;
    const ok = await upload.run(async () => {
      await service.uploadPhoto(lease.id, phase, shotId, file);
      await reloadNow(); // the new photo and count come back from the server
    });
    setActiveShot(null);
    // A first photo moves on to the next missing spot. A retake stays put so the new preview is what you see.
    setSelected(ok && wasEmpty ? null : shotId);
  };

  const [sampleProgress, setSampleProgress] = useState<number | null>(null);
  const canUseSamples = offersSamplePhotos(capture.shots) && (uploaded < total || sampleProgress !== null);
  const addSamplePhotos = async () => {
    setFileError(null);
    await upload.run(async () => {
      try {
        // One shot at a time: the server serialises uploads per lease.
        for (const [i, row] of rows.entries()) {
          setSampleProgress(i);
          setActiveShot(row.shot.id);
          const res = await fetch(samplePhotoUrl(row.shot.id, phase));
          if (!res.ok) throw new ServiceError('service_failure', "The sample photos didn't load. Try again.", true);
          await service.uploadPhoto(lease.id, phase, row.shot.id, await res.blob());
        }
      } finally {
        setSampleProgress(null);
        setActiveShot(null);
        await reloadNow();
      }
    });
  };

  const closeDialog = () => {
    setConfirming(false);
    if (commit.error) void reloadNow(); // e.g. already recorded elsewhere: show the current state
    commit.clearError();
  };

  return (
    <section className="stack" aria-label={`${phaseName} photos`}>
      <p role="status" className="section-title">
        {progressText(uploaded, total)}
      </p>

      {upload.error && (
        <div role="alert" className="callout callout--problem">
          <p>{upload.error.message}</p>
        </div>
      )}

      {current && (
        <ShotCard
          key={current.shot.id}
          row={current}
          position={rows.indexOf(current) + 1}
          count={rows.length}
          phase={phase}
          disabled={busy}
          uploading={activeShot === current.shot.id}
          fileError={fileError?.shotId === current.shot.id ? fileError.message : undefined}
          onFile={(file) => void onFile(current.shot.id, file)}
        />
      )}

      <section aria-label="Required shots" className="checklist">
        <h2 className="checklist__title">Required shots</h2>
        <ul className="checklist__list">
          {rows.map((row) => (
            <li key={row.shot.id}>
              <button
                type="button"
                className="checklist__item"
                aria-current={current?.shot.id === row.shot.id ? 'true' : undefined}
                onClick={() => setSelected(row.shot.id)}
              >
                <span className={`checklist__mark${row.photo ? ' checklist__mark--done' : ''}`} aria-hidden="true">
                  {row.photo ? '✓' : ''}
                </span>
                <span className="checklist__text">
                  <span className="checklist__room">{row.shot.room}</span>
                  <span className="checklist__label">{row.shot.label}</span>
                </span>
                <span className="checklist__state">{row.photo ? 'Done' : 'Needed'}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {canUseSamples && (
        <div className="surface stack--tight">
          <p className="small">No room to photograph? Use our sample photos for every spot. You can still retake any of them.</p>
          <div className="button-row">
            <button type="button" className="button" disabled={busy} aria-busy={sampleProgress !== null} onClick={() => void addSamplePhotos()}>
              {sampleProgress !== null ? `Adding sample photos… ${sampleProgress + 1} of ${rows.length}` : 'Use sample photos'}
            </button>
          </div>
        </div>
      )}

      <div className="surface stack--tight">
        {hint && <p className="muted">{hint}</p>}
        <div className="button-row">
          <button type="button" className="button button--primary" disabled={hint !== null || busy || total === 0} onClick={() => setConfirming(true)}>
            Done
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Record ${phaseName} photos?`}
        confirmLabel="Record photos"
        busyLabel="Recording…"
        busy={commit.pending}
        error={commit.error && <p>{commit.error.message}</p>}
        onCancel={closeDialog}
        onConfirm={async () => {
          let proof: ProofLink | undefined;
          const ok = await commit.run(async () => {
            proof = (await service.commitPhotos(lease.id, phase)).proof;
            await reloadNow();
          });
          if (ok) {
            setConfirming(false);
            onRecorded(proof);
          }
        }}
      >
        <p>
          This saves all {total} photos as the {phaseName} record. You can't change them afterward.
        </p>
      </ConfirmDialog>
    </section>
  );
}

function ShotCard({
  row,
  position,
  count,
  phase,
  disabled,
  uploading,
  fileError,
  onFile,
}: {
  row: ShotRow;
  position: number;
  count: number;
  phase: PhotoPhase;
  disabled: boolean;
  uploading: boolean;
  fileError?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const { shot, photo } = row;
  const phaseLabel = phase === 'in' ? 'Move-in' : 'Move-out';

  return (
    <article className="surface stack--tight" aria-labelledby={titleId}>
      <p className="shot__count">
        Shot {position} of {count}
      </p>
      <h2 id={titleId} className="section-title">
        {shot.room}
      </h2>
      <p>{shot.label}</p>
      <div className="compare__frame shot__frame">
        {photo ? (
          <img className="compare__img" src={photo.src} alt={`${phaseLabel} photo: ${shot.room}, ${shot.label}`} />
        ) : (
          <span>No photo yet</span>
        )}
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={ACCEPT_ATTR}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ''; // picking the same file again still fires a change
          if (file) onFile(file);
        }}
      />
      {fileError && (
        <p id={errorId} className="field__error" role="alert">
          {fileError}
        </p>
      )}
      <div className="button-row">
        <button
          type="button"
          className={`button button--hero${photo ? '' : ' button--primary'}`}
          disabled={disabled}
          aria-busy={uploading}
          aria-describedby={fileError ? errorId : undefined}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : photo ? 'Retake photo' : 'Take or choose photo'}
        </button>
        {uploading && (
          <span role="status" className="sr-only">
            Uploading the {shot.room} photo
          </span>
        )}
      </div>
    </article>
  );
}

function AnalysisSection({ section }: { section: Exclude<AnalysisSectionKind, null> }) {
  const { service } = useServices().bundle;
  const { lease, reloadNow } = useLeaseContext();
  const { run, pending, error } = useMutation();
  const titleId = useId();
  const analysis = lease.analysis!;
  const copy = analysisCopy(analysis, section, lease.viewer.role);

  return (
    <section className="surface stack--tight" aria-labelledby={titleId}>
      <h2 id={titleId} className="section-title">
        {copy.title}
      </h2>
      {section === 'failed' ? (
        <div role="alert" className="callout callout--problem">
          <p>{copy.body}</p>
        </div>
      ) : (
        <p role={section === 'running' ? 'status' : undefined}>{copy.body}</p>
      )}
      {error && (
        <div role="alert" className="callout callout--problem">
          <p>{error.message}</p>
        </div>
      )}
      {copy.button && (
        <div className="button-row">
          <button
            type="button"
            className="button button--primary"
            disabled={pending}
            aria-busy={pending}
            onClick={() =>
              void run(async () => {
                await service.startReport(lease.id);
                await reloadNow(); // the lease moves to "comparing"; polling takes over
              })
            }
          >
            {pending ? 'Starting…' : copy.button}
          </button>
        </div>
      )}
    </section>
  );
}
