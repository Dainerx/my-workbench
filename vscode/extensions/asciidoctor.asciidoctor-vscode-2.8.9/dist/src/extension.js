"use strict";
/*---------------------------------------------------------------------------------------------
  *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const commandManager_1 = require("./commandManager");
const commands = require("./commands/index");
const documentLinkProvider_1 = require("./features/documentLinkProvider");
const documentSymbolProvider_1 = require("./features/documentSymbolProvider");
// import AsciidocFoldingProvider from './features/foldingProvider';
const previewContentProvider_1 = require("./features/previewContentProvider");
const previewManager_1 = require("./features/previewManager");
const workspaceSymbolProvider_1 = require("./features/workspaceSymbolProvider");
const logger_1 = require("./logger");
const asciidocEngine_1 = require("./asciidocEngine");
const asciidocExtensions_1 = require("./asciidocExtensions");
const security_1 = require("./security");
const slugify_1 = require("./slugify");
const attributeCompleter_1 = require("./features/attributeCompleter");
const includeAutoCompletion_1 = require("./util/includeAutoCompletion");
function activate(context) {
    const contributions = asciidocExtensions_1.getAsciidocExtensionContributions(context);
    const cspArbiter = new security_1.ExtensionContentSecurityPolicyArbiter(context.globalState, context.workspaceState);
    const errorCollection = vscode.languages.createDiagnosticCollection('asciidoc');
    const engine = new asciidocEngine_1.AsciidocEngine(contributions, slugify_1.githubSlugifier, errorCollection);
    const logger = new logger_1.Logger();
    logger.log("Extension was started");
    const selector = [
        { language: 'asciidoc', scheme: 'file' },
        { language: 'asciidoc', scheme: 'untitled' },
    ];
    const contentProvider = new previewContentProvider_1.AsciidocContentProvider(engine, context, cspArbiter, contributions, logger);
    const symbolProvider = new documentSymbolProvider_1.default(engine, null, null, null, null);
    const previewManager = new previewManager_1.AsciidocPreviewManager(contentProvider, logger, contributions);
    context.subscriptions.push(previewManager);
    const includeAutoCompletionMonitor = new includeAutoCompletion_1.AsciidocFileIncludeAutoCompletionMonitor();
    context.subscriptions.push(includeAutoCompletionMonitor);
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider));
    context.subscriptions.push(vscode.languages.registerDocumentLinkProvider(selector, new documentLinkProvider_1.default()));
    // context.subscriptions.push(vscode.languages.registerFoldingRangeProvider(selector, new AsciidocFoldingProvider(engine)));
    context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider(new workspaceSymbolProvider_1.default(symbolProvider)));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, new attributeCompleter_1.AttributeCompleter(), '{'));
    const previewSecuritySelector = new security_1.PreviewSecuritySelector(cspArbiter, previewManager);
    const commandManager = new commandManager_1.CommandManager();
    context.subscriptions.push(commandManager);
    commandManager.register(new commands.ShowPreviewCommand(previewManager));
    commandManager.register(new commands.ShowPreviewToSideCommand(previewManager));
    commandManager.register(new commands.ShowLockedPreviewToSideCommand(previewManager));
    commandManager.register(new commands.ShowSourceCommand(previewManager));
    commandManager.register(new commands.RefreshPreviewCommand(previewManager));
    commandManager.register(new commands.MoveCursorToPositionCommand());
    commandManager.register(new commands.ShowPreviewSecuritySelectorCommand(previewSecuritySelector, previewManager));
    commandManager.register(new commands.OpenDocumentLinkCommand(engine));
    commandManager.register(new commands.ExportAsPDF(engine, logger));
    commandManager.register(new commands.PasteImage());
    commandManager.register(new commands.ToggleLockCommand(previewManager));
    commandManager.register(new commands.ShowPreviewCommand(previewManager));
    commandManager.register(new commands.SaveHTML(engine));
    commandManager.register(new commands.SaveDocbook(engine));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        logger.updateConfiguration();
        previewManager.updateConfiguration();
    }));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        errorCollection.clear();
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
        previewManager.refresh(true);
    }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map