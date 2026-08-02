import path from 'node:path';

export class AccessManagementStore {
  constructor({ jsonStore, basePath }) {
    if (!jsonStore?.load || !jsonStore?.save) {
      throw new Error('AccessManagementStore requires JsonStore');
    }

    this.jsonStore = jsonStore;
    this.filePath = path.join(basePath, 'access-management.json');
  }

  async load() {
    return this.jsonStore.load(this.filePath);
  }

  async save(data) {
    await this.jsonStore.save(this.filePath, data);
  }
}
