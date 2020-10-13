const crypto = require('crypto');
const fs = require('fs');
const config = require('./config.js');

const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
fs.writeFileSync(config.token.key.private, privateKey.export({
    format: 'pem',
    type: 'pkcs8',
}))
fs.writeFileSync(config.token.key.public, publicKey.export({
    format: 'pem',
    type: 'spki',
}));
