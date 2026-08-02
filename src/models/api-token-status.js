export const ApiTokenStatus = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
});

export function isApiTokenStatus(status) {
  return Object.values(ApiTokenStatus).includes(status);
}
