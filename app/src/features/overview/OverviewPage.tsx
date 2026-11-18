import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { AllTransactions, ProofHighlight } from "../../components/ProofLinks";
import { ExampleNote, PropertyHeader } from "../../components/PropertyHeader";
import { Disclosure } from "../../components/Disclosure";
import { LifecycleStatus } from "../../components/LifecycleTimeline";
import { formatDateTime, roleLabel } from "../../lib/format";
import { counterpartyOf } from "../../lib/participants";
import { useMutation } from "../../services/hooks";
import { useServices } from "../../services/ServiceContext";
import type { Lease, ProofLink } from "../../services/types";
import { useLeaseContext } from "../lease/LeaseLayout";
import { DepositSummaryPanel } from "./DepositSummaryPanel";
import { describeLease, type ActionButton } from "./describeLease";
import { summarizeDeposit } from "./summarizeDeposit";

export function OverviewPage() {
  const { lease, proposal } = useLeaseContext();
  const next = describeLease(lease, proposal);
  const summary = summarizeDeposit(lease, proposal);
  const summaryId = useId();
  const other = counterpartyOf(lease.participants, lease.viewer.userId);

  return (
    <div className="overview">
      <PropertyHeader
        lease={lease}
        other={
          other ? `${roleLabel(other.role)}: ${other.displayName}` : undefined
        }
      />

      <LifecycleStatus
        stage={lease.stage}
        complete={lease.phase === "settled"}
      />

      {summary ? (
        <DepositSummaryPanel
          headingId={summaryId}
          summary={summary}
          detail={summary.detail ?? next.detail}
          waiting={next.waiting}
          action={next.primary && <ActionControl action={next.primary} />}
          proof={<ProofHighlight lease={lease} />}
        />
      ) : (
        <section className="callout callout--problem" role="alert">
          <h2 className="callout__title">These amounts can't be shown</h2>
          <p>
            They don't add up to the original deposit, so we won't display
            numbers we can't stand behind. Reload to try again.
          </p>
        </section>
      )}

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
  if (action.kind === "pay_deposit")
    return <PayDepositControl label={action.label} />;
  const className = `button button--hero${action.variant === "primary" ? " button--primary" : ""}`;
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
          Deposit paid.{" "}
          <a
            href={proof.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View proof: Deposit paid (opens the block explorer)"
          >
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
          {pending ? "Paying…" : label}
        </button>
      </div>
    </div>
  );
}

/** Evidence and recent activity: open rows, not cards, so the summary stays the one focal surface. */
function Folds({ lease }: { lease: Lease }) {
  // Oldest-first sort is stable, so entries sharing a timestamp keep their recorded order; reversing gives newest first.
  const events = [...lease.events]
    .sort((a, b) => a.at.localeCompare(b.at))
    .reverse()
    .slice(0, 5);
  const evidenceCount = lease.evidence.length;
  return (
    <>
      <div className="folds">
        <AllTransactions lease={lease} />
        <Disclosure
          title="Evidence"
          meta={`${evidenceCount} ${evidenceCount === 1 ? "item" : "items"}`}
        >
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

      <section className="activity" aria-labelledby="activity-title">
        <h2 id="activity-title" className="activity__title">
          Recent activity
        </h2>
        {events.length === 0 ? (
          <p className="muted">Nothing yet</p>
        ) : (
          <ul className="fold__rows">
            {events.map((event) => (
              <li key={event.id} className="fold__row">
                <span>{event.text}</span>
                <span className="fold__row-note">
                  {formatDateTime(event.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ExampleNote />
    </>
  );
}
