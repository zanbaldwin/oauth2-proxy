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
