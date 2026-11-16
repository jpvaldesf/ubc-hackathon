import { ServiceError } from '../errors';
import type { DepositService } from '../types';

/**
 * Live adapter. NOT IMPLEMENTED YET. The server (server/, docs/API.md) now exists, but this
 * service interface was designed before it and does not match the frozen API (it assumes proposal
 * versions, allowedActions and fund buckets that the API does not return). Until it is mapped,
 * every call fails loudly with `integration_blocked` so the UI shows a blocked state.
 * It must never fall back to sample data or pretend an action succeeded.
 * Replace methods one at a time, using server-issued ids and the payloads in docs/API.md.
 */
function blocked(capability: string): never {
  throw new ServiceError(
    'integration_blocked',
    `The ${capability} service isn't connected yet. This screen can't load real data.`,
  );
}

export function createLiveService(): DepositService {
  return {
    mode: 'live',
    getLease: async () => blocked('lease'),
    getProposal: async () => blocked('proposal'),
    requestMoveOut: async () => blocked('lease'),
    saveProposalDraft: async () => blocked('proposal'),
    submitProposal: async () => blocked('proposal'),
    acceptProposal: async () => blocked('response'),
    disputeProposal: async () => blocked('response'),
  };
}
