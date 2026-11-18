import { Link } from 'react-router-dom';
import { Disclosure } from '../../components/Disclosure';
import { isZero } from '../../lib/money';
import type { SimulatedStepKind } from '../../services/live';
import { useMutation } from '../../services/hooks';
import { useServices } from '../../services/ServiceContext';
import type { Lease, Proposal } from '../../services/types';
import { useLeaseContext } from '../lease/LeaseLayout';

interface Control {
  step: SimulatedStepKind;
  label: string;
  /** Recorded in the session's simulated list once it succeeds. */
  done: string;
  /** True when, on a live server, this sends a real testnet transaction. */
  onchain: boolean;
}

function name(lease: Lease, role: 'tenant' | 'landlord'): string {
  return lease.participants.find((p) => p.role === role)?.displayName ?? (role === 'tenant' ? 'The tenant' : 'The landlord');
}

/**
 * The other participant's next step, when the demo needs it and the backend state machine allows it. Each one
 * is a real supported request sent as that participant (the backend's development identity), never a made-up
 * success. Only the steps the API really has appear here; the arbiter ruling after an appeal has no API at all.
 */
export function counterpartControls(lease: Lease, proposal: Proposal | null): Control[] {
  const status = lease.serverStatus;
  const tenant = name(lease, 'tenant');
  const landlord = name(lease, 'landlord');
  if (lease.viewer.role === 'tenant') {
    if (status === 'move_out_recorded')
      return [{ step: 'start_report', label: `${landlord} compares the photos`, done: `${landlord} started the photo comparison`, onchain: false }];
    if (status === 'report_draft')
      return [{ step: 'send_report', label: `${landlord} sends the report`, done: `${landlord} sent the report as drafted`, onchain: true }];
    return [];
  }
  if (status === 'created') return [{ step: 'pay_deposit', label: `${tenant} pays the deposit`, done: `${tenant} paid the deposit`, onchain: true }];
  if (status === 'proposed' && proposal && !isZero(proposal.deductionTotal)) {
    return [
      { step: 'accept', label: `${tenant} accepts the deductions`, done: `${tenant} accepted the deductions`, onchain: true },
      { step: 'appeal', label: `${tenant} disputes the deductions`, done: `${tenant} disputed the deductions`, onchain: true },
    ];
  }
  return [];
}

/** Landlord journey: the tenant's own photo steps. The API lets either person upload, so they open the capture screen from here. */
function photoLinks(lease: Lease, moveOutOpened: boolean): { to: string; label: string }[] {
  if (lease.viewer.role !== 'landlord') return [];
  const tenant = name(lease, 'tenant');
  if (lease.serverStatus === 'funded') return [{ to: 'photos', label: `Add ${tenant}'s move-in photos` }];
  if (lease.serverStatus === 'move_in_recorded' && moveOutOpened) return [{ to: 'photos', label: `Add ${tenant}'s move-out photos` }];
  return [];
}

/**
 * Everything the demo does for the other person, in one compact collapsed section. The ordinary screens only ever
 * show the viewer's own actions: a tenant never sees report editing or sending, and a landlord never sees the
 * tenant's payment, photos or response as their own buttons.
 */
export function DemoControls() {
  const { lease, proposal, reloadNow } = useLeaseContext();
  const { bundle, demo } = useServices();
  const { run, pending, error } = useMutation();
  const live = bundle.live;
  const controls = counterpartControls(lease, proposal);
  const moveOutGate = lease.serverStatus === 'move_in_recorded' && !demo.session.moveOutOpened;
  const links = photoLinks(lease, demo.session.moveOutOpened);
  const simulated = demo.session.leaseId === lease.id ? demo.session.simulated : [];
  const appealed = lease.serverStatus === 'appealed';
  if (!live || (controls.length === 0 && !moveOutGate && links.length === 0 && simulated.length === 0 && !appealed)) return null;

  const available = controls.length + links.length + (moveOutGate ? 1 : 0);
  const stillCurrent = demo.session.leaseId === lease.id;
  return (
    <Disclosure title="Demo controls" meta={available > 0 ? `${available} step${available === 1 ? '' : 's'} available` : undefined} standalone>
      <div className="demo-panel" aria-label="Demo-only controls">
        <p className="demo-panel__badge">Demo only</p>
        <p className="small">Steps that belong to the other person or to time passing. Nothing here runs until you press it.</p>
        {moveOutGate && (
          <div className="stack--tight">
            <div className="button-row">
              <button type="button" className="button button--hero" disabled={!stillCurrent} onClick={() => demo.openMoveOut()}>
                Demo only: the lease ends, start move-out
              </button>
            </div>
            <p className="small muted">This only opens the move-out step. The backend has no move-out request, so nothing is sent.</p>
          </div>
        )}
        {links.map((link) => (
          <div key={link.label} className="stack--tight">
            <div className="button-row">
              <Link className="button button--hero" to={`/leases/${lease.id}/${link.to}`}>
                Demo only: {link.label}
              </Link>
            </div>
            <p className="small muted">You take them on the capture screen; the backend lets either person upload.</p>
          </div>
        ))}
        {controls.map((control) => (
          <div key={control.step} className="stack--tight">
            <div className="button-row">
              <button
                type="button"
                className="button button--hero"
                disabled={pending || !stillCurrent}
                aria-busy={pending}
                onClick={() =>
                  void run(async () => {
                    const startedAt = demo.session.startedAt;
                    await live.simulate(control.step, lease.id);
                    demo.recordSimulated(control.done, startedAt);
                    await reloadNow();
                  })
                }
              >
                Demo only: {control.label}
              </button>
            </div>
            <p className="small muted">
              Simulated for the other person: {control.onchain ? 'this sends the real request as them, which is a real testnet transaction on a live server.' : 'this sends the real request as them.'}
            </p>
          </div>
        ))}
        {appealed && (
          <p className="small">
            Blocked in this demo: after a dispute the arbiter's ruling has no API (it runs from server scripts), so this lease stays at "Waiting for a ruling". Nothing is
            simulated here.
          </p>
        )}
        {error && (
          <div role="alert" className="callout callout--problem">
            <p>{error.message}</p>
          </div>
        )}
        {simulated.length > 0 && (
          <div>
            <p className="small">Simulated by the demo in this session:</p>
            <ul className="journey journey--plain small">
              {simulated.map((entry) => (
                <li key={`${entry.at}-${entry.text}`}>{entry.text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Disclosure>
  );
}
