/* eslint-disable unicorn/prefer-top-level-await */

const ts = require('typescript');
const fs = require('node:fs/promises');
const {spawn} = require('node:child_process');
const path = require('node:path');

const {resolvePathAliases, on} = require('./utils.cjs');

const DIST_PATH = path.join(__dirname, '..', 'dist');
const SRC_PATH = path.join(__dirname, '..', 'src');

const formatHost = {
	getCanonicalFileName: path => path,
	getCurrentDirectory: ts.sys.getCurrentDirectory,
	getNewLine: () => ts.sys.newLine,
};

function watch() {
	const host = ts.createWatchCompilerHost(
		ts.findConfigFile(path.join(__dirname, '..'), ts.sys.fileExists, 'tsconfig.json'),
		{},
		ts.sys,
		ts.createEmitAndSemanticDiagnosticsBuilderProgram,
		diagnostic => console.log(ts.formatDiagnosticsWithColorAndContext([diagnostic], formatHost)),
		diagnostic => console.log(ts.formatDiagnosticsWithColorAndContext([diagnostic], formatHost)),
	);
	let nodeProcess;
	let startTimeout;
	let lastFilePath;
	on(
		host,
		'readFile',
		path => {
			lastFilePath = path;
		},
		t => lastFilePath.endsWith('.ts') && resolvePathAliases(SRC_PATH, lastFilePath, t),
	);
	on(host, 'afterProgramCreate', undefined, async () => {
		clearTimeout(startTimeout);
		if (nodeProcess) {
			process.kill(nodeProcess.pid);
			nodeProcess = undefined;
		}

		startTimeout = setTimeout(() => {
			nodeProcess = spawn('node', [DIST_PATH, '--max-old-space-size=8000']);
			nodeProcess.on('exit', async code => {
				console.log(`Backend exited with code ${code}`);
				nodeProcess = undefined;
			});
			nodeProcess.stdout.pipe(process.stdout);
			nodeProcess.stderr.pipe(process.stderr);
			process.stdin.pipe(nodeProcess.stdin);
		}, 500);
	});
	ts.createWatchProgram(host);
}

(async () => {
	await fs.rm(DIST_PATH, {recursive: true, force: true});
	await fs.mkdir(DIST_PATH);
	watch();
})();
