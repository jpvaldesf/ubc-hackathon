import { useState } from 'react';
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

function Region({ title, photo }: { title: string; photo: Photo }) {
  return (
    <figure className="compare__region">
      <figcaption className="compare__label">{title}</figcaption>
      {photo.kind === 'image' ? (
        <div className="compare__frame">
          <RemotePhoto photo={photo} />
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
      <Region title="Move-in" photo={pair.moveIn} />
      <Region title="Move-out" photo={pair.moveOut} />
    </div>
  );
}
