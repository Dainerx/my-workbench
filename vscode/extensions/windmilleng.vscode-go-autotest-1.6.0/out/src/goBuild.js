"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const util_1 = require("./util");
const os = require("os");
const goPackages_1 = require("./goPackages");
const testUtils_1 = require("./testUtils");
const goPath_1 = require("./goPath");
/**
 * Runs go build -i or go test -i and presents the output in the 'Go' channel and in the diagnostic collections.
 *
 * @param fileUri Document uri.
 * @param goConfig Configuration for the Go extension.
 * @param buildWorkspace If true builds code in all workspace.
 */
function goBuild(fileUri, goConfig, buildWorkspace) {
    const currentWorkspace = util_1.getWorkspaceFolderPath(fileUri);
    const cwd = (buildWorkspace && currentWorkspace) ? currentWorkspace : path.dirname(fileUri.fsPath);
    if (!path.isAbsolute(cwd)) {
        return Promise.resolve([]);
    }
    const buildEnv = Object.assign({}, util_1.getToolsEnvVars());
    const tmpPath = path.normalize(path.join(os.tmpdir(), 'go-code-check'));
    const isTestFile = fileUri && fileUri.fsPath.endsWith('_test.go');
    const buildFlags = isTestFile ? testUtils_1.getTestFlags(goConfig, null) : (Array.isArray(goConfig['buildFlags']) ? [...goConfig['buildFlags']] : []);
    const buildArgs = isTestFile ? ['test', '-c'] : ['build'];
    if (goConfig['installDependenciesWhenBuilding'] === true) {
        buildArgs.push('-i');
        // Remove the -i flag from user as we add it anyway
        if (buildFlags.indexOf('-i') > -1) {
            buildFlags.splice(buildFlags.indexOf('-i'), 1);
        }
    }
    buildArgs.push('-o', tmpPath, ...buildFlags);
    if (goConfig['buildTags'] && buildFlags.indexOf('-tags') === -1) {
        buildArgs.push('-tags');
        buildArgs.push(goConfig['buildTags']);
    }
    if (buildWorkspace && currentWorkspace && !isTestFile) {
        return goPackages_1.getNonVendorPackages(currentWorkspace).then(pkgs => {
            let buildPromises = [];
            buildPromises = pkgs.map(pkgPath => {
                return util_1.runTool(buildArgs.concat(pkgPath), currentWorkspace, 'error', true, null, buildEnv, true);
            });
            return Promise.all(buildPromises).then((resultSets) => {
                let results = [].concat.apply([], resultSets);
                // Filter duplicates
                return results.filter((results, index, self) => self.findIndex((t) => {
                    return t.file === results.file && t.line === results.line && t.msg === results.msg && t.severity === results.severity;
                }) === index);
            });
        });
    }
    // Find the right importPath instead of directly using `.`. Fixes https://github.com/Microsoft/vscode-go/issues/846
    let currentGoWorkspace = goPath_1.getCurrentGoWorkspaceFromGOPATH(util_1.getCurrentGoPath(), cwd);
    let importPath = currentGoWorkspace ? cwd.substr(currentGoWorkspace.length + 1) : '.';
    return util_1.runTool(buildArgs.concat(importPath), cwd, 'error', true, null, buildEnv, true);
}
exports.goBuild = goBuild;
//# sourceMappingURL=goBuild.js.map