import { describe, expect, it } from 'vitest';
import type { Lease, Proposal } from '../../services/types';
import { counterpartControls } from './DemoControls';

const lease = (role: 'tenant' | 'landlord', serverStatus: string) =>
  ({ viewer: { role }, serverStatus, participants: [{ id: 'tenant_demo', role: 'tenant', displayName: 'John Doe' }, { id: 'landlord_demo', role: 'landlord', displayName: 'Jane Doe' }] }) as unknown as Lease;
const proposal = (deductionTotal: string) => ({ deductionTotal }) as unknown as Proposal;
const steps = (l: Lease, p: Proposal | null = null) => counterpartControls(l, p).map((c) => c.step);

describe('counterpart controls follow the backend state machine', () => {
  it('tenant session: the landlord runs the comparison, then sends the report', () => {
    expect(steps(lease('tenant', 'move_out_recorded'))).toEqual(['start_report']);
    expect(steps(lease('tenant', 'report_draft'))).toEqual(['send_report']);
  });
  it('landlord session: the tenant pays the deposit, then accepts or disputes real deductions', () => {
    expect(steps(lease('landlord', 'created'))).toEqual(['pay_deposit']);
    expect(steps(lease('landlord', 'proposed'), proposal('1200000'))).toEqual(['accept', 'appeal']);
  });
  it('offers nothing where the user acts themselves, where there is nothing to answer, or where the API has no step', () => {
    for (const status of ['funded', 'move_in_recorded', 'analyzing', 'settled', 'appealed', 'resolved']) {
      expect(steps(lease('landlord', status))).toEqual([]);
      expect(steps(lease('tenant', status))).toEqual([]);
    }
    expect(steps(lease('landlord', 'proposed'), proposal('0'))).toEqual([]);
    expect(steps(lease('tenant', 'created'))).toEqual([]); // the tenant pays their own deposit
    expect(steps(lease('tenant', 'proposed'), proposal('1200000'))).toEqual([]); // the tenant responds themselves
  });
});
