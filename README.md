# OAuth2 Proxy

> This is a proof-of-concept only for demonstration purposes.
> If it's decided this concept is suitable for production, it'll ideally be
> rewritten in Rust.

OAuth2 uses Bearer tokens which usually have short lifetimes and are constantly
changing; this makes caching responses via Varnish hard. This proxy is designed
to forward all incoming requests to Varnish after intercepting the request
headers and converting the Bearer auth tokens into `X-OAuth2-ID` headers, the
backend application can choose to set responses as cachable using `X-OAuth2-ID`
as a value for the `Vary` header.

It also has a mechanism to revoke stateless Bearer auth tokens.

This proxy assume all requests are HTTP, it expects SSL termination to have
already been handled by a load balancer.

# Example Usage

- Update `config.js` to point to your backend application hostname and port.
- Generate your crpytographic keys with `node ./keys.js`
- Generate a test token with `node ./token.js 123`
- Run the proxy with `node ./index.js`
- Make a request to `http://localhost:80`, you should see a valid response from your backend application.
- Make a request to `http://localhost:80` with the header `Authorization: Bearer ${TOKEN}`, your backend application should see a `X-OAuth2-ID: 123` request header.
- Send the ID `123` as the request body in a POST request to `http://localhost:8080` to revoke any tokens for that ID issued before this POST request: `curl -XPOST -d 123 http://localhost:8080`
- Make another request to `http://localhost:80` with the header `Authorization: Bearer ${TOKEN}`, your backend application should see a `X-OAuth2-Error: revoked` request header.
