/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const goStatus_1 = require("./goStatus");
const goPath_1 = require("./goPath");
const goStatus_2 = require("./goStatus");
const util_1 = require("./util");
let updatesDeclinedTools = [];
let installsDeclinedTools = [];
const allTools = {
    'gocode': 'github.com/nsf/gocode',
    'gopkgs': 'github.com/uudashr/gopkgs/cmd/gopkgs',
    'go-outline': 'github.com/ramya-rao-a/go-outline',
    'go-symbols': 'github.com/acroca/go-symbols',
    'guru': 'golang.org/x/tools/cmd/guru',
    'gorename': 'golang.org/x/tools/cmd/gorename',
    'gomodifytags': 'github.com/fatih/gomodifytags',
    'goplay': 'github.com/haya14busa/goplay/cmd/goplay',
    'impl': 'github.com/josharian/impl',
    'gotype-live': 'github.com/tylerb/gotype-live',
    'godef': 'github.com/rogpeppe/godef',
    'godoc': 'golang.org/x/tools/cmd/godoc',
    'gogetdoc': 'github.com/zmb3/gogetdoc',
    'goimports': 'golang.org/x/tools/cmd/goimports',
    'goreturns': 'github.com/sqs/goreturns',
    'goformat': 'winterdrache.de/goformat/goformat',
    'golint': 'github.com/golang/lint/golint',
    'gotests': 'github.com/cweill/gotests/...',
    'gometalinter': 'github.com/alecthomas/gometalinter',
    'megacheck': 'honnef.co/go/tools/...',
    'go-langserver': 'github.com/sourcegraph/go-langserver',
    'dlv': 'github.com/derekparker/delve/cmd/dlv',
    'fillstruct': 'github.com/davidrjenni/reftools/cmd/fillstruct'
};
// Tools used explicitly by the basic features of the extension
const importantTools = [
    'gocode',
    'gopkgs',
    'go-outline',
    'go-symbols',
    'guru',
    'gorename',
    'godef',
    'godoc',
    'gogetdoc',
    'goreturns',
    'goimports',
    'golint',
    'gometalinter',
    'megacheck',
    'dlv'
];
function getTools(goVersion) {
    let goConfig = vscode.workspace.getConfiguration('go', vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri : null);
    let tools = [
        'gocode',
        'gopkgs',
        'go-outline',
        'go-symbols',
        'guru',
        'gorename',
        'gomodifytags',
        'goplay',
        'impl',
        'fillstruct'
    ];
    // Install the doc/def tool that was chosen by the user
    if (goConfig['docsTool'] === 'godoc') {
        tools.push('godef');
        tools.push('godoc');
    }
    else if (goConfig['docsTool'] === 'gogetdoc') {
        tools.push('gogetdoc');
    }
    // Install the formattool that was chosen by the user
    if (goConfig['formatTool'] === 'goimports') {
        tools.push('goimports');
    }
    else if (goConfig['formatTool'] === 'goformat') {
        tools.push('goformat');
    }
    else if (goConfig['formatTool'] === 'goreturns') {
        tools.push('goreturns');
    }
    // golint and gotests are not supported in go1.5
    if (!goVersion || (goVersion.major > 1 || (goVersion.major === 1 && goVersion.minor > 5))) {
        tools.push('golint');
        tools.push('gotests');
    }
    if (goConfig['lintTool'] === 'gometalinter') {
        tools.push('gometalinter');
    }
    if (goConfig['lintTool'] === 'megacheck') {
        tools.push('megacheck');
    }
    if (goConfig['useLanguageServer'] && process.platform !== 'win32') {
        tools.push('go-langserver');
    }
    if (process.platform !== 'darwin') {
        tools.push('dlv');
    }
    return tools;
}
function installAllTools() {
    util_1.getGoVersion().then((goVersion) => installTools(goVersion));
}
exports.installAllTools = installAllTools;
function promptForMissingTool(tool) {
    // If user has declined to install, then don't prompt
    if (installsDeclinedTools.indexOf(tool) > -1) {
        return;
    }
    util_1.getGoVersion().then((goVersion) => {
        if (goVersion && goVersion.major === 1 && goVersion.minor < 6) {
            if (tool === 'golint') {
                vscode.window.showInformationMessage('golint no longer supports go1.5, update your settings to use gometalinter as go.lintTool and install gometalinter');
                return;
            }
            if (tool === 'gotests') {
                vscode.window.showInformationMessage('Generate unit tests feature is not supported as gotests tool needs go1.6 or higher.');
                return;
            }
        }
        const items = ['Install'];
        getMissingTools(goVersion).then(missing => {
            if (missing.indexOf(tool) === -1) {
                return;
            }
            missing = missing.filter(x => x === tool || importantTools.indexOf(x) > -1);
            if (missing.length > 1) {
                items.push('Install All');
            }
            vscode.window.showInformationMessage(`The "${tool}" command is not available.  Use "go get -v ${allTools[tool]}" to install.`, ...items).then(selected => {
                if (selected === 'Install') {
                    installTools(goVersion, [tool]);
                }
                else if (selected === 'Install All') {
                    installTools(goVersion, missing);
                    goStatus_1.hideGoStatus();
                }
                else {
                    installsDeclinedTools.push(tool);
                }
            });
        });
    });
}
exports.promptForMissingTool = promptForMissingTool;
function promptForUpdatingTool(tool) {
    // If user has declined to update, then don't prompt
    if (updatesDeclinedTools.indexOf(tool) > -1) {
        return;
    }
    util_1.getGoVersion().then((goVersion) => {
        vscode.window.showInformationMessage(`The Go extension is better with the latest version of "${tool}". Use "go get -u -v ${allTools[tool]}" to update`, 'Update').then(selected => {
            if (selected === 'Update') {
                installTools(goVersion, [tool]);
            }
            else {
                updatesDeclinedTools.push(tool);
            }
        });
    });
}
exports.promptForUpdatingTool = promptForUpdatingTool;
/**
 * Installs given array of missing tools. If no input is given, the all tools are installed
 *
 * @param string[] array of tool names to be installed
 */
