import * as vscode from 'vscode';
import { WebOSAPIProvider } from './api-provider';

export class WebOSHoverProvider implements vscode.HoverProvider {
    constructor(private apiProvider: WebOSAPIProvider) {}

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return undefined;

        const word = document.getText(wordRange);
        const line = document.lineAt(position.line).text;

        // Check if hovering over a Luna service URI
        if (this.isLunaServiceURI(word, line)) {
            return this.createServiceURIHover(word);
        }

        // Check if hovering over a method name in webOS service call
        if (this.isMethodName(word, line)) {
            return this.createMethodHover(word, line);
        }

        // Check if hovering over webOS.service.request
        if (word === 'webOS' || line.includes('webOS.service.request')) {
            return this.createWebOSServiceHover();
        }

        return undefined;
    }

    private isLunaServiceURI(word: string, line: string): boolean {
        return line.includes('luna://') && 
               (line.includes(word) && word.includes('luna://') ||
                line.includes(`luna://${word}`) ||
                line.includes(`luna://com.${word}`) ||
                line.includes(`luna://com.webos.${word}`));
    }

    private isMethodName(word: string, line: string): boolean {
        return line.includes('method:') && 
               line.includes(`'${word}'` || `"${word}"`);
    }

    private createServiceURIHover(serviceURI: string): vscode.Hover {
        const apis = this.apiProvider.getAPIs();
        const api = apis.find(a => a.serviceUri.includes(serviceURI) || serviceURI.includes(a.serviceUri));

        if (api) {
            const markdown = new vscode.MarkdownString();
            markdown.isTrusted = true;
            markdown.supportHtml = true;

            markdown.appendMarkdown(`### ${api.serviceName}\n\n`);
            markdown.appendMarkdown(`**Service URI:** \`${api.serviceUri}\`\n\n`);
            markdown.appendMarkdown(`**Category:** ${api.category}\n\n`);
            markdown.appendMarkdown(`**Status:** ${api.status}\n\n`);
            markdown.appendMarkdown(`**Description:** ${api.description}\n\n`);
            
            // Add link to documentation
            markdown.appendMarkdown(`[📖 View Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);
            
            // Add compatibility info
            markdown.appendMarkdown(`---\n\n`);
            markdown.appendMarkdown(`💡 **Tip:** Use Ctrl+Space for auto-completion of methods\n\n`);

            return new vscode.Hover(markdown);
        }

        // Fallback for unrecognized service URIs
        const fallbackMarkdown = new vscode.MarkdownString();
        fallbackMarkdown.appendMarkdown(`### Luna Service\n\n`);
        fallbackMarkdown.appendMarkdown(`**URI:** \`${serviceURI}\`\n\n`);
        fallbackMarkdown.appendMarkdown(`This appears to be a webOS TV Luna Service URI.\n\n`);
        fallbackMarkdown.appendMarkdown(`[📖 webOS TV API Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);

        return new vscode.Hover(fallbackMarkdown);
    }

    private createMethodHover(methodName: string, line: string): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        
        // Extract service URI from the line
        const serviceMatch = line.match(/luna:\/\/[^'"]+/);
        if (serviceMatch) {
            const serviceURI = serviceMatch[0];
            const apis = this.apiProvider.getAPIs();
            const api = apis.find(a => a.serviceUri === serviceURI);
            
            if (api) {
                const methodInfo = this.getMethodInfo(api.serviceName, methodName);
                
                markdown.appendMarkdown(`### ${api.serviceName}.${methodName}\n\n`);
                
                if (methodInfo) {
                    markdown.appendMarkdown(`${methodInfo.description}\n\n`);
                    
                    if (methodInfo.deprecated) {
                        markdown.appendMarkdown(`⚠️ **DEPRECATED** - This method is deprecated\n\n`);
                    }
                    
                    if (methodInfo.parameters && methodInfo.parameters.length > 0) {
                        markdown.appendMarkdown(`**Parameters:**\n`);
                        for (const param of methodInfo.parameters) {
                            const required = param.required ? '**required**' : '*optional*';
                            markdown.appendMarkdown(`- \`${param.name}\` (${param.type}) - ${required} - ${param.description}\n`);
                        }
                        markdown.appendMarkdown(`\n`);
                    }
                    
                    if (methodInfo.example) {
                        markdown.appendMarkdown(`**Example:**\n`);
                        markdown.appendCodeblock(methodInfo.example, 'javascript');
                    }
                } else {
                    markdown.appendMarkdown(`Method in ${api.serviceName}\n\n`);
                }
                
                markdown.appendMarkdown(`[📖 ${api.serviceName} Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);
            }
        }

        return new vscode.Hover(markdown);
    }

    private createWebOSServiceHover(): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        
        markdown.appendMarkdown(`### webOS.service.request\n\n`);
        markdown.appendMarkdown(`The main method for calling webOS TV Luna Service APIs.\n\n`);
        
        markdown.appendMarkdown(`**Syntax:**\n`);
        markdown.appendCodeblock(`webOS.service.request(uri, options)`, 'javascript');
        
        markdown.appendMarkdown(`**Parameters:**\n`);
        markdown.appendMarkdown(`- \`uri\` (string) - Luna service URI (e.g., "luna://com.webos.service.audio")\n`);
        markdown.appendMarkdown(`- \`options\` (object) - Request options:\n`);
        markdown.appendMarkdown(`  - \`method\` (string) - Method name to call\n`);
        markdown.appendMarkdown(`  - \`parameters\` (object) - Method parameters\n`);
        markdown.appendMarkdown(`  - \`onSuccess\` (function) - Success callback\n`);
        markdown.appendMarkdown(`  - \`onFailure\` (function) - Error callback\n`);
        markdown.appendMarkdown(`  - \`subscribe\` (boolean) - Whether to subscribe for updates\n\n`);
        
        markdown.appendMarkdown(`**Example:**\n`);
        markdown.appendCodeblock(`webOS.service.request('luna://com.webos.service.audio', {
    method: 'getVolume',
    parameters: {},
    onSuccess: function(response) {
        console.log('Volume:', response.volume);
    },
    onFailure: function(error) {
        console.error('Error:', error.errorText);
    }
});`, 'javascript');

        markdown.appendMarkdown(`\n[📖 webOS TV Development Guide](https://webostv.developer.lge.com/develop/)\n\n`);

        return new vscode.Hover(markdown);
    }

    private getMethodInfo(serviceName: string, methodName: string): any {
        // Hardcoded method info for demo - in real implementation,
        // this would come from the MCP server
        const methodDatabase: Record<string, Record<string, any>> = {
            'Audio': {
                'getVolume': {
                    description: '현재 볼륨 수준을 조회합니다.',
                    deprecated: false,
                    parameters: [
                        {
                            name: 'subscribe',
                            type: 'boolean',
                            required: false,
                            description: '볼륨 변경 알림을 구독할지 여부'
                        }
                    ],
                    example: `webOS.service.request('luna://com.webos.service.audio', {
    method: 'getVolume',
    parameters: {
        subscribe: true
    },
    onSuccess: function(response) {
        console.log('Volume:', response.volume);
        console.log('Muted:', response.muted);
    }
});`
                },
                'setVolume': {
                    description: '볼륨 수준을 설정합니다.',
                    deprecated: false,
                    parameters: [
                        {
                            name: 'volume',
                            type: 'number',
                            required: true,
                            description: '설정할 볼륨 수준 (0-100)'
                        }
                    ]
                }
            },
            'Activity Manager': {
                'adopt': {
                    description: '앱이나 서비스가 Activity의 부모로 전환되려는 의지를 등록합니다.',
                    deprecated: false,
                    parameters: [
                        {
                            name: 'activityId',
                            type: 'number',
                            required: true,
                            description: 'Activity ID'
                        },
                        {
                            name: 'wait',
                            type: 'boolean',
                            required: true,
                            description: 'Activity가 해제될 때까지 대기할지 여부'
                        }
                    ]
                }
            }
        };

        return methodDatabase[serviceName]?.[methodName];
    }
}
