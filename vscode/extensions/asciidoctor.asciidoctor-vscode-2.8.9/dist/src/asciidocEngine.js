"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidocEngine = void 0;
const vscode = require("vscode");
const text_parser_1 = require("./text-parser");
const FrontMatterRegex = /^---\s*[^]*?(-{3}|\.{3})\s*/;
class AsciidocEngine {
    constructor(extensionPreviewResourceProvider, slugifier, errorCollection = null) {
        this.extensionPreviewResourceProvider = extensionPreviewResourceProvider;
        this.slugifier = slugifier;
        this.errorCollection = errorCollection;
    }
    getEngine(resource) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ad) {
                this.ad = new text_parser_1.AsciidocParser(resource.fsPath, this.errorCollection);
            }
            const config = vscode.workspace.getConfiguration('asciidoc', resource);
            return this.ad;
        });
    }
    stripFrontmatter(text) {
        let offset = 0;
        const frontMatterMatch = FrontMatterRegex.exec(text);
        if (frontMatterMatch) {
            const frontMatter = frontMatterMatch[0];
            offset = frontMatter.split(/\r\n|\n|\r/g).length - 1;
            text = text.substr(frontMatter.length);
        }
        return { text, offset };
    }
    render(document, stripFrontmatter, text, forHTML = false, backend = 'html5') {
        return __awaiter(this, void 0, void 0, function* () {
            let offset = 0;
            if (stripFrontmatter) {
                const asciidocContent = this.stripFrontmatter(text);
                offset = asciidocContent.offset;
                text = asciidocContent.text;
            }
            this.currentDocument = document;
            this.firstLine = offset;
            const engine = yield this.getEngine(document);
            const doc = yield vscode.workspace.openTextDocument(document);
            let ascii_doc = engine.parseText(text, doc, forHTML, backend);
            return ascii_doc;
        });
    }
    parse(document, source) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentDocument = document;
            const engine = yield this.getEngine(document);
            const doc = yield vscode.workspace.openTextDocument(document);
            let ascii_doc = yield engine.parseText(source, doc);
            return engine.document;
        });
    }
}
exports.AsciidocEngine = AsciidocEngine;
//# sourceMappingURL=asciidocEngine.js.map