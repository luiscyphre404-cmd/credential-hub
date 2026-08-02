export async function runGrantResolveAttempt({
  configuration,
  consumerToken,
  synchronizeGrant,
  verifyResolve,
  isCurrentAttempt,
  commitSavedGrant,
  commitVerification,
  consumeToken
}) {
  let savedGrant;
  try {
    savedGrant = await synchronizeGrant(configuration);
  } catch (error) {
    return isCurrentAttempt() ? { status: 'error', phase: 'save', error } : { status: 'stale' };
  }
  if (!isCurrentAttempt()) return { status: 'stale' };
  commitSavedGrant(savedGrant);

  let verification;
  try {
    verification = await verifyResolve({ consumerToken, configuration: savedGrant });
  } catch (error) {
    return isCurrentAttempt() ? { status: 'error', phase: 'resolve', error } : { status: 'stale' };
  }
  if (!isCurrentAttempt()) return { status: 'stale' };
  commitVerification(verification);
  consumeToken?.();
  return { status: 'success', savedGrant, verification };
}

export async function runGrantDiagnosisAttempt({ diagnoseGrant, isCurrentAttempt }) {
  try {
    const diagnostic = await diagnoseGrant();
    return isCurrentAttempt() ? { status: 'success', diagnostic } : { status: 'stale' };
  } catch (error) {
    return isCurrentAttempt() ? { status: 'error', error } : { status: 'stale' };
  }
}
