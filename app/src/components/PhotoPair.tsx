import { useEffect, useId, useRef, useState } from 'react';
import type { Photo, PhotoPair as PhotoPairData } from '../services/types';

/** A real photo with visible loading and failure states. Nothing is substituted when it can't load. */
function RemotePhoto({ photo }: { photo: Extract<Photo, { kind: 'image' }> }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  return (
    <>
      {state === 'loading' && <span role="status">Loading photo…</span>}
      {state === 'error' && (
        <span role="alert">
          Couldn't load this photo.{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setState('loading');
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </span>
      )}
      {state !== 'error' && (
        <img
          key={attempt}
          className={`compare__img${state === 'loaded' ? '' : ' compare__img--pending'}`}
          src={photo.src}
          alt={photo.alt}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
        />
      )}
    </>
  );
}

/** Full-size view in a native dialog: Escape or the Close button dismisses it, and the page never scrolls sideways. */
export function Enlarged({ photo, title, onClose }: { photo: Extract<Photo, { kind: 'image' }>; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog ref={ref} className="dialog dialog--photo" aria-labelledby={titleId} onClose={onClose}>
      <div className="dialog__content">
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        <img className="enlarged__img" src={photo.src} alt={photo.alt} />
        <div className="button-row">
          <button type="button" className="button button--primary" onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Region({ title, photo }: { title: string; photo: Photo }) {
  const [enlarged, setEnlarged] = useState(false);
  return (
    <figure className="compare__region">
      <figcaption className="compare__label">{title}</figcaption>
      {photo.kind === 'image' ? (
        <div className="compare__frame">
          <RemotePhoto photo={photo} />
          <button type="button" className="compare__enlarge" onClick={() => setEnlarged(true)}>
            Enlarge<span className="sr-only"> {title} photo</span>
          </button>
          {enlarged && <Enlarged photo={photo} title={`${title} photo`} onClose={() => setEnlarged(false)} />}
        </div>
      ) : (
        <div className="compare__frame" role="img" aria-label={photo.alt}>
          <span aria-hidden="true">No photo attached</span>
        </div>
      )}
    </figure>
  );
}

/** Matched evidence for one finding: the same spot at move-in and at move-out, side by side and compact. */
export function PhotoPair({ pair }: { pair: PhotoPairData }) {
  return (
    <div className="compare">
      <Region title="Move-In" photo={pair.moveIn} />
      <Region title="Move-Out" photo={pair.moveOut} />
    </div>
  );
}

/** A button that opens the image full size. Used by the capture steps for both the reference and the saved photo. */
export function EnlargeButton({ src, alt, title }: { src: string; alt: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="compare__enlarge" onClick={() => setOpen(true)}>
        Enlarge<span className="sr-only"> {title}</span>
      </button>
      {open && <Enlarged photo={{ kind: 'image', src, alt, caption: title }} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
