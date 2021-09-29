"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const util_1 = require("./util");
/**
 * Runs go vet or go tool vet and presents the output in the 'Go' channel and in the diagnostic collections.
 *
 * @param fileUri Document uri.
 * @param goConfig Configuration for the Go extension.
 * @param vetWorkspace If true vets code in all workspace.
 */
function goVet(fileUri, goConfig, vetWorkspace) {
    if (running) {
        tokenSource.cancel();
    }
    const currentWorkspace = util_1.getWorkspaceFolderPath(fileUri);
    const cwd = (vetWorkspace && currentWorkspace) ? currentWorkspace : path.dirname(fileUri.fsPath);
    if (!path.isAbsolute(cwd)) {
        return Promise.resolve([]);
    }
    const vetFlags = goConfig['vetFlags'] || [];
    const vetEnv = Object.assign({}, util_1.getToolsEnvVars());
    const vetPromise = util_1.getGoVersion().then((version) => {
        const tagsArg = [];
        if (goConfig['buildTags'] && vetFlags.indexOf('-tags') === -1) {
            tagsArg.push('-tags');
            tagsArg.push(goConfig['buildTags']);
        }
        let vetArgs = ['vet', ...vetFlags, ...tagsArg, './...'];
        if (version && version.major === 1 && version.minor <= 9 && vetFlags.length) {
            vetArgs = ['tool', 'vet', ...vetFlags, ...tagsArg, '.'];
        }
        running = true;
        return util_1.runTool(vetArgs, cwd, 'warning', true, null, vetEnv, false, tokenSource.token).then((result) => {
            running = false;
            return result;
        });
    });
    return vetPromise;
}
exports.goVet = goVet;
let tokenSource = new vscode.CancellationTokenSource();
let running = false;
//# sourceMappingURL=goVet.js.map