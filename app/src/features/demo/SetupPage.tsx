import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Disclosure } from '../../components/Disclosure';
import { LifecycleStatus } from '../../components/LifecycleTimeline';
import { SiteTop } from '../../components/SiteTop';
import { DEMO_PEOPLE, EXAMPLE_APARTMENT } from '../../demo/demoProperty';
import { useMutation } from '../../services/hooks';
import { DEMO_LEASE } from '../../services/live/demoLease';
import { useServices } from '../../services/ServiceContext';

const DEPOSIT = `$${(DEMO_LEASE.deposit_cents / 100).toFixed(2)}`;

/** The apartment, as a small summary shared by the tenant's invitation and the landlord's lease details. */
function ApartmentSummary({ children }: { children?: React.ReactNode }) {
  const { image, name } = EXAMPLE_APARTMENT;
  return (
    <div className="property">
      <img className="property__thumb" src={image.src} alt={image.alt} width={72} height={72} />
      <div className="property__text">
        <h2 className="property__name">{name}</h2>
        {children}
        <a className="property__credit" href={image.credit.sourceUrl} target="_blank" rel="noopener noreferrer">
          Photo: {image.credit.author}, {image.credit.license}
        </a>
      </div>
    </div>
  );
}

/**
 * Where every demo session starts (live mode), at Setup, in the role's own words.
 *  - Tenant: an invitation to an already prepared lease. The lease is prepared with the existing create-lease
 *    request (as the landlord) when the session starts. That is not a payment: the deposit is only paid when the
 *    tenant presses Pay deposit on the next screen.
 *  - Landlord: Create lease, then the property, tenant and deposit status on the lease screen.
 * Demo-only extras (earlier sessions, open by id) live in the collapsed Demo controls.
 */
export function SetupPage() {
  const navigate = useNavigate();
  const { bundle, demo } = useServices();
  const { run, pending, error } = useMutation();
  const [id, setId] = useState('');
  const valid = /^[A-Za-z0-9_-]+$/.test(id.trim());
  const role = demo.session.role;
  const tried = useRef<string | null>(null);

  const prepare = () =>
    void run(async () => {
      const leaseId = await demo.startLease();
      // null: this session was replaced while the lease was being created. Stay put; the lease is archived.
      if (leaseId && role === 'landlord') navigate(`/leases/${leaseId}`);
    });

  // A tenant's invitation is prepared once per session, automatically. A failure is shown with a retry, never retried in a loop.
  useEffect(() => {
    if (role !== 'tenant' || demo.session.leaseId || demo.starting || tried.current === demo.session.startedAt) return;
    tried.current = demo.session.startedAt;
    prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, demo.session.startedAt, demo.session.leaseId]);

  const preparing = pending || demo.starting;
  const leaseId = demo.session.leaseId;

  return (
    <>
      <SiteTop />
      <main id="main" className="main" tabIndex={-1}>
        <div className="page stack">
          {role === 'tenant' ? (
            <section className="stack" aria-labelledby="invite-title">
              <div className="stack--tight">
                <h1 id="invite-title" className="page-title__heading">
                  You're invited
                </h1>
                <p className="muted">{DEMO_PEOPLE.landlordName} has prepared a deposit for you.</p>
              </div>
              <LifecycleStatus stage="setup" complete={false} />
              <ApartmentSummary>
                <p className="property__meta">Landlord: {DEMO_PEOPLE.landlordName}</p>
                <p className="property__meta">Example property · fictional demo lease</p>
              </ApartmentSummary>
              <dl className="facts">
                <div className="fact">
                  <dt className="fact__label">Deposit</dt>
                  <dd className="fact__value">{DEPOSIT}</dd>
                </div>
              </dl>
              <p className="small muted">Testnet demo: amounts scaled 1:100. No real money moves.</p>
              {error && (
                <div role="alert" className="callout callout--problem">
                  <p>{error.message}</p>
                </div>
              )}
              <div className="button-row">
                {leaseId ? (
                  <button type="button" className="button button--hero button--primary" onClick={() => {
                      demo.openInvitation();
                      navigate(`/leases/${leaseId}`);
                    }}>
                    Review lease
                  </button>
                ) : error ? (
                  <button type="button" className="button button--hero button--primary" disabled={preparing} onClick={prepare}>
                    Try again
                  </button>
                ) : (
                  <button type="button" className="button button--hero button--primary" disabled aria-busy="true">
                    Preparing your invitation…
                  </button>
                )}
              </div>
            </section>
          ) : (
            <section className="stack" aria-labelledby="landlord-title">
              <div className="stack--tight">
                <h1 id="landlord-title" className="page-title__heading">
                  Set up a lease
                </h1>
                <p className="muted">Create the lease for your tenant, then wait for their deposit.</p>
              </div>
              <LifecycleStatus stage="setup" complete={false} />
              <ApartmentSummary>
                <p className="property__meta">Tenant: {DEMO_PEOPLE.tenantName}</p>
                <p className="property__meta">Example property · fictional demo lease</p>
              </ApartmentSummary>
              <dl className="facts">
                <div className="fact">
                  <dt className="fact__label">Deposit</dt>
                  <dd className="fact__value">{DEPOSIT}</dd>
                </div>
              </dl>
              <p className="small muted">Testnet demo: amounts scaled 1:100. Creating the lease sends the invitation; nothing is paid.</p>
              {error && (
                <div role="alert" className="callout callout--problem">
                  <p>{error.message}</p>
                </div>
              )}
              <div className="button-row">
                <button type="button" className="button button--hero button--primary" disabled={preparing} aria-busy={preparing} onClick={prepare}>
                  {preparing ? 'Creating the lease…' : 'Create lease'}
                </button>
              </div>
            </section>
          )}

          <Disclosure title="Demo controls" meta="Earlier sessions, open by id" standalone>
            <div className="stack--tight">
              <p className="small muted">Demo only. Not part of the product flow.</p>
              {demo.archive.length > 0 ? (
                <>
                  <p className="small">Earlier sessions are kept as they were; their leases, photos and transactions are not deleted.</p>
                  <ul className="journey journey--plain">
                    {demo.archive.slice(0, 5).map((a) => (
                      <li key={a.leaseId}>
                        <Link to={`/leases/${a.leaseId}`} onClick={() => demo.adoptLease(a.leaseId, a.role)}>
                          {a.role === 'tenant' ? 'Tenant' : 'Landlord'} session · {a.leaseId}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="small muted">No earlier sessions.</p>
              )}
              <form
                className="stack--tight"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (valid) {
                    demo.adoptLease(id.trim(), role);
                    navigate(`/leases/${id.trim()}`);
                  }
                }}
              >
                <label htmlFor="lease-id">Open an existing lease by its id</label>
                <input id="lease-id" className="field__control field__control--short" value={id} autoComplete="off" onChange={(e) => setId(e.target.value)} />
                <div className="button-row">
                  <button type="submit" className="button" disabled={!valid || !bundle.live}>
                    Open
                  </button>
                </div>
              </form>
            </div>
          </Disclosure>
        </div>
      </main>
    </>
  );
}
