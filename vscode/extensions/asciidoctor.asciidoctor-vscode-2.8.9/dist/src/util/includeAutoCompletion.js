"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidocFileIncludeAutoCompletionMonitor = void 0;
const vscode = require("vscode");
const asciidoc_provider_1 = require("../providers/asciidoc.provider");
const dispose_1 = require("../util/dispose");
class AsciidocFileIncludeAutoCompletionMonitor {
    constructor() {
        this.disposables = [];
        this._onDidIncludeAutoCompletionEmitter = new vscode.EventEmitter();
        this.onDidIncludeAutoCompletionEmitter = this._onDidIncludeAutoCompletionEmitter.event;
        vscode.languages.registerReferenceProvider;
        const disposable = vscode.languages.registerCompletionItemProvider({
            language: "asciidoc",
            scheme: "file",
        }, asciidoc_provider_1.AsciidocProvider, ...[":", "/"]);
        this.disposables.push(disposable);
    }
    dispose() {
        dispose_1.disposeAll(this.disposables);
    }
}
exports.AsciidocFileIncludeAutoCompletionMonitor = AsciidocFileIncludeAutoCompletionMonitor;
//# sourceMappingURL=includeAutoCompletion.js.map