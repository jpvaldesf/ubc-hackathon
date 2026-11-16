import { describe, expect, it, vi } from 'vitest';
import { reconcileFunds } from '../../lib/funds';
import { ServiceError } from '../errors';
import { createApiClient, type ApiClient, type ApiLease } from './api';
import { createLiveService } from './index';
import { centsToUnits, mapLease, mapProposal } from './mapping';

const tx = (h: string) => ({ hash: h, explorer_url: `https://explorer.test/tx/${h}` });

function api(over: Partial<ApiLease> = {}): ApiLease {
  return {
    lease_id: 'l_1',
    status: 'proposed',
    address: '1 Main St',
    tenant: { id: 'tenant_demo', name: 'Alex Kim' },
    landlord: { id: 'landlord_demo', name: 'Sunrise Properties' },
    deposit_cents: 1000,
    demo_scale: 100,
    escrow_balance_cents: 120,
    appeal_deadline: '2026-11-21T20:11:02Z',
    photos: { in: [1, 2], out: [1, 2] },
    report: {
      report_id: 'r_1',
      report_hash: '0xabc',
      sent_by: 'landlord',
      total_deduction_cents: 120,
      error: null,
      findings: [
        { id: 'f1', room: 'bedroom', item: 'wall', before_photo: 'p_in_s3', after_photo: 'p_out_s3', category: 'damage', description: 'Mark', confidence: 0.9, cost_cents: 120 },
        { id: 'f2', room: 'bedroom', item: 'wall', before_photo: 'p_in_s4', after_photo: 'p_out_s4', category: 'normal_wear', description: 'Nail holes', confidence: 0.6, cost_cents: 0 },
      ],
    },
    payout: { to_tenant_cents: 880, to_landlord_cents: null, pending_cents: 120 },
    timeline: [{ step: 'proposed', at: '2026-11-14T20:11:02Z', label: '$8.80 sent to you', tx: tx('0x1') }],
    ...over,
  };
}

describe('mapLease', () => {
  it('maps a proposed lease: payout in base units, reconciled, refund tied to its tx', () => {
    const lease = mapLease(api(), 'tenant_demo');
    expect(lease.funds).toMatchObject({ original: '10000000', returnedConfirmed: '8800000', held: '1200000', paidToLandlordConfirmed: '0' });
    expect(reconcileFunds(lease.funds).ok).toBe(true);
    expect(lease.operations).toEqual([{ id: 'refund-l_1', kind: 'refund', amount: '8800000', status: 'succeeded', txHash: '0x1' }]);
    expect(lease.phase).toBe('proposal_submitted');
    expect(lease.allowedActions).toEqual(['accept_proposal', 'dispute_proposal']);
    expect(lease.deadlines).toEqual([{ label: 'Appeal window ends', at: '2026-11-21T20:11:02Z' }]);
  });

  it('gives the landlord no response actions', () => {
    expect(mapLease(api(), 'landlord_demo').allowedActions).toEqual([]);
  });

  it('does not confirm a transfer that has no tx', () => {
    const lease = mapLease(api({ timeline: [{ step: 'proposed', at: 'x', label: 'l', tx: null }] }), 'tenant_demo');
    expect(lease.funds.returnedConfirmed).toBe('0');
    expect(lease.operations).toEqual([]);
  });

  it('maps settled: both payouts confirmed, nothing held, no actions', () => {
    const lease = mapLease(
      api({
        status: 'settled',
        escrow_balance_cents: 0,
        payout: { to_tenant_cents: 880, to_landlord_cents: 120, pending_cents: 0 },
        timeline: [
          { step: 'proposed', at: 'a', label: 'l', tx: tx('0x1') },
          { step: 'settled', at: 'b', label: 'l', tx: tx('0x2') },
        ],
      }),
      'tenant_demo',
    );
    expect(lease.phase).toBe('settled');
    expect(lease.funds).toMatchObject({ returnedConfirmed: '8800000', paidToLandlordConfirmed: '1200000', held: '0' });
    expect(reconcileFunds(lease.funds).ok).toBe(true);
    expect(lease.allowedActions).toEqual([]);
  });

  it('maps appealed to disputed, waiting on a reviewer', () => {
    const lease = mapLease(api({ status: 'appealed' }), 'tenant_demo');
    expect(lease.phase).toBe('disputed');
    expect(lease.waitingOn).toEqual({ actor: 'reviewer', awaiting: 'dispute_ruling' });
    expect(lease.allowedActions).toEqual([]);
  });

  it('keeps funds reconciled before the deposit exists', () => {
    const lease = mapLease(api({ status: 'created', escrow_balance_cents: 0, report: null, payout: { to_tenant_cents: null, to_landlord_cents: null, pending_cents: null }, timeline: [] }), 'tenant_demo');
    expect(reconcileFunds(lease.funds).ok).toBe(true);
  });

  it('tells the landlord who the refund went to', () => {
    expect(mapLease(api(), 'landlord_demo').events[0].text).toBe('$8.80 sent to Alex Kim');
  });
});

