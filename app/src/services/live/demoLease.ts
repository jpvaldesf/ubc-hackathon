import { DEMO_PEOPLE, EXAMPLE_APARTMENT } from '../../demo/demoProperty';

/**
 * The demo lease the home screen's "Start a demo deposit" creates. The five shots follow the guided capture steps
 * (reference photos in public/reference); shot ids s1 to s5 are the ones the backend already supports.
 * The property is the fictional "Example Apartment" with no street address (src/demo/demoProperty.ts); the lease and people are fictional. $10 = a $1,000 deposit at the 1:100 testnet scale (D-002).
 */
export const DEMO_LEASE = {
  address: EXAMPLE_APARTMENT.name,
  tenant_name: DEMO_PEOPLE.tenantName,
  deposit_cents: 1000,
  move_in_date: '2026-08-15',
  shot_list: [
    { shot_id: 's1', room: 'living room', label: 'Lounge, toward the TV wall' },
    { shot_id: 's2', room: 'kitchen', label: 'Kitchen, counter and cabinets' },
    { shot_id: 's3', room: 'dining room', label: 'Dining area, table and bookcases' },
    { shot_id: 's4', room: 'bedroom', label: 'Bedroom, bed and window wall' },
    { shot_id: 's5', room: 'bathroom', label: 'Bathroom, shower and vanity' },
  ],
} as const;
