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
        // Safety check for range parameter
        if (!range || !range.start || typeof range.start.line !== 'number') {
            console.warn('⚠️ Invalid range parameter in code action provider:', range);
            return [];
        }

        // Safety check for document bounds
        if (range.start.line >= document.lineCount || range.start.line < 0) {
            console.warn('⚠️ Range line out of bounds in code action provider:', range.start.line, 'document lines:', document.lineCount);
            return [];
        }

        const actions: vscode.CodeAction[] = [];
        
        console.log('🔍 Checking Quick Fix actions for range:', range.start.line, 'to', range.end.line);
        
        // Analyze a broader context around the current range
        const contextRange = new vscode.Range(
            Math.max(0, range.start.line - 10),
            0,
            Math.min(document.lineCount - 1, range.end.line + 10),
            0
        );
        
        const contextText = document.getText(contextRange);
        console.log('📝 Context text for Quick Fix analysis:', contextText.substring(0, 200) + '...');
        
        // Quick Fix: Add error handling to webOS service calls
        const serviceCallInfo = this.findWebOSServiceCallInRange(document, range);
        if (serviceCallInfo && this.isServiceCallMissingErrorHandling(serviceCallInfo, document)) {
            console.log('✅ Found webOS service call missing error handling');
            actions.push(this.createAddErrorHandlingAction(document, serviceCallInfo));
        }

        // Quick Fix: Convert callback to async/await  
        if (serviceCallInfo && this.isWebOSServiceCallWithCallback(serviceCallInfo.text)) {
            actions.push(this.createConvertToAsyncAction(document, range));
        }

        // Quick Fix: Add missing parameters
        if (serviceCallInfo && this.isWebOSServiceCallMissingParameters(serviceCallInfo.text)) {
            actions.push(this.createAddParametersAction(document, range, serviceCallInfo.text));
        }

        // Quick Fix: Fix deprecated API usage
        if (serviceCallInfo && this.isUsingDeprecatedAPI(serviceCallInfo.text)) {
            actions.push(this.createFixDeprecatedAPIAction(document, range, serviceCallInfo.text));
        }

        console.log(`🎯 Generated ${actions.length} Quick Fix actions`);
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

    private findWebOSServiceCallInRange(document: vscode.TextDocument, range: vscode.Range): {text: string, startLine: number, endLine: number} | null {
        // Look for webOS.service.request in the current range and surrounding context
        const searchRange = new vscode.Range(
            Math.max(0, range.start.line - 20),
            0,
            Math.min(document.lineCount - 1, range.end.line + 20),
            0
        );
        
        const searchText = document.getText(searchRange);
        const searchStartLine = searchRange.start.line;
        
        console.log(`🔍 Searching for webOS service call in range ${searchRange.start.line}-${searchRange.end.line}`);
        
        // Find webOS.service.request calls
        const serviceCallRegex = /webOS\.service\.request\s*\(/g;
        let match;
        
        while ((match = serviceCallRegex.exec(searchText)) !== null) {
            const beforeMatch = searchText.substring(0, match.index);
            const linesBefore = beforeMatch.split('\n');
            const callStartLine = searchStartLine + linesBefore.length - 1;
            
            console.log(`🎯 Found webOS.service.request at line ${callStartLine}`);
            
            // Find the complete call (including closing parenthesis and semicolon)
            const callText = this.extractCompleteServiceCall(document, callStartLine, match.index - beforeMatch.lastIndexOf('\n') - 1);
            
            if (callText) {
                const endLine = callStartLine + callText.split('\n').length - 1;
                
                // Check if the current range overlaps with this service call
                if (range.start.line <= endLine && range.end.line >= callStartLine) {
                    console.log(`✅ Found overlapping webOS service call from line ${callStartLine} to ${endLine}`);
                    return {
                        text: callText,
                        startLine: callStartLine,
                        endLine: endLine
                    };
                }
            }
        }
        
        console.log('❌ No webOS service call found in range');
        return null;
    }

    private extractCompleteServiceCall(document: vscode.TextDocument, startLine: number, startColumn: number): string | null {
        let result = '';
        let braceCount = 0;
        let parenCount = 0;
        let inCall = false;
        
        for (let lineNum = startLine; lineNum < Math.min(document.lineCount, startLine + 30); lineNum++) {
            const line = document.lineAt(lineNum).text;
            const startCol = lineNum === startLine ? startColumn : 0;
            const lineSegment = line.substring(startCol);
            
            for (let i = 0; i < lineSegment.length; i++) {
                const char = lineSegment[i];
                result += char;
                
                if (char === '(') {
                    parenCount++;
                    inCall = true;
                } else if (char === ')') {
                    parenCount--;
                } else if (char === '{') {
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                }
                
                // Check if we've completed the call
                if (inCall && parenCount === 0) {
                    // Look for semicolon
                    const remaining = lineSegment.substring(i + 1);
                    const semicolonMatch = remaining.match(/^\s*;/);
                    if (semicolonMatch) {
                        result += semicolonMatch[0];
                    }
                    return result;
                }
            }
            
            if (lineNum < startLine + 29) {
                result += '\n';
            }
        }
        
        return result || null;
    }

    private isServiceCallMissingErrorHandling(serviceCallInfo: {text: string, startLine: number, endLine: number}, document: vscode.TextDocument): boolean {
        const callText = serviceCallInfo.text;
        console.log(`🔍 Checking if service call is missing error handling:`, callText.substring(0, 100) + '...');
        
        // Check if onFailure is present in the call text
        const hasOnFailure = /onFailure\s*:/i.test(callText);
        console.log(`📝 Has onFailure: ${hasOnFailure}`);
        
        // Also check if there's onSuccess but no onFailure
        const hasOnSuccess = /onSuccess\s*:/i.test(callText);
        console.log(`📝 Has onSuccess: ${hasOnSuccess}`);
        
        const missingErrorHandling = hasOnSuccess && !hasOnFailure;
        console.log(`🎯 Missing error handling: ${missingErrorHandling}`);
        
        return missingErrorHandling;
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
        serviceCallInfo: {text: string, startLine: number, endLine: number}
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Add error handling (onFailure)',
            vscode.CodeActionKind.QuickFix
        );

        action.edit = new vscode.WorkspaceEdit();
        
        console.log('🔧 Creating add error handling action for service call');
        
        // Find the position to insert onFailure by analyzing the service call text
        const callText = serviceCallInfo.text;
        const callLines = callText.split('\n');
        let insertLine = serviceCallInfo.endLine;
        let insertColumn = 0;
        
        // Look for onSuccess in the call text to insert onFailure after it
        for (let i = 0; i < callLines.length; i++) {
            const line = callLines[i];
            if (line.includes('onSuccess')) {
                // Find the end of the onSuccess function
                let braceCount = 0;
                let inFunction = false;
                
                for (let j = i; j < callLines.length; j++) {
                    const funcLine = callLines[j];
                    
                    // Count braces in onSuccess function
                    for (const char of funcLine) {
                        if (char === '{') {
                            braceCount++;
                            inFunction = true;
                        } else if (char === '}') {
                            braceCount--;
                            if (inFunction && braceCount === 0) {
                                // Found the end of onSuccess function
                                insertLine = serviceCallInfo.startLine + j;
                                // Look for comma after the closing brace
                                const afterBrace = funcLine.substring(funcLine.lastIndexOf('}') + 1);
                                if (afterBrace.includes(',')) {
                                    insertColumn = funcLine.lastIndexOf(',') + 1;
                                } else {
                                    // Add comma before inserting onFailure
                                    insertColumn = funcLine.lastIndexOf('}') + 1;
                                }
                                break;
                            }
                        }
                    }
                    if (inFunction && braceCount === 0) break;
                }
                break;
            }
        }
        
        // If we couldn't find onSuccess, insert before the closing of the service call
        if (insertLine === serviceCallInfo.endLine) {
            insertLine = serviceCallInfo.endLine - 1;
            const lastLine = document.lineAt(insertLine).text;
            insertColumn = lastLine.lastIndexOf('}');
        }
        
        console.log(`🎯 Will insert onFailure at line ${insertLine}`);
        
        // Detect indentation style from the service call
        const indentation = this.detectIndentation(document, serviceCallInfo);
        console.log(`📏 Detected indentation: "${indentation}" (${indentation.length} chars)`);
        
        // Create the insertion point
        const targetLine = document.lineAt(insertLine);
        const insertPosition = new vscode.Position(insertLine, targetLine.text.length);
        
        // Generate error handling code with proper indentation
        const errorHandlingCode = `,
${indentation}onFailure: function (inError) {
${indentation}    console.log('Failed:', inError.errorText);
${indentation}    // Handle error
${indentation}}`;

        action.edit.insert(document.uri, insertPosition, errorHandlingCode);
        action.isPreferred = true;

        return action;
    }

    private detectIndentation(document: vscode.TextDocument, serviceCallInfo: {text: string, startLine: number, endLine: number}): string {
        console.log('🔍 Detecting indentation from service call...');
        
        // First, try to detect from the service call itself
        const callLines = serviceCallInfo.text.split('\n');
        
        // Look for lines with method:, onSuccess:, parameters: etc.
        for (const line of callLines) {
            if (line.match(/^\s+(method|onSuccess|parameters|onFailure):/)) {
                const match = line.match(/^(\s+)/);
                if (match) {
                    console.log(`📐 Found indentation from service call: "${match[1]}" (${match[1].length} chars)`);
                    return match[1];
                }
            }
        }
        
        // If not found in service call, analyze the document around the service call
        for (let lineNum = serviceCallInfo.startLine; lineNum <= serviceCallInfo.endLine; lineNum++) {
            const line = document.lineAt(lineNum).text;
            
            // Look for lines with typical object properties
            if (line.match(/^\s+(method|onSuccess|parameters|onFailure):/)) {
                const match = line.match(/^(\s+)/);
                if (match) {
                    console.log(`📐 Found indentation from document line ${lineNum}: "${match[1]}" (${match[1].length} chars)`);
                    return match[1];
                }
            }
        }
        
        // Try to detect from nearby lines in the document
        const searchStart = Math.max(0, serviceCallInfo.startLine - 5);
        const searchEnd = Math.min(document.lineCount - 1, serviceCallInfo.endLine + 5);
        
        for (let lineNum = searchStart; lineNum <= searchEnd; lineNum++) {
            const line = document.lineAt(lineNum).text;
            
            // Look for any indented line that's not just whitespace
            if (line.trim().length > 0) {
                const match = line.match(/^(\s+)/);
                if (match && match[1].length > 0) {
                    console.log(`📐 Found fallback indentation from line ${lineNum}: "${match[1]}" (${match[1].length} chars)`);
                    return match[1];
                }
            }
        }
        
        // Default fallback: detect if using tabs or spaces from editor settings
        const editorConfig = vscode.workspace.getConfiguration('editor');
        const insertSpaces = editorConfig.get<boolean>('insertSpaces', true);
        const tabSize = editorConfig.get<number>('tabSize', 4);
        
        const defaultIndent = insertSpaces ? ' '.repeat(tabSize) : '\t';
        console.log(`📐 Using default indentation: "${defaultIndent}" (${defaultIndent.length} chars, insertSpaces: ${insertSpaces})`);
        
        return defaultIndent;
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
