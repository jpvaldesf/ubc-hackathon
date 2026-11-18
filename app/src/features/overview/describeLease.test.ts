import { describe, expect, it } from 'vitest';
import {
  acceptProposal,
  buildScenario,
  saveDraft,
  selectLease,
  selectProposal,
  submitProposal,
  type ScenarioId,
} from '../../services/sample/engine';
import type { AnalysisState, CaptureState, Lease, Role } from '../../services/types';
import { describeLease } from './describeLease';

const now = new Date('2026-11-14T12:00:00.000Z');

function describeFor(scenario: ScenarioId, role: Role) {
  const state = buildScenario(scenario, now);
  return describeLease(selectLease(state, role), selectProposal(state, role));
}

describe('describeLease', () => {
  it('shows nothing urgent while the deposit is simply held, and offers no move-out request', () => {
    for (const role of ['tenant', 'landlord'] as const) {
      const result = describeFor('active', role);
      expect(result.headline).toContain('$1,000.00');
      expect(result.detail).toBe('Nothing needs doing right now.');
      expect(result.primary).toBeUndefined();
    }
  });

  it('gives the landlord one review action and tells the tenant who they are waiting on', () => {
    expect(describeFor('move_out', 'landlord').primary).toMatchObject({ label: 'Review proposed charges' });
    const tenant = describeFor('move_out', 'tenant');
    expect(tenant.primary).toBeUndefined();
    expect(tenant.waiting).toContain('Waiting on Jane Doe');
  });

  it('offers one review action and says the amount stays held until accepted or a dispute is resolved', () => {
    const tenant = describeFor('refund_pending', 'tenant');
    expect(tenant.headline).toContain('$120.00 in deductions');
    expect(tenant.detail).toBe('This amount stays held until you accept the deductions or a dispute is resolved.');
    expect(tenant.primary).toMatchObject({ label: 'Review deductions', variant: 'primary' });
  });

  it('does not repeat refund amounts the breakdown already shows', () => {
    // Processing versus confirmed is carried by the breakdown rows, not by a second sentence.
    for (const scenario of ['refund_pending', 'refund_confirmed'] as const) {
      expect(describeFor(scenario, 'tenant').detail).not.toContain('$880.00');
    }
  });

  it('tells the landlord the tenant has to respond, without offering an action that is not theirs', () => {
    const landlord = describeFor('refund_confirmed', 'landlord');
    expect(landlord.waiting).toContain('Waiting on John Doe');
    expect(landlord.primary).toMatchObject({ variant: 'secondary' });
    // The actor is named once. The sentence above it only states the hold rule.
    expect(landlord.detail).not.toContain('John Doe');
    expect(landlord.detail).toBe('This amount stays held until the deductions are accepted or a dispute is resolved.');
  });

  it('shows refund processing, and no review task, for a zero-deduction proposal', () => {
    let state = buildScenario('move_out', now);
    state = saveDraft(
      state,
      [
        { itemId: 'finding-wall', included: false },
        { itemId: 'finding-carpet', included: false },
      ],
      now,
    );
    state = submitProposal(state, state.proposal.version, now);
    for (const role of ['tenant', 'landlord'] as const) {
      const result = describeLease(selectLease(state, role), selectProposal(state, role));
      expect(result.headline).toContain('$1,000.00');
      expect(result.headline).toContain('processing');
      expect(result.primary).toBeUndefined();
      expect(result.waiting).toBe('Waiting for the transfer to confirm.');
    }
  });

  it('shows awaiting review after a dispute, with one waiting line and no duplicate hold sentence', () => {
    const result = describeFor('disputed', 'tenant');
    expect(result.headline).toBe('Awaiting review');
    expect(result.detail).toBe('You disputed 1 deduction.');
    expect(result.waiting).toBe('Waiting for a ruling on the disputed deductions.');
  });

  it('says the payout is waiting for confirmation once the deductions are accepted', () => {
    let state = buildScenario('refund_confirmed', now);
    state = acceptProposal(state, state.proposal.version, now);
    const tenant = describeLease(selectLease(state, 'tenant'), selectProposal(state, 'tenant'));
    const landlord = describeLease(selectLease(state, 'landlord'), selectProposal(state, 'landlord'));
    expect(tenant.detail).toBe('You accepted the deductions.');
    expect(landlord.detail).toBe('John Doe accepted the deductions.');
    expect(tenant.waiting).toBe('Waiting for the transfer to confirm.');
  });

  it('never says disputing releases money, in any state for either role', () => {
    const misleading = /accept or dispute|until they respond|until you respond|accepts or disputes/i;
    const scenarios: ScenarioId[] = ['active', 'move_out', 'refund_pending', 'refund_confirmed', 'disputed', 'settled'];
    for (const scenario of scenarios) {
      for (const role of ['tenant', 'landlord'] as const) {
        const { detail, waiting } = describeFor(scenario, role);
        // "Waiting on X to accept or dispute" names who acts; it does not describe the hold.
        expect(detail).not.toMatch(misleading);
        if (waiting && !/^Waiting on .+ to accept or dispute the deductions\.$/.test(waiting)) {
          expect(waiting).not.toMatch(misleading);
        }
      }
    }
  });

  it('summarizes settlement from confirmed amounts only', () => {
    const tenant = describeFor('settled', 'tenant');
    expect(tenant.headline).toBe('Settlement complete.');
    expect(tenant.detail).toContain('$880.00');
    expect(tenant.detail).toContain('$120.00 was paid to Jane Doe');
    expect(tenant.detail).toContain('Nothing is held');
  });

  describe('photo and deposit entry points (live mode)', () => {
    const base = (): Lease => selectLease(buildScenario('active', now), 'tenant');
    const capture = (openPhase: CaptureState['openPhase']): CaptureState => ({
      shots: [],
      photos: { in: [], out: [] },
      openPhase,
      committed: { in: openPhase === 'out', out: false },
    });

    it('asks the tenant to pay the deposit while the lease is only created; the landlord just waits', () => {
      const created: Lease = { ...base(), stage: 'setup', allowedActions: ['pay_deposit'] };
      expect(describeLease(created, null).primary).toEqual({ kind: 'pay_deposit', label: 'Pay deposit', variant: 'primary' });
      const landlord = describeLease({ ...created, allowedActions: [], viewer: { ...created.viewer, role: 'landlord' } }, null);
      expect(landlord.primary).toBeUndefined();
      expect(landlord.waiting).toContain('to pay the deposit');
    });

    it('links to the photos screen while a phase is open', () => {
      const moveIn = describeLease({ ...base(), capture: capture('in') }, null).primary;
      expect(moveIn).toMatchObject({ kind: 'link', to: 'photos', label: 'Take move-in photos' });
      const moveOut = describeLease({ ...base(), capture: capture('out') }, null).primary;
      expect(moveOut).toMatchObject({ kind: 'link', to: 'photos', label: 'Take move-out photos' });
    });

    it('links the landlord to Compare photos once move-out is recorded, and shows progress while it runs', () => {
      const landlordLease = selectLease(buildScenario('active', now), 'landlord');
      const moveOut: Lease = { ...landlordLease, phase: 'move_out', stage: 'move_out', capture: capture(null) };
      const analysis = (a: Partial<AnalysisState>): AnalysisState => ({ state: 'idle', canStart: false, ...a });
      expect(describeLease({ ...moveOut, analysis: analysis({ canStart: true }) }, null).primary).toMatchObject({ to: 'photos', label: 'Compare photos', variant: 'primary' });
      expect(describeLease({ ...moveOut, analysis: analysis({ state: 'running' }) }, null).primary).toMatchObject({ to: 'photos', label: 'See progress' });
      expect(describeLease({ ...moveOut, analysis: analysis({ error: 'x', canStart: true }) }, null).primary).toMatchObject({ to: 'photos' });
    });
  });
});
