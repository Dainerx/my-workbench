/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const cp = require("child_process");
const util_1 = require("./util");
const goPath_1 = require("./goPath");
const goInstallTools_1 = require("./goInstallTools");
function getWorkspaceSymbols(workspacePath, query, token, goConfig, ignoreFolderFeatureOn = true) {
    if (!goConfig) {
        goConfig = vscode.workspace.getConfiguration('go', vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri : null);
    }
    let gotoSymbolConfig = goConfig['gotoSymbol'];
    let calls = [];
    let ignoreFolders = gotoSymbolConfig ? gotoSymbolConfig['ignoreFolders'] : [];
    let baseArgs = (ignoreFolderFeatureOn && ignoreFolders && ignoreFolders.length > 0) ? ['-ignore', ignoreFolders.join(',')] : [];
    calls.push(callGoSymbols([...baseArgs, workspacePath, query], token));
    if (gotoSymbolConfig.includeGoroot) {
        let gorootCall = getGoroot()
            .then(goRoot => callGoSymbols([...baseArgs, goRoot, query], token));
        calls.push(gorootCall);
    }
    return Promise.all(calls)
        .then(([...results]) => [].concat(...results))
        .catch((err) => {
        if (err && err.code === 'ENOENT') {
            goInstallTools_1.promptForMissingTool('go-symbols');
        }
        if (err.message.startsWith('flag provided but not defined: -ignore')) {
            goInstallTools_1.promptForUpdatingTool('go-symbols');
            return getWorkspaceSymbols(workspacePath, query, token, goConfig, false);
        }
    });
}
exports.getWorkspaceSymbols = getWorkspaceSymbols;
function callGoSymbols(args, token) {
    let gosyms = util_1.getBinPath('go-symbols');
    let env = util_1.getToolsEnvVars();
    let p;
    if (token) {
        token.onCancellationRequested(() => util_1.killProcess(p));
    }
    return new Promise((resolve, reject) => {
        p = cp.execFile(gosyms, args, { maxBuffer: 1024 * 1024, env }, (err, stdout, stderr) => {
            if (err && stderr && stderr.startsWith('flag provided but not defined: -ignore')) {
                return reject(new Error(stderr));
            }
            else if (err) {
                return reject(err);
            }
            let result = stdout.toString();
            let decls = JSON.parse(result);
            return resolve(decls);
        });
    });
}
function getGoroot() {
    let goExecutable = goPath_1.getGoRuntimePath();
    if (!goExecutable) {
        return Promise.reject(new Error('Cannot find "go" binary. Update PATH or GOROOT appropriately'));
    }
    return new Promise((resolve, reject) => {
        cp.execFile(goExecutable, ['env', 'GOROOT'], (err, stdout) => {
            if (err) {
                reject(err);
                return;
            }
            let [goRoot] = stdout.split('\n');
            resolve(goRoot.trim());
        });
    });
}
//# sourceMappingURL=goSymbol.js.map