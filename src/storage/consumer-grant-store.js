import path from 'node:path';

export class ConsumerGrantStore {
  constructor({ jsonStore, basePath }) {
    if (!jsonStore?.load || !jsonStore?.save || !jsonStore?.exists) {
      throw new Error('ConsumerGrantStore requires JsonStore');
    }

    this.jsonStore = jsonStore;
    this.filePath = path.join(basePath, 'consumer-grants.json');
  }

  async load() {
    if (!(await this.jsonStore.exists(this.filePath))) return { grants: [] };
    const data = await this.jsonStore.load(this.filePath);
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.grants)) {
      throw new Error('ConsumerGrantStore: invalid consumer grant collection');
    }
    return { ...data, grants: [...data.grants] };
  }

  async save(data) {
    if (!data || !Array.isArray(data.grants)) {
      throw new Error('ConsumerGrantStore: grants must be an array');
    }
    await this.jsonStore.save(this.filePath, { ...data, grants: [...data.grants] });
  }
}
