export class CredentialMetadata {
  constructor({
    displayName = null,
    description = null,
    scopes = [],
    tags = [],
    expiresAt = null,
    custom = {}
  } = {}) {
    this.displayName = displayName;
    this.description = description;
    this.scopes = Object.freeze([...scopes]);
    this.tags = Object.freeze([...tags]);
    this.expiresAt = expiresAt ? new Date(expiresAt) : null;
    this.custom = Object.freeze({ ...custom });

    Object.freeze(this);
  }

  toJSON() {
    return {
      displayName: this.displayName,
      description: this.description,
      scopes: this.scopes,
      tags: this.tags,
      expiresAt: this.expiresAt ? this.expiresAt.toISOString() : null,
      custom: this.custom
    };
  }

  static from(data = {}) {
    if (data instanceof CredentialMetadata) return data;
    return new CredentialMetadata(data);
  }
}
