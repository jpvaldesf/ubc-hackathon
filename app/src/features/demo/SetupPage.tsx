import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Disclosure } from '../../components/Disclosure';
import { LifecycleStatus } from '../../components/LifecycleTimeline';
import { SiteTop } from '../../components/SiteTop';
import { PropertyHeader } from '../../components/PropertyHeader';
import { DEMO_PEOPLE, MARKS_TOWER, propertyFromAddress } from '../../demo/demoProperty';
import { useMutation } from '../../services/hooks';
import { DEMO_LEASE } from '../../services/live/demoLease';
import { useServices } from '../../services/ServiceContext';

const DEPOSIT = `$${(DEMO_LEASE.deposit_cents / 100).toFixed(2)}`;

/** The property, as a small summary shared by the tenant's invitation and the landlord's lease details. */
function PropertySummary({ person }: { person: string }) {
  return (
    <>
      <PropertyHeader lease={{ property: propertyFromAddress(MARKS_TOWER.address) }} other={person} headingLevel={2} />
    </>
  );
}

/**
 * Setup, in the viewing role's words. Tenant and landlord are two views of one lease, so what shows depends on
 * where that lease is:
 *  - Landlord, no lease yet: Create lease (the landlord's own step).
 *  - Tenant, no lease yet: waiting for the landlord. A collapsed demo shortcut can create it on the landlord's behalf.
 *  - Tenant, lease created: the invitation (apartment, landlord, deposit) and Review lease.
 * Nothing is created or paid by switching roles; only the buttons below do anything.
 */
export function SetupPage() {
  const navigate = useNavigate();
  const { bundle, demo } = useServices();
  const { run, pending, error } = useMutation();
  const [id, setId] = useState('');
  const valid = /^[A-Za-z0-9_-]+$/.test(id.trim());
  const role = demo.session.role;
  const leaseId = demo.session.leaseId;
  const busy = pending || demo.starting;

  const create = (simulated: boolean) =>
    void run(async () => {
      const startedAt = demo.session.startedAt;
      const created = await demo.startLease();
      // null: the demo was restarted while the lease was being created. Stay put; the lease is archived.
      if (!created) return;
      if (simulated) demo.recordSimulated(`${DEMO_PEOPLE.landlordName} created the lease`, startedAt);
      if (!simulated) navigate(`/leases/${created}`);
    });

  const details = (
    <>
      <dl className="facts">
        <div className="fact">
          <dt className="fact__label">Deposit</dt>
          <dd className="fact__value">{DEPOSIT}</dd>
        </div>
      </dl>
      <p className="small muted">Testnet demo: amounts scaled 1:100. No real money moves.</p>
    </>
  );
  const errorBox = error && (
    <div role="alert" className="callout callout--problem">
      <p>{error.message}</p>
    </div>
  );

  return (
    <>
      <SiteTop />
      <main id="main" className="main" tabIndex={-1}>
        <div className="page stack">
          {role === 'landlord' ? (
            <section className="stack" aria-labelledby="landlord-title">
              <div className="stack--tight">
                <h1 id="landlord-title" className="page-title__heading">
                  Set up a lease
                </h1>
                <p className="muted">Create the lease for your tenant, then wait for their deposit.</p>
              </div>
              <LifecycleStatus stage="setup" complete={false} />
              <PropertySummary person={`Tenant: ${DEMO_PEOPLE.tenantName}`} />
              {details}
              {errorBox}
              <div className="button-row">
                <button type="button" className="button button--hero button--primary" disabled={busy} aria-busy={busy} onClick={() => create(false)}>
                  {busy ? 'Creating the lease…' : 'Create lease'}
                </button>
              </div>
            </section>
          ) : leaseId ? (
            <section className="stack" aria-labelledby="invite-title">
              <div className="stack--tight">
                <h1 id="invite-title" className="page-title__heading">
                  You're invited
                </h1>
                <p className="muted">{DEMO_PEOPLE.landlordName} has prepared a deposit for you.</p>
              </div>
              <LifecycleStatus stage="setup" complete={false} />
              <PropertySummary person={`Landlord: ${DEMO_PEOPLE.landlordName}`} />
              {details}
              <div className="button-row">
                <button
                  type="button"
                  className="button button--hero button--primary"
                  onClick={() => {
                    demo.openInvitation();
                    navigate(`/leases/${leaseId}`);
                  }}
                >
                  Review lease
                </button>
              </div>
            </section>
          ) : (
            <section className="stack" aria-labelledby="waiting-title">
              <div className="stack--tight">
                <h1 id="waiting-title" className="page-title__heading">
                  Waiting for your landlord
                </h1>
                <p className="muted">{DEMO_PEOPLE.landlordName} has not created the lease yet.</p>
              </div>
              <LifecycleStatus stage="setup" complete={false} />
              <p>Your invitation appears here as soon as the lease exists. Switch to the landlord to create it, or open Demo controls.</p>
              {errorBox}
            </section>
          )}

          <Disclosure title="Demo controls" meta={role === 'tenant' && !leaseId ? '1 step available' : undefined} standalone>
            <div className="stack--tight">
              <p className="small muted">Demo only. Not part of the product flow. Nothing here runs until you press it.</p>
              {role === 'tenant' && !leaseId && (
                <div className="stack--tight">
                  <div className="button-row">
                    <button type="button" className="button button--hero" disabled={busy} aria-busy={busy} onClick={() => create(true)}>
                      {busy ? 'Creating the lease…' : `Demo only: ${DEMO_PEOPLE.landlordName} creates the lease`}
                    </button>
                  </div>
                  <p className="small muted">Simulated for the landlord: this sends the real create-lease request as them. It is not a payment.</p>
                </div>
              )}
              {demo.archive.length > 0 ? (
                <>
                  <p className="small">Earlier demo leases are kept as they were; their photos and transactions are not deleted.</p>
                  <ul className="journey journey--plain">
                    {demo.archive.slice(0, 5).map((a) => (
                      <li key={a.leaseId}>
                        <Link to={`/leases/${a.leaseId}`} onClick={() => demo.adoptLease(a.leaseId, a.role)}>
                          {a.role === 'tenant' ? 'Tenant' : 'Landlord'} view · {a.leaseId}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="small muted">No earlier demo leases.</p>
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
