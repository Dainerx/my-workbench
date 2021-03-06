"use strict";
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
exports.Import = void 0;
const path = require("path");
const vscode = require("vscode");
const child_process_1 = require("child_process");
const moment = require("moment");
const fs = require("fs");
const text_parser_1 = require("./text-parser");
var Import;
(function (Import) {
    class Configuration {
        constructor() {
            this.DocumentDirectory = '';
            this.selectionRole = SelectionRole.Filename;
            this.encoding = FilenameEncoding.URIEncoding;
            this.mode = SelectionMode.Replace;
        }
    }
    Import.Configuration = Configuration;
    /**
     * What part of the image macro should the selection be used for.
     *
     * e.g. image::filename[alt-text]
     */
    let SelectionRole;
    (function (SelectionRole) {
        SelectionRole[SelectionRole["Filename"] = 0] = "Filename";
        SelectionRole[SelectionRole["AltText"] = 1] = "AltText";
        SelectionRole[SelectionRole["None"] = 2] = "None";
    })(SelectionRole || (SelectionRole = {}));
    /**
     * Controls if the selection is to be replaced with the image macro, or the
     * image macro is to be inserted at the selection-cursor.
     *
     * e.g. |selection| => ||image:...[]
     *      |selection| => |selection|image:...[]
     */
    let SelectionMode;
    (function (SelectionMode) {
        SelectionMode[SelectionMode["Insert"] = 0] = "Insert";
        SelectionMode[SelectionMode["Replace"] = 1] = "Replace";
    })(SelectionMode || (SelectionMode = {}));
    /**
     * Controls how the image filename should be encoded, if at all.
     */
    let FilenameEncoding;
    (function (FilenameEncoding) {
        FilenameEncoding[FilenameEncoding["None"] = 0] = "None";
        FilenameEncoding[FilenameEncoding["URIEncoding"] = 1] = "URIEncoding";
    })(FilenameEncoding || (FilenameEncoding = {}));
    let SelectionContext;
    (function (SelectionContext) {
        SelectionContext[SelectionContext["Inline"] = 0] = "Inline";
        SelectionContext[SelectionContext["Block"] = 1] = "Block";
        SelectionContext[SelectionContext["Other"] = 2] = "Other";
    })(SelectionContext || (SelectionContext = {}));
    class ScriptArgumentError extends Error {
    }
    class Image {
        /**
         * Saves an image from the clipboard.
         * @param filename the filename of the image file
         */
        static saveImageFromClipboard(filename) {
            const platform = process.platform;
            if (platform === 'win32') {
                const script = path.join(__dirname, '../../res/pc.ps1');
                let promise = new Promise((resolve, reject) => {
                    let child = child_process_1.spawn('powershell', [
                        '-noprofile',
                        '-noninteractive',
                        '-nologo',
                        '-sta',
                        '-executionpolicy',
                        'unrestricted',
                        '-windowstyle',
                        'hidden',
                        '-file',
                        `${script}`,
                        `${filename}`,
                    ]);
                    child.stdout.once('data', (e) => resolve(e.toString()));
                    child.stderr.once('data', (e) => {
                        let exception = e.toString().trim();
                        if (exception ==
                            'Exception calling "Open" with "2" argument(s): "Could not find a part of the path')
                            reject(new ScriptArgumentError('bad path exception'));
                        else if (exception == 'no image')
                            reject(new ScriptArgumentError('no image exception'));
                        else if (exception == 'no filename')
                            reject(new ScriptArgumentError('no filename exception'));
                    });
                    child.once('error', (e) => reject(e));
                });
                return promise;
            }
            else if (platform === 'darwin') {
                // Mac
                let scriptPath = path.join(__dirname, '../../res/mac.applescript');
                let promise = new Promise((resolve, reject) => {
                    let child = child_process_1.spawn('osascript', [scriptPath, filename]);
                    child.stdout.once('data', (e) => resolve(e.toString()));
                    child.stderr.once('data', (e) => {
                        console.log(`stderr: ${e}`);
                        const exception = e.toString().trim();
                        if (exception == 'no image') {
                            reject(new ScriptArgumentError('no image exception'));
                        }
                        else {
                            reject(exception);
                        }
                    });
                });
                return promise;
            }
            else {
                // Linux
                const scriptPath = path.join(__dirname, '../../res/linux.sh');
                let promise = new Promise((resolve, reject) => {
                    let child = child_process_1.spawn(`"${scriptPath}"`, [`"${filename}"`], { shell: true });
                    child.stdout.once('data', (e) => resolve(e.toString()));
                    child.stderr.once('data', (e) => {
                        const exception = e.toString().trim();
                        if (exception == 'no xclip') {
                            reject(new ScriptArgumentError('no xclip'));
                        }
                        else if (exception == 'no image') {
                            reject(new ScriptArgumentError('no image exception'));
                        }
                        else {
                            reject(exception);
                        }
                    });
                });
                return promise;
            }
        }
        static importFromClipboard(config) {
            return __awaiter(this, void 0, void 0, function* () {
                config = config || new Configuration();
                const editor = vscode.window.activeTextEditor;
                let filename = moment()
                    .format('d-M-YYYY-HH-mm-ss-A.png')
                    .toString(); //default filename
                let alttext = ''; //todo:...
                let directory = this.get_current_imagesdir();
                // confirm directory is local--asciidoctor allows external URIs. test for
                // protocol (http, ftp, etc) to determine this
                let remote = /'^(?:[a-z]+:)?\\/i.test(directory);
                if (remote) {
                    vscode.window.showWarningMessage('Cannot determine save location for image because `imagesdir` attribute references a remote location.');
                    return;
                }
                // grab the selected text & update either the alt-attribute or filename
                // corresponding to the selection role.
                const selectedText = editor.document.getText(editor.selection);
                if (!editor.selection.isEmpty) {
                    switch (config.selectionRole) {
                        case SelectionRole.AltText:
                            alttext = selectedText;
                            break;
                        case SelectionRole.Filename:
                            filename = selectedText + '.png';
                            break;
                    }
                }
                switch (config.encoding) {
                    case FilenameEncoding.URIEncoding:
                        filename = encodeURIComponent(filename);
                        break;
                }
                try {
                    const docDir = path.dirname(vscode.window.activeTextEditor.document.uri.fsPath);
                    // docDir === '.' if a document has not yet been saved
                    if (docDir === '.') {
                        vscode.window.showErrorMessage('To allow images to be saved, first save your document.');
                        return;
                    }
                    yield this.saveImageFromClipboard(path.join(docDir, directory, filename));
                }
                catch (error) {
                    if (error instanceof ScriptArgumentError) {
                        if (error.message == 'bad path exception') {
                            let folder = path.join(vscode.workspace.rootPath, directory);
                            vscode.window
                                .showErrorMessage(`The imagesdir folder was not found (${folder}).`, 'Create Folder & Retry')
                                .then((value) => __awaiter(this, void 0, void 0, function* () {
                                if (value == 'Create Folder & Retry') {
                                    fs.mkdirSync(folder);
                                    this.importFromClipboard(config); // try again
                                }
                            }));
                        }
                        else if (error.message == 'no image exception')
                            vscode.window.showInformationMessage('An image was not found on the clipboard.');
                        else if (error.message == 'no filename exception')
                            vscode.window.showErrorMessage('Missing image filename argument.');
                        else if (error.message == 'no xclip')
                            vscode.window.showErrorMessage('To use this feature you must install xclip');
                    }
                    else
                        vscode.window.showErrorMessage(error.toString());
                    return;
                }
                let is_inline = Image.predict(config.mode, Image.modifiedLines(editor), editor.selection.anchor.character, selectedText);
                let macro = `image${is_inline ? ':' : '::'}${filename}[${alttext}]`;
                macro = Image.padMacro(config, editor, macro);
                editor.edit((edit) => {
                    switch (config.mode) {
                        case SelectionMode.Insert:
                            edit.insert(editor.selection.active, macro);
                            break;
                        case SelectionMode.Replace:
                            edit.replace(editor.selection, macro);
                            break;
                    }
                });
            });
        }
        // todo: tag functionl
        static padMacro(config, editor, macro) {
            let { first, second } = config.mode == SelectionMode.Replace
                ? editor.selection.active.isAfter(editor.selection.anchor)
                    ? {
                        first: editor.selection.anchor,
                        second: editor.selection.active,
                    }
                    : {
                        first: editor.selection.active,
                        second: editor.selection.anchor,
                    }
                : { first: editor.selection.active, second: editor.selection.active };
            let selection = editor.document.getText(new vscode.Range(first.translate(0, first.character > 0 ? -1 : 0), second.translate(0, 1)));
            let padHead = first.character != 0 && !/^\s/.test(selection);
            let padTail = !/\s$/.test(selection);
            macro = `${padHead ? ' ' : ''}${macro}${padTail ? ' ' : ''}`;
            return macro;
        }
        /**
         * Returns the lines that will be effected by the current editor selection
         */
        static modifiedLines(editor) {
            const affectedLines = new vscode.Range(editor.selection.start.line, 0, editor.selection.end.line + 1, 0);
            const affectedText = editor.document.getText(affectedLines);
            return affectedText;
        }
        /**
         * Determines if the resulting image-macro is an inline-image or
         * block-image.
         */
        static predict(selectionMode, affectedText, index, selectedText) {
            // does the macro start at the beginning of the line and end in only
            // whitespace.
            return !(index === 0 && /^\s+$/.test(affectedText) || /^\s+$|^\S+$/.test(affectedText));
        }
        /**
         * Reads the current `:imagesdir:` [attribute](https://asciidoctor.org/docs/user-manual/#setting-the-location-of-images) from the document.
         *
         *
         * Reads the _nearest_ `:imagesdir:` attribute that appears _before_ the current selection
         * or cursor location, failing that figures it out from the API by converting the document and reading the attribute
         */
        static get_current_imagesdir() {
            const text = vscode.window.activeTextEditor.document.getText();
            const imagesdir = /^[\t\f]*?:imagesdir:\s+(.+?)\s+$/gim;
            let matches = imagesdir.exec(text);
            const index = vscode.window.activeTextEditor.selection.start;
            const cursor_index = vscode.window.activeTextEditor.document.offsetAt(index);
            let dir = '';
            while (matches && matches.index < cursor_index) {
                dir = matches[1] || '';
                matches = imagesdir.exec(text);
            }
            if (dir === '') {
                const thisDocument = vscode.window.activeTextEditor.document;
                const adoc = new text_parser_1.AsciidocParser(thisDocument.uri.fsPath);
                adoc.parseText(thisDocument.getText(), thisDocument);
                dir = adoc.document.getAttribute('imagesdir');
            }
            return dir !== undefined ? dir : '';
        }
        /**
         * Checks if the given editor is a valid condidate _file_ for pasting images into.
         * @param editor vscode editor to check.
         */
        static is_candidate_file(document) {
            return document.uri.scheme === 'file';
        }
        /**
         * Checks if the given selected text is a valid _filename_ for an image.
         * @param selection Selected text to check.
         */
        static is_candidate_selection(selection) {
            return encodeURIComponent(selection) === selection;
        }
        /**
         * Checks if the current selection is an `inline` element of the document.
         */
        static isInline(document, selection) {
            const line = document.lineAt(selection.start).text;
            const selected_text = document.getText(selection);
            const selected_text_is_block = new RegExp(`^${selected_text}\\w*$`);
            return selection.isSingleLine && !selected_text_is_block.test(line);
        }
        /**
         * Determines the context of the selection in the document.
         */
        static getSelectionContext(document, selection) {
            const line = document.lineAt(selection.start).text;
            const selected_text = document.getText(selection);
            const selected_text_is_block = new RegExp(`^${selected_text}\\w*$`);
            if (!selection.isSingleLine) {
                return SelectionContext.Other;
            }
            else if (selected_text_is_block) {
                return SelectionContext.Block;
            }
            else {
                return SelectionContext.Inline;
            }
        }
        static validate(required) {
            if (!this.is_candidate_file(required.editor.document)) {
                return false;
            }
            return true;
        }
        static isValidFilename(selection) {
            if (!this.is_candidate_selection(selection)) {
                return { result: false, value: encodeURIComponent(selection) };
            }
            return { result: true, value: selection };
        }
    }
    Import.Image = Image;
    function encodeFilename(config, filename) {
        switch (config.encoding) {
            case FilenameEncoding.None:
                break;
            case FilenameEncoding.URIEncoding:
                filename = encodeURIComponent(filename);
                break;
            default:
                return filename;
        }
    }
})(Import = exports.Import || (exports.Import = {}));
//# sourceMappingURL=image-paste.js.map