function installTools(goVersion, missing) {
    let goRuntimePath = goPath_1.getGoRuntimePath();
    if (!goRuntimePath) {
        vscode.window.showInformationMessage('Cannot find "go" binary. Update PATH or GOROOT appropriately');
        return;
    }
    if (!missing) {
        missing = getTools(goVersion);
    }
    // http.proxy setting takes precedence over environment variables
    let httpProxy = vscode.workspace.getConfiguration('http').get('proxy');
    let envForTools = Object.assign({}, process.env);
    if (httpProxy) {
        envForTools = Object.assign({}, process.env, {
            http_proxy: httpProxy,
            HTTP_PROXY: httpProxy,
            https_proxy: httpProxy,
            HTTPS_PROXY: httpProxy,
        });
    }
    // If the go.toolsGopath is set, use its value as the GOPATH for the "go get" child process.
    // Else use the Current Gopath
    let toolsGopath = util_1.getToolsGopath() || util_1.getCurrentGoPath();
    if (toolsGopath) {
        envForTools['GOPATH'] = toolsGopath;
    }
    else {
        vscode.window.showInformationMessage('Cannot install Go tools. Set either go.gopath or go.toolsGopath in settings.', 'Open User Settings', 'Open Workspace Settings').then(selected => {
            if (selected === 'Open User Settings') {
                vscode.commands.executeCommand('workbench.action.openGlobalSettings');
            }
            else if (selected === 'Open Workspace Settings') {
                vscode.commands.executeCommand('workbench.action.openWorkspaceSettings');
            }
        });
        return;
    }
    goStatus_2.outputChannel.show();
    goStatus_2.outputChannel.clear();
    goStatus_2.outputChannel.appendLine(`Installing ${missing.length} ${missing.length > 1 ? 'tools' : 'tool'} at ${toolsGopath}${path.sep}bin`);
    missing.forEach((missingTool, index, missing) => {
        goStatus_2.outputChannel.appendLine('  ' + missingTool);
    });
    goStatus_2.outputChannel.appendLine(''); // Blank line for spacing.
    missing.reduce((res, tool) => {
        return res.then(sofar => new Promise((resolve, reject) => {
            cp.execFile(goRuntimePath, ['get', '-u', '-v', allTools[tool]], { env: envForTools }, (err, stdout, stderr) => {
                if (err) {
                    goStatus_2.outputChannel.appendLine('Installing ' + allTools[tool] + ' FAILED');
                    let failureReason = tool + ';;' + err + stdout.toString() + stderr.toString();
                    resolve([...sofar, failureReason]);
                }
                else {
                    goStatus_2.outputChannel.appendLine('Installing ' + allTools[tool] + ' SUCCEEDED');
                    if (tool === 'gometalinter') {
                        // Gometalinter needs to install all the linters it uses.
                        goStatus_2.outputChannel.appendLine('Installing all linters used by gometalinter....');
                        let gometalinterBinPath = util_1.getBinPath('gometalinter');
                        cp.execFile(gometalinterBinPath, ['--install'], { env: envForTools }, (err, stdout, stderr) => {
                            if (!err) {
                                goStatus_2.outputChannel.appendLine('Installing all linters used by gometalinter SUCCEEDED.');
                                resolve([...sofar, null]);
                            }
                            else {
                                let failureReason = `Error while running gometalinter --install;; ${stderr}`;
                                resolve([...sofar, failureReason]);
                            }
                        });
                    }
                    else {
                        resolve([...sofar, null]);
                    }
                }
            });
        }));
    }, Promise.resolve([])).then(res => {
        goStatus_2.outputChannel.appendLine(''); // Blank line for spacing
        let failures = res.filter(x => x != null);
        if (failures.length === 0) {
            if (missing.indexOf('langserver-go') > -1) {
                goStatus_2.outputChannel.appendLine('Reload VS Code window to use the Go language server');
            }
            goStatus_2.outputChannel.appendLine('All tools successfully installed. You\'re ready to Go :).');
            return;
        }
        goStatus_2.outputChannel.appendLine(failures.length + ' tools failed to install.\n');
        failures.forEach((failure, index, failures) => {
            let reason = failure.split(';;');
            goStatus_2.outputChannel.appendLine(reason[0] + ':');
            goStatus_2.outputChannel.appendLine(reason[1]);
        });
    });
}
function updateGoPathGoRootFromConfig() {
    let goroot = vscode.workspace.getConfiguration('go', vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri : null)['goroot'];
    if (goroot) {
        process.env['GOROOT'] = util_1.resolvePath(goroot);
    }
    if (process.env['GOPATH'] && process.env['GOROOT']) {
        return Promise.resolve();
    }
    // If GOPATH is still not set, then use the one from `go env`
    let goRuntimePath = goPath_1.getGoRuntimePath();
    if (!goRuntimePath) {
        return Promise.reject(new Error('Cannot find "go" binary. Update PATH or GOROOT appropriately'));
    }
    return new Promise((resolve, reject) => {
        cp.execFile(goRuntimePath, ['env', 'GOPATH', 'GOROOT'], (err, stdout, stderr) => {
            if (err) {
                return reject();
            }
            let envOutput = stdout.split('\n');
            if (!process.env['GOPATH'] && envOutput[0].trim()) {
                process.env['GOPATH'] = envOutput[0].trim();
            }
            if (!process.env['GOROOT'] && envOutput[1] && envOutput[1].trim()) {
                process.env['GOROOT'] = envOutput[1].trim();
            }
            return resolve();
        });
    });
}
exports.updateGoPathGoRootFromConfig = updateGoPathGoRootFromConfig;
function offerToInstallTools() {
    util_1.isVendorSupported();
    util_1.getGoVersion().then(goVersion => {
        getMissingTools(goVersion).then(missing => {
            missing = missing.filter(x => importantTools.indexOf(x) > -1);
            if (missing.length > 0) {
                goStatus_1.showGoStatus('Analysis Tools Missing', 'go.promptforinstall', 'Not all Go tools are available on the GOPATH');
                vscode.commands.registerCommand('go.promptforinstall', () => {
                    promptForInstall(goVersion, missing);
                });
            }
        });
    });
    function promptForInstall(goVersion, missing) {
        let installItem = {
            title: 'Install',
            command() {
                goStatus_1.hideGoStatus();
                installTools(goVersion, missing);
            }
        };
        let showItem = {
            title: 'Show',
            command() {
                goStatus_2.outputChannel.clear();
                goStatus_2.outputChannel.appendLine('Below tools are needed for the basic features of the Go extension.');
                missing.forEach(x => goStatus_2.outputChannel.appendLine(x));
            }
        };
        vscode.window.showInformationMessage('Some Go analysis tools are missing from your GOPATH.  Would you like to install them?', installItem, showItem).then(selection => {
            if (selection) {
                selection.command();
            }
            else {
                goStatus_1.hideGoStatus();
            }
        });
    }
}
exports.offerToInstallTools = offerToInstallTools;
function getMissingTools(goVersion) {
    let keys = getTools(goVersion);
    return Promise.all(keys.map(tool => new Promise((resolve, reject) => {
        let toolPath = util_1.getBinPath(tool);
        fs.exists(toolPath, exists => {
            resolve(exists ? null : tool);
        });
    }))).then(res => {
        return res.filter(x => x != null);
    });
}
// If langserver needs to be used, but is not installed, this will prompt user to install and Reload
// If langserver needs to be used, and is installed, this will return true
// Returns false in all other cases
function checkLanguageServer() {
    let latestGoConfig = vscode.workspace.getConfiguration('go');
    if (!latestGoConfig['useLanguageServer'])
        return false;
    if (process.platform === 'win32') {
        vscode.window.showInformationMessage('The Go language server is not supported on Windows yet.');
        return false;
    }
    if (!allFoldersHaveSameGopath()) {
        vscode.window.showInformationMessage('The Go language server is not supported in a multi root set up with different GOPATHs.');
        return false;
    }
    let langServerAvailable = util_1.getBinPath('go-langserver') !== 'go-langserver';
    if (!langServerAvailable) {
        promptForMissingTool('go-langserver');
        vscode.window.showInformationMessage('Reload VS Code window after installing the Go language server');
    }
    return langServerAvailable;
}
exports.checkLanguageServer = checkLanguageServer;
function allFoldersHaveSameGopath() {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 1) {
        return true;
    }
    let tempGopath = util_1.getCurrentGoPath(vscode.workspace.workspaceFolders[0].uri);
    return vscode.workspace.workspaceFolders.find(x => tempGopath !== util_1.getCurrentGoPath(x.uri)) ? false : true;
}
//# sourceMappingURL=goInstallTools.js.map