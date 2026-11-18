import { DEMO_PEOPLE, DEMO_PROPERTY } from '../demo/demoProperty';
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
      {isExample && (
        <img className="property__thumb" src={DEMO_PROPERTY.image.src} alt={DEMO_PROPERTY.image.alt} width={72} height={72} />
      )}
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

/** Plain statement of what is real and what is demo, plus the full photo credit. Static text, not a control. */
export function ExampleNote() {
  const credit = DEMO_PROPERTY.image.credit;
  return (
    <section className="about" aria-labelledby="about-example">
      <h2 id="about-example" className="about__title">
        About this example
      </h2>
      <p>
        {DEMO_PROPERTY.name} ({DEMO_PROPERTY.address}) is a real community used only as an example location (
        <a href={DEMO_PROPERTY.officialUrl} target="_blank" rel="noopener noreferrer">
          official site
        </a>
        ). The lease, deposit and people are fictional: {DEMO_PEOPLE.tenantName} and {DEMO_PEOPLE.landlordName} are demo participants, not the
        property's owner or residents. No unit, rent or availability is claimed. Inspection photos are staged demo evidence, not documented
        conditions at this property.
      </p>
      <p>
        Property photo: “{credit.title}” by{' '}
        <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
          {credit.author}
        </a>
        , Wikimedia Commons,{' '}
        <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">
          {credit.license}
        </a>
        . {credit.modification}
      </p>
    </section>
  );
}

/** One line wherever staged inspection photos appear: they are demo evidence, not this property's documented conditions. */
export function DemoEvidenceNote({ lease }: { lease: Lease }) {
  if (!lease.property.isExample) return null;
  return <p className="property__meta">Staged demo photos, not documented conditions at {lease.property.label}.</p>;
}
