const RedisStorage = require('../storage/redisStorage');
const BackupStorage = require('../storage/backupStorage');

class TokenService {

    constructor() {
        this.redis = new RedisStorage();
        this.backup = new BackupStorage();
    }

    async saveToken(provider, tokenData) {

        await this.redis.save(provider, tokenData);

        await this.backup.save(provider, tokenData);

    }

    async getToken(provider) {

        return await this.redis.get(provider);

    }

}

module.exports = TokenService;
