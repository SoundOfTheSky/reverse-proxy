/* eslint-disable unicorn/prefer-top-level-await */
const {readdir} = require('node:fs/promises');
const {join} = require('node:path');
const {copy} = require('./utils.cjs');

const ROOT_PATH = join(__dirname, '..');
const DIST_PATH = join(ROOT_PATH, 'dist');

(async () => {
	const files = await readdir(DIST_PATH);
	await Promise.all(files.map(name => copy(join(DIST_PATH, name), join(ROOT_PATH, name))));
})();
