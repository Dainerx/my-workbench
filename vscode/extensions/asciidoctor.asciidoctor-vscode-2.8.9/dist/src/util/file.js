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
exports.sortFilesAndDirectories = exports.getChildrenOfPath = exports.getPathOfFolderToLookupFiles = exports.FileInfo = exports.isAsciidocFile = void 0;
const path = require("path");
const path_1 = require("path");
const fs_1 = require("fs");
const { promisify } = require("util");
const readdirAsync = promisify(fs_1.readdir);
function isAsciidocFile(document) {
    return document.languageId === 'asciidoc';
}
exports.isAsciidocFile = isAsciidocFile;
class FileInfo {
    constructor(path, file) {
        this.file = file;
        this.isFile = fs_1.statSync(path_1.join(path, file)).isFile();
    }
}
exports.FileInfo = FileInfo;
/**
 * @param fileName  {string} current filename the look up is done. Absolute path
 * @param text      {string} text in import string. e.g. './src/'
 */
function getPathOfFolderToLookupFiles(fileName, text, rootPath) {
    const normalizedText = path.normalize(text || "");
    const isPathAbsolute = normalizedText.startsWith(path.sep);
    let rootFolder = path.dirname(fileName);
    let pathEntered = normalizedText;
    if (isPathAbsolute) {
        rootFolder = rootPath || "";
    }
    return path.join(rootFolder, pathEntered);
}
exports.getPathOfFolderToLookupFiles = getPathOfFolderToLookupFiles;
function getChildrenOfPath(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const files = yield readdirAsync(path);
            const filesDbg = files
                .map((f) => new FileInfo(path, f));
            return filesDbg;
        }
        catch (error) {
            return [];
        }
    });
}
exports.getChildrenOfPath = getChildrenOfPath;
exports.sortFilesAndDirectories = (filesAndDirs) => {
    const dirs = filesAndDirs.filter((f) => f.isFile !== true);
    const files = filesAndDirs.filter((f) => f.isFile === true);
    return [...dirs, ...files];
};
//# sourceMappingURL=file.js.map