export const LifecycleState = Object.freeze({
  REGISTERED: 'registered',
  VALIDATED: 'validated',
  ACTIVE: 'active',
  EXPIRING: 'expiring',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  DELETED: 'deleted'
});

export function isLifecycleState(value) {
  return Object.values(LifecycleState).includes(value);
}
