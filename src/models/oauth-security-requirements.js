export const OAuthSecurityRequirement = Object.freeze({
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  DISABLED: 'disabled'
});

const ALLOWED_VALUES = new Set(Object.values(OAuthSecurityRequirement));

export class OAuthSecurityRequirements {
  constructor({
    state = OAuthSecurityRequirement.REQUIRED,
    pkce = OAuthSecurityRequirement.DISABLED,
    nonce = OAuthSecurityRequirement.DISABLED
  } = {}) {
    this.state = this.#normalize('state', state);
    this.pkce = this.#normalize('pkce', pkce);
    this.nonce = this.#normalize('nonce', nonce);

    Object.freeze(this);
  }

  static default() {
    return new OAuthSecurityRequirements();
  }

  static from(value = null) {
    if (value instanceof OAuthSecurityRequirements) {
      return value;
    }

    return new OAuthSecurityRequirements(value ?? {});
  }

  requiresState() {
    return this.state === OAuthSecurityRequirement.REQUIRED;
  }

  requiresPkce() {
    return this.pkce === OAuthSecurityRequirement.REQUIRED;
  }

  supportsPkce() {
    return this.pkce !== OAuthSecurityRequirement.DISABLED;
  }

  requiresNonce() {
    return this.nonce === OAuthSecurityRequirement.REQUIRED;
  }

  toJSON() {
    return {
      state: this.state,
      pkce: this.pkce,
      nonce: this.nonce
    };
  }

  #normalize(field, value) {
    const normalized = String(value).toLowerCase();

    if (!ALLOWED_VALUES.has(normalized)) {
      throw new Error(
        `OAuthSecurityRequirements: ${field} must be one of required, optional, disabled`
      );
    }

    return normalized;
  }
}
