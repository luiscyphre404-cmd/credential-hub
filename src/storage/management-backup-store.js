import fs from 'node:fs/promises';
import path from 'node:path';

export class ManagementBackupStore {
  constructor({ jsonStore, basePath }) {
    if (!jsonStore?.load || !jsonStore?.save) {
      throw new Error('ManagementBackupStore requires JsonStore');
    }

    this.jsonStore = jsonStore;
    this.directoryPath = path.join(basePath, 'management-backups');
  }

  async save(backup) {
    await this.jsonStore.save(this.#filePath(backup.backupId), backup);
  }

  async load(backupId) {
    return this.jsonStore.load(this.#filePath(backupId));
  }

  async list() {
    try {
      const entries = await fs.readdir(this.directoryPath);
      return entries
        .filter((entry) => entry.endsWith('.json'))
        .map((entry) => entry.replace(/\.json$/, ''))
        .sort()
        .reverse();
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  #filePath(backupId) {
    return path.join(this.directoryPath, `${backupId}.json`);
  }
}
