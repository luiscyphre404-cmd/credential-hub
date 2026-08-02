const Redis = require('ioredis');
const config = require('./env');

let client = null;

function getRedis() {

    if (client) {
        return client;
    }

    client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        maxRetriesPerRequest: 3
    });

    client.on('connect', () => {
        console.log('[Redis] Connected');
    });

    client.on('error', (err) => {
        console.error('[Redis]', err.message);
    });

    return client;
}

module.exports = getRedis;
