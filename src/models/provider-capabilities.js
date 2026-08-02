export class ProviderCapabilities {
  #capabilities;

  constructor(capabilities = []) {
    this.#capabilities = new Set(capabilities);
    Object.freeze(this);
  }

  has(capability) {
    return this.#capabilities.has(capability);
  }

  hasAll(capabilities) {
    return capabilities.every(capability => this.has(capability));
  }

  hasAny(capabilities) {
    return capabilities.some(capability => this.has(capability));
  }

  toArray() {
    return [...this.#capabilities];
  }
}
