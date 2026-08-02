export function oauthConfigurationValue({
  providerConfiguration = {},
  field,
  config,
  environmentKey,
  required = true
}) {
  const configured = providerConfiguration?.[field];
  if (configured !== undefined && configured !== null && String(configured).trim() !== '') {
    return configured;
  }

  const fallback = config?.get?.(environmentKey)
    ?? (required ? config?.require?.(environmentKey) : null)
    ?? null;
  if (fallback !== null && fallback !== undefined && String(fallback).trim() !== '') {
    return fallback;
  }

  if (!required) return null;

  const error = new Error('Required provider configuration is missing');
  error.code = 'PROVIDER_CONFIGURATION_MISSING';
  error.statusCode = 400;
  throw error;
}
