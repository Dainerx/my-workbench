"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const path = require("path");
const vscode = require("vscode");
const util = require("util");
const goPath_1 = require("./goPath");
const util_1 = require("./util");
const goOutline_1 = require("./goOutline");
const goPackages_1 = require("./goPackages");
let defaultOutputChannel = vscode.window.createOutputChannel('Go Tests');
function getTestEnvVars(config) {
    const envVars = util_1.getToolsEnvVars();
    const testEnvConfig = config['testEnvVars'] || {};
    let fileEnv = {};
    let testEnvFile = config['testEnvFile'];
    if (testEnvFile) {
        testEnvFile = util_1.resolvePath(testEnvFile);
        try {
            fileEnv = goPath_1.parseEnvFile(testEnvFile);
        }
        catch (e) {
            console.log(e);
        }
    }
    Object.keys(testEnvConfig).forEach(key => envVars[key] = typeof testEnvConfig[key] === 'string' ? util_1.resolvePath(testEnvConfig[key]) : testEnvConfig[key]);
    Object.keys(fileEnv).forEach(key => envVars[key] = typeof fileEnv[key] === 'string' ? util_1.resolvePath(fileEnv[key]) : fileEnv[key]);
    return envVars;
}
exports.getTestEnvVars = getTestEnvVars;
function getTestFlags(goConfig, args) {
    let testFlags = goConfig['testFlags'] ? goConfig['testFlags'] : goConfig['buildFlags'];
    testFlags = [...testFlags]; // Use copy of the flags, dont pass the actual object from config
    return (args && args.hasOwnProperty('flags') && Array.isArray(args['flags'])) ? args['flags'] : testFlags;
}
exports.getTestFlags = getTestFlags;
/**
 * Returns all Go unit test functions in the given source file.
 *
 * @param the URI of a Go source file.
 * @return test function symbols for the source file.
 */
function getTestFunctions(doc, token) {
    let documentSymbolProvider = new goOutline_1.GoDocumentSymbolProvider();
    return documentSymbolProvider
        .provideDocumentSymbols(doc, token)
        .then(symbols => symbols.filter(sym => sym.kind === vscode.SymbolKind.Function
        && (sym.name.startsWith('Test') || sym.name.startsWith('Example'))));
}
exports.getTestFunctions = getTestFunctions;
/**
 * Returns all Benchmark functions in the given source file.
 *
 * @param the URI of a Go source file.
 * @return benchmark function symbols for the source file.
 */
function getBenchmarkFunctions(doc, token) {
    let documentSymbolProvider = new goOutline_1.GoDocumentSymbolProvider();
    return documentSymbolProvider
        .provideDocumentSymbols(doc, token)
        .then(symbols => symbols.filter(sym => sym.kind === vscode.SymbolKind.Function
        && sym.name.startsWith('Benchmark')));
}
exports.getBenchmarkFunctions = getBenchmarkFunctions;
/**
 * Runs go test and presents the output in the 'Go' channel.
 *
 * @param goConfig Configuration for the Go extension.
 */
