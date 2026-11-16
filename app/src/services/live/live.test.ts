import { describe, expect, it, vi } from 'vitest';
import { reconcileFunds } from '../../lib/funds';
import { ServiceError } from '../errors';
import { createApiClient, type ApiClient, type ApiLease } from './api';
import { createLiveService } from './index';
import { centsToUnits, genuineTxUrl, mapLease, mapProposal, resolvePhotoUrl, type MapContext } from './mapping';

const tx = (h: string) => ({ hash: h, explorer_url: `https://explorer.test/tx/${h}` });

const photo = (id: string, phase: string, shot: string) => ({ photo_id: id, shot_id: shot, url: `/files/l_1/${phase}/${shot}.jpg` });

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
    photos: { in: [photo('p_in_s3', 'in', 's3'), photo('p_in_s4', 'in', 's4')], out: [photo('p_out_s3', 'out', 's3'), photo('p_out_s4', 'out', 's4')] },
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
    expect(lease.operations).toEqual([{ id: 'refund-l_1', kind: 'refund', amount: '8800000', status: 'succeeded' }]);
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

  it('flags unsupported next steps up front', () => {
    expect(mapLease(api({ status: 'analyzing' }), 'landlord_demo').unavailableNotice).toMatch(/photo comparison/);
    expect(mapLease(api({ status: 'report_draft' }), 'landlord_demo').unavailableNotice).toBeUndefined();
    expect(mapLease(api({ status: 'report_draft' }), 'tenant_demo').unavailableNotice).toBeUndefined();
    expect(mapLease(api({ status: 'funded' }), 'tenant_demo').unavailableNotice).toMatch(/not available/);
    expect(mapLease(api({ status: 'funded' }), 'tenant_demo').unavailableNotice).not.toMatch(/move-out/i);
    expect(mapLease(api(), 'tenant_demo').unavailableNotice).toBeUndefined();
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
    await expect(client.post('/leases/l_1/accept', 'tenant_demo', {})).rejects.toMatchObject({ code: 'invalid_state', message: expect.stringContaining('already moved on'), retryable: false });
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
    expect((c.get.mock.calls as unknown as string[][]).filter(([path]) => path === '/leases/l_1')).toHaveLength(1);
  });

  it('refuses move-out instead of pretending', async () => {
    const s = createLiveService({ baseUrl: 'x', userId: 'landlord_demo', client: client() });
    await expect(s.requestMoveOut('l_1', 'k')).rejects.toMatchObject({ code: 'integration_blocked' });
  });

  const draftLease = () => api({ status: 'report_draft', report: { ...api().report!, sent_by: null, report_hash: null }, payout: { to_tenant_cents: null, to_landlord_cents: null, pending_cents: null }, timeline: [] });
  const draftClient = () => ({ get: vi.fn(async () => draftLease()), post: vi.fn(async () => ({})) }) satisfies ApiClient;

  it('gives the landlord a draft to send, and the tenant none', async () => {
    const l = createLiveService({ baseUrl: 'x', userId: 'landlord_demo', client: draftClient() });
    expect((await l.getLease('l_1')).allowedActions).toEqual(['edit_proposal', 'submit_proposal']);
    const p = (await l.getProposal('l_1'))!;
    expect(p.status).toBe('draft');
    expect(p.draftRules).toEqual({ editReason: false, lowerOnly: true });
    expect(p.items.map((i) => i.id)).toEqual(['f1']);
    const t = createLiveService({ baseUrl: 'x', userId: 'tenant_demo', client: draftClient() });
    expect((await t.getLease('l_1')).allowedActions).toEqual([]);
    expect(await t.getProposal('l_1')).toBeNull();
  });

  it('sends the report as is with an empty edit set to POST /report/send', async () => {
    const c = draftClient();
    await createLiveService({ baseUrl: 'x', userId: 'landlord_demo', client: c }).submitProposal('l_1', undefined, 'k');
    expect(c.post).toHaveBeenCalledWith('/leases/l_1/report/send', 'landlord_demo', { remove_finding_ids: [], lower_costs: {} });
  });

  it('stages a lowered charge and sends it as lower_costs, then clears the staging', async () => {
    const c = draftClient();
    const s = createLiveService({ baseUrl: 'x', userId: 'landlord_demo', client: c });
    const preview = await s.saveProposalDraft('l_1', [{ itemId: 'f1', amount: centsToUnits(80) }]);
    expect(preview.deductionTotal).toBe(centsToUnits(80));
    expect(preview.refundAmount).toBe(centsToUnits(920));
    await s.submitProposal('l_1', undefined, 'k');
    expect(c.post).toHaveBeenCalledWith('/leases/l_1/report/send', 'landlord_demo', { remove_finding_ids: [], lower_costs: { f1: 80 } });
    expect((await s.getProposal('l_1'))!.deductionTotal).toBe(centsToUnits(120));
  });

  it('sends a removed charge as remove_finding_ids, and restoring it undoes that', async () => {
    const c = draftClient();
    const s = createLiveService({ baseUrl: 'x', userId: 'landlord_demo', client: c });
    await s.saveProposalDraft('l_1', [{ itemId: 'f1', included: false }]);
    await s.submitProposal('l_1', undefined, 'k');
    expect(c.post).toHaveBeenLastCalledWith('/leases/l_1/report/send', 'landlord_demo', { remove_finding_ids: ['f1'], lower_costs: {} });
    await s.saveProposalDraft('l_1', [{ itemId: 'f1', included: false }]);
    await s.saveProposalDraft('l_1', [{ itemId: 'f1', included: true }]);
    await s.submitProposal('l_1', undefined, 'k');
    expect(c.post).toHaveBeenLastCalledWith('/leases/l_1/report/send', 'landlord_demo', { remove_finding_ids: [], lower_costs: {} });
  });

  it('rejects raising a charge or editing the reason before any request', async () => {
    const c = draftClient();
    const s = createLiveService({ baseUrl: 'x', userId: 'landlord_demo', client: c });
    await expect(s.saveProposalDraft('l_1', [{ itemId: 'f1', amount: centsToUnits(121) }])).rejects.toMatchObject({ code: 'validation' });
    await expect(s.saveProposalDraft('l_1', [{ itemId: 'f1', rationale: 'x' }])).rejects.toMatchObject({ code: 'validation' });
    await expect(s.saveProposalDraft('l_1', [{ itemId: 'nope', included: false }])).rejects.toMatchObject({ code: 'validation' });
    expect(c.post).not.toHaveBeenCalled();
  });

  it('does not clear staged edits when the send fails', async () => {
    const c = draftClient();
    c.post.mockRejectedValueOnce(new ServiceError('invalid_state', 'nope'));
    const s = createLiveService({ baseUrl: 'x', userId: 'landlord_demo', client: c });
    await s.saveProposalDraft('l_1', [{ itemId: 'f1', included: false }]);
    await expect(s.submitProposal('l_1', undefined, 'k')).rejects.toBeInstanceOf(ServiceError);
    expect((await s.getProposal('l_1'))!.items[0].included).toBe(false);
  });

  it('rejects a lease id that could escape the path', async () => {
    const s = createLiveService({ baseUrl: 'x', userId: 'tenant_demo', client: client() });
    await expect(s.getLease('../health')).rejects.toBeInstanceOf(ServiceError);
  });
});

