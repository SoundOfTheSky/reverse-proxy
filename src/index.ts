
import {readFileSync} from 'node:fs';
import net from 'node:net';
import tls from 'node:tls';

export type Rules = Record<string, {
	address?: string;
	port?: number;
}>;
type RulesParsed = Array<[RegExp, {
	address?: string;
	port?: number;
}]>;
type ReverseProxyNetOptions = {
	rules: Rules;
	port?: number;
	verbose?: boolean;
	serverOpts?: net.ServerOpts;
	key?: string;
	cert?: string;
	ca?: string;
};
type ReverseProxyTlsOptions = {
	rules: Rules;
	port?: number;
	verbose?: boolean;
	serverOpts?: tls.TlsOptions;
	key: string;
	cert: string;
	ca?: string;
};
export type ReverseProxyOptions = ReverseProxyNetOptions | ReverseProxyTlsOptions;

export default function revproxy(options: ReverseProxyOptions): void {
	const port = options.port ?? 443;
	const rules = Object.entries(options.rules).map(([k, v]) => [new RegExp(k.split('/').slice(1, -1).join('/'), k.split('/').at(-1)), v]) as RulesParsed;
	if (options.cert) {
		tls.createServer({
			key: readFileSync(process.env.KEY ?? 'privkey.pem', 'utf8'),
			cert: readFileSync(process.env.CERT ?? 'cert.pem', 'utf8'),
			ca: readFileSync(process.env.CHAIN ?? 'chain.pem', 'utf8'),
			...(options.serverOpts ?? {}) as tls.TlsOptions,
		}, socket => {
			handler(socket, rules);
		}).listen(port, onReady);
	} else {
		net.createServer((options.serverOpts ?? {}), socket => {
			handler(socket, rules);
		}).listen(port, onReady);
	}

	function onReady() {
		if (options.verbose) {
			console.log(`Running reverse proxy on port ${port}.`);
			const rulesLog = Object.entries(options.rules).map(([k, v]) => `${k}=${v.address ?? '127.0.0.1'}:${v.port ?? 443}`).join('\n');
			console.log(`Options:\n${rulesLog}`);
		}
	}
}

function handler(socket: net.Socket, rules: RulesParsed) {
	const openSockets = new Map<RegExp, net.Socket>();
	let current: net.Socket;
	function destroy() {
		socket.destroy();
		for (const openSocket of openSockets.values()) {
			openSocket.destroy();
		}
	}

	socket.on('data', packet => {
		const data = packet.toString();
		const end = data.indexOf(' HTTP');
		if (end !== -1) {
			const start = data.indexOf(' ') + 1;
			const url = data.slice(start, end);
			const destination = rules.find(([p]) => p.test(url));
			if (!destination) {
				destroy();
			} else if (openSockets.has(destination[0])) {
				current = openSockets.get(destination[0])!;
			} else {
				current = net.createConnection(destination[1].port ?? 443, destination[1].address ?? '127.0.0.1');
				current.on('error', () => {
					destroy();
				});
				openSockets.set(destination[0], current);
				current.pipe(socket);
			}
		}

		current.write(packet);
	});
	socket.on('error', () => {
		destroy();
	});
}

// Revproxy({
// 	port: 443,
// 	key: 'privkey.pem',
// 	ca: 'chain.pem',
// 	cert: 'cert.pem',
// 	rules: {
// 		'/^/api/': {
// 			port: 8080,
// 		},
// 		'/^//': {
// 			port: 5173,
// 		},
// 	},
// });
