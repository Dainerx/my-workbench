/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const rl = require("readline");
exports.coverProfilePath = '';
let coverageFiles = {};
function clearCoverage() {
    applyCoverage(true);
    coverageFiles = {};
}
exports.clearCoverage = clearCoverage;
function initGoCover(ctx) {
    exports.coveredGutter = vscode.window.createTextEditorDecorationType({
        // Gutter green
        gutterIconPath: ctx.asAbsolutePath('images/gutter-green.svg')
    });
    exports.uncoveredGutter = vscode.window.createTextEditorDecorationType({
        // Gutter red
        gutterIconPath: ctx.asAbsolutePath('images/gutter-red.svg')
    });
}
exports.initGoCover = initGoCover;
function removeCodeCoverage(e) {
    let editor = vscode.window.visibleTextEditors.find((value, index, obj) => {
        return value.document === e.document;
    });
    if (!editor) {
        return;
    }
    for (let filename in coverageFiles) {
        let found = editor.document.uri.fsPath.endsWith(filename);
        // Check for file again if outside the $GOPATH.
        if (!found && filename.startsWith('_')) {
            found = editor.document.uri.fsPath.endsWith(filename.slice(1));
        }
        if (found) {
            highlightCoverage(editor, coverageFiles[filename], true);
            delete coverageFiles[filename];
        }
    }
}
exports.removeCodeCoverage = removeCodeCoverage;
function getCodeCoverage(editor) {
    if (!editor) {
        return;
    }
    for (let filename in coverageFiles) {
        if (editor.document.uri.fsPath.endsWith(filename)) {
            highlightCoverage(editor, coverageFiles[filename], false);
        }
    }
}
exports.getCodeCoverage = getCodeCoverage;
function applyCoverage(remove = false) {
    Object.keys(coverageFiles).forEach(filename => {
        let file = coverageFiles[filename];
        // Highlight lines in current editor.
        vscode.window.visibleTextEditors.forEach((value, index, obj) => {
            let found = value.document.fileName.endsWith(filename);
            // Check for file again if outside the $GOPATH.
            if (!found && filename.startsWith('_')) {
                found = value.document.fileName.endsWith(filename.slice(1));
            }
            if (found) {
                highlightCoverage(value, file, remove);
            }
            return found;
        });
    });
}
function highlightCoverage(editor, file, remove) {
    editor.setDecorations(exports.coveredGutter, []);
    editor.setDecorations(exports.uncoveredGutter, []);
    if (remove) {
        return;
    }
    editor.setDecorations(exports.coveredGutter, file.coveredRange);
    editor.setDecorations(exports.uncoveredGutter, file.uncoveredRange);
}
function clearCoverProfilePath() {
    exports.coverProfilePath = '';
}
exports.clearCoverProfilePath = clearCoverProfilePath;
function setCoverProfilePath(path) {
    exports.coverProfilePath = path;
}
exports.setCoverProfilePath = setCoverProfilePath;
function reanalyzeCoverage(showErrOutput = false) {
    return new Promise((resolve, reject) => {
        try {
            // Clear existing coverage files
            clearCoverage();
            if (!exports.coverProfilePath) {
                resolve([]);
                return;
            }
            let lines = rl.createInterface({
                input: fs.createReadStream(exports.coverProfilePath),
                output: undefined
            });
            lines.on('line', function (data) {
                // go test coverageprofile generates output:
                //    filename:StartLine.StartColumn,EndLine.EndColumn Hits IsCovered
                // The first line will be "mode: set" which will be ignored
                let fileRange = data.match(/([^:]+)\:([\d]+)\.([\d]+)\,([\d]+)\.([\d]+)\s([\d]+)\s([\d]+)/);
                if (!fileRange)
                    return;
                let coverage = coverageFiles[fileRange[1]] || { coveredRange: [], uncoveredRange: [] };
                let range = new vscode.Range(
                // Start Line converted to zero based
                parseInt(fileRange[2]) - 1, 
                // Start Column converted to zero based
                parseInt(fileRange[3]) - 1, 
                // End Line converted to zero based
                parseInt(fileRange[4]) - 1, 
                // End Column converted to zero based
                parseInt(fileRange[5]) - 1);
                // If is Covered
                if (parseInt(fileRange[7]) === 1) {
                    coverage.coveredRange.push({ range });
                }
                // Not Covered
                else {
                    coverage.uncoveredRange.push({ range });
                }
                coverageFiles[fileRange[1]] = coverage;
            });
            lines.on('close', function (data) {
                applyCoverage();
                resolve([]);
            });
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.reanalyzeCoverage = reanalyzeCoverage;
//# sourceMappingURL=goCover.js.map