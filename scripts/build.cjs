/* eslint-disable unicorn/no-process-exit */

const ts = require('typescript');
const fs = require('node:fs/promises');
const path = require('node:path');

const {resolvePathAliases, on} = require('./utils.cjs');

const formatHost = {
	getCanonicalFileName: path => path,
	getCurrentDirectory: ts.sys.getCurrentDirectory,
	getNewLine: () => ts.sys.newLine,
};

const DIST_PATH = path.join(__dirname, '..', 'dist');
const SRC_PATH = path.join(__dirname, '..', 'src');
const ROOT_NAMES = [path.join(SRC_PATH, 'index.ts'), path.join(SRC_PATH, 'bin', 'index.ts')];
function getTSConfig() {
	const configPath = ts.findConfigFile(path.join(__dirname, '..'), ts.sys.fileExists, 'tsconfig.json');
	const readConfigFileResult = ts.readConfigFile(configPath, ts.sys.readFile);
	if (readConfigFileResult.error) {
		throw new Error(ts.formatDiagnostic(readConfigFileResult.error, formatHost));
	}

	const convertResult = ts.convertCompilerOptionsFromJson(readConfigFileResult.config.compilerOptions, './');
	if (convertResult.errors && convertResult.errors.length > 0) {
		throw new Error(ts.formatDiagnostics(convertResult.errors, formatHost));
	}

	return convertResult.options;
}

async function compile() {
	await fs.rm(DIST_PATH, {recursive: true, force: true, maxRetries: 3});
	const config = getTSConfig();
	const host = ts.createCompilerHost(config);
	let lastFilePath;
	on(
		host,
		'readFile',
		path => {
			lastFilePath = path;
		},
		t => lastFilePath.endsWith('.ts') && resolvePathAliases(SRC_PATH, lastFilePath, t),
	);
	const program = ts.createProgram(ROOT_NAMES, config, host);
	const emitResult = program.emit();
	const allDiagnostics = [...ts.getPreEmitDiagnostics(program), ...emitResult.diagnostics];
	for (const diagnostic of allDiagnostics) {
		if (diagnostic.file) {
			const {line, character} = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
			console.log(
				`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${ts.flattenDiagnosticMessageText(
					diagnostic.messageText,
					'\n',
				)}`,
			);
		} else {
			console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
		}
	}

	process.exit();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
compile();