const HASH = '0x' + 'ab'.repeat(32);
const ctx: MapContext = { apiUrl: 'http://api.test:8000/', chainVerified: true, explorer: 'https://explorer.testnet.arc.io' };
const realTx = { hash: HASH, explorer_url: `https://explorer.testnet.arc.io/tx/${HASH}` };

describe('photos', () => {
  it('resolves relative /files paths against the backend address and rejects anything else', () => {
    expect(resolvePhotoUrl('/files/l_1/in/s3.jpg', 'http://api.test:8000/')).toBe('http://api.test:8000/files/l_1/in/s3.jpg');
    expect(resolvePhotoUrl('http://evil.test/x.jpg', 'http://api.test:8000')).toBeUndefined();
    expect(resolvePhotoUrl('/files/../secret', 'http://api.test:8000')).toBeUndefined();
    expect(resolvePhotoUrl('/other/x.jpg', 'http://api.test:8000')).toBeUndefined();
    expect(resolvePhotoUrl('/files/x.jpg', '')).toBeUndefined();
  });

  it('shows the real photos on a finding, and a placeholder when the server has no such photo', () => {
    const [item] = mapProposal(api(), 'tenant_demo', undefined, ctx)!.items;
    expect(item.photoPair.moveIn).toMatchObject({ kind: 'image', src: 'http://api.test:8000/files/l_1/in/s3.jpg' });
    expect(item.photoPair.moveOut).toMatchObject({ kind: 'image', src: 'http://api.test:8000/files/l_1/out/s3.jpg' });
    const missing = api({ photos: { in: [], out: [] } });
    expect(mapProposal(missing, 'tenant_demo', undefined, ctx)!.items[0].photoPair.moveIn.kind).toBe('placeholder');
  });
});

