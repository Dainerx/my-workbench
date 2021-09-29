"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAsciidocExtensionContributions = void 0;
const vscode = require("vscode");
const path = require("path");
const resolveExtensionResource = (extension, resourcePath) => {
    return vscode.Uri.file(path.join(extension.extensionPath, resourcePath))
        .with({ scheme: 'vscode-resource' });
};
const resolveExtensionResources = (extension, resourcePaths) => {
    const result = [];
    if (Array.isArray(resourcePaths)) {
        for (const resource of resourcePaths) {
            try {
                result.push(resolveExtensionResource(extension, resource));
            }
            catch (e) {
                // noop
            }
        }
    }
    return result;
};
class AsciidocExtensionContributions {
    constructor(extensionPath) {
        this.extensionPath = extensionPath;
        this._scripts = [];
        this._stylesEditor = [];
        this._stylesDefault = [];
        this._previewResourceRoots = [];
        this._plugins = [];
        this._loaded = false;
    }
    get previewScripts() {
        this.ensureLoaded();
        return this._scripts;
    }
    get previewStylesEditor() {
        this.ensureLoaded();
        return this._stylesEditor;
    }
    get previewStylesDefault() {
        this.ensureLoaded();
        return this._stylesDefault;
    }
    get previewResourceRoots() {
        this.ensureLoaded();
        return this._previewResourceRoots;
    }
    get asciidocItPlugins() {
        this.ensureLoaded();
        return this._plugins;
    }
    ensureLoaded() {
        if (this._loaded) {
            return;
        }
        this._loaded = true;
        for (const extension of vscode.extensions.all) {
            const contributes = extension.packageJSON && extension.packageJSON.contributes;
            if (!contributes) {
                continue;
            }
        }
    }
}
function getAsciidocExtensionContributions(context) {
    return new AsciidocExtensionContributions(context.extensionPath);
}
exports.getAsciidocExtensionContributions = getAsciidocExtensionContributions;
//# sourceMappingURL=asciidocExtensions.js.map