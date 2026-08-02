const crypto = require('crypto');
const config = require('../config/env');

const ALGORITHM = 'aes-256-cbc';

function getKey() {
    return Buffer.from(config.security.encryptionKey, 'utf8');
}

function encrypt(text) {

    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        getKey(),
        iv
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
        iv: iv.toString('hex'),
        data: encrypted
    };
}

function decrypt(payload) {

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getKey(),
        Buffer.from(payload.iv, 'hex')
    );

    let decrypted = decipher.update(payload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
};
