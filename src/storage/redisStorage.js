const getRedis = require('../config/redis');

class RedisStorage {

    async save(provider, tokenData) {

        const redis = getRedis();

        await redis.hset(`tokens:${provider}`, tokenData);

    }

    async get(provider) {

        const redis = getRedis();

        return await redis.hgetall(`tokens:${provider}`);

    }

}

module.exports = RedisStorage;
