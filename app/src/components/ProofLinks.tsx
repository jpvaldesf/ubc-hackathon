import type { Lease } from '../services/types';

/**
 * One-tap proof links, shown on the overview and review screens. A link exists only for a transaction the
 * adapter verified as real on the configured network. When the server reported transactions that could not be
 * verified, a note says why there is no link. Hashes are never shown as text.
 */
export function ProofLinks({ lease }: { lease: Lease }) {
  const proofs = lease.proofs ?? [];
  if (proofs.length === 0 && !lease.proofNote) return null;
  return (
    <section className="proof" aria-label="Proof">
      <h2 className="proof__title">Proof</h2>
      {proofs.length > 0 && (
        <ul className="proof__list">
          {proofs.map((proof) => (
            <li key={proof.id} className="proof__item">
              <span>{proof.label}</span>
              <a href={proof.url} target="_blank" rel="noopener noreferrer" aria-label={`View proof: ${proof.label} (opens the block explorer)`}>
                View proof
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
    </section>
  );
}
