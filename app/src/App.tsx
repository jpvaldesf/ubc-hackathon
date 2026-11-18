import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SiteTop } from './components/SiteTop';
import { LeaseLayout } from './features/lease/LeaseLayout';
import { PhotoCapturePage } from './features/photos/PhotoCapturePage';
import { OverviewPage } from './features/overview/OverviewPage';
import { ReviewPage } from './features/review/ReviewPage';
import { SetupPage } from './features/demo/SetupPage';
import { ServiceProvider, useServices } from './services/ServiceContext';

function Home() {
  const { bundle, demo } = useServices();
  if (bundle.defaultLeaseId) return <Navigate to={`/leases/${bundle.defaultLeaseId}`} replace />;
  // A refresh keeps the current session and stage: its lease is reopened. A fresh session has no lease yet and shows Setup.
  if (demo.session.leaseId) return <Navigate to={`/leases/${demo.session.leaseId}`} replace />;
  return <SetupPage />;
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