describe('mapProposal', () => {
  it('has no proposal before the report is sent', () => {
    expect(mapProposal(api({ status: 'report_draft' }))).toBeNull();
  });

  it('lists only charged findings, never invents a version', () => {
    const p = mapProposal(api())!;
    expect(p.version).toBeUndefined();
    expect(p.status).toBe('submitted');
    expect(p.items.map((i) => i.id)).toEqual(['f1']);
    expect(p.deductionTotal).toBe('1200000');
    expect(p.refundAmount).toBe('8800000');
    expect(p.dispute).toBeUndefined();
  });
});

describe('centsToUnits', () => {
  it('converts and rejects bad input', () => {
    expect(centsToUnits(1)).toBe('10000');
    expect(() => centsToUnits(1.5)).toThrow();
    expect(() => centsToUnits(-1)).toThrow();
  });
});

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe('createApiClient', () => {
  it('maps backend error codes to service errors', async () => {
    const client = createApiClient('http://x', fakeFetch(409, { error: { code: 'wrong_state', message: 'Lease is not proposed' } }));
    await expect(client.post('/leases/l_1/accept', 'tenant_demo', {})).rejects.toMatchObject({ code: 'invalid_state', message: 'Lease is not proposed', retryable: false });
  });

  it('reports an unreachable server as retryable', async () => {
    const client = createApiClient('http://x', (async () => {
      throw new TypeError('fail');
    }) as unknown as typeof fetch);
    await expect(client.get('/health')).rejects.toMatchObject({ code: 'service_failure', retryable: true });
  });

  it('sends the dev identity header and JSON body on writes', async () => {
    const f = fakeFetch(200, {});
    await createApiClient('http://x/', f).post('/leases/l_1/appeal', 'tenant_demo', { a: 1 });
    expect(f).toHaveBeenCalledWith('http://x/leases/l_1/appeal', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-User-Id': 'tenant_demo' }), body: '{"a":1}' }));
  });
});

describe('live service', () => {
  const client = () => ({ get: vi.fn(async () => api()), post: vi.fn(async () => ({})) }) satisfies ApiClient;

  it('accept calls POST /accept with the dev identity and no invented body fields', async () => {
    const c = client();
    await createLiveService({ baseUrl: 'x', userId: 'tenant_demo', client: c }).acceptProposal('l_1', undefined, 'key');
    expect(c.post).toHaveBeenCalledWith('/leases/l_1/accept', 'tenant_demo', {});
  });

  it('dispute calls POST /appeal with finding_ids and reason', async () => {
    const c = client();
    await createLiveService({ baseUrl: 'x', userId: 'tenant_demo', client: c }).disputeProposal('l_1', undefined, { itemIds: ['f1'], reason: 'was there' }, 'key');
    expect(c.post).toHaveBeenCalledWith('/leases/l_1/appeal', 'tenant_demo', { finding_ids: ['f1'], reason: 'was there' });
  });

  it('loads lease and proposal with one GET', async () => {
    const c = client();
    const s = createLiveService({ baseUrl: 'x', userId: 'tenant_demo', client: c });
    await Promise.all([s.getLease('l_1'), s.getProposal('l_1')]);
    expect(c.get).toHaveBeenCalledTimes(1);
    expect(c.get).toHaveBeenCalledWith('/leases/l_1');
  });

  it('refuses unsupported actions instead of pretending', async () => {
    const s = createLiveService({ baseUrl: 'x', userId: 'landlord_demo', client: client() });
    for (const call of [() => s.requestMoveOut('l_1', 'k'), () => s.saveProposalDraft('l_1', []), () => s.submitProposal('l_1', undefined, 'k')]) {
      await expect(call()).rejects.toMatchObject({ code: 'integration_blocked' });
    }
  });

  it('rejects a lease id that could escape the path', async () => {
    const s = createLiveService({ baseUrl: 'x', userId: 'tenant_demo', client: client() });
    await expect(s.getLease('../health')).rejects.toBeInstanceOf(ServiceError);
  });
});
