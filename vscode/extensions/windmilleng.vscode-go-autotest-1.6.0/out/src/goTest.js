/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const os = require("os");
const testUtils_1 = require("./testUtils");
const util_1 = require("./util");
const diags_1 = require("./diags");
const goBaseCodelens_1 = require("./goBaseCodelens");
const goCover_1 = require("./goCover");
let autorunTestConfig;
let lastAutorunTestResult;
let autorunTestStart;
let autotestFileConfig;
let lastAutotestFileResult;
// Returns a promise that completes when the configuration is set.
function pinTestAtCursor(goConfig, isBenchmark, args) {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No editor is active.');
        return Promise.resolve(true);
    }
    if (!editor.document.fileName.endsWith('_test.go')) {
        vscode.window.showInformationMessage('No tests found. Current file is not a test file.');
        return Promise.resolve(true);
    }
    cleanUpOldAutotestFileOutput();
    diags_1.autotestDisplay.clear();
    clearPinnedTest();
    util_1.sendTelemetryEvent('autotest-pin', { args }, {});
    const getFunctions = isBenchmark ? testUtils_1.getBenchmarkFunctions : testUtils_1.getTestFunctions;
    const testFlags = testUtils_1.getTestFlags(goConfig, args) || [];
    // TODO(nick): By default, this only runs coverage for the current package.
    // If this is a useful feature, we might make it run coverage for the package
    // you're currently editing as well.
    let coverPath = path.normalize(path.join(os.tmpdir(), 'go-code-cover'));
    testFlags.push('-coverprofile=' + coverPath);
    goCover_1.setCoverProfilePath(coverPath);
    return editor.document.save().then(() => {
        return getFunctions(editor.document, null);
    }).then(testFunctions => {
        let testFunction;
        // We use symbol if it was provided as argument
        // Otherwise find any test function containing the cursor.
        if (args && args.symbol) {
            testFunction = args.symbol;
        }
        else {
            for (let func of testFunctions) {
                let selection = editor.selection;
                if (selection && func.location.range.contains(selection.start)) {
                    testFunction = func;
                    break;
                }
            }
            ;
        }
        if (!testFunction) {
            vscode.window.showInformationMessage('No test function found at cursor.');
            return;
        }
        const testConfig = {
            goConfig: goConfig,
            dir: path.dirname(editor.document.fileName),
            fileName: editor.document.fileName,
            flags: testFlags,
            functions: [testFunction],
            isBenchmark: isBenchmark,
            showTestCoverage: true,
            background: true,
            output: vscode.window.createOutputChannel('Go Test ' + testFunction.name),
        };
        // Remember this config as the autorun test
        autorunTestConfig = testConfig;
        // add some ui for the currently running test
        updatePinStatus();
        diags_1.pinDisplay.displayWaiting(testFunction);
        // focus the problems pane so that we see the new testConfig
        vscode.commands.executeCommand('workbench.action.problems.focus');
        goBaseCodelens_1.rerenderCodeLenses();
        // fire and forget the test
        runPinnedTest();
    });
}
exports.pinTestAtCursor = pinTestAtCursor;
let pinStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
function updatePinStatus() {
    if (autorunTestConfig) {
        let result = getLastAutorunTestResult();
        let fnName = autorunTestConfig.functions[0].name;
        if (result) {
            pinStatus.text = 'Autotest (' + (result.success ? 'ok' : 'FAIL') + '): ' + fnName;
            if (result.success) {
                pinStatus.color = '';
            }
            else {
                pinStatus.color = new vscode.ThemeColor('errorForeground');
            }
        }
        else {
            pinStatus.text = 'Autotest: ' + fnName;
            pinStatus.color = '';
        }
        pinStatus.command = 'go.autotest.show';
        pinStatus.show();
    }
    else {
        pinStatus.hide();
    }
}
function maybeAutorunTestsOnChange() {
    // If there's a pinned test, run that now.
    if (autorunTestConfig) {
        return runPinnedTest();
    }
    // Otherwise, clear any existing autotests.  We don't want to autotest on
    // every save because that makes the edit experience laggy on large files.
    cleanUpOldAutotestFileOutput();
    diags_1.autotestDisplay.clear();
    return Promise.resolve();
}
exports.maybeAutorunTestsOnChange = maybeAutorunTestsOnChange;
function log(msg) {
    console.log(new Date().toLocaleTimeString() + ' ' + msg);
}
function runPinnedTest() {
    if (!autorunTestConfig) {
        return Promise.resolve();
    }
    let fnName = autorunTestConfig.functions[0].name;
    log('Running pinned test ' + fnName);
    return testUtils_1.goTest(autorunTestConfig).then((result) => {
        log('[done] running pinned test ' + fnName);
        lastAutorunTestResult = result;
        diags_1.pinDisplay.clear();
        // If the buildFailed, we still show the pinned results
        // as failures, because the user expects them to be pinned.
        for (let fn of autorunTestConfig.functions) {
            if (!(fn.name in result.tests)) {
                diags_1.pinDisplay.displayUnknown(fn);
            }
            else if (result.tests[fn.name]) {
                diags_1.pinDisplay.displaySuccess(fn);
            }
            else {
                diags_1.pinDisplay.displayFailure(fn);
            }
        }
        updatePinStatus();
    }).then(() => {
        goBaseCodelens_1.rerenderCodeLenses();
        goCover_1.reanalyzeCoverage();
    }, err => {
        console.error(err);
    });
}
function showAutorunTest(args) {
    if (!autorunTestConfig) {
        return;
    }
    let success = args && args.success;
    util_1.sendTelemetryEvent('autotest-showPin', { success: success }, {});
    autorunTestConfig.output.show(true);
}
exports.showAutorunTest = showAutorunTest;
function clearPinnedTest() {
    if (!autorunTestConfig) {
        return;
    }
    let timeTaken = Date.now() - autorunTestStart;
    util_1.sendTelemetryEvent('autotest-clearPin', {}, { timeTaken });
    autorunTestStart = 0;
    autorunTestConfig.output.dispose();
    autorunTestConfig = null;
    lastAutorunTestResult = null;
    updatePinStatus();
    diags_1.pinDisplay.clear();
    goBaseCodelens_1.rerenderCodeLenses();
    goCover_1.clearCoverage();
    goCover_1.clearCoverProfilePath();
}
exports.clearPinnedTest = clearPinnedTest;
function currentAutorunTestConfig() {
    return autorunTestConfig;
}
exports.currentAutorunTestConfig = currentAutorunTestConfig;
function getLastAutorunTestResult() {
    return lastAutorunTestResult;
}
exports.getLastAutorunTestResult = getLastAutorunTestResult;
function getLastAutotestFileResult() {
    return lastAutotestFileResult;
}
exports.getLastAutotestFileResult = getLastAutotestFileResult;
function showAutotestFileOutput(args) {
    if (!autotestFileConfig) {
        return;
    }
    util_1.sendTelemetryEvent('autotestFileOutput-show', { success: args.success }, {});
    autotestFileConfig.output.show(true);
}
exports.showAutotestFileOutput = showAutotestFileOutput;
function isTestFileActive() {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return false;
    }
    return editor.document.fileName.endsWith('_test.go');
}
function maybeAutotestCurrentFile() {
    let oldFileName = autotestFileConfig && autotestFileConfig.fileName;
    cleanUpOldAutotestFileOutput();
    // Don't do this if a test is already pinned.
    if (autorunTestConfig) {
        diags_1.autotestDisplay.clear();
        return Promise.resolve();
    }
    if (!isTestFileActive()) {
        diags_1.autotestDisplay.clear();
        return Promise.resolve();
    }
    let editor = vscode.window.activeTextEditor;
    let goConfig = vscode.workspace.getConfiguration('go', editor ? editor.document.uri : null);
    let output = vscode.window.createOutputChannel('Go Test ' + editor.document.fileName);
    let fileName = editor.document.fileName;
    let dir = path.dirname(fileName);
    if (oldFileName !== fileName) {
        diags_1.autotestDisplay.clear();
    }
    return testUtils_1.getTestFunctions(editor.document, null).then(testFunctions => {
        const testConfig = {
            goConfig: goConfig,
            dir: dir,
            fileName: fileName,
            flags: testUtils_1.getTestFlags(goConfig, []),
            functions: testFunctions,
            background: true,
            output: output,
        };
        autotestFileConfig = testConfig;
        log('Autotesting file ' + fileName);
        return Promise.all([testUtils_1.goTest(testConfig), testFunctions]);
    }).then((resultArray) => {
        log('[done] autotesting file ' + fileName);
        diags_1.autotestDisplay.clear();
        let [result, testFunctions] = resultArray;
        lastAutotestFileResult = result;
        // Don't show failure diagnostics on all tests if they failed
        // to build. It's just noise.
        if (result.buildFailed) {
            return;
        }
        for (let fn of testFunctions) {
            if (result.tests[fn.name] === false) {
                diags_1.autotestDisplay.displayFailure(fn);
            }
        }
    }).then(() => {
        goBaseCodelens_1.rerenderCodeLenses();
    }, (err) => {
        console.error(err);
        return Promise.resolve(false);
    });
}
exports.maybeAutotestCurrentFile = maybeAutotestCurrentFile;
function cleanUpOldAutotestFileOutput() {
    if (autotestFileConfig && autotestFileConfig.output) {
        autotestFileConfig.output.dispose();
        autotestFileConfig = null;
        lastAutotestFileResult = null;
    }
}
exports.cleanUpOldAutotestFileOutput = cleanUpOldAutotestFileOutput;
function updatePinnedTestLocation(u) {
    if (autorunTestConfig && autorunTestConfig.fileName === u.path) {
        // Get all testFunctions from that file
        vscode.workspace.openTextDocument(autorunTestConfig.fileName).then((document) => {
            return testUtils_1.getTestFunctions(document, null);
        }).then(testFunctions => {
            for (let func of testFunctions) {
                if (func.name === autorunTestConfig.functions[0].name) {
                    autorunTestConfig.functions[0].location = func.location;
                    return;
                }
            }
            // if we didn't find the test in this file, assume it was deleted
            clearPinnedTest();
        });
        goBaseCodelens_1.rerenderCodeLenses();
    }
}
exports.updatePinnedTestLocation = updatePinnedTestLocation;
//# sourceMappingURL=goTest.js.map