import * as vscode from 'vscode';
import { WebOSAPIProvider } from './api-provider';

export class WebOSCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private apiProvider: WebOSAPIProvider) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        
        const lineText = document.lineAt(position).text;
        const linePrefix = lineText.substring(0, position.character);

        // Check if we're in a webOS.service.request context
        if (this.isInWebOSServiceContext(linePrefix)) {
            completions.push(...this.getWebOSServiceCompletions());
        }

        // Check if we're completing Luna service URIs
        if (this.isCompletingServiceURI(linePrefix)) {
            completions.push(...this.getServiceURICompletions());
        }

        // Check if we're completing method names
        if (this.isCompletingMethod(linePrefix)) {
            completions.push(...await this.getMethodCompletions(linePrefix));
        }

        return completions;
    }

    private isInWebOSServiceContext(linePrefix: string): boolean {
        return linePrefix.includes('webOS.service.request') ||
               linePrefix.includes('webOS.service.call');
    }

    private isCompletingServiceURI(linePrefix: string): boolean {
        return linePrefix.includes('luna://') ||
               (linePrefix.includes("'luna://") && !linePrefix.includes("'luna://", linePrefix.lastIndexOf("'luna://") + 1)) ||
               (linePrefix.includes('"luna://') && !linePrefix.includes('"luna://', linePrefix.lastIndexOf('"luna://') + 1));
    }

    private isCompletingMethod(linePrefix: string): boolean {
        return linePrefix.includes('method:') &&
               (linePrefix.includes("'") || linePrefix.includes('"'));
    }

    private getWebOSServiceCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        // webOS.service.request snippet
        const requestCompletion = new vscode.CompletionItem(
            'webOS.service.request',
            vscode.CompletionItemKind.Snippet
        );
        requestCompletion.insertText = new vscode.SnippetString(
            `webOS.service.request('\${1:luna://service.uri}', {
    method: '\${2:methodName}',
    parameters: {
        \${3:// parameters}
    },
    onSuccess: function (inResponse) {
        \${4:// Success handling}
        console.log('Success:', inResponse);
    },
    onFailure: function (inError) {
        \${5:// Error handling}
        console.log('Failed:', inError.errorText);
    }
});`
        );
        requestCompletion.documentation = new vscode.MarkdownString(
            'Generate a webOS TV Luna Service API call'
        );
        completions.push(requestCompletion);

        return completions;
    }

    private getServiceURICompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const apis = this.apiProvider.getAPIs();

        for (const api of apis) {
            const completion = new vscode.CompletionItem(
                api.serviceUri,
                vscode.CompletionItemKind.Value
            );
            completion.detail = api.serviceName;
            completion.documentation = new vscode.MarkdownString(
                `**${api.serviceName}** (${api.category})\\n\\n${api.description}`
            );
            completion.insertText = api.serviceUri;
            
            // Add icon based on category
            switch (api.category) {
                case 'system':
                    completion.kind = vscode.CompletionItemKind.Module;
                    break;
                case 'media':
                    completion.kind = vscode.CompletionItemKind.Event;
                    break;
                case 'device':
                    completion.kind = vscode.CompletionItemKind.Interface;
                    break;
                case 'network':
                    completion.kind = vscode.CompletionItemKind.Reference;
                    break;
            }
            
            completions.push(completion);
        }

        return completions;
    }

    private async getMethodCompletions(linePrefix: string): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];

        // Extract service URI from line
        const serviceURIMatch = linePrefix.match(/luna:\/\/[^'"]*/);
        if (!serviceURIMatch) return completions;

        const serviceURI = serviceURIMatch[0];
        const api = this.apiProvider.getAPIs().find(a => a.serviceUri === serviceURI);
        
        if (!api) return completions;

        // Get common methods for this API
        const commonMethods = this.getCommonMethodsForAPI(api.serviceName);
        
        for (const method of commonMethods) {
            const completion = new vscode.CompletionItem(
                method.name,
                vscode.CompletionItemKind.Method
            );
            completion.detail = `${api.serviceName}.${method.name}`;
            completion.documentation = new vscode.MarkdownString(method.description);
            completion.insertText = method.name;
            
            if (method.deprecated) {
                completion.tags = [vscode.CompletionItemTag.Deprecated];
            }
            
            completions.push(completion);
        }

        return completions;
    }

    private getCommonMethodsForAPI(serviceName: string): Array<{name: string, description: string, deprecated: boolean}> {
        // Hardcoded common methods for demo - in real implementation, 
        // this would come from the MCP server
        const methodMap: Record<string, Array<{name: string, description: string, deprecated: boolean}>> = {
            'Audio': [
                { name: 'getVolume', description: '현재 볼륨 수준을 조회합니다', deprecated: false },
                { name: 'setVolume', description: '볼륨 수준을 설정합니다', deprecated: false }
            ],
            'Activity Manager': [
                { name: 'adopt', description: '앱이나 서비스가 Activity의 부모로 전환되려는 의지를 등록합니다', deprecated: false },
                { name: 'cancel', description: '지정된 Activity를 종료하고 모든 구독자에게 cancel 이벤트를 보냅니다', deprecated: false },
                { name: 'create', description: '새로운 Activity를 생성하고 해당 ID를 반환합니다', deprecated: false }
            ],
            'Settings Service': [
                { name: 'getSystemSettings', description: '시스템 설정 값들을 조회합니다', deprecated: false },
                { name: 'setSystemSettings', description: '시스템 설정 값을 설정합니다', deprecated: false }
            ]
        };

        return methodMap[serviceName] || [];
    }
}
