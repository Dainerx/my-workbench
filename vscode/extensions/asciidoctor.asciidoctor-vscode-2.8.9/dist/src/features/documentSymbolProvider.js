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
const vscode = require("vscode");
const tableOfContentsProvider_1 = require("../tableOfContentsProvider");
class AdocDocumentSymbolProvider {
    constructor(engine, root = {
        level: -Infinity,
        children: [],
        parent: undefined,
    }, lastSymbolCall, lastRunTime = 1000, RunTimeFactor = 1.5) {
        this.engine = engine;
        this.root = root;
        this.lastSymbolCall = lastSymbolCall;
        this.lastRunTime = lastRunTime;
        this.RunTimeFactor = RunTimeFactor;
    }
    provideDocumentSymbolInformation(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const toc = yield new tableOfContentsProvider_1.TableOfContentsProvider(this.engine, document).getToc();
            return toc.map((entry) => this.toSymbolInformation(entry));
        });
    }
    provideDocumentSymbols(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const nextOKRunTime = this.lastSymbolCall + Math.max(this.lastRunTime * this.RunTimeFactor, 2000);
            const startTime = (new Date()).getTime();
            if (this.lastSymbolCall == undefined || startTime > nextOKRunTime) {
                const toc = yield new tableOfContentsProvider_1.TableOfContentsProvider(this.engine, document).getToc();
                this.root = {
                    level: -Infinity,
                    children: [],
                    parent: undefined,
                };
                this.buildTree(this.root, toc);
                this.lastSymbolCall = (new Date).getTime();
                this.lastRunTime = this.lastSymbolCall - startTime;
            }
            return this.root.children;
        });
    }
    buildTree(parent, entries) {
        if (!entries.length) {
            return;
        }
        const entry = entries[0];
        const symbol = this.toDocumentSymbol(entry);
        symbol.children = [];
        while (parent && entry.level <= parent.level) {
            parent = parent.parent;
        }
        parent.children.push(symbol);
        this.buildTree({ level: entry.level, children: symbol.children, parent }, entries.slice(1));
    }
    toSymbolInformation(entry) {
        return new vscode.SymbolInformation(entry.text, vscode.SymbolKind.String, '', entry.location);
    }
    toDocumentSymbol(entry) {
        return new vscode.DocumentSymbol(entry.text, '', vscode.SymbolKind.String, entry.location.range, entry.location.range);
    }
}
exports.default = AdocDocumentSymbolProvider;
//# sourceMappingURL=documentSymbolProvider.js.map