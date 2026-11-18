import type { Lease } from '../services/types';
import { Disclosure } from './Disclosure';

/**
 * Transaction proof. A link exists only for a transaction the adapter verified as real on the configured
 * network. When the server reported transactions that could not be verified, a note says why there is no link.
 * Hashes are never shown as text.
 */

/**
 * The transaction that matches the amount this viewer sees as the outcome: the tenant's refund, or what
 * the landlord received once settled (otherwise what was sent to the tenant). Falls back to the latest.
 */
export function relevantProof(lease: Lease) {
  const proofs = lease.proofs ?? [];
  const byStep = (step: string) => proofs.find((proof) => proof.step === step);
  const preferred = lease.viewer.role === 'landlord' ? (byStep('settled') ?? byStep('proposed')) : byStep('proposed');
  return preferred ?? proofs.at(-1);
}

/** The one relevant link, shown beside the confirmed outcome, named for what the transaction was. */
export function ProofHighlight({ lease }: { lease: Lease }) {
  const latest = relevantProof(lease);
  if (!latest) return null;
  return (
    <p className="proof-highlight">
      <a href={latest.url} target="_blank" rel="noopener noreferrer" aria-label={`View transaction: ${latest.label} (opens the block explorer)`}>
        View transaction: {latest.label}
      </a>
    </p>
  );
}

/** Every transaction, behind one disclosure, so the page does not repeat six equal links. */
export function AllTransactions({ lease }: { lease: Lease }) {
  const proofs = lease.proofs ?? [];
  if (proofs.length === 0 && !lease.proofNote) return null;
  return (
    <Disclosure title="All transactions" meta={proofs.length > 0 ? String(proofs.length) : undefined}>
      {proofs.length > 0 && (
        <ul className="proof__list">
          {proofs.map((proof) => (
            <li key={proof.id} className="proof__item">
              <span>{proof.label}</span>
              <a href={proof.url} target="_blank" rel="noopener noreferrer" aria-label={`View transaction: ${proof.label} (opens the block explorer)`}>
                View
              </a>
            </li>
          ))}
        </ul>
      )}
      {lease.proofNote && (
        <p role="note" className="small">
          {lease.proofNote}
        </p>
      )}
    </Disclosure>
  );
}
