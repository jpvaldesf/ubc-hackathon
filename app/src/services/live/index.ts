import { ServiceError } from '../errors';
import type { DepositService } from '../types';
import { createApiClient, type ApiClient, type ApiLease, type DevUserId } from './api';
import { mapLease, mapProposal } from './mapping';

/**
 * Live adapter for the frozen API (docs/API.md). Calls the backend for:
 *   getLease / getProposal -> GET /leases/{id}
 *   acceptProposal         -> POST /leases/{id}/accept
 *   disputeProposal        -> POST /leases/{id}/appeal
 * NOT connected (the API has no matching endpoint, so these fail with `integration_blocked`
 * instead of pretending): requestMoveOut, saveProposalDraft, submitProposal.
 * It never falls back to sample data. Idempotency keys and proposal versions are not part of
 * the API, so they are not sent; the server's state machine rejects a repeat with 409.
 */
const POLL_MS = 5000;
const TERMINAL = new Set(['settled', 'resolved']);

function blocked(capability: string): never {
  throw new ServiceError('integration_blocked', `${capability} isn't connected to the backend yet.`);
}

function leasePath(leaseId: string, suffix = ''): string {
  if (!/^[A-Za-z0-9_-]+$/.test(leaseId)) throw new ServiceError('validation', 'That lease id is not valid.');
  return `/leases/${leaseId}${suffix}`;
}

export interface LiveOptions {
  baseUrl: string;
  userId: DevUserId;
  client?: ApiClient;
}

export function createLiveService({ baseUrl, userId, client = createApiClient(baseUrl) }: LiveOptions): DepositService {
  let lastStatus: string | undefined;
  const inflight = new Map<string, Promise<ApiLease>>();

  // getLease and getProposal load together; share one request.
  function fetchLease(leaseId: string): Promise<ApiLease> {
    const existing = inflight.get(leaseId);
    if (existing) return existing;
    const request = (client.get(leasePath(leaseId)) as Promise<ApiLease>)
      .then((lease) => {
        lastStatus = lease.status;
        return lease;
      })
      .finally(() => inflight.delete(leaseId));
    inflight.set(leaseId, request);
    return request;
  }

  return {
    mode: 'live',
    async getLease(leaseId) {
      return mapLease(await fetchLease(leaseId), userId);
    },
    async getProposal(leaseId) {
      return mapProposal(await fetchLease(leaseId));
    },
    requestMoveOut: async () => blocked('Requesting move-out'),
    saveProposalDraft: async () => blocked('Editing the draft proposal'),
    submitProposal: async () => blocked('Sending the report'),
    async acceptProposal(leaseId) {
      await client.post(leasePath(leaseId, '/accept'), userId, {});
    },
    async disputeProposal(leaseId, _version, input) {
      await client.post(leasePath(leaseId, '/appeal'), userId, { finding_ids: input.itemIds, reason: input.reason });
    },
    subscribe(listener) {
      const timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        if (lastStatus && TERMINAL.has(lastStatus)) return;
        listener();
      }, POLL_MS);
      return () => {
        clearInterval(timer);
      };
    },
  };
}
