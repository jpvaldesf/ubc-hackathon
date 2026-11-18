import type { Lease } from '../services/types';

/**
 * Small property context: thumbnail, short name, address (when there is one). Example properties get a compact
 * label and a photo credit; any other address is shown as stored, without an image.
 */
export function PropertyHeader({ lease, other }: { lease: Lease; other?: string }) {
  const { label, address, isExample, image, credit } = lease.property;
  return (
    <section className="property" aria-label="Property">
      {image && <img className="property__thumb" src={image.src} alt={image.alt} width={72} height={72} />}
      <div className="property__text">
        <h1 className="property__name" tabIndex={-1}>
          {label}
        </h1>
        {address && <p className="property__address">{address}</p>}
        {other && <p className="property__meta">{other}</p>}
        {isExample && <p className="property__meta">Example property · fictional demo lease</p>}
        {credit && (
          <a className="property__credit" href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
            Photo: {credit.author}, {credit.license}
          </a>
        )}
      </div>
    </section>
  );
}

/** One line wherever staged inspection photos appear. Only older demo leases have staged photos. */
export function DemoEvidenceNote({ lease }: { lease: Lease }) {
  const note = lease.property.evidenceNote;
  return note ? <p className="property__meta">{note}</p> : null;
}
