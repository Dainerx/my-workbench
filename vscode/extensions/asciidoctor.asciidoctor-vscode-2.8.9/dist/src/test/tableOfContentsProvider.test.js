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
const vscode = require("vscode");
require("mocha");
const tableOfContentsProvider_1 = require("../tableOfContentsProvider");
const inMemoryDocument_1 = require("./inMemoryDocument");
const engine_1 = require("./engine");
const testFileName = vscode.Uri.file('test.md');
suite('asciidoc.TableOfContentsProvider', () => {
    test('Lookup should not return anything for empty document', () => __awaiter(void 0, void 0, void 0, function* () {
        const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, '');
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(engine_1.createNewAsciidocEngine(), doc);
        assert.strictEqual(yield provider.lookup(''), undefined);
        assert.strictEqual(yield provider.lookup('foo'), undefined);
    }));
    test('Lookup should not return anything for document with no headers', () => __awaiter(void 0, void 0, void 0, function* () {
        const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, 'a *b*\nc');
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(engine_1.createNewAsciidocEngine(), doc);
        assert.strictEqual(yield provider.lookup(''), undefined);
        assert.strictEqual(yield provider.lookup('foo'), undefined);
        assert.strictEqual(yield provider.lookup('a'), undefined);
        assert.strictEqual(yield provider.lookup('b'), undefined);
    }));
    test('Lookup should return basic #header', () => __awaiter(void 0, void 0, void 0, function* () {
        const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, `# a\nx\n# c`);
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(engine_1.createNewAsciidocEngine(), doc);
        {
            const entry = yield provider.lookup('a');
            assert.ok(entry);
            assert.strictEqual(entry.line, 0);
        }
        {
            assert.strictEqual(yield provider.lookup('x'), undefined);
        }
        {
            const entry = yield provider.lookup('c');
            assert.ok(entry);
            assert.strictEqual(entry.line, 2);
        }
    }));
    test('Lookups should be case in-sensitive', () => __awaiter(void 0, void 0, void 0, function* () {
        const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, `# fOo\n`);
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(engine_1.createNewAsciidocEngine(), doc);
        assert.strictEqual((yield provider.lookup('fOo')).line, 0);
        assert.strictEqual((yield provider.lookup('foo')).line, 0);
        assert.strictEqual((yield provider.lookup('FOO')).line, 0);
    }));
    test('Lookups should ignore leading and trailing white-space, and collapse internal whitespace', () => __awaiter(void 0, void 0, void 0, function* () {
        const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, `#      f o  o    \n`);
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(engine_1.createNewAsciidocEngine(), doc);
        assert.strictEqual((yield provider.lookup('f o  o')).line, 0);
        assert.strictEqual((yield provider.lookup('  f o  o')).line, 0);
        assert.strictEqual((yield provider.lookup('  f o  o  ')).line, 0);
        assert.strictEqual((yield provider.lookup('f o o')).line, 0);
        assert.strictEqual((yield provider.lookup('f o       o')).line, 0);
        assert.strictEqual(yield provider.lookup('f'), undefined);
        assert.strictEqual(yield provider.lookup('foo'), undefined);
        assert.strictEqual(yield provider.lookup('fo o'), undefined);
    }));
    test('should handle special characters #44779', () => __awaiter(void 0, void 0, void 0, function* () {
        const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, `# Indentação\n`);
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(engine_1.createNewAsciidocEngine(), doc);
        assert.strictEqual((yield provider.lookup('indentação')).line, 0);
    }));
    test('should handle special characters 2, #48482', () => __awaiter(void 0, void 0, void 0, function* () {
        const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, `# Инструкция - Делай Раз, Делай Два\n`);
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(engine_1.createNewAsciidocEngine(), doc);
        assert.strictEqual((yield provider.lookup('инструкция---делай-раз-делай-два')).line, 0);
    }));
    test('should handle special characters 3, #37079', () => __awaiter(void 0, void 0, void 0, function* () {
        const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, `## Header 2
### Header 3
## Заголовок 2
### Заголовок 3
### Заголовок Header 3
## Заголовок`);
        const provider = new tableOfContentsProvider_1.TableOfContentsProvider(engine_1.createNewAsciidocEngine(), doc);
        assert.strictEqual((yield provider.lookup('header-2')).line, 0);
        assert.strictEqual((yield provider.lookup('header-3')).line, 1);
        assert.strictEqual((yield provider.lookup('Заголовок-2')).line, 2);
        assert.strictEqual((yield provider.lookup('Заголовок-3')).line, 3);
        assert.strictEqual((yield provider.lookup('Заголовок-header-3')).line, 4);
        assert.strictEqual((yield provider.lookup('Заголовок')).line, 5);
    }));
});
//# sourceMappingURL=tableOfContentsProvider.test.js.map