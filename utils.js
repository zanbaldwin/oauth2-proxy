const crypto = require('crypto');
const fs = require('fs');
const paseto = require('paseto');
const config = require('./config.js');

const publicKey = crypto.createPublicKey({
    key: fs.readFileSync(config.token.key.public),
    format: 'pem',
});

module.exports = {

    extractBearerAuthTokenFromHeaders: function (headers) {
        const authHeader = headers["authorization"] || headers["Authorization"];
        if (authHeader !== undefined) {
            if (authHeader.substr(0, 7) === "Bearer ") {
                return authHeader.substr(7);
            }
            console.debug(`\tAuthorization header present but didn't contain a OAuth2 bearer token.`);
            throw 'corrupt';
        }
        console.debug(`\tAuthorization header missing from request.`);
        throw 'missing';
    },

    getPasetoTokenPayload: async function (authToken) {
        let payload = undefined;
        try {
            payload = await paseto.V2.verify(authToken, publicKey, {
                issuer: config.token.issuer,
            });
        } catch (err) {
            console.warn(`\tBearer auth token could not be verified as valid Paseto token.`);
            throw 'invalid';
        }
        if (payload['id'] === undefined) {
            console.warn(`\tBearer auth token did not contain ID in payload.`)
            throw 'unidentifiable';
        }
        payload['id'] = payload['id'].toString();
        return payload;
    },

    checkPayloadIdHasNotBeenRevoked: function (payload, revocationList) {
        if (revocationList[payload['id']] !== undefined && typeof revocationList[payload['id']] === 'number') {
            const revokedAt = revocationList[payload['id']] * 1000;
            const issuedAt = Date.parse(payload['iat']);
            if (Number.isNaN(issuedAt)) {
                console.warn(`\tAuth token for ID "${payload['id']}" did not contain a valid issue date.`);
                throw 'invalid';
            }
            if (issuedAt < revokedAt) {
                console.error(`\tAuth token for ID "${payload['id']}" has been revoked.`);
                throw 'revoked';
            }
        }
    },

    convertTokenPayloadToAdditionalHeaders: function (payload) {
        let additionalHeaders = {};
        additionalHeaders['X-OAuth2-ID'] = payload['id'];
        if (payload['scope'] !== undefined) {
            additionalHeaders['X-OAuth2-Scope'] = JSON.stringify(payload['scope']);
        }
        return additionalHeaders;
    },

    getPrintableRevocationList: function (revocationList) {
        let body = '';
        Object.entries(revocationList).forEach(entry => {
            const [id, timestamp] = entry;
            body += timestamp.toString() + ' ' + id + "\n";
        });
        return body;
    },

};
