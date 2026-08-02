export class Provider {
  startOAuth() {
    this.#notImplemented('startOAuth');
  }

  async handleOAuthCallback() {
    this.#notImplemented('handleOAuthCallback');
  }

  async refreshToken() {
    this.#notImplemented('refreshToken');
  }

  async validateToken() {
    this.#notImplemented('validateToken');
  }

  async revokeToken() {
    this.#notImplemented('revokeToken');
  }

  async healthCheck() {
    this.#notImplemented('healthCheck');
  }

  #notImplemented(methodName) {
    throw new Error(`${methodName}() must be implemented by the provider`);
  }
}
