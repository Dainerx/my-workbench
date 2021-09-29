"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributeCompleter = void 0;
const vscode = require("vscode");
const text_parser_1 = require("../text-parser");
class AttributeCompleter {
    provideCompletionItems(document, position) {
        const adoc = new text_parser_1.AsciidocParser(document.uri.fsPath);
        adoc.parseText(document.getText(), document);
        const attributes = adoc.document.getAttributes();
        let attribs = [];
        for (const key in attributes) {
            let attrib = new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable);
            attrib.detail = attributes[key].toString();
            attribs.push(attrib);
        }
        return attribs;
    }
}
exports.AttributeCompleter = AttributeCompleter;
//# sourceMappingURL=attributeCompleter.js.map