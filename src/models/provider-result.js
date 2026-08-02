export class ProviderResult {
  constructor({ success, data = null, error = null }) {
    this.success = Boolean(success);
    this.data = data;
    this.error = error;

    Object.freeze(this);
  }

  static success(data = null) {
    return new ProviderResult({
      success: true,
      data,
      error: null
    });
  }

  static failure(error) {
    return new ProviderResult({
      success: false,
      data: null,
      error: ProviderResult.normalizeError(error)
    });
  }

  static normalizeError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
        ...(error.statusCode ? { statusCode: error.statusCode } : {}),
        ...(error.status ? { status: error.status } : {})
      };
    }

    if (typeof error === 'object' && error !== null) {
      return {
        name: error.name ?? 'ProviderError',
        message: error.message ?? JSON.stringify(error),
        ...error
      };
    }

    return {
      name: 'ProviderError',
      message: String(error)
    };
  }
}
