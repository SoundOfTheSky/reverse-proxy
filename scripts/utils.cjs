/* eslint-disable prefer-rest-params */

const Path = require('node:path');
const fs = require('node:fs/promises');
const importRE = /.*@\//;
function resolvePathAliases(root, filePath, t) {
	root = root.toLowerCase();
	filePath = filePath.toLowerCase();
	if (!filePath.startsWith(root)) {
		return t;
	}

	let element;
	while ((element = importRE.exec(t)) !== null) {
		t = t.replace(
			element[0],
			element[0].slice(0, -2)
        + (Path.relative(filePath.slice(0, filePath.lastIndexOf('/')), root).replaceAll('\\', '/') || '.')
        + '/',
		);
	}

	return t;
}

function on(host, functionName, before, after) {
	const originalFunction = host[functionName];
	host[functionName] = function () {
		if (before) {
			before(...arguments);
		}

		const result = originalFunction(...arguments);
		if (after) {
			const r = after(result);
			if (r) {
				return r;
			}
		}

		return result;
	};
}

async function copy(path, destination) {
	const stat = await fs.stat(path);
	try {
		await fs.rm(destination, {
			force: true,
			maxRetries: 3,
			recursive: true,
		});
	} catch {}

	if (stat.isDirectory()) {
		await fs.mkdir(destination, {
			recursive: true,
		});
		const files = await fs.readdir(path);
		await Promise.all(
			files.map(name =>
				copy(Path.join(path, name), Path.join(destination, name),
				),
			),
		);
	} else {
		await fs.copyFile(path, destination);
	}
}

module.exports = {
	resolvePathAliases,
	on,
	copy,
};
