import fs from 'fs/promises';
import path from 'path';

export class JsonStore {
  async load(filePath) {

  const content = await fs.readFile(filePath, 'utf8');

  return JSON.parse(content);
}

  async save(filePath, data) {
    await this.ensureDirectory(path.dirname(filePath));

    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  }

  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath) {
    if (!(await this.exists(filePath))) {
      return false;
    }

    await fs.unlink(filePath);
    return true;
  }

  async ensureDirectory(directoryPath) {
    await fs.mkdir(directoryPath, { recursive: true });
  }
}
