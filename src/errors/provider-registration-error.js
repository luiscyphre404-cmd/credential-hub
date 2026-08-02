export class ProviderRegistrationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderRegistrationError';
  }
}
