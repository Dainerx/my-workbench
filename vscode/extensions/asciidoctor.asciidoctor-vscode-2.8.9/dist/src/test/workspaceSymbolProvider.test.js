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
const assert = require("assert");
require("mocha");
const vscode = require("vscode");
const documentSymbolProvider_1 = require("../features/documentSymbolProvider");
const workspaceSymbolProvider_1 = require("../features/workspaceSymbolProvider");
const engine_1 = require("./engine");
const inMemoryDocument_1 = require("./inMemoryDocument");
const symbolProvider = new documentSymbolProvider_1.default(engine_1.createNewAsciidocEngine(), null, null, null, null);
suite('asciidoc.WorkspaceSymbolProvider', () => {
    test('Should not return anything for empty workspace', () => __awaiter(void 0, void 0, void 0, function* () {
        const provider = new workspaceSymbolProvider_1.default(symbolProvider, new InMemoryWorkspaceAsciidocDocumentProvider([]));
        assert.deepEqual(yield provider.provideWorkspaceSymbols(''), []);
    }));
    test('Should return symbols from workspace with one asciidoc file', () => __awaiter(void 0, void 0, void 0, function* () {
        const testFileName = vscode.Uri.file('test.md');
        const provider = new workspaceSymbolProvider_1.default(symbolProvider, new InMemoryWorkspaceAsciidocDocumentProvider([
            new inMemoryDocument_1.InMemoryDocument(testFileName, `# header1\nabc\n## header2`),
        ]));
        const symbols = yield provider.provideWorkspaceSymbols('');
        assert.strictEqual(symbols.length, 2);
        assert.strictEqual(symbols[0].name, '# header1');
        assert.strictEqual(symbols[1].name, '## header2');
    }));
    test('Should return all content  basic workspace', () => __awaiter(void 0, void 0, void 0, function* () {
        const fileNameCount = 10;
        const files = [];
        for (let i = 0; i < fileNameCount; ++i) {
            const testFileName = vscode.Uri.parse(`test${i}.md`);
            files.push(new inMemoryDocument_1.InMemoryDocument(testFileName, `# common\nabc\n## header${i}`));
        }
        const provider = new workspaceSymbolProvider_1.default(symbolProvider, new InMemoryWorkspaceAsciidocDocumentProvider(files));
        const symbols = yield provider.provideWorkspaceSymbols('');
        assert.strictEqual(symbols.length, fileNameCount * 2);
    }));
    test('Should update results when asciidoc file changes symbols', () => __awaiter(void 0, void 0, void 0, function* () {
        const testFileName = vscode.Uri.file('test.md');
        const workspaceFileProvider = new InMemoryWorkspaceAsciidocDocumentProvider([
            new inMemoryDocument_1.InMemoryDocument(testFileName, `# header1`),
        ]);
        const provider = new workspaceSymbolProvider_1.default(symbolProvider, workspaceFileProvider);
        assert.strictEqual((yield provider.provideWorkspaceSymbols('')).length, 1);
        // Update file
        workspaceFileProvider.updateDocument(new inMemoryDocument_1.InMemoryDocument(testFileName, `# new header\nabc\n## header2`));
        const newSymbols = yield provider.provideWorkspaceSymbols('');
        assert.strictEqual(newSymbols.length, 2);
        assert.strictEqual(newSymbols[0].name, '# new header');
        assert.strictEqual(newSymbols[1].name, '## header2');
    }));
    test('Should remove results when file is deleted', () => __awaiter(void 0, void 0, void 0, function* () {
        const testFileName = vscode.Uri.file('test.md');
        const workspaceFileProvider = new InMemoryWorkspaceAsciidocDocumentProvider([
            new inMemoryDocument_1.InMemoryDocument(testFileName, `# header1`),
        ]);
        const provider = new workspaceSymbolProvider_1.default(symbolProvider, workspaceFileProvider);
        assert.strictEqual((yield provider.provideWorkspaceSymbols('')).length, 1);
        // delete file
        workspaceFileProvider.deleteDocument(testFileName);
        const newSymbols = yield provider.provideWorkspaceSymbols('');
        assert.strictEqual(newSymbols.length, 0);
    }));
    test('Should update results when asciidoc file is created', () => __awaiter(void 0, void 0, void 0, function* () {
        const testFileName = vscode.Uri.file('test.md');
        const workspaceFileProvider = new InMemoryWorkspaceAsciidocDocumentProvider([
            new inMemoryDocument_1.InMemoryDocument(testFileName, `# header1`),
        ]);
        const provider = new workspaceSymbolProvider_1.default(symbolProvider, workspaceFileProvider);
        assert.strictEqual((yield provider.provideWorkspaceSymbols('')).length, 1);
        // Creat file
        workspaceFileProvider.createDocument(new inMemoryDocument_1.InMemoryDocument(vscode.Uri.file('test2.md'), `# new header\nabc\n## header2`));
        const newSymbols = yield provider.provideWorkspaceSymbols('');
        assert.strictEqual(newSymbols.length, 3);
    }));
});
class InMemoryWorkspaceAsciidocDocumentProvider {
    constructor(documents) {
        this._documents = new Map();
        this._onDidChangeAsciidocDocumentEmitter = new vscode.EventEmitter();
        this.onDidChangeAsciidocDocument = this._onDidChangeAsciidocDocumentEmitter.event;
        this._onDidCreateAsciidocDocumentEmitter = new vscode.EventEmitter();
        this.onDidCreateAsciidocDocument = this._onDidCreateAsciidocDocumentEmitter.event;
        this._onDidDeleteAsciidocDocumentEmitter = new vscode.EventEmitter();
        this.onDidDeleteAsciidocDocument = this._onDidDeleteAsciidocDocumentEmitter.event;
        for (const doc of documents) {
            this._documents.set(doc.fileName, doc);
        }
    }
    getAllAsciidocDocuments() {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this._documents.values());
        });
    }
    updateDocument(document) {
        this._documents.set(document.fileName, document);
        this._onDidChangeAsciidocDocumentEmitter.fire(document);
    }
    createDocument(document) {
        assert.ok(!this._documents.has(document.uri.fsPath));
        this._documents.set(document.uri.fsPath, document);
        this._onDidCreateAsciidocDocumentEmitter.fire(document);
    }
    deleteDocument(resource) {
        this._documents.delete(resource.fsPath);
        this._onDidDeleteAsciidocDocumentEmitter.fire(resource);
    }
}
//# sourceMappingURL=workspaceSymbolProvider.test.js.map