export function normalizeBasePath(value) {
  if (typeof value !== 'string' || value.trim() === '' || value.trim() === '/') {
    return '/';
  }

  const normalized = `/${value.trim().replace(/^\/+|\/+$/g, '')}`;
  if (!/^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(normalized)) {
    throw new Error('BASE_PATH must be / or a slash-prefixed path without query, fragment, or whitespace');
  }
  return normalized;
}

export function withBasePath(basePath, path) {
  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedBasePath === '/' ? normalizedPath : `${normalizedBasePath}${normalizedPath}`;
}

export function normalizePublicBaseUrl(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;

  let parsed;
  try {
    parsed = new URL(String(value).trim());
  } catch {
    throw new Error('PUBLIC_BASE_URL must be an absolute HTTP(S) URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || (parsed.pathname !== '/' && parsed.pathname !== '')) {
    throw new Error('PUBLIC_BASE_URL must contain only an HTTP(S) origin without credentials, path, query, or fragment');
  }

  return parsed.origin;
}
