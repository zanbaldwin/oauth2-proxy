module.exports = {
    headers: {
        error: 'X-OAuth2-Error',
        disallowed: [
            'X-OAuth2-ID',
            'X-OAuth2-Scope',
        ],
    },
    servers: {
        admin: {
            port: 8080,
        },
        proxy: {
            port: 80,
            forward: {
                hostname: 'nginx',
                port: '80'
            }
        }
    },
    token: {
        lifetime: 60 * 60,
        issuer: 'SmarterQueue',
        key: {
            private: '/data/key',
            public: '/data/key.pub',
        },
    },
};
