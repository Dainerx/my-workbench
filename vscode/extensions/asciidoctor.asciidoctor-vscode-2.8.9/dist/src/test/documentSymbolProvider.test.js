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
const inMemoryDocument_1 = require("./inMemoryDocument");
const engine_1 = require("./engine");
const testFileName = vscode.Uri.file('test.md');
function getSymbolsForFile(fileContents) {
    const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, fileContents);
    const provider = new documentSymbolProvider_1.default(engine_1.createNewAsciidocEngine(), null, null, null, null);
    return provider.provideDocumentSymbols(doc);
}
suite('asciidoc.DocumentSymbolProvider', () => {
    test('Should not return anything for empty document', () => __awaiter(void 0, void 0, void 0, function* () {
        const symbols = yield getSymbolsForFile('');
        assert.strictEqual(symbols.length, 0);
    }));
    test('Should not return anything for document with no headers', () => __awaiter(void 0, void 0, void 0, function* () {
        const symbols = yield getSymbolsForFile('a\na');
        assert.strictEqual(symbols.length, 0);
    }));
    test('Should not return anything for document with # but no real headers', () => __awaiter(void 0, void 0, void 0, function* () {
        const symbols = yield getSymbolsForFile('a#a\na#');
        assert.strictEqual(symbols.length, 0);
    }));
    test('Should return single symbol for single header', () => __awaiter(void 0, void 0, void 0, function* () {
        const symbols = yield getSymbolsForFile('# h');
        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, '# h');
    }));
    test('Should not care about symbol level for single header', () => __awaiter(void 0, void 0, void 0, function* () {
        const symbols = yield getSymbolsForFile('### h');
        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, '### h');
    }));
    test('Should put symbols of same level in flat list', () => __awaiter(void 0, void 0, void 0, function* () {
        const symbols = yield getSymbolsForFile('## h\n## h2');
        assert.strictEqual(symbols.length, 2);
        assert.strictEqual(symbols[0].name, '## h');
        assert.strictEqual(symbols[1].name, '## h2');
    }));
    test('Should nest symbol of level - 1 under parent', () => __awaiter(void 0, void 0, void 0, function* () {
        const symbols = yield getSymbolsForFile('# h\n## h2\n## h3');
        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, '# h');
        assert.strictEqual(symbols[0].children.length, 2);
        assert.strictEqual(symbols[0].children[0].name, '## h2');
        assert.strictEqual(symbols[0].children[1].name, '## h3');
    }));
    test('Should nest symbol of level - n under parent', () => __awaiter(void 0, void 0, void 0, function* () {
        const symbols = yield getSymbolsForFile('# h\n#### h2');
        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, '# h');
        assert.strictEqual(symbols[0].children.length, 1);
        assert.strictEqual(symbols[0].children[0].name, '#### h2');
    }));
    test('Should flatten children where lower level occurs first', () => __awaiter(void 0, void 0, void 0, function* () {
        const symbols = yield getSymbolsForFile('# h\n### h2\n## h3');
        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, '# h');
        assert.strictEqual(symbols[0].children.length, 2);
        assert.strictEqual(symbols[0].children[0].name, '### h2');
        assert.strictEqual(symbols[0].children[1].name, '## h3');
    }));
});
//# sourceMappingURL=documentSymbolProvider.test.js.map