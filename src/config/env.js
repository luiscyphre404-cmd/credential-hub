const dotenv = require('dotenv');

dotenv.config();

function required(name) {
    const value = process.env[name];

    if (!value || value.trim() === '') {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

const config = {

    redis: {
        host: required('REDIS_HOST'),
        port: Number(required('REDIS_PORT'))
    },

    threads: {
        appSecret: required('THREADS_APP_SECRET'),
        accessToken: required('THREADS_ACCESS_TOKEN')
    },

    security: {
        encryptionKey: required('TOKEN_ENCRYPTION_KEY')
    },

    refreshBeforeDays: Number(process.env.REFRESH_BEFORE_DAYS || 14),

    checkIntervalHours: Number(process.env.CHECK_INTERVAL_HOURS || 12)

};

if (config.security.encryptionKey.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must contain exactly 32 characters.');
}

module.exports = config;
