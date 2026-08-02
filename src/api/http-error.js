export class HttpError extends Error {
  constructor({
    message,
    status,
    url,
    response,
    body
  }) {
    super(message);

    this.name = 'HttpError';

    this.status = status;
    this.url = url;
    this.response = response;
    this.body = body;

    const providerCode = typeof body?.error === 'string'
      ? body.error
      : body?.error?.code ?? body?.code;
    if (typeof providerCode === 'string' && providerCode.toLowerCase() === 'redirect_uri_mismatch') {
      this.code = 'OAUTH_REDIRECT_URI_MISMATCH';
    }
  }
}
