"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPathCompletionItem = void 0;
const vscode = require("vscode");
function createPathCompletionItem(fileInfo) {
    return {
        label: fileInfo.file,
        kind: fileInfo.isFile ? vscode.CompletionItemKind.File : vscode.CompletionItemKind.Folder,
        sortText: fileInfo.file,
    };
}
exports.createPathCompletionItem = createPathCompletionItem;
//# sourceMappingURL=createCompletionItem.js.map