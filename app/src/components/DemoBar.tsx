import { useNavigate } from 'react-router-dom';
import { useServices } from '../services/ServiceContext';

const OPTIONS = [
  { role: 'tenant', label: 'Tenant' },
  { role: 'landlord', label: 'Landlord' },
] as const;

function RestartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The demo bar: the Tenant / Landlord switch, centered, plus a compact Restart. In live mode the two roles are two
 * views of the SAME lease: switching keeps the lease, photos, findings and transactions, refetches with the other
 * identity and shows that role's next step. It never submits, pays, approves or advances anything. Restart is the
 * only thing that starts a fresh demo (the old lease record is kept). In sample mode it previews as that role.
 */
export function DemoBar() {
  const { bundle, revision, demo } = useServices();
  void revision; // re-render when sample state changes
  const navigate = useNavigate();
  const live = bundle.live;
  const sample = bundle.sampleControls;
  if (!live && !sample) return null;

  const current = live ? demo.session.role : sample!.getViewerRole();
  const choose = (role: (typeof OPTIONS)[number]['role']) => {
    if (role === current) return;
    if (live) {
      demo.switchRole(role);
      navigate('/');
    } else sample!.setViewerRole(role);
  };

  return (
    <div className="demo-bar" role="region" aria-label="Demo role">
      <div className="page demo-bar__inner">
        <span className="demo-bar__side" aria-hidden="true" />
        <div className="demo-bar__switch" role="group" aria-label="Demo role: tenant or landlord">
          {OPTIONS.map((option) => (
            <button key={option.role} type="button" className="demo-bar__choice" aria-pressed={current === option.role} onClick={() => choose(option.role)}>
              {option.label}
            </button>
          ))}
        </div>
        <span className="demo-bar__side demo-bar__side--end">
          {live && (
            <button
              type="button"
              className="demo-bar__restart"
              aria-label="Restart demo"
              title="Restart: start a fresh demo at Setup. The current lease and its evidence stay on the server."
              onClick={() => {
                demo.restart();
                navigate('/');
              }}
            >
              <RestartIcon />
              <span className="demo-bar__restart-label">Restart</span>
            </button>
          )}
        </span>
      </div>
      {/* Required on screen for the demo video (D-002): $10 here stands for a $1,000 deposit. */}
      <p className="page demo-bar__note">Testnet demo: amounts scaled 1:100</p>
    </div>
  );
}
