const paseto = require('paseto');
const crypto = require('crypto');
const fs = require('fs');
const config = require('./config.js');

const privateKey = crypto.createPrivateKey({
    key: fs.readFileSync(config.token.key.private),
    format: 'pem',
    type: 'pkcs8',
});

if (process.argv[2] === undefined || typeof process.argv[2] !== 'string' || process.argv[2] === '') {
    console.error('Please provide an ID to generate a token for as the argument after the scriptname.');
    console.error(`For example: ${process.argv[0]} "${process.argv[1]}" "123"`);
    process.exit(1);
}

paseto.V2.sign({
    id: process.argv[2],
}, privateKey, {
    expiresIn: config.token.lifetime.toString() + " seconds",
    issuer: config.token.issuer,
}).then(function (token) {
    console.log(token);
});
