import { DEMO_PEOPLE, DEMO_PROPERTY } from '../../demo/demoProperty';

/**
 * The demo lease the home screen's "Start a demo deposit" creates. Same values as server/scripts/smoke.py
 * (DEMO_SHOTS), so the shot labels match the sample photos and the AI reads the same context.
 * The property is the canonical example (src/demo/demoProperty.ts); the lease and tenant are fictional. $10 = a $1,000 deposit at the 1:100 testnet scale (D-002).
 */
export const DEMO_LEASE = {
  address: DEMO_PROPERTY.address,
  tenant_name: DEMO_PEOPLE.tenantName,
  deposit_cents: 1000,
  move_in_date: '2026-08-15',
  shot_list: [
    { shot_id: 's1', room: 'living room', label: 'Living room wall, wide shot' },
    { shot_id: 's2', room: 'living room', label: 'Living room floor and wall' },
    { shot_id: 's3', room: 'living room', label: 'White brick wall below the light switch' },
    { shot_id: 's4', room: 'bedroom', label: 'Bedroom corner (lamp on/off)' },
    { shot_id: 's5', room: 'bedroom', label: 'Wall above the bed (picture hooks)' },
  ],
} as const;