function goTest(testconfig) {
    let outputChannel = testconfig.output || defaultOutputChannel;
    return new Promise((resolve, reject) => {
        let result = {
            success: false,
            buildFailed: false,
            tests: {}
        };
        outputChannel.clear();
        if (!testconfig.background) {
            outputChannel.show(true);
        }
        let buildTags = testconfig.goConfig['buildTags'];
        let args = ['test', ...testconfig.flags];
        let testType = testconfig.isBenchmark ? 'Benchmarks' : 'Tests';
        if (testconfig.isBenchmark) {
            args.push('-benchmem', '-run=^$');
        }
        else {
            args.push('-timeout', testconfig.goConfig['testTimeout']);
        }
        if (buildTags && testconfig.flags.indexOf('-tags') === -1) {
            args.push('-tags', buildTags);
        }
        let testEnvVars = getTestEnvVars(testconfig.goConfig);
        let goRuntimePath = goPath_1.getGoRuntimePath();
        if (!goRuntimePath) {
            vscode.window.showInformationMessage('Cannot find "go" binary. Update PATH or GOROOT appropriately');
            return resolve(result);
        }
        // Append the package name to args to enable running tests in symlinked directories
        let currentGoWorkspace = goPath_1.getCurrentGoWorkspaceFromGOPATH(util_1.getCurrentGoPath(), testconfig.dir);
        if (currentGoWorkspace && !testconfig.includeSubDirectories) {
            args.push(testconfig.dir.substr(currentGoWorkspace.length + 1));
        }
        targetArgs(testconfig).then(targets => {
            let outTargets = args.slice(0);
            if (targets.length > 2) {
                outTargets.push('<long arguments omitted>');
            }
            else {
                outTargets.push(...targets);
            }
            outputChannel.appendLine(['Running tool:', goRuntimePath, ...outTargets].join(' '));
            outputChannel.appendLine('');
            args.push(...targets);
            let proc = cp.spawn(goRuntimePath, args, { env: testEnvVars, cwd: testconfig.dir });
            const outBuf = new util_1.LineBuffer();
            const errBuf = new util_1.LineBuffer();
            const testResultLineRE = /^[ \t\-]+(ok|FAIL)[ \t\:]+([^ ]+) /; // 1=ok/FAIL, 2=testname
            const packageResultLineRE = /^(ok|FAIL)[ \t]+(.+?)[ \t]+([0-9\.]+s|\(cached\))/; // 1=ok/FAIL, 2=package, 3=time/(cached)
            const buildFailedLineRE = /^FAIL[ \t]+.+? \[build failed\]/;
            const testResultLines = [];
            const processTestResultLine = (line) => {
                testResultLines.push(line);
                const testResult = line.match(testResultLineRE);
                if (testResult) {
                    result.tests[testResult[2]] = testResult[1] === 'ok';
                }
                const packageResult = line.match(packageResultLineRE);
                if (packageResult && currentGoWorkspace) {
                    const packageNameArr = packageResult[2].split('/');
                    const baseDir = path.join(currentGoWorkspace, ...packageNameArr);
                    testResultLines.forEach(line => outputChannel.appendLine(expandFilePathInOutput(line, baseDir)));
                    testResultLines.splice(0);
                }
                const buildFailedLine = line.match(buildFailedLineRE);
                if (buildFailedLine) {
                    result.buildFailed = true;
                }
            };
            // go test emits test results on stdout, which contain file names relative to the package under test
            outBuf.onLine(line => processTestResultLine(line));
            outBuf.onDone(last => {
                if (last)
                    processTestResultLine(last);
                // If there are any remaining test result lines, emit them to the output channel.
                if (testResultLines.length > 0) {
                    testResultLines.forEach(line => outputChannel.appendLine(line));
                }
            });
            // go test emits build errors on stderr, which contain paths relative to the cwd
            errBuf.onLine(line => outputChannel.appendLine(expandFilePathInOutput(line, testconfig.dir)));
            errBuf.onDone(last => last && outputChannel.appendLine(expandFilePathInOutput(last, testconfig.dir)));
            proc.stdout.on('data', chunk => outBuf.append(chunk.toString()));
            proc.stderr.on('data', chunk => errBuf.append(chunk.toString()));
            proc.on('close', code => {
                outBuf.done();
                errBuf.done();
                if (code) {
                    outputChannel.appendLine(`Error: ${testType} failed.`);
                }
                else {
                    outputChannel.appendLine(`Success: ${testType} passed.`);
                }
                result.success = code === 0;
                if (result.success && testconfig.functions) {
                    // In the success case, the Go tool does not give any output.
                    // Populate the testCases manually.
                    for (let fn of testconfig.functions) {
                        result.tests[fn.name] = true;
                    }
                }
                else if (result.buildFailed && testconfig.functions) {
                    for (let fn of testconfig.functions) {
                        result.tests[fn.name] = false;
                    }
                }
                resolve(result);
            });
        }, err => {
            outputChannel.appendLine(`Error: ${testType} failed.`);
            outputChannel.appendLine(err);
            resolve(result);
        });
    });
}
exports.goTest = goTest;
function expandFilePathInOutput(output, cwd) {
    let lines = output.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let matches = lines[i].match(/^\s*(.+.go):(\d+):/);
        if (matches && matches[1] && !path.isAbsolute(matches[1])) {
            lines[i] = lines[i].replace(matches[1], path.join(cwd, matches[1]));
        }
    }
    return lines.join('\n');
}
/**
 * Get the test target arguments.
 *
 * @param testconfig Configuration for the Go extension.
 */
function targetArgs(testconfig) {
    if (testconfig.functions) {
        let names = testconfig.functions.map((f) => f.name);
        return Promise.resolve([testconfig.isBenchmark ? '-bench' : '-run', util.format('^%s$', names.join('|'))]);
    }
    else if (testconfig.includeSubDirectories && !testconfig.isBenchmark) {
        return util_1.getGoVersion().then((ver) => {
            if (ver && (ver.major > 1 || (ver.major === 1 && ver.minor >= 9))) {
                return ['./...'];
            }
            return goPackages_1.getNonVendorPackages(testconfig.dir);
        });
    }
    return Promise.resolve([]);
}
//# sourceMappingURL=testUtils.js.map