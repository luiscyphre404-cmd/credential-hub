import path from 'node:path';

export class CredentialPolicyStore {
  constructor({ jsonStore, basePath }) {
    if (!jsonStore?.load || !jsonStore?.save) {
      throw new Error('CredentialPolicyStore requires JsonStore');
    }

    this.jsonStore = jsonStore;
    this.filePath = path.join(basePath, 'credential-policies.json');
  }

  async load() {
    return this.jsonStore.load(this.filePath);
  }

  async save(data) {
    await this.jsonStore.save(this.filePath, data);
  }
}
