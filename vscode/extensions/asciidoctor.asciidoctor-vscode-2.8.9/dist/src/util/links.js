"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUriForLinkWithKnownExternalScheme = void 0;
const vscode = require("vscode");
const knownSchemes = ['http:', 'https:', 'file:', 'mailto:'];
function getUriForLinkWithKnownExternalScheme(link) {
    if (knownSchemes.some((knownScheme) => link.toLowerCase().startsWith(knownScheme))) {
        return vscode.Uri.parse(link);
    }
    return undefined;
}
exports.getUriForLinkWithKnownExternalScheme = getUriForLinkWithKnownExternalScheme;
//# sourceMappingURL=links.js.map