const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../utils/crypto');

const BACKUP_FILE = '/app/backup/tokens.enc.json';
const BACKUP_TYPE = 'token-manager-backup';
const BACKUP_VERSION = 1;

class BackupStorage {

    readBackup() {
        if (!fs.existsSync(BACKUP_FILE)) {
            return {
                type: BACKUP_TYPE,
                version: BACKUP_VERSION,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                tokens: {}
            };
        }

        const raw = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
        const decrypted = decrypt(raw);
        return JSON.parse(decrypted);
    }

    writeBackup(data) {
        data.updated_at = new Date().toISOString();

        const encrypted = encrypt(JSON.stringify(data, null, 2));

        fs.mkdirSync(path.dirname(BACKUP_FILE), { recursive: true });
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(encrypted, null, 2));
    }

    async save(provider, tokenData) {
        const backup = this.readBackup();

        backup.tokens[provider] = {
            ...tokenData,
            backed_up_at: new Date().toISOString()
        };

        this.writeBackup(backup);

        console.log(`[Backup] ${provider} encrypted backup written`);
    }

    async get(provider) {
        const backup = this.readBackup();
        return backup.tokens[provider] || null;
    }
}

module.exports = BackupStorage;
