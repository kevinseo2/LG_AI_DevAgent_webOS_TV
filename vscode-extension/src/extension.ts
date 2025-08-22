import * as vscode from 'vscode';
import { WebOSAPIProvider } from './providers/api-provider';
import { MCPClient } from './services/mcp-client';
import { WebOSCompletionProvider } from './providers/completion-provider';
import { WebOSCodeActionProvider } from './providers/code-action-provider';
import { WebOSHoverProvider } from './providers/hover-provider';

let mcpClient: MCPClient;
let apiProvider: WebOSAPIProvider;

export async function activate(context: vscode.ExtensionContext) {
    console.log('webOS TV API Assistant is now active!');

    // Initialize MCP Client
    mcpClient = new MCPClient();
    await mcpClient.initialize();

    // Initialize API Provider
    apiProvider = new WebOSAPIProvider(mcpClient);
    await apiProvider.initialize(context);

    // Register providers
    registerProviders(context);
    
    // Register commands
    registerCommands(context);

    // Show activation message
    vscode.window.showInformationMessage('webOS TV API Assistant activated! 🚀');
}

function registerProviders(context: vscode.ExtensionContext) {
    const jsSelector = { language: 'javascript', scheme: 'file' };
    const tsSelector = { language: 'typescript', scheme: 'file' };
    const selectors = [jsSelector, tsSelector];

    // Completion Provider
    const completionProvider = new WebOSCompletionProvider(apiProvider);
    for (const selector of selectors) {
        context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                selector,
                completionProvider,
                '.', '(', '\''
            )
        );
    }

    // Code Action Provider (Quick Fix)
    const codeActionProvider = new WebOSCodeActionProvider(apiProvider);
    for (const selector of selectors) {
        context.subscriptions.push(
            vscode.languages.registerCodeActionsProvider(
                selector,
                codeActionProvider
            )
        );
    }

    // Hover Provider
    const hoverProvider = new WebOSHoverProvider(apiProvider);
    for (const selector of selectors) {
        context.subscriptions.push(
            vscode.languages.registerHoverProvider(
                selector,
                hoverProvider
            )
        );
    }
}

function registerCommands(context: vscode.ExtensionContext) {
    // Search API Command
    context.subscriptions.push(
        vscode.commands.registerCommand('webos-api.searchAPI', async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'Search webOS TV APIs',
                placeHolder: 'Enter API name or functionality...'
            });

            if (query) {
                await apiProvider.searchAndShowAPIs(query);
            }
        })
    );

    // Generate Code Command
    context.subscriptions.push(
        vscode.commands.registerCommand('webos-api.generateCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            await apiProvider.generateCodeAtCursor(editor);
        })
    );

    // Validate Project Command
    context.subscriptions.push(
        vscode.commands.registerCommand('webos-api.validateProject', async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('No workspace folder found');
                return;
            }

            await apiProvider.validateProject(workspaceFolder.uri.fsPath);
        })
    );

    // Refresh APIs Command
    context.subscriptions.push(
        vscode.commands.registerCommand('webos-api.refreshAPIs', async () => {
            await apiProvider.refreshAPIs();
            vscode.window.showInformationMessage('webOS TV API cache refreshed!');
        })
    );
}

export function deactivate() {
    if (mcpClient) {
        mcpClient.dispose();
    }
}
