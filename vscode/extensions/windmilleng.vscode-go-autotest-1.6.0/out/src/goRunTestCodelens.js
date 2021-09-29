/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const vscode_1 = require("vscode");
const testUtils_1 = require("./testUtils");
const goBaseCodelens_1 = require("./goBaseCodelens");
const goTest_1 = require("./goTest");
class GoRunTestCodeLensProvider extends goBaseCodelens_1.GoBaseCodeLensProvider {
    provideCodeLenses(document, token) {
        if (!this.enabled) {
            return [];
        }
        let config = vscode.workspace.getConfiguration('go', document.uri);
        let codeLensConfig = config.get('enableCodeLens');
        let codelensEnabled = codeLensConfig ? codeLensConfig['runtest'] : false;
        if (!codelensEnabled || !document.fileName.endsWith('_test.go')) {
            return [];
        }
        return this.getCodeLensForFunctions(config, document, token);
    }
    getCodeLensForFunctions(vsConfig, document, token) {
        const codelens = [];
        const testPromise = testUtils_1.getTestFunctions(document, token).then(testFunctions => {
            let pinTestResult = goTest_1.getLastAutorunTestResult();
            let fileTestResult = goTest_1.getLastAutotestFileResult();
            testFunctions.forEach(func => {
                let autorun = goTest_1.currentAutorunTestConfig();
                if (autorun && autorun.functions &&
                    autorun.functions.findIndex((f) => f.name === func.name) !== -1) {
                    codelens.push(new vscode_1.CodeLens(func.location.range, {
                        title: 'remove pin',
                        command: 'go.autotest.clear'
                    }));
                    if (pinTestResult && (func.name in pinTestResult.tests)) {
                        let success = pinTestResult.tests[func.name];
                        let title = success ? 'output (ok)' : 'output (FAIL)';
                        codelens.push(new vscode_1.CodeLens(func.location.range, {
                            title: title,
                            command: 'go.autotest.show',
                            arguments: [{ success }],
                        }));
                    }
                }
                else {
                    codelens.push(new vscode_1.CodeLens(func.location.range, {
                        title: 'pin test',
                        command: 'go.autotest.pin',
                        arguments: [{ symbol: func }]
                    }));
                    if (fileTestResult && (func.name in fileTestResult.tests)) {
                        let success = fileTestResult.tests[func.name];
                        let title = success ? 'output (ok)' : 'output (FAIL)';
                        codelens.push(new vscode_1.CodeLens(func.location.range, {
                            title: title,
                            command: 'go.autotest.showFile',
                            arguments: [{ success }],
                        }));
                    }
                }
            });
        });
        return testPromise.then(() => codelens);
    }
}
exports.GoRunTestCodeLensProvider = GoRunTestCodeLensProvider;
//# sourceMappingURL=goRunTestCodelens.js.map