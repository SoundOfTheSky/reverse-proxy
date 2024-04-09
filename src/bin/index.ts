#! /usr/bin/env node
import reverseProxy from '../index.js';

function getOption(name: string, shortName?: string) {
  let index = process.argv.indexOf(name);
  if (shortName && index === -1) index = process.argv.indexOf(shortName);
  if (index === -1) return;
  return process.argv[index + 1];
}

const rules = Object.fromEntries(
  process.argv
    .filter((argument) => /^\/.+?\/\w*?=.*/.test(argument))
    .map((element) => {
      const split = element.split('=');
      const [address, port] = split[1].split(':');
      return [
        split[0],
        {
          address: address || undefined,
          port: port ? Number.parseInt(port) : undefined,
        },
      ];
    }),
);

reverseProxy({
  verbose: true,
  port: Number.parseInt(getOption('--port', '-p') ?? '443'),
  rules,
  ca: getOption('--ca'),
  cert: getOption('--cert'),
  key: getOption('--key'),
});
