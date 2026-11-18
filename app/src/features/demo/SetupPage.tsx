import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LifecycleStatus } from '../../components/LifecycleTimeline';
import { SiteTop } from '../../components/SiteTop';
import { DEMO_PEOPLE, EXAMPLE_APARTMENT } from '../../demo/demoProperty';
import { useMutation } from '../../services/hooks';
import { useServices } from '../../services/ServiceContext';

const JOURNEYS = {
  tenant: {
    title: 'Tenant journey',
    steps: [
      { text: 'Jane Doe creates the lease', demo: true },
      { text: 'You pay the $10 deposit' },
      { text: 'You take the move-in photos' },
      { text: 'The lease is active' },
      { text: 'You take the move-out photos' },
      { text: 'Jane Doe runs the comparison and sends the report', demo: true },
      { text: 'You review it, then accept or dispute' },
      { text: 'Settlement' },
    ],
    button: 'Create the lease (simulated landlord)',
    note: `Step 1 belongs to ${DEMO_PEOPLE.landlordName}, so the demo performs it for them when you press the button.`,
  },
  landlord: {
    title: 'Landlord journey',
    steps: [
      { text: 'You create the lease' },
      { text: 'John Doe pays the $10 deposit', demo: true },
      { text: 'Move-in photos are taken' },
      { text: 'The lease is active' },
      { text: 'Move-out photos are taken' },
      { text: 'You run the comparison and review the findings' },
      { text: 'You send the report' },
      { text: 'John Doe accepts or disputes', demo: true },
      { text: 'Settlement' },
    ],
    button: 'Create lease',
    note: `${DEMO_PEOPLE.tenantName}'s steps are simulated with Demo only controls, and only when you press them.`,
  },
} as const;

/**
 * Live mode home. Every demo session starts here, at Setup, with no lease yet. Nothing happens until the
 * button is pressed: switching role or restarting never creates a lease or moves money by itself.
 */
export function SetupPage() {
  const navigate = useNavigate();
  const { bundle, demo } = useServices();
  const { run, pending, error } = useMutation();
  const [id, setId] = useState('');
  const valid = /^[A-Za-z0-9_-]+$/.test(id.trim());
  const role = demo.session.role;
  const journey = JOURNEYS[role];

  const create = () =>
    void run(async () => {
      const leaseId = await demo.startLease();
      // null: this session was replaced while the lease was being created. Stay put; the lease is archived.
      if (leaseId) navigate(`/leases/${leaseId}`);
    });

  return (
    <>
      <SiteTop />
      <main id="main" className="main" tabIndex={-1}>
        <div className="page stack">
          <div className="stack--tight">
            <h1 className="page-title__heading">{journey.title}</h1>
            <p className="muted">
              {EXAMPLE_APARTMENT.name} · fictional demo lease · you are {role === 'tenant' ? DEMO_PEOPLE.tenantName : DEMO_PEOPLE.landlordName}
            </p>
          </div>
          <LifecycleStatus stage="setup" complete={false} />
          <ol className="journey">
            {journey.steps.map((step) => (
              <li key={step.text} className="journey__step">
                {step.text}
                {'demo' in step && <span className="journey__tag">Demo only</span>}
              </li>
            ))}
          </ol>
          <p className="small muted">{journey.note} Nothing is paid or created until you press a button, and switching role or restarting never does it for you.</p>
          {error && (
            <div role="alert" className="callout callout--problem">
              <p>{error.message}</p>
            </div>
          )}
          <div className="button-row">
            <button type="button" className="button button--hero button--primary" disabled={pending || demo.starting} aria-busy={pending} onClick={create}>
              {pending || demo.starting ? 'Creating the lease…' : journey.button}
            </button>
          </div>

          {demo.archive.length > 0 && (
            <section className="stack--tight" aria-label="Earlier demo sessions">
              <h2 className="activity__title">Earlier sessions</h2>
              <p className="small muted">Kept as they were: their leases, photos and transactions are not deleted.</p>
              <ul className="journey journey--plain">
                {demo.archive.slice(0, 5).map((a) => (
                  <li key={a.leaseId}>
                    <Link
                      to={`/leases/${a.leaseId}`}
                      onClick={() => {
                        demo.adoptLease(a.leaseId, a.role);
                      }}
                    >
                      {a.role === 'tenant' ? 'Tenant' : 'Landlord'} session · {a.leaseId}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
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
            <label htmlFor="lease-id">Or open an existing lease by its id</label>
            <input id="lease-id" className="field__control field__control--short" value={id} autoComplete="off" onChange={(e) => setId(e.target.value)} />
            <div className="button-row">
              <button type="submit" className="button" disabled={!valid || !bundle.live}>
                Open
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
