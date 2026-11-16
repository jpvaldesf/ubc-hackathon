import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { SiteTop } from './components/SiteTop';
import { LeaseLayout } from './features/lease/LeaseLayout';
import { PhotoCapturePage } from './features/photos/PhotoCapturePage';
import { OverviewPage } from './features/overview/OverviewPage';
import { ReviewPage } from './features/review/ReviewPage';
import { ServiceProvider, useServices } from './services/ServiceContext';

function Home() {
  const { bundle } = useServices();
  if (bundle.defaultLeaseId) return <Navigate to={`/leases/${bundle.defaultLeaseId}`} replace />;
  return <OpenLease />;
}

/** Live mode: the API has no lease list, so open a lease by the id the server issued (e.g. l_7f3a). */
function OpenLease() {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const valid = /^[A-Za-z0-9_-]+$/.test(id.trim());
  return (
    <>
      <SiteTop />
      <main id="main" className="main" tabIndex={-1}>
        <div className="page stack">
          <h1 className="page-title__heading">Open a deposit</h1>
          <form
            className="stack--tight"
            onSubmit={(event) => {
              event.preventDefault();
              if (valid) navigate(`/leases/${id.trim()}`);
            }}
          >
            <label htmlFor="lease-id">Lease id from the server</label>
            <input id="lease-id" className="field__control field__control--short" value={id} autoComplete="off" onChange={(e) => setId(e.target.value)} />
            <div className="button-row">
              <button type="submit" className="button button--primary" disabled={!valid}>
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
