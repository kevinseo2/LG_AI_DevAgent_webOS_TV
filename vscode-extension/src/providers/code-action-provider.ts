import * as vscode from 'vscode';
import { WebOSAPIProvider } from './api-provider';

export class WebOSCodeActionProvider implements vscode.CodeActionProvider {
    constructor(private apiProvider: WebOSAPIProvider) {}

    async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];
        const lineText = document.lineAt(range.start.line).text;

        // Quick Fix: Add error handling to webOS service calls
        if (this.isWebOSServiceCallMissingErrorHandling(lineText, document, range.start.line)) {
            actions.push(this.createAddErrorHandlingAction(document, range.start.line));
        }

        // Quick Fix: Convert callback to async/await
        if (this.isWebOSServiceCallWithCallback(lineText)) {
            actions.push(this.createConvertToAsyncAction(document, range));
        }

        // Quick Fix: Add missing parameters
        if (this.isWebOSServiceCallMissingParameters(lineText)) {
            actions.push(this.createAddParametersAction(document, range, lineText));
        }

        // Quick Fix: Fix deprecated API usage
        if (this.isUsingDeprecatedAPI(lineText)) {
            actions.push(this.createFixDeprecatedAPIAction(document, range, lineText));
        }

        return actions;
    }

    private isWebOSServiceCallMissingErrorHandling(
        lineText: string, 
        document: vscode.TextDocument, 
        lineNumber: number
    ): boolean {
        if (!lineText.includes('webOS.service.request')) return false;

        // Check if onFailure is present in the call
        let checkLine = lineNumber;
        let foundOnFailure = false;
        let braceCount = 0;
        let inServiceCall = false;

        while (checkLine < document.lineCount) {
            const currentLine = document.lineAt(checkLine).text;
            
            if (currentLine.includes('webOS.service.request')) {
                inServiceCall = true;
            }
            
            if (inServiceCall) {
                braceCount += (currentLine.match(/{/g) || []).length;
                braceCount -= (currentLine.match(/}/g) || []).length;
                
                if (currentLine.includes('onFailure')) {
                    foundOnFailure = true;
                    break;
                }
                
                if (braceCount <= 0 && checkLine > lineNumber) {
                    break;
                }
            }
            
            checkLine++;
        }

        return !foundOnFailure;
    }

    private isWebOSServiceCallWithCallback(lineText: string): boolean {
        return lineText.includes('webOS.service.request') && 
               lineText.includes('onSuccess');
    }

    private isWebOSServiceCallMissingParameters(lineText: string): boolean {
        return lineText.includes('webOS.service.request') &&
               lineText.includes('parameters: {}');
    }

    private isUsingDeprecatedAPI(lineText: string): boolean {
        // Check for known deprecated APIs
        const deprecatedAPIs = [
            'luna://com.webos.service.camera'
        ];
        
        return deprecatedAPIs.some(api => lineText.includes(api));
    }

    private createAddErrorHandlingAction(
        document: vscode.TextDocument, 
        lineNumber: number
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Add error handling (onFailure)',
            vscode.CodeActionKind.QuickFix
        );

        action.edit = new vscode.WorkspaceEdit();
        
        // Find the position to insert onFailure
        let insertLine = lineNumber;
        let braceCount = 0;
        
        for (let i = lineNumber; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;
            
            if (line.includes('onSuccess')) {
                // Find the closing of onSuccess
                let j = i;
                let functionBraces = 0;
                while (j < document.lineCount) {
                    const funcLine = document.lineAt(j).text;
                    if (funcLine.includes('function')) functionBraces++;
                    if (funcLine.includes('}')) functionBraces--;
                    if (functionBraces === 0 && j > i) {
                        insertLine = j;
                        break;
                    }
                    j++;
                }
                break;
            }
        }

        const insertPosition = new vscode.Position(insertLine, document.lineAt(insertLine).text.length);
        const errorHandlingCode = `,
    onFailure: function (inError) {
        console.log('Failed:', inError.errorText);
        // Handle error
    }`;

        action.edit.insert(document.uri, insertPosition, errorHandlingCode);
        action.isPreferred = true;

        return action;
    }

    private createConvertToAsyncAction(
        document: vscode.TextDocument,
        range: vscode.Range
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Convert to async/await',
            vscode.CodeActionKind.Refactor
        );

        action.edit = new vscode.WorkspaceEdit();
        
        // This is a simplified implementation
        // In a real scenario, you'd parse the entire service call and convert it
        const newCode = `async function callWebOSService() {
    try {
        const response = await new Promise((resolve, reject) => {
            // Original webOS.service.request call here
            // with onSuccess: resolve, onFailure: reject
        });
        
        console.log('Success:', response);
        return response;
    } catch (error) {
        console.log('Failed:', error.errorText);
        throw error;
    }
}`;

        action.edit.replace(document.uri, range, newCode);
        
        return action;
    }

    private createAddParametersAction(
        document: vscode.TextDocument,
        range: vscode.Range,
        lineText: string
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Add common parameters',
            vscode.CodeActionKind.QuickFix
        );

        // Extract service URI and method to suggest parameters
        const serviceMatch = lineText.match(/luna:\/\/[^'"]*/);
        const methodMatch = lineText.match(/method:\s*['"]([^'"]*)['"]/);
        
        if (serviceMatch && methodMatch) {
            const parameters = this.getCommonParametersForMethod(serviceMatch[0], methodMatch[1]);
            
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(
                document.uri, 
                new vscode.Range(range.start, range.end),
                `parameters: {${parameters}}`
            );
        }

        return action;
    }

    private createFixDeprecatedAPIAction(
        document: vscode.TextDocument,
        range: vscode.Range,
        lineText: string
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Replace deprecated API',
            vscode.CodeActionKind.QuickFix
        );

        action.edit = new vscode.WorkspaceEdit();
        
        // Replace deprecated camera API with newer alternative
        if (lineText.includes('luna://com.webos.service.camera')) {
            const newText = lineText.replace(
                'luna://com.webos.service.camera',
                '// Note: Camera API is deprecated from webOS TV 4.x\n// Consider using Media APIs instead'
            );
            action.edit.replace(document.uri, range, newText);
        }

        action.isPreferred = true;
        return action;
    }

    private getCommonParametersForMethod(serviceURI: string, methodName: string): string {
        // Return common parameters for known method combinations
        const parameterMap: Record<string, Record<string, string>> = {
            'luna://com.webos.service.audio': {
                'getVolume': '\n        subscribe: false',
                'setVolume': '\n        volume: 50'
            },
            'luna://com.palm.activitymanager': {
                'adopt': '\n        activityId: 0,\n        wait: true,\n        subscribe: true',
                'create': '\n        name: "activityName",\n        description: "Activity description"'
            },
            'luna://com.webos.service.settings': {
                'getSystemSettings': '\n        keys: ["localeInfo", "country"]',
                'setSystemSettings': '\n        settings: {\n            "key": "value"\n        }'
            }
        };

        return parameterMap[serviceURI]?.[methodName] || '\n        // Add parameters here';
    }
}
