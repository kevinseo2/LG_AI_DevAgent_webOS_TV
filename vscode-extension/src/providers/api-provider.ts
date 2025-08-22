import * as vscode from 'vscode';
import { MCPClient } from '../services/mcp-client';

export interface WebOSAPIInfo {
    serviceName: string;
    serviceUri: string;
    category: string;
    description: string;
    status: string;
}

export interface WebOSMethod {
    serviceName: string;
    serviceUri: string;
    methodName: string;
    description: string;
    deprecated: boolean;
    emulatorSupport: boolean;
}

export class WebOSAPIProvider {
    private apis: WebOSAPIInfo[] = [];
    private methods: WebOSMethod[] = [];
    private statusBarItem: vscode.StatusBarItem;

    constructor(private mcpClient: MCPClient) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.text = '$(rocket) webOS TV';
        this.statusBarItem.tooltip = 'webOS TV API Assistant';
        this.statusBarItem.command = 'webos-api.searchAPI';
    }

    async initialize(context: vscode.ExtensionContext): Promise<void> {
        try {
            // Load API list
            await this.loadAPIs();
            
            this.statusBarItem.show();
            context.subscriptions.push(this.statusBarItem);

            // Update status
            this.statusBarItem.text = `$(rocket) webOS TV (${this.apis.length} APIs)`;
        } catch (error) {
            console.error('Failed to initialize API provider:', error);
            vscode.window.showErrorMessage('Failed to load webOS TV APIs');
        }
    }

    private async loadAPIs(): Promise<void> {
        try {
            // Get all APIs
            const response = await this.mcpClient.callTool('webos_list_apis');
            this.apis = this.parseAPIListResponse(response);

            // Cache frequently used methods for faster completion
            await this.cacheCommonMethods();
        } catch (error) {
            console.error('Failed to load APIs:', error);
            throw error;
        }
    }

    private parseAPIListResponse(response: any): WebOSAPIInfo[] {
        if (response?.content?.[0]?.text) {
            const text = response.content[0].text;
            const apis: WebOSAPIInfo[] = [];
            
            // Parse the markdown-formatted response
            const lines = text.split('\n');
            let currentAPI: Partial<WebOSAPIInfo> = {};

            for (const line of lines) {
                if (line.startsWith('**') && line.includes('**')) {
                    // New API entry
                    if (currentAPI.serviceName) {
                        apis.push(currentAPI as WebOSAPIInfo);
                    }
                    
                    const match = line.match(/\*\*(.*?)\*\* \((.*?)\)/);
                    if (match) {
                        currentAPI = {
                            serviceName: match[1],
                            category: match[2]
                        };
                    }
                } else if (line.startsWith('- URI:')) {
                    currentAPI.serviceUri = line.replace('- URI: `', '').replace('`', '');
                } else if (line.startsWith('- Status:')) {
                    currentAPI.status = line.replace('- Status: ', '');
                } else if (line.startsWith('- Description:')) {
                    currentAPI.description = line.replace('- Description: ', '');
                }
            }

            // Add the last API
            if (currentAPI.serviceName) {
                apis.push(currentAPI as WebOSAPIInfo);
            }

            return apis;
        }
        return [];
    }

    private async cacheCommonMethods(): Promise<void> {
        // Cache methods for most commonly used APIs
        const commonAPIs = ['Audio', 'Activity Manager', 'Settings Service'];
        
        for (const apiName of commonAPIs) {
            try {
                const searchResponse = await this.mcpClient.callTool('webos_search_methods', {
                    apiName: apiName,
                    query: '*' // Get all methods
                });
                
                // Parse and cache methods
                // This is a simplified implementation
            } catch (error) {
                console.warn(`Failed to cache methods for ${apiName}:`, error);
            }
        }
    }

    async searchAndShowAPIs(query: string): Promise<void> {
        try {
            const response = await this.mcpClient.callTool('webos_search_methods', {
                query,
                includeDeprecated: false
            });

            if (response?.content?.[0]?.text) {
                const panel = vscode.window.createWebviewPanel(
                    'webosAPISearch',
                    'webOS TV API Search Results',
                    vscode.ViewColumn.Two,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true
                    }
                );

                panel.webview.html = this.getSearchResultsHTML(response.content[0].text, query);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Search failed: ${error}`);
        }
    }

    async generateCodeAtCursor(editor: vscode.TextEditor): Promise<void> {
        const position = editor.selection.active;
        const document = editor.document;
        
        // Quick picker for API selection
        const apiItems = this.apis.map(api => ({
            label: api.serviceName,
            description: api.serviceUri,
            detail: api.description,
            api: api
        }));

        const selectedAPI = await vscode.window.showQuickPick(apiItems, {
            placeHolder: 'Select webOS TV API'
        });

        if (!selectedAPI) return;

        // Get methods for selected API
        try {
            const apiInfo = await this.mcpClient.callTool('webos_get_api_info', {
                serviceName: selectedAPI.api.serviceName,
                includeExamples: false
            });

            // Parse methods from API info and show method picker
            const methodPicker = await this.showMethodPicker(selectedAPI.api.serviceName, apiInfo);
            
            if (methodPicker) {
                // Generate code
                const config = vscode.workspace.getConfiguration('webos-api');
                const codeStyle = config.get<string>('codeStyle', 'callback');

                const codeResponse = await this.mcpClient.callTool('webos_generate_code', {
                    serviceName: selectedAPI.api.serviceName,
                    methodName: methodPicker,
                    codeStyle: codeStyle,
                    includeErrorHandling: true
                });

                if (codeResponse?.content?.[0]?.text) {
                    const generatedCode = this.extractCodeFromResponse(codeResponse.content[0].text);
                    
                    // Insert code at cursor
                    editor.edit(editBuilder => {
                        editBuilder.insert(position, generatedCode);
                    });
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Code generation failed: ${error}`);
        }
    }

    private async showMethodPicker(serviceName: string, apiInfo: any): Promise<string | undefined> {
        // Parse methods from API info response
        // This is a simplified implementation - you'd parse the actual methods
        const commonMethods = ['getVolume', 'setVolume', 'adopt', 'cancel', 'getSystemInfo'];
        
        const methodItems = commonMethods.map(method => ({
            label: method,
            description: `${serviceName}.${method}`,
            detail: 'Click to generate code'
        }));

        const selected = await vscode.window.showQuickPick(methodItems, {
            placeHolder: `Select ${serviceName} method`
        });

        return selected?.label;
    }

    private extractCodeFromResponse(text: string): string {
        // Extract JavaScript code from markdown response
        const codeMatch = text.match(/```javascript\n([\s\S]*?)\n```/);
        return codeMatch ? codeMatch[1] : text;
    }

    async validateProject(projectPath: string): Promise<void> {
        try {
            // This would implement project validation
            vscode.window.showInformationMessage('Project validation feature coming soon!');
        } catch (error) {
            vscode.window.showErrorMessage(`Validation failed: ${error}`);
        }
    }

    async refreshAPIs(): Promise<void> {
        await this.loadAPIs();
        this.statusBarItem.text = `$(rocket) webOS TV (${this.apis.length} APIs)`;
    }

    private getSearchResultsHTML(results: string, query: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>webOS TV API Search</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 20px;
        }
        .header {
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .method {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .method-name {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            font-size: 1.1em;
        }
        .method-uri {
            font-family: 'Courier New', monospace;
            color: var(--vscode-textPreformat-foreground);
            font-size: 0.9em;
        }
        .method-description {
            margin-top: 8px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Search Results for: "${query}"</h1>
    </div>
    <div class="results">
        ${this.convertMarkdownToHTML(results)}
    </div>
</body>
</html>`;
    }

    private convertMarkdownToHTML(markdown: string): string {
        // Simple markdown to HTML conversion
        return markdown
            .replace(/\*\*(.*?)\*\*/g, '<div class="method-name">$1</div>')
            .replace(/- URI: `(.*?)`/g, '<div class="method-uri">$1</div>')
            .replace(/- Description: (.*)/g, '<div class="method-description">$1</div>')
            .replace(/\n\n/g, '</div><div class="method">');
    }

    getAPIs(): WebOSAPIInfo[] {
        return this.apis;
    }

    getMethods(): WebOSMethod[] {
        return this.methods;
    }
}
