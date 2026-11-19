import { DEMO_PEOPLE, MARKS_TOWER } from '../../demo/demoProperty';

/**
 * The demo lease the home screen's "Start a demo deposit" creates. The five shots are generic dorm-room spots (no room number is claimed); shot ids s1 to s5 are the ones the backend already supports.
 * The property is Marks Tower, a staged inspection (src/demo/demoProperty.ts); the lease and people are fictional. $10 = a $1,000 deposit at the 1:100 testnet scale (D-002).
 */
export const DEMO_LEASE = {
  address: MARKS_TOWER.address,
  tenant_name: DEMO_PEOPLE.tenantName,
  deposit_cents: 1000,
  move_in_date: '2026-08-15',
  shot_list: [
    { shot_id: 's1', room: 'dorm room', label: 'Room, from the doorway' },
    { shot_id: 's2', room: 'dorm room', label: 'Bed and the wall beside it' },
    { shot_id: 's3', room: 'dorm room', label: 'Desk and the wall above it' },
    { shot_id: 's4', room: 'dorm room', label: 'Closet or wardrobe' },
    { shot_id: 's5', room: 'dorm room', label: 'Window and floor' },
  ],
} as const;
