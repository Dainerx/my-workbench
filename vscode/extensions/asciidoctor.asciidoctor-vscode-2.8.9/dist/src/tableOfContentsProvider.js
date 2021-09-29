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
exports.TableOfContentsProvider = void 0;
const vscode = require("vscode");
const slugify_1 = require("./slugify");
class TableOfContentsProvider {
    constructor(engine, document) {
        this.engine = engine;
        this.document = document;
    }
    getToc() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.toc) {
                try {
                    this.toc = yield this.buildToc(this.document);
                }
                catch (e) {
                    this.toc = [];
                }
            }
            return this.toc;
        });
    }
    lookup(fragment) {
        return __awaiter(this, void 0, void 0, function* () {
            const toc = yield this.getToc();
            const slug = slugify_1.githubSlugifier.fromHeading(fragment);
            return toc.find((entry) => entry.slug.equals(slug));
        });
    }
    buildToc(document) {
        return __awaiter(this, void 0, void 0, function* () {
            let toc = [];
            const adoc = yield this.engine.parse(document.uri, document.getText());
            adoc.findBy({ 'context': 'section' }, function (section) {
                toc.push({
                    slug: section.getId(),
                    text: section.getTitle(),
                    level: section.getLevel(),
                    line: section.getLineNumber() - 1,
                    location: new vscode.Location(document.uri, new vscode.Position(section.getLineNumber() - 1, 1)),
                });
            });
            // Get full range of section
            return toc.map((entry, startIndex) => {
                let end = undefined;
                for (let i = startIndex + 1; i < toc.length; ++i) {
                    if (toc[i].level <= entry.level) {
                        end = toc[i].line - 1;
                        break;
                    }
                }
                const endLine = typeof end === 'number' ? end : document.lineCount - 1;
                return Object.assign(Object.assign({}, entry), { location: new vscode.Location(document.uri, new vscode.Range(entry.location.range.start, new vscode.Position(endLine, document.lineAt(endLine).range.end.character))) });
            });
        });
    }
}
exports.TableOfContentsProvider = TableOfContentsProvider;
//# sourceMappingURL=tableOfContentsProvider.js.map