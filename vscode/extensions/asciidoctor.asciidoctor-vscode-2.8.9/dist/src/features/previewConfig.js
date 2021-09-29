"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsciidocPreviewConfigurationManager = exports.AsciidocPreviewConfiguration = void 0;
const vscode = require("vscode");
class AsciidocPreviewConfiguration {
    constructor(resource) {
        const editorConfig = vscode.workspace.getConfiguration('editor', resource);
        const asciidocConfig = vscode.workspace.getConfiguration('asciidoc', resource);
        const asciidocEditorConfig = vscode.workspace.getConfiguration('[asciidoc]', resource);
        this.scrollBeyondLastLine = editorConfig.get('scrollBeyondLastLine', false);
        this.wordWrap = editorConfig.get('wordWrap', 'off') !== 'off';
        if (asciidocEditorConfig && asciidocEditorConfig['editor.wordWrap']) {
            this.wordWrap = asciidocEditorConfig['editor.wordWrap'] !== 'off';
        }
        this.previewFrontMatter = asciidocConfig.get('previewFrontMatter', 'hide');
        this.scrollPreviewWithEditor = !!asciidocConfig.get('preview.scrollPreviewWithEditor', true);
        this.scrollEditorWithPreview = !!asciidocConfig.get('preview.scrollEditorWithPreview', true);
        this.lineBreaks = !!asciidocConfig.get('preview.breaks', false);
        this.doubleClickToSwitchToEditor = !!asciidocConfig.get('preview.doubleClickToSwitchToEditor', true);
        this.markEditorSelection = !!asciidocConfig.get('preview.markEditorSelection', true);
        this.fontFamily = asciidocConfig.get('preview.fontFamily', undefined);
        this.fontSize = Math.max(8, +asciidocConfig.get('preview.fontSize', NaN));
        this.lineHeight = Math.max(0.6, +asciidocConfig.get('preview.lineHeight', NaN));
        this.styles = asciidocConfig.get('styles', []);
        this.refreshInterval = Math.max(0.6, +asciidocConfig.get('preview.refreshInterval', NaN));
    }
    static getForResource(resource) {
        return new AsciidocPreviewConfiguration(resource);
    }
    isEqualTo(otherConfig) {
        for (let key in this) {
            if (this.hasOwnProperty(key) && key !== 'styles') {
                if (this[key] !== otherConfig[key]) {
                    return false;
                }
            }
        }
        // Check styles
        if (this.styles.length !== otherConfig.styles.length) {
            return false;
        }
        for (let i = 0; i < this.styles.length; ++i) {
            if (this.styles[i] !== otherConfig.styles[i]) {
                return false;
            }
        }
        return true;
    }
}
exports.AsciidocPreviewConfiguration = AsciidocPreviewConfiguration;
class AsciidocPreviewConfigurationManager {
    constructor() {
        this.previewConfigurationsForWorkspaces = new Map();
    }
    loadAndCacheConfiguration(resource) {
        const config = AsciidocPreviewConfiguration.getForResource(resource);
        this.previewConfigurationsForWorkspaces.set(this.getKey(resource), config);
        return config;
    }
    hasConfigurationChanged(resource) {
        const key = this.getKey(resource);
        const currentConfig = this.previewConfigurationsForWorkspaces.get(key);
        const newConfig = AsciidocPreviewConfiguration.getForResource(resource);
        return (!currentConfig || !currentConfig.isEqualTo(newConfig));
    }
    getKey(resource) {
        const folder = vscode.workspace.getWorkspaceFolder(resource);
        return folder ? folder.uri.toString() : '';
    }
}
exports.AsciidocPreviewConfigurationManager = AsciidocPreviewConfigurationManager;
//# sourceMappingURL=previewConfig.js.map