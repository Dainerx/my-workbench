/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const _ = require("lodash");
const goRunTestCodelens_1 = require("./goRunTestCodelens");
const goInstallTools_1 = require("./goInstallTools");
const goMode_1 = require("./goMode");
const goTest_1 = require("./goTest");
const util_1 = require("./util");
const goPath_1 = require("./goPath");
const diags_1 = require("./diags");
const goBaseCodelens_1 = require("./goBaseCodelens");
const goCover_1 = require("./goCover");
const DEBOUNCE_WAIT_TIME_MS = 200;
function activate(ctx) {
    goCover_1.initGoCover(ctx);
    diags_1.initDiagnosticCollection(ctx);
    let testCodeLensProvider = new goRunTestCodelens_1.GoRunTestCodeLensProvider();
    ctx.subscriptions.push(vscode.languages.registerCodeLensProvider(goMode_1.GO_MODE, testCodeLensProvider));
    goBaseCodelens_1.setDefaultCodeLens(testCodeLensProvider);
    ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        let updatedGoConfig = vscode.workspace.getConfiguration('go', vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri : null);
        goInstallTools_1.updateGoPathGoRootFromConfig();
        // If there was a change in "toolsGopath" setting, then clear cache for go tools
        if (util_1.getToolsGopath() !== util_1.getToolsGopath(false)) {
            goPath_1.clearCacheForTools();
        }
        if (updatedGoConfig['enableCodeLens']) {
            testCodeLensProvider.setEnabled(updatedGoConfig['enableCodeLens']['autoruntest']);
        }
    }));
    vscode.languages.setLanguageConfiguration(goMode_1.GO_MODE.language, {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    });
    // Only watch Go files. The vscode filesystem watcher does
    // not support more complex matching patterns, otherwise we'd use
    // a narrower filter that skipped gitignore files.
    let watcher = vscode.workspace.createFileSystemWatcher(path.join(vscode.workspace.rootPath, '**', '*.go'));
    let onChange = _.debounce(goTest_1.maybeAutorunTestsOnChange, DEBOUNCE_WAIT_TIME_MS);
    watcher.onDidChange(onChange);
    watcher.onDidChange(_.debounce(goTest_1.updatePinnedTestLocation, DEBOUNCE_WAIT_TIME_MS));
    watcher.onDidCreate(onChange);
    watcher.onDidDelete(onChange);
    ctx.subscriptions.push(watcher);
    ctx.subscriptions.push(vscode.commands.registerCommand('go.autotest.pin', (args) => {
        let goConfig = vscode.workspace.getConfiguration('go', vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri : null);
        goTest_1.pinTestAtCursor(goConfig, false, args);
    }));
    ctx.subscriptions.push(vscode.commands.registerCommand('go.autotest.clear', goTest_1.clearPinnedTest));
    ctx.subscriptions.push(vscode.commands.registerCommand('go.autotest.show', goTest_1.showAutorunTest));
    ctx.subscriptions.push(vscode.commands.registerCommand('go.autotest.showFile', goTest_1.showAutotestFileOutput));
    // Automatically run the tests if:
    // 1) There's a test file open when the extension activates, or
    // 2) The user changes the active text editor to a test file.
    ctx.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(goTest_1.maybeAutotestCurrentFile));
    goTest_1.maybeAutotestCurrentFile();
    vscode.workspace.onDidChangeTextDocument(goCover_1.removeCodeCoverage, null, ctx.subscriptions);
    vscode.window.onDidChangeActiveTextEditor(goCover_1.getCodeCoverage, null, ctx.subscriptions);
}
exports.activate = activate;
function deactivate() {
    return util_1.disposeTelemetryReporter();
}
exports.deactivate = deactivate;
//# sourceMappingURL=goMain.js.map