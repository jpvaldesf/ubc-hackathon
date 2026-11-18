import { useServices } from '../services/ServiceContext';

const OPTIONS = [
  { id: 'tenant_demo', role: 'tenant', label: 'Tenant' },
  { id: 'landlord_demo', role: 'landlord', label: 'Landlord' },
] as const;

/**
 * The demo bar is only the Tenant / Landlord switch, centered. In live mode it sets the development
 * identity header (X-User-Id, not sign-in); in sample mode it previews as that role. It never shows
 * in any other form, so live mode cannot expose anything else.
 */
export function DemoBar() {
  const { bundle, revision } = useServices();
  void revision; // re-render when sample state changes
  const live = bundle.live;
  const sample = bundle.sampleControls;
  if (!live && !sample) return null;

  const isCurrent = (option: (typeof OPTIONS)[number]) => (live ? live.getUserId() === option.id : sample!.getViewerRole() === option.role);
  const choose = (option: (typeof OPTIONS)[number]) => {
    if (isCurrent(option)) return;
    if (live) live.setUserId(option.id);
    else sample!.setViewerRole(option.role);
  };

  return (
    <div className="demo-bar" role="region" aria-label="Demo role">
      <div className="page demo-bar__inner">
        <div className="demo-bar__switch" role="group" aria-label="Demo role: tenant or landlord">
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="demo-bar__choice"
              aria-pressed={isCurrent(option)}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
