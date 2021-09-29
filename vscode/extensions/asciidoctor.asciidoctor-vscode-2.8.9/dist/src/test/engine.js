"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewAsciidocEngine = void 0;
const asciidocEngine_1 = require("../asciidocEngine");
const slugify_1 = require("../slugify");
const emptyContributions = new class {
    constructor() {
        this.extensionPath = '';
        this.previewScripts = [];
        this.previewStylesEditor = [];
        this.previewStylesDefault = [];
        this.previewResourceRoots = [];
        this.asciidocItPlugins = [];
    }
};
function createNewAsciidocEngine() {
    return new asciidocEngine_1.AsciidocEngine(emptyContributions, slugify_1.githubSlugifier);
}
exports.createNewAsciidocEngine = createNewAsciidocEngine;
//# sourceMappingURL=engine.js.map