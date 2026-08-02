import path from 'node:path';

export class AuditLogStore {
  constructor({ jsonStore, basePath }) {
    if (!jsonStore?.load || !jsonStore?.save) {
      throw new Error('AuditLogStore requires JsonStore');
    }

    this.jsonStore = jsonStore;
    this.filePath = path.join(basePath, 'audit-log.json');
  }

  async load() {
    return this.jsonStore.load(this.filePath);
  }

  async save(data) {
    await this.jsonStore.save(this.filePath, data);
  }
}
