import { useId, useRef } from 'react';
import { EnlargeButton } from '../../components/PhotoPair';
import { titleCase } from '../../lib/labels';
import type { PhotoPhase } from '../../services/types';
import { ACCEPT_ATTR, type ShotRow } from './describeCapture';
import { guideForShot, REFERENCE_CREDIT } from './referenceGuides';

interface GuidedStepProps {
  row: ShotRow;
  /** The same spot's saved move-in photo. During move-out it is the reference. */
  moveInPhoto?: { src: string };
  position: number;
  count: number;
  phase: PhotoPhase;
  disabled: boolean;
  uploading: boolean;
  fileError?: string;
  onFile: (file: File) => void;
}

/**
 * One guided capture step: a reference on the left (the example photo during move-in, your own move-in photo
 * during move-out) and your photo on the right. On phones they stack, reference first. The reference is
 * guidance only: it is never uploaded and never evidence. Your photo is the one saved on the server.
 */
export function GuidedStep({ row, moveInPhoto, position, count, phase, disabled, uploading, fileError, onFile }: GuidedStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const errorId = useId();
  const { shot, photo } = row;
  const guide = guideForShot(shot);
  const spot = titleCase(shot.label);
  const phaseLabel = phase === 'in' ? 'Move-In' : 'Move-Out';

  // Reference: during move-out the actual move-in photo; during move-in the example photo for this spot.
  const reference =
    phase === 'out' && moveInPhoto
      ? { src: moveInPhoto.src, alt: `Your move-in photo: ${spot}`, own: true }
      : guide
        ? { src: guide.src, alt: guide.alt, own: false }
        : null;

  return (
    <article className="step surface" aria-labelledby={titleId}>
      <p className="shot__count">
        Photo {position} of {count}
      </p>
      <h2 id={titleId} className="section-title">
        {spot}
      </h2>
      <p className="step__rule">Match the reference angle and framing.</p>
      {phase === 'out' && moveInPhoto ? (
        <p className="step__hint">Stand where you stood for the move-in photo and line up the same landmarks.</p>
      ) : (
        guide && <p className="step__hint">{guide.landmarks}</p>
      )}

      <div className={`step__pair${reference ? '' : ' step__pair--single'}`}>
        {reference && (
          <figure className="step__panel">
            <figcaption className="step__caption">Reference Photo</figcaption>
            <div className="step__frame">
              <img className="step__img" src={reference.src} alt={reference.alt} />
            </div>
            <EnlargeButton src={reference.src} alt={reference.alt} title="Reference photo" />
            {reference.own ? (
              <p className="step__note">Your saved move-in photo of this spot.</p>
            ) : (
              guide && (
                <p className="step__note">
                  Example apartment interior, not Park La Brea. Photo:{' '}
                  <a href={guide.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {REFERENCE_CREDIT.author}
                  </a>
                  ,{' '}
                  <a href={REFERENCE_CREDIT.licenseUrl} target="_blank" rel="noopener noreferrer">
                    {REFERENCE_CREDIT.license}
                  </a>
                  . {REFERENCE_CREDIT.modification}
                </p>
              )
            )}
          </figure>
        )}

        <figure className="step__panel">
          <figcaption className="step__caption">Your Photo</figcaption>
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
          {photo ? (
            <>
              <div className="step__frame">
                <img className="step__img" src={photo.src} alt={`${phaseLabel} photo: ${spot}`} />
              </div>
              <div className="step__actions">
                <button
                  type="button"
                  className="button"
                  disabled={disabled}
                  aria-busy={uploading}
                  aria-describedby={fileError ? errorId : undefined}
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading ? 'Uploading…' : 'Retake / Replace'}
                </button>
                <EnlargeButton src={photo.src} alt={`${phaseLabel} photo: ${spot}`} title="Your photo" />
              </div>
            </>
          ) : (
            <button
              type="button"
              className="step__upload"
              disabled={disabled}
              aria-busy={uploading}
              aria-describedby={fileError ? errorId : undefined}
              onClick={() => inputRef.current?.click()}
            >
              <span className="step__upload-icon" aria-hidden="true">
                +
              </span>
              <span>{uploading ? 'Uploading…' : 'Take or Choose Photo'}</span>
            </button>
          )}
          {fileError && (
            <p id={errorId} className="field__error" role="alert">
              {fileError}
            </p>
          )}
          {uploading && (
            <span role="status" className="sr-only">
              Uploading the {spot} photo
            </span>
          )}
        </figure>
      </div>
    </article>
  );
}
