export class Container {
  constructor() {
    this.definitions = new Map();
    this.instances = new Map();
  }

  singleton(token, factory) {
    this.#register(token, factory, 'singleton');
  }

  transient(token, factory) {
    this.#register(token, factory, 'transient');
  }

  resolve(token) {
    if (!this.definitions.has(token)) {
      throw new Error(`Container token not registered: ${String(token)}`);
    }

    const definition = this.definitions.get(token);

    if (definition.lifetime === 'singleton') {
      if (!this.instances.has(token)) {
        this.instances.set(token, definition.factory(this));
      }

      return this.instances.get(token);
    }

    return definition.factory(this);
  }

  has(token) {
    return this.definitions.has(token);
  }

  #register(token, factory, lifetime) {
    if (!token) {
      throw new Error('Container token is required');
    }

    if (typeof factory !== 'function') {
      throw new Error(`Container factory must be a function: ${String(token)}`);
    }

    if (this.definitions.has(token)) {
      throw new Error(`Container token already registered: ${String(token)}`);
    }

    this.definitions.set(token, { factory, lifetime });
  }
}
