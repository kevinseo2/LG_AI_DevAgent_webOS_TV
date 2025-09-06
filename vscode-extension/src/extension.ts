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
    
    try {
        // Initialize MCP Client
        console.log('Initializing MCP Client...');
        mcpClient = new MCPClient();
        await mcpClient.initialize();
        console.log('MCP Client initialized successfully');

        // Initialize API Provider
        console.log('Initializing API Provider...');
        apiProvider = new WebOSAPIProvider(mcpClient);
        await apiProvider.initialize(context);
        console.log('API Provider initialized successfully');

        // Register providers with error handling
        console.log('Registering providers...');
        registerProviders(context);
        console.log('Providers registered successfully');
        
        // Register commands
        console.log('Registering commands...');
        registerCommands(context);
        console.log('Commands registered successfully');

        // Show activation message
        vscode.window.showInformationMessage('webOS TV API Assistant activated! 🚀');
        console.log('webOS TV API Assistant activation completed');
        
    } catch (error) {
        console.error('Failed to activate webOS TV API Assistant:', error);
        vscode.window.showErrorMessage(`webOS TV API Assistant activation failed: ${error instanceof Error ? error.message : String(error)}`);
        
        // Still try to register basic functionality even if full initialization fails
        try {
            console.log('Attempting fallback registration...');
            registerProviders(context);
            registerCommands(context);
            vscode.window.showWarningMessage('webOS TV API Assistant activated with limited functionality');
        } catch (fallbackError) {
            console.error('Fallback registration also failed:', fallbackError);
        }
    }
}

function registerProviders(context: vscode.ExtensionContext) {
    try {
        const jsSelector = { language: 'javascript', scheme: 'file' };
        const tsSelector = { language: 'typescript', scheme: 'file' };
        const selectors = [jsSelector, tsSelector];

        // Ensure apiProvider exists before registering providers
        if (!apiProvider) {
            console.warn('⚠️ API Provider not available, creating minimal fallback...');
            // Create a minimal fallback API provider
            if (mcpClient) {
                apiProvider = new WebOSAPIProvider(mcpClient);
            } else {
                console.error('❌ MCP Client also not available, providers may have limited functionality');
                return;
            }
        }

        // Completion Provider with high priority and comprehensive trigger characters
        const completionProvider = new WebOSCompletionProvider(apiProvider);
        for (const selector of selectors) {
            context.subscriptions.push(
                vscode.languages.registerCompletionItemProvider(
                    selector,
                    completionProvider,
                    // Add all possible trigger characters
                    '.', '(', '\'', '"', '/', ':', 'l', 'w', 'O', 'S', 'u', 'n', 'a', 'e', 'b'
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
    } catch (error) {
        console.error('❌ Failed to register providers:', error);
        throw error;
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

    // Reconnect MCP Server Command
    context.subscriptions.push(
        vscode.commands.registerCommand('webos-api.reconnectServer', async () => {
            if (mcpClient) {
                await mcpClient.reconnect();
            } else {
                vscode.window.showErrorMessage('MCP Client not available');
            }
        })
    );

    // Show Connection Status Command
    context.subscriptions.push(
        vscode.commands.registerCommand('webos-api.showConnectionStatus', async () => {
            if (mcpClient) {
                const status = mcpClient.getConnectionStatus();
                const statusText = status.connected ? 'Connected' : 
                                 status.reconnecting ? 'Reconnecting' : 'Disconnected';
                const message = `MCP Server Status: ${statusText} (Attempts: ${status.attempts})`;
                vscode.window.showInformationMessage(message);
            } else {
                vscode.window.showErrorMessage('MCP Client not available');
            }
        })
    );
}

export function deactivate() {
    if (mcpClient) {
        mcpClient.dispose();
    }
}