describe('$0 findings', () => {
  it('lists normal wear separately, without changing counts or totals', () => {
    const p = mapProposal(api(), 'tenant_demo', undefined, ctx)!;
    expect(p.items.map((i) => i.id)).toEqual(['f1']);
    expect(p.noChargeItems!.map((i) => [i.id, i.tag, i.amount, i.included])).toEqual([['f2', 'Normal wear', '0', false]]);
    expect(p.deductionTotal).toBe('1200000');
  });

  it('shows them in the landlord draft preview too, and staging never touches them', () => {
    const draft = api({ status: 'report_draft', report: { ...api().report!, sent_by: null }, timeline: [] });
    const staged = new Map([['f1', { cents: 80 }]]);
    const p = mapProposal(draft, 'landlord_demo', staged, ctx)!;
    expect(p.status).toBe('draft');
    expect(p.noChargeItems!.map((i) => i.id)).toEqual(['f2']);
    expect(p.deductionTotal).toBe(centsToUnits(80));
  });
});

describe('proof links', () => {
  it('links only genuine transactions on the verified network', () => {
    expect(genuineTxUrl(realTx, ctx)).toBe(realTx.explorer_url);
    expect(genuineTxUrl(realTx, { ...ctx, chainVerified: false })).toBeUndefined();
    expect(genuineTxUrl({ ...realTx, explorer_url: `https://FAKE-explorer.invalid/tx/${HASH}` }, ctx)).toBeUndefined();
    expect(genuineTxUrl({ ...realTx, explorer_url: 'https://explorer.testnet.arc.io/tx/0xdead' }, ctx)).toBeUndefined();
    expect(genuineTxUrl({ hash: '0x1', explorer_url: 'https://explorer.testnet.arc.io/tx/0x1' }, ctx)).toBeUndefined();
    expect(genuineTxUrl(null, ctx)).toBeUndefined();
    expect(genuineTxUrl(realTx, { ...ctx, explorer: 'javascript:alert(1)//' })).toBeUndefined();
  });

  it('puts links on the lease only for genuine tx, and explains the missing ones', () => {
    const lease = mapLease(api({ timeline: [{ step: 'proposed', at: 'a', label: 'x', tx: realTx }] }), 'tenant_demo', ctx);
    expect(lease.proofs).toHaveLength(1);
    expect(lease.proofNote).toBeUndefined();
    const fake = mapLease(api({ timeline: [{ step: 'proposed', at: 'a', label: 'x', tx: { hash: HASH, explorer_url: `https://FAKE-explorer.invalid/tx/${HASH}` } }] }), 'tenant_demo', ctx);
    expect(fake.proofs).toEqual([]);
    expect(fake.proofNote).toMatch(/not blockchain proof/);
    expect(mapLease(api({ timeline: [] }), 'tenant_demo', ctx).proofNote).toBeUndefined();
  });
});

describe('demo identity', () => {
  it('uses the new identity on the next request and tells subscribers to refetch', async () => {
    const c = { get: vi.fn(async () => api()), post: vi.fn(async () => ({})) } satisfies ApiClient;
    const s = createLiveService({ baseUrl: 'x', userId: 'tenant_demo', client: c });
    const refetch = vi.fn();
    const stop = s.subscribe!(refetch);
    expect((await s.getLease('l_1')).viewer).toEqual({ userId: 'tenant_demo', role: 'tenant' });
    s.setUserId('landlord_demo');
    expect(refetch).toHaveBeenCalledTimes(1);
    expect((await s.getLease('l_1')).viewer).toEqual({ userId: 'landlord_demo', role: 'landlord' });
    await s.acceptProposal('l_1', undefined, 'k');
    expect(c.post).toHaveBeenCalledWith('/leases/l_1/accept', 'landlord_demo', {});
    stop();
  });

  it('verifies the chain once via /health before offering links', async () => {
    const get = vi.fn(async (path: string) => (path === '/health' ? { ok: true, chain_id: 5042002, escrow: '0x' + '1'.repeat(40) } : api({ timeline: [{ step: 'proposed', at: 'a', label: 'x', tx: realTx }] })));
    const s = createLiveService({ baseUrl: 'x', userId: 'tenant_demo', client: { get, post: vi.fn() } as unknown as ApiClient });
    expect((await s.getLease('l_1')).proofs).toHaveLength(1);
    await s.getLease('l_1');
    expect(get.mock.calls.filter(([p]) => p === '/health')).toHaveLength(1);
    const wrongChain = createLiveService({ baseUrl: 'x', userId: 'tenant_demo', client: { get: vi.fn(async (path: string) => (path === '/health' ? { ok: true, chain_id: 1, escrow: '0x' + '1'.repeat(40) } : api({ timeline: [{ step: 'proposed', at: 'a', label: 'x', tx: realTx }] }))), post: vi.fn() } as unknown as ApiClient });
    expect((await wrongChain.getLease('l_1')).proofs).toEqual([]);
  });
});
