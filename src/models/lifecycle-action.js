export const LifecycleAction = Object.freeze({
  CREATE: 'create',
  VALIDATE: 'validate',
  REFRESH: 'refresh',
  REVOKE: 'revoke',
  DELETE: 'delete',
  HEALTH_CHECK: 'health-check'
});

export function isLifecycleAction(value) {
  return Object.values(LifecycleAction).includes(value);
}
