import { readFileSync } from 'node:fs';
import net from 'node:net';
import tls from 'node:tls';

export type Rules = Record<
  string,
  {
    address?: string;
    port?: number;
  }
>;
type RulesParsed = Array<
  [
    RegExp,
    {
      id: string;
      address?: string;
      port?: number;
    },
  ]
>;
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
  const port = options.port ?? (options.cert ? 443 : 80);
  const rules = Object.entries(options.rules).map(([k, v]) => {
    const split = k.split('/');
    return [new RegExp(split.slice(1, -1).join('/'), split.at(-1)), { ...v, id: k }];
  }) as RulesParsed;
  if (options.cert)
    tls
      .createServer(
        {
          cert: readFileSync(options.cert, 'utf8'),
          ...(options.key && { key: readFileSync(options.key, 'utf8') }),
          ...(options.ca && { ca: readFileSync(options.ca, 'utf8') }),
          ...((options.serverOpts ?? {}) as tls.TlsOptions),
        },
        (socket) => handler(socket, rules),
      )
      .listen(port, onReady);
  else net.createServer(options.serverOpts ?? {}, (socket) => handler(socket, rules)).listen(port, onReady);

  function onReady() {
    if (options.verbose) {
      console.log(`Running reverse proxy on port ${port}.`);
      const rulesLog = Object.entries(options.rules)
        .map(([k, v]) => `${k}=${v.address ?? '127.0.0.1'}:${v.port ?? 443}`)
        .join('\n');
      console.log(`Options:\n${rulesLog}`);
    }
  }
}

function handler(socket: net.Socket, rules: RulesParsed) {
  const openSockets = new Map<string, net.Socket>();
  let current: net.Socket;
  function destroy() {
    socket.destroy();
    for (const openSocket of openSockets.values()) openSocket.destroy();
    openSockets.clear();
  }
  socket.on('data', (packet) => {
    try {
      const data = packet.toString();
      const end = data.indexOf(' HTTP');
      if (end !== -1) {
        const url = data.slice(data.indexOf(' ') + 1, end);
        const destination = rules.find(([p]) => p.test(url))?.[1];
        if (!destination) throw new Error('Unknown route');
        else if (openSockets.has(destination.id)) current = openSockets.get(destination.id)!;
        else {
          current = net.createConnection(destination.port ?? 443, destination.address ?? '127.0.0.1');
          current.on('error', (e) => {
            console.error(e);
            destroy();
          });
          openSockets.set(destination.id, current);
          current.pipe(socket, {
            end: false,
          });
          current.once('end', () => {
            current.destroy();
            openSockets.delete(destination.id);
            if (openSockets.size === 0) socket.destroy();
          });
        }
      }

      if (!current) throw new Error('Only HTTP/1.X is supported');
      if (current.closed) throw new Error('End socket connection is closed');
      if (current.writableNeedDrain) {
        socket.pause();
        current.once('drain', () => {
          current.write(packet);
          socket.resume();
        });
      } else current.write(packet);
    } catch (e) {
      console.error(e);
      destroy();
    }
  });
  socket.on('error', (e) => {
    console.error(e);
    destroy();
  });
}
