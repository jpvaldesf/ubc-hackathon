import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { SiteTop } from './components/SiteTop';
import { LeaseLayout } from './features/lease/LeaseLayout';
import { PhotoCapturePage } from './features/photos/PhotoCapturePage';
import { OverviewPage } from './features/overview/OverviewPage';
import { ReviewPage } from './features/review/ReviewPage';
import { ServiceProvider, useServices } from './services/ServiceContext';
import { useMutation } from './services/hooks';

function Home() {
  const { bundle } = useServices();
  if (bundle.defaultLeaseId) return <Navigate to={`/leases/${bundle.defaultLeaseId}`} replace />;
  return <OpenLease />;
}

/**
 * Live mode home. A judge or new visitor has no lease id, so the main action creates a fresh demo deposit
 * (one real testnet tx) and opens it as the tenant, at Pay deposit. Opening an existing lease by id stays as
 * a secondary option for the team.
 */
function OpenLease() {
  const navigate = useNavigate();
  const { bundle } = useServices();
  const { run, pending, error } = useMutation();
  const [id, setId] = useState('');
  const valid = /^[A-Za-z0-9_-]+$/.test(id.trim());
  const start = () =>
    void run(async () => {
      const { leaseId } = await bundle.service.createDemoLease();
      bundle.live?.setUserId('tenant_demo');
      navigate(`/leases/${leaseId}`);
    });
  return (
    <>
      <SiteTop />
      <main id="main" className="main" tabIndex={-1}>
        <div className="page stack">
          <div className="stack--tight">
            <h1 className="page-title__heading">Try Deposit Keeper</h1>
            <p>
              Walk through one rental deposit from move-in to payout. You play both the tenant and the landlord: switch
              between them with the buttons at the top.
            </p>
          </div>
          <ol className="stack--tight home-steps">
            <li>
              <strong>Tenant:</strong> pay the $10 deposit into escrow.
            </li>
            <li>
              <strong>Tenant:</strong> take the move-in photos, then the move-out photos.
            </li>
            <li>
              <strong>Landlord:</strong> compare the photos and review the AI report, then send it.
            </li>
            <li>
              <strong>Tenant:</strong> the undisputed part comes back right away. Accept or dispute the rest.
            </li>
          </ol>
          {error && (
            <div role="alert" className="callout callout--problem">
              <p>{error.message}</p>
            </div>
          )}
          <div className="button-row">
            <button type="button" className="button button--hero button--primary" disabled={pending} aria-busy={pending} onClick={start}>
              {pending ? 'Setting up your deposit…' : 'Start a demo deposit'}
            </button>
          </div>
          <p className="small muted">Each step is recorded on a test network, with a proof link. No real money moves.</p>
          <form
            className="stack--tight"
            onSubmit={(event) => {
              event.preventDefault();
              if (valid) navigate(`/leases/${id.trim()}`);
            }}
          >
            <label htmlFor="lease-id">Or open an existing deposit by its id</label>
            <input id="lease-id" className="field__control field__control--short" value={id} autoComplete="off" onChange={(e) => setId(e.target.value)} />
            <div className="button-row">
              <button type="submit" className="button" disabled={!valid}>
                Open
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

function NotFound() {
  return (
    <>
      <SiteTop />
      <main id="main" className="main" tabIndex={-1}>
        <div className="page stack">
          <h1 className="page-title__heading">We can't find that page</h1>
          <p>
            <a href="/">Go to your deposit</a>
          </p>
        </div>
      </main>
    </>
  );
}

export default function App() {
  return (
    <ServiceProvider>
      <BrowserRouter>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leases/:leaseId" element={<LeaseLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="photos" element={<PhotoCapturePage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ServiceProvider>
  );
}
