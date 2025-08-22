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
exports.WebOSAPIProvider = void 0;
const vscode = __importStar(require("vscode"));
class WebOSAPIProvider {
    constructor(mcpClient) {
        this.mcpClient = mcpClient;
        this.apis = [];
        this.methods = [];
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = '$(rocket) webOS TV';
        this.statusBarItem.tooltip = 'webOS TV API Assistant';
        this.statusBarItem.command = 'webos-api.searchAPI';
    }
    async initialize(context) {
        try {
            // Load API list
            await this.loadAPIs();
            this.statusBarItem.show();
            context.subscriptions.push(this.statusBarItem);
            // Update status
            this.statusBarItem.text = `$(rocket) webOS TV (${this.apis.length} APIs)`;
        }
        catch (error) {
            console.error('Failed to initialize API provider:', error);
            vscode.window.showErrorMessage('Failed to load webOS TV APIs');
        }
    }
    async loadAPIs() {
        try {
            // Get all APIs
            const response = await this.mcpClient.callTool('webos_list_apis');
            this.apis = this.parseAPIListResponse(response);
            // Cache frequently used methods for faster completion
            await this.cacheCommonMethods();
        }
        catch (error) {
            console.error('Failed to load APIs:', error);
            throw error;
        }
    }
    parseAPIListResponse(response) {
        if (response?.content?.[0]?.text) {
            const text = response.content[0].text;
            const apis = [];
            // Parse the markdown-formatted response
            const lines = text.split('\n');
            let currentAPI = {};
            for (const line of lines) {
                if (line.startsWith('**') && line.includes('**')) {
                    // New API entry
                    if (currentAPI.serviceName) {
                        apis.push(currentAPI);
                    }
                    const match = line.match(/\*\*(.*?)\*\* \((.*?)\)/);
                    if (match) {
                        currentAPI = {
                            serviceName: match[1],
                            category: match[2]
                        };
                    }
                }
                else if (line.startsWith('- URI:')) {
                    currentAPI.serviceUri = line.replace('- URI: `', '').replace('`', '');
                }
                else if (line.startsWith('- Status:')) {
                    currentAPI.status = line.replace('- Status: ', '');
                }
                else if (line.startsWith('- Description:')) {
                    currentAPI.description = line.replace('- Description: ', '');
                }
            }
            // Add the last API
            if (currentAPI.serviceName) {
                apis.push(currentAPI);
            }
            return apis;
        }
        return [];
    }
    async cacheCommonMethods() {
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
            }
            catch (error) {
                console.warn(`Failed to cache methods for ${apiName}:`, error);
            }
        }
    }
    async searchAndShowAPIs(query) {
        try {
            const response = await this.mcpClient.callTool('webos_search_methods', {
                query,
                includeDeprecated: false
            });
            if (response?.content?.[0]?.text) {
                const panel = vscode.window.createWebviewPanel('webosAPISearch', 'webOS TV API Search Results', vscode.ViewColumn.Two, {
                    enableScripts: true,
                    retainContextWhenHidden: true
                });
                panel.webview.html = this.getSearchResultsHTML(response.content[0].text, query);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Search failed: ${error}`);
        }
    }
    async generateCodeAtCursor(editor) {
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
        if (!selectedAPI)
            return;
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
                const codeStyle = config.get('codeStyle', 'callback');
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Code generation failed: ${error}`);
        }
    }
    async showMethodPicker(serviceName, apiInfo) {
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
    extractCodeFromResponse(text) {
        // Extract JavaScript code from markdown response
        const codeMatch = text.match(/```javascript\n([\s\S]*?)\n```/);
        return codeMatch ? codeMatch[1] : text;
    }
    async validateProject(projectPath) {
        try {
            // This would implement project validation
            vscode.window.showInformationMessage('Project validation feature coming soon!');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Validation failed: ${error}`);
        }
    }
    async refreshAPIs() {
        await this.loadAPIs();
        this.statusBarItem.text = `$(rocket) webOS TV (${this.apis.length} APIs)`;
    }
    getSearchResultsHTML(results, query) {
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
    convertMarkdownToHTML(markdown) {
        // Simple markdown to HTML conversion
        return markdown
            .replace(/\*\*(.*?)\*\*/g, '<div class="method-name">$1</div>')
            .replace(/- URI: `(.*?)`/g, '<div class="method-uri">$1</div>')
            .replace(/- Description: (.*)/g, '<div class="method-description">$1</div>')
            .replace(/\n\n/g, '</div><div class="method">');
    }
    getAPIs() {
        return this.apis;
    }
    getMethods() {
        return this.methods;
    }
}
exports.WebOSAPIProvider = WebOSAPIProvider;
//# sourceMappingURL=api-provider.js.map