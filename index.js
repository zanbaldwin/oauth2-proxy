const http = require('http');
const url = require('url');
const config = require('./config.js');
const utils = require('./utils.js');

// This in-memory revocation list would be better backed by something like Redis,
// but this is a proof-of-concept so I'm (a) not going to implement that, or
// (b) do any kind of research to work out the overhead of such calls or whether
// there's a better way of having a central repository of revoked IDs that
// multiple instances of this script could check.
/** @var Object<string>[integer] $revocationList */
let revocationList = {};
// Automatic Garbage Collection: delete unnecessary revocation targets every 60 seconds.
const revocationGarbageCollection = setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    let removed = 0;
    Object.entries(revocationList).forEach(entry => {
        const [id, timestamp] = entry;
        if (timestamp + config.token.lifetime < now) {
            removed++;
            delete revocationList[id];
        }
    });
    removed > 0 && console.log(`Removed ${removed} revocation(s) due to expiration timeouts.`);
}, 60 * 1000);

const adminServer = http.createServer(async function (request, response) {
    switch (request.method) {
        case 'GET':
            const body = utils.getPrintableRevocationList(revocationList);
            response.writeHead(200, {
                'Content-Type': 'text/plain',
                'Content-Length': body.length,
            }).write(body).end();
            return;
        case 'POST':
            let id = '';
            request.on('data', chunk => id += chunk).on('end', () => {
                if (id !== '' && !id.match(/[^\x20-\x7E]/g)) {
                    const now = new Date;
                    revocationList[id] = Math.floor(now.valueOf() / 1000);
                    console.info(`Revoking tokens for ID "${id}" issued before "${now.toISOString()}".`);
                    response.writeHead(200, 'OK', {'Content-Length': 0}).end();
                } else {
                    response.writeHead(400, 'Bad Request', {'Content-Length': 0}).end();
                }
            });
            return;
    }
    response.writeHead(405, 'Method Not Allowed');
    response.end();
});

const processIncomingRequestHeaders = async function (headers) {
    let additionalHeaders = {};
    try {
        const authToken = utils.extractBearerAuthTokenFromHeaders(headers);
        ["Authorization", config.headers.error, ...config.headers.disallowed].forEach(function (headerName) {
            delete headers[headerName];
            delete headers[headerName.toLowerCase()];
        });
        if (authToken) {
            const payload = await utils.getPasetoTokenPayload(authToken);
            utils.checkPayloadIdHasNotBeenRevoked(payload, revocationList);
            additionalHeaders = utils.convertTokenPayloadToAdditionalHeaders(payload);
        }
    } catch (err) {
        additionalHeaders = {[config.headers.error]: err};
    }
    return {...headers, ...additionalHeaders};
};

const proxyServer = http.createServer(async function (request, response) {
    console.info(`Forwarding request "${request.method} ${url.parse(request.url).path}".`);
    const headers = await processIncomingRequestHeaders(request.headers);
    let connector = http.request({
        host: config.servers.proxy.forward.hostname,
        port: config.servers.proxy.forward.port,
        path: url.parse(request.url).path,
        method: request.method,
        headers: headers,
    }, backend => {
        response.headersSent || response.writeHead(backend.statusCode, backend.headers);
        backend.pipe(response);
    });
    request
        .on('data', chunk => connector.write(chunk))
        .on('end', () => connector.end());
    request.pipe(connector, {end: true});
});

proxyServer.listen(config.servers.proxy.port);
console.log(`Forwarding connections on port ${config.servers.proxy.port} to "${config.servers.proxy.forward.hostname}:${config.servers.proxy.forward.port}".`);
adminServer.listen(config.servers.admin.port);
console.log(`Admin revocation service listening on port ${config.servers.admin.port}.`);
