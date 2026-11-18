import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AllTransactions, ProofHighlight } from '../../components/ProofLinks';
import { PropertyHeader } from '../../components/PropertyHeader';
import { DemoControls } from '../demo/DemoControls';
import { Disclosure } from '../../components/Disclosure';
import { LifecycleStatus } from '../../components/LifecycleTimeline';
import { roleLabel } from '../../lib/format';
import { counterpartyOf } from '../../lib/participants';
import { useMutation } from '../../services/hooks';
import { useServices } from '../../services/ServiceContext';
import type { Lease, ProofLink } from '../../services/types';
import { useLeaseContext } from '../lease/LeaseLayout';
import { DepositSummaryPanel } from './DepositSummaryPanel';
import { describeLease, type ActionButton } from './describeLease';
import { summarizeDeposit } from './summarizeDeposit';

export function OverviewPage() {
  const { lease, proposal } = useLeaseContext();
  const { bundle, demo } = useServices();
  // Between move-in and move-out nothing external is required by the backend. The demo makes that wait explicit.
  const moveOutGated = !!bundle.live && lease.serverStatus === 'move_in_recorded' && !demo.session.moveOutOpened;
  const described = describeLease(lease, proposal);
  // In the landlord journey the tenant's photo steps are demo controls, not the landlord's own buttons.
  const landlordWaitsForPhotos =
    !!bundle.live && lease.viewer.role === 'landlord' && described.primary?.kind === 'link' && described.primary.to === 'photos' && !!lease.capture?.openPhase;
  const tenantName = lease.participants.find((p) => p.role === 'tenant')?.displayName ?? 'The tenant';
  const next = landlordWaitsForPhotos
    ? {
        ...described,
        detail: 'The deposit is held.',
        primary: undefined,
        waiting: lease.capture?.openPhase === 'in' ? `Waiting on ${tenantName} to take the move-in photos.` : `Waiting on ${tenantName} to take the move-out photos.`,
      }
    : !!bundle.live && lease.viewer.role === 'landlord' && lease.serverStatus === 'created'
      ? { ...described, detail: `Invitation sent to ${tenantName}. Photos open once the deposit is paid.` }
      : described;
  const summary = summarizeDeposit(lease, proposal);
  const summaryId = useId();
  const other = counterpartyOf(lease.participants, lease.viewer.userId);

  return (
    <div className="overview">
      <PropertyHeader lease={lease} other={other ? `${roleLabel(other.role)}: ${other.displayName}` : undefined} />

      <LifecycleStatus stage={lease.stage} complete={lease.phase === 'settled'} />

      {summary ? (
        <DepositSummaryPanel
          headingId={summaryId}
          summary={summary}
          detail={moveOutGated ? 'The lease is active. Nothing needs doing until move-out.' : (summary.detail ?? next.detail)}
          waiting={next.waiting}
          action={next.primary && !moveOutGated && <ActionControl action={next.primary} />}
          proof={<ProofHighlight lease={lease} />}
        />
      ) : (
        <section className="callout callout--problem" role="alert">
          <h2 className="callout__title">These amounts can't be shown</h2>
          <p>They don't add up to the original deposit, so we won't display numbers we can't stand behind. Reload to try again.</p>
        </section>
      )}

      <DemoControls />

      {lease.unavailableNotice && (
        <p role="status" className="callout callout--caution">
          {lease.unavailableNotice}
        </p>
      )}

      <Folds lease={lease} />
    </div>
  );
}

function ActionControl({ action }: { action: ActionButton }) {
  if (action.kind === 'pay_deposit') return <PayDepositControl label={action.label} />;
  const className = `button button--hero${action.variant === 'primary' ? ' button--primary' : ''}`;
  return (
    <div className="button-row">
      <Link to={action.to} className={className}>
        {action.label}
      </Link>
    </div>
  );
}

function PayDepositControl({ label }: { label: string }) {
  const { service } = useServices().bundle;
  const { lease, reloadNow } = useLeaseContext();
  const { run, pending, error } = useMutation();
  const [proof, setProof] = useState<ProofLink | undefined>();
  return (
    <div className="stack--tight">
      {error && (
        <div role="alert" className="callout callout--problem">
          <p>{error.message}</p>
        </div>
      )}
      {proof && (
        <p role="status">
          Deposit paid.{' '}
          <a href={proof.url} target="_blank" rel="noopener noreferrer" aria-label="View proof: Deposit paid (opens the block explorer)">
            View proof
          </a>
        </p>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button button--hero button--primary"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            void run(async () => {
              setProof((await service.payDeposit(lease.id)).proof);
              await reloadNow();
            })
          }
        >
          {pending ? 'Paying…' : label}
        </button>
      </div>
    </div>
  );
}

/** Transactions and evidence: open rows, not cards, so the summary stays the one focal surface. */
function Folds({ lease }: { lease: Lease }) {
  const evidenceCount = lease.evidence.length;
  return (
    <>
      <div className="folds">
        <AllTransactions lease={lease} />
        <Disclosure title="Evidence" meta={`${evidenceCount} ${evidenceCount === 1 ? 'item' : 'items'}`}>
          <ul className="fold__rows">
            {lease.evidence.map((entry) => (
              <li key={entry.id} className="fold__row fold__row--stacked">
                <span className="fold__row-title">{entry.label}</span>
                <span className="fold__row-note">{entry.detail}</span>
              </li>
            ))}
          </ul>
        </Disclosure>
      </div>
    </>
  );
}
