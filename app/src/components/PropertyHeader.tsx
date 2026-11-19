import type { Lease } from '../services/types';

/** Simple building mark used until a genuine photo is supplied. Decorative; the property name carries the meaning. */
export function BuildingIcon() {
  return (
    <svg className="property__thumb property__thumb--icon" viewBox="0 0 72 72" width={72} height={72} aria-hidden="true" focusable="false">
      <rect x="20" y="12" width="32" height="48" rx="2" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M14 60h44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <g fill="currentColor">
        <rect x="27" y="20" width="6" height="6" />
        <rect x="39" y="20" width="6" height="6" />
        <rect x="27" y="32" width="6" height="6" />
        <rect x="39" y="32" width="6" height="6" />
        <rect x="27" y="44" width="6" height="6" />
        <rect x="39" y="44" width="6" height="6" />
      </g>
    </svg>
  );
}

/**
 * Small property context: thumbnail, short name, address (when there is one). Example properties get a compact
 * label and a photo credit; any other address is shown as stored, without an image.
 */
export function PropertyHeader({ lease, other, headingLevel = 1 }: { lease: Pick<Lease, 'property'>; other?: string; headingLevel?: 1 | 2 }) {
  const { label, address, isExample, image, credit, type, icon } = lease.property;
  return (
    <section className="property" aria-label="Property">
      {icon === 'building' && !image && <BuildingIcon />}
      {image && <img className="property__thumb" src={image.src} alt={image.alt} width={72} height={72} />}
      <div className="property__text">
        {headingLevel === 1 ? (
          <h1 className="property__name" tabIndex={-1}>
            {label}
          </h1>
        ) : (
          <h2 className="property__name">{label}</h2>
        )}
        {address && <p className="property__address">{address}</p>}
        {other && <p className="property__meta">{other}</p>}
        {type && <p className="property__meta">{type}</p>}
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
