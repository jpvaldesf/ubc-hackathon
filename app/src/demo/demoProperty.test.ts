import { describe, expect, it } from 'vitest';
import { relevantProof } from '../components/ProofLinks';
import { DEMO_LEASE } from '../services/live/demoLease';
import { createSampleService } from '../services/sample';
import type { Lease } from '../services/types';
import { DEMO_PEOPLE, DEMO_PROPERTY, propertyFromAddress } from './demoProperty';

describe('canonical demo configuration', () => {
  it('names the fictional participants and the real example property', () => {
    expect(DEMO_PEOPLE).toEqual({ tenantName: 'John Doe', landlordName: 'Jane Doe' });
    expect(DEMO_PROPERTY.address).toBe('6200 W 3rd St, Los Angeles, CA 90036');
    expect(DEMO_PROPERTY.image.credit).toMatchObject({ author: 'Downtowngal', license: 'CC BY-SA 4.0' });
  });

  it('seeds the live demo lease from it', () => {
    expect(DEMO_LEASE.address).toBe(DEMO_PROPERTY.address);
    expect(DEMO_LEASE.tenant_name).toBe(DEMO_PEOPLE.tenantName);
  });

  it('gives the canonical address a short name and shows any other address as stored', () => {
    expect(propertyFromAddress(DEMO_PROPERTY.address)).toEqual({ label: 'Park La Brea', address: DEMO_PROPERTY.address, isExample: true });
    expect(propertyFromAddress('1 Main St')).toEqual({ label: '1 Main St' });
  });

  it('shows the same property and people in the sample data for both roles', async () => {
    const { service, controls } = createSampleService({ latencyMs: 0, storage: null });
    for (const role of ['tenant', 'landlord'] as const) {
      controls.setViewerRole(role);
      const lease = await service.getLease('sample-lease');
      expect(lease.property.label).toBe('Park La Brea');
      expect(lease.participants.map((p) => p.displayName).sort()).toEqual(['Jane Doe', 'John Doe']);
    }
  });
});

describe('relevantProof', () => {
  const proofs = ['created', 'proposed', 'settled'].map((step) => ({ id: step, label: step, url: `https://x/${step}`, step }));
  const lease = (role: 'tenant' | 'landlord', list = proofs) => ({ viewer: { role }, proofs: list }) as unknown as Lease;
  it('picks the refund for the tenant and the landlord payout once settled', () => {
    expect(relevantProof(lease('tenant'))?.step).toBe('proposed');
    expect(relevantProof(lease('landlord'))?.step).toBe('settled');
    expect(relevantProof(lease('landlord', proofs.slice(0, 2)))?.step).toBe('proposed');
  });
  it('falls back to the latest and returns nothing without verified proofs', () => {
    expect(relevantProof(lease('tenant', [proofs[0]!]))?.step).toBe('created');
    expect(relevantProof(lease('tenant', []))).toBeUndefined();
  });
});
