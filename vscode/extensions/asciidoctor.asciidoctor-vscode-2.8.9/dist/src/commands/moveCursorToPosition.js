"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoveCursorToPositionCommand = void 0;
const vscode = require("vscode");
class MoveCursorToPositionCommand {
    constructor() {
        this.id = '_asciidoc.moveCursorToPosition';
    }
    execute(line, character) {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        const position = new vscode.Position(line, character);
        const selection = new vscode.Selection(position, position);
        vscode.window.activeTextEditor.revealRange(selection);
        vscode.window.activeTextEditor.selection = selection;
    }
}
exports.MoveCursorToPositionCommand = MoveCursorToPositionCommand;
//# sourceMappingURL=moveCursorToPosition.js.map