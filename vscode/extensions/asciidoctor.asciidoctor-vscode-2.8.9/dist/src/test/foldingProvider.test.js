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
const foldingProvider_1 = require("../features/foldingProvider");
const inMemoryDocument_1 = require("./inMemoryDocument");
const engine_1 = require("./engine");
const testFileName = vscode.Uri.file('test.md');
suite('asciidoc.FoldingProvider', () => {
    test('Should not return anything for empty document', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(``);
        assert.strictEqual(folds.length, 0);
    }));
    test('Should not return anything for document without headers', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`a
**b** afas
a#b
a`);
        assert.strictEqual(folds.length, 0);
    }));
    test('Should fold from header to end of document', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`a
# b
c
d`);
        assert.strictEqual(folds.length, 1);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 1);
        assert.strictEqual(firstFold.end, 3);
    }));
    test('Should leave single newline before next header', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`
# a
x

# b
y`);
        assert.strictEqual(folds.length, 2);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 1);
        assert.strictEqual(firstFold.end, 3);
    }));
    test('Should collapse multuple newlines to single newline before next header', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`
# a
x



# b
y`);
        assert.strictEqual(folds.length, 2);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 1);
        assert.strictEqual(firstFold.end, 5);
    }));
    test('Should not collapse if there is no newline before next header', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`
# a
x
# b
y`);
        assert.strictEqual(folds.length, 2);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 1);
        assert.strictEqual(firstFold.end, 2);
    }));
    test('Should fold nested <!-- #region --> markers', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`a
<!-- #region -->
b
<!-- #region hello!-->
b.a
<!-- #endregion -->
b
<!-- #region: foo! -->
b.b
<!-- #endregion: foo -->
b
<!-- #endregion -->
a`);
        assert.strictEqual(folds.length, 3);
        const [outer, first, second] = folds.sort((a, b) => a.start - b.start);
        assert.strictEqual(outer.start, 1);
        assert.strictEqual(outer.end, 11);
        assert.strictEqual(first.start, 3);
        assert.strictEqual(first.end, 5);
        assert.strictEqual(second.start, 7);
        assert.strictEqual(second.end, 9);
    }));
    test('Should fold from list to end of document', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`a
- b
c
d`);
        assert.strictEqual(folds.length, 1);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 1);
        assert.strictEqual(firstFold.end, 3);
    }));
    test('lists folds should span multiple lines of content', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`a
- This list item\n  spans multiple\n  lines.`);
        assert.strictEqual(folds.length, 1);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 1);
        assert.strictEqual(firstFold.end, 3);
    }));
    test('List should leave single blankline before new element', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`- a
a


b`);
        assert.strictEqual(folds.length, 1);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 0);
        assert.strictEqual(firstFold.end, 3);
    }));
    test('Should fold fenced code blocks', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`~~~ts
a
~~~
b`);
        assert.strictEqual(folds.length, 1);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 0);
        assert.strictEqual(firstFold.end, 2);
    }));
    test('Should fold fenced code blocks with yaml front matter', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`---
title: bla
---

~~~ts
a
~~~

a
a
b
a`);
        assert.strictEqual(folds.length, 1);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 4);
        assert.strictEqual(firstFold.end, 6);
    }));
    test('Should fold html blocks', () => __awaiter(void 0, void 0, void 0, function* () {
        const folds = yield getFoldsForDocument(`x
<div>
	fa
</div>`);
        assert.strictEqual(folds.length, 1);
        const firstFold = folds[0];
        assert.strictEqual(firstFold.start, 1);
        assert.strictEqual(firstFold.end, 3);
    }));
});
function getFoldsForDocument(contents) {
    return __awaiter(this, void 0, void 0, function* () {
        const doc = new inMemoryDocument_1.InMemoryDocument(testFileName, contents);
        const provider = new foldingProvider_1.default(engine_1.createNewAsciidocEngine());
        return yield provider.provideFoldingRanges(doc, {}, new vscode.CancellationTokenSource().token);
    });
}
//# sourceMappingURL=foldingProvider.test.js.map