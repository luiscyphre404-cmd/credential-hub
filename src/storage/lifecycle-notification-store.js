import path from 'node:path';

export class LifecycleNotificationStore {
  constructor({ jsonStore, basePath }) {
    if (!jsonStore?.load || !jsonStore?.save) {
      throw new Error('LifecycleNotificationStore requires JsonStore');
    }

    this.jsonStore = jsonStore;
    this.filePath = path.join(basePath, 'lifecycle-notifications.json');
  }

  async load() {
    return this.jsonStore.load(this.filePath);
  }

  async save(data) {
    await this.jsonStore.save(this.filePath, data);
  }
}
