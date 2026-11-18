import { DEMO_PROPERTY } from '../demo/demoProperty';
import type { Lease } from '../services/types';

/**
 * Small property context: thumbnail, short name, address. The example property gets a compact
 * label and a photo credit; any other address is shown as stored, without an image.
 */
export function PropertyHeader({ lease, other }: { lease: Lease; other?: string }) {
  const { label, address, isExample } = lease.property;
  const credit = DEMO_PROPERTY.image.credit;
  return (
    <section className="property" aria-label="Property">
      {isExample && <img className="property__thumb" src={DEMO_PROPERTY.image.src} alt={DEMO_PROPERTY.image.alt} width={72} height={72} />}
      <div className="property__text">
        <h1 className="property__name" tabIndex={-1}>
          {label}
        </h1>
        {address && <p className="property__address">{address}</p>}
        {other && <p className="property__meta">{other}</p>}
        {isExample && <p className="property__meta">Example property · fictional demo lease</p>}
        {isExample && (
          <a className="property__credit" href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
            Photo: {credit.author}, {credit.license}
          </a>
        )}
      </div>
    </section>
  );
}

/** One line wherever staged inspection photos appear: they are demo evidence, not this property's documented conditions. */
export function DemoEvidenceNote({ lease }: { lease: Lease }) {
  if (!lease.property.isExample) return null;
  return <p className="property__meta">Staged demo photos, not documented conditions at {lease.property.label}.</p>;
}
