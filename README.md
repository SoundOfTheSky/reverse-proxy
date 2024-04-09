# Reverse Proxy Node

>Reverse proxy CLI tool written in JavaScript with RegExp mapping


#### Install:
`npm install -g reverse-proxy-node`

#### Example of usage:
```
reverse-proxy 
    /\.(jpg|png)$/=cdn.com   | Every .png and .jpg is served from cdn.com
    /^/api/=192.168.1.100:8080 | /api => 192.168.1.100:8080
    /^//=:5173                 | Everything else => localhost:5173
    --key privkey.pem 
    --ca chain.pem 
    --cert cert.pem
    --port 443
```

#### Programmatic usage:
```
import RevProxy from 'reverse-proxy-node';
// OR
const RevProxy = require('reverse-proxy-node');

RevProxy({
	port: 443,
	key: 'privkey.pem',
	ca: 'chain.pem',
	cert: 'cert.pem',
	rules: {
	    '/\.(jpg)|(png)$/': {
	        address: 'cdn.com',
	    },
		'/^/api/': {
			port: 8080,
		},
		'/^//': {
			port: 5173,
		},
	},
});
```

#### Options:
- port: <number> | --port <number> | -p <number> **Default: 443 or 80** based on cert
- key: <path> | --key <path>
- cert: <path> | --cert <path>
- ca: <path> | --ca <path>
- serverOpts: net.ServerOpts [Only programmatic usage]
- rules:
```
CLI: /RegExp/=address:port OR /RegExp/=address OR /RegExp/=:port

Programmatic: {
    '/RegExp/': {
        address: 'URL',  // Default 127.0.0.1
        port: <number>   // Default 443 or 80
    }
}
```
