"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const api_provider_1 = require("./providers/api-provider");
const mcp_client_1 = require("./services/mcp-client");
const completion_provider_1 = require("./providers/completion-provider");
const code_action_provider_1 = require("./providers/code-action-provider");
const hover_provider_1 = require("./providers/hover-provider");
let mcpClient;
let apiProvider;
async function activate(context) {
    console.log('webOS TV API Assistant is now active!');
    // Initialize MCP Client
    mcpClient = new mcp_client_1.MCPClient();
    await mcpClient.initialize();
    // Initialize API Provider
    apiProvider = new api_provider_1.WebOSAPIProvider(mcpClient);
    await apiProvider.initialize(context);
    // Register providers
    registerProviders(context);
    // Register commands
    registerCommands(context);
    // Show activation message
    vscode.window.showInformationMessage('webOS TV API Assistant activated! 🚀');
}
function registerProviders(context) {
    const jsSelector = { language: 'javascript', scheme: 'file' };
    const tsSelector = { language: 'typescript', scheme: 'file' };
    const selectors = [jsSelector, tsSelector];
    // Completion Provider
    const completionProvider = new completion_provider_1.WebOSCompletionProvider(apiProvider);
    for (const selector of selectors) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, completionProvider, '.', '(', '\''));
    }
    // Code Action Provider (Quick Fix)
    const codeActionProvider = new code_action_provider_1.WebOSCodeActionProvider(apiProvider);
    for (const selector of selectors) {
        context.subscriptions.push(vscode.languages.registerCodeActionsProvider(selector, codeActionProvider));
    }
    // Hover Provider
    const hoverProvider = new hover_provider_1.WebOSHoverProvider(apiProvider);
    for (const selector of selectors) {
        context.subscriptions.push(vscode.languages.registerHoverProvider(selector, hoverProvider));
    }
}
function registerCommands(context) {
    // Search API Command
    context.subscriptions.push(vscode.commands.registerCommand('webos-api.searchAPI', async () => {
        const query = await vscode.window.showInputBox({
            prompt: 'Search webOS TV APIs',
            placeHolder: 'Enter API name or functionality...'
        });
        if (query) {
            await apiProvider.searchAndShowAPIs(query);
        }
    }));
    // Generate Code Command
    context.subscriptions.push(vscode.commands.registerCommand('webos-api.generateCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }
        await apiProvider.generateCodeAtCursor(editor);
    }));
    // Validate Project Command
    context.subscriptions.push(vscode.commands.registerCommand('webos-api.validateProject', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder found');
            return;
        }
        await apiProvider.validateProject(workspaceFolder.uri.fsPath);
    }));
    // Refresh APIs Command
    context.subscriptions.push(vscode.commands.registerCommand('webos-api.refreshAPIs', async () => {
        await apiProvider.refreshAPIs();
        vscode.window.showInformationMessage('webOS TV API cache refreshed!');
    }));
}
function deactivate() {
    if (mcpClient) {
        mcpClient.dispose();
    }
}
//# sourceMappingURL=extension.js.map