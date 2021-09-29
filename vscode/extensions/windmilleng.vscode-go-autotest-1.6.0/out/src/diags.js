'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class TestResultDisplay {
    constructor(ctx, source) {
        this.source = source;
        this.collection = vscode.languages.createDiagnosticCollection(source);
        ctx.subscriptions.push(this.collection);
    }
    clear() {
        this.collection.clear();
    }
    displaySuccess(fn) {
        this.display(fn, 'ok: ' + fn.name, vscode.DiagnosticSeverity.Information);
    }
    displayFailure(fn) {
        this.display(fn, 'FAIL: ' + fn.name, vscode.DiagnosticSeverity.Error);
    }
    // Unknown indicates an internal analysis error where we didn't find the test results.
    displayUnknown(fn) {
        this.display(fn, 'unknown: ' + fn.name, vscode.DiagnosticSeverity.Error);
    }
    displayWaiting(fn) {
        this.display(fn, 'waiting: ' + fn.name, vscode.DiagnosticSeverity.Information);
    }
    display(fn, message, severity) {
        let uri = fn.location.uri;
        // Only highlight the first line of the function.
        let range = new vscode.Range(fn.location.range.start, new vscode.Position(fn.location.range.start.line, 1000));
        let d = new vscode.Diagnostic(range, message, severity);
        d.source = this.source;
        let oldDiags = this.collection.get(uri) || [];
        let newDiags = [].concat(oldDiags);
        newDiags.push(d);
        this.collection.set(uri, newDiags);
    }
}
function initDiagnosticCollection(ctx) {
    exports.pinDisplay = new TestResultDisplay(ctx, 'pinned');
    exports.autotestDisplay = new TestResultDisplay(ctx, 'wm-autotest');
}
exports.initDiagnosticCollection = initDiagnosticCollection;
//# sourceMappingURL=diags.js.map