export function normalizeSecretNames(secretNames) {
  return [...new Set((secretNames ?? []).map((name) => String(name).trim()).filter(Boolean))].sort();
}

export function normalizedGrantConfiguration(configuration = {}) {
  return {
    grantId: configuration.grantId ?? null,
    consumerId: configuration.consumerId ?? null,
    credentialId: configuration.credentialId ?? null,
    providerKey: configuration.providerKey ?? null,
    secretNames: normalizeSecretNames(configuration.secretNames)
  };
}

export function sameGrantBinding(left, right) {
  return Boolean(left && right)
    && left.consumerId === right.consumerId
    && left.credentialId === right.credentialId
    && left.providerKey === right.providerKey;
}

export function sameGrantConfiguration(left, right) {
  return sameGrantBinding(left, right)
    && normalizeSecretNames(left?.secretNames).join('\u0000') === normalizeSecretNames(right?.secretNames).join('\u0000');
}

export async function synchronizeGrant({ api, savedGrant, configuration }) {
  const current = normalizedGrantConfiguration(configuration);
  const payload = {
    consumerId: current.consumerId,
    credentialId: current.credentialId,
    providerKey: current.providerKey,
    secretNames: current.secretNames
  };
  const loadBinding = async () => {
    const query = new URLSearchParams({ consumerId: current.consumerId, credentialId: current.credentialId, providerKey: current.providerKey });
    const body = await api(`/api/v1/management/consumer-grants?${query.toString()}`);
    return (body?.data ?? []).find((grant) => sameGrantBinding(grant, current)) ?? null;
  };
  const save = (grant) => normalizedGrantConfiguration(grant);
  let existing = sameGrantBinding(savedGrant, current) ? savedGrant : await loadBinding();

  if (existing && sameGrantConfiguration(existing, current)) return save(existing);
  if (existing) return save((await api(`/api/v1/management/consumer-grants/${encodeURIComponent(existing.grantId)}`, { method: 'PUT', body: JSON.stringify(payload) }))?.data ?? existing);

  try {
    return save((await api('/api/v1/management/consumer-grants', { method: 'POST', body: JSON.stringify(payload) }))?.data ?? current);
  } catch (error) {
    if (error?.code !== 'CONSUMER_GRANT_DUPLICATE') throw error;
    existing = await loadBinding();
    if (!existing) throw error;
    if (sameGrantConfiguration(existing, current)) return save(existing);
    return save((await api(`/api/v1/management/consumer-grants/${encodeURIComponent(existing.grantId)}`, { method: 'PUT', body: JSON.stringify(payload) }))?.data ?? existing);
  }
}
