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
        try {
            console.log('🚀 webOS Completion Provider TRIGGERED!');
            
            // Check if cancellation was requested early
            if (token.isCancellationRequested) {
                console.log('❌ Completion cancelled at start');
                return [];
            }

            // Add cancellation check throughout the process
            const checkCancellation = () => {
                if (token.isCancellationRequested) {
                    console.log('❌ Completion cancelled during processing');
                    throw new Error('Completion was cancelled');
                }
            };

            // Safety check for position parameter
            if (!position || typeof position.line !== 'number' || typeof position.character !== 'number') {
                console.warn('⚠️ Invalid position parameter:', position);
                return [];
            }

            // Safety check for document bounds
            if (position.line >= document.lineCount || position.line < 0) {
                console.warn('⚠️ Position line out of bounds:', position.line, 'document lines:', document.lineCount);
                return [];
            }

            const completions: vscode.CompletionItem[] = [];
            
            const lineText = document.lineAt(position).text;
            const linePrefix = lineText.substring(0, Math.min(position.character, lineText.length));
            const wordRange = document.getWordRangeAtPosition(position);
            const currentWord = wordRange ? document.getText(wordRange) : '';

            console.log('📝 Completion Context:', { 
                linePrefix, 
                currentWord, 
                position: position.character,
                triggerKind: context.triggerKind,
                triggerCharacter: context.triggerCharacter,
                lineText
            });

            // Early return for non-webOS contexts to avoid conflicts with other extensions
            const isWebOSContext = this.isWebOSRelatedContext(document, position);
            if (!isWebOSContext && 
                !linePrefix.includes('webOS') && 
                !linePrefix.includes('luna://') &&
                !this.isCompletingMethod(linePrefix, document, position)) {
                console.log('⚡ Not webOS context, skipping to avoid conflicts');
                return [];
            }

            checkCancellation();
            
            // More aggressive webOS service detection
            if (this.isTypingWebOSService(linePrefix, currentWord) || 
                linePrefix.includes('webOS') || 
                currentWord === 'w' || currentWord === 'we' || currentWord === 'web' ||
                context.triggerCharacter === 'w') {
                console.log('✅ WebOS Service typing detected');
                checkCancellation();
                const webosCompletions = this.getWebOSServiceCompletions();
                completions.push(...webosCompletions);
                console.log(`➕ Added ${webosCompletions.length} webOS service completions`);
            }

            // More aggressive Luna URI detection
            if (this.isCompletingServiceURI(linePrefix) || 
                linePrefix.includes("'l") || linePrefix.includes('"l') ||
                linePrefix.includes("'luna") || linePrefix.includes('"luna') ||
                (linePrefix.includes('webOS.service.request') && linePrefix.includes("'"))) {
                console.log('✅ Luna service URI completion detected');
                checkCancellation();
                const uriCompletions = this.getServiceURICompletions(linePrefix, position, document);
                completions.push(...uriCompletions);
                console.log(`➕ Added ${uriCompletions.length} URI completions`);
            }

            // Check if we're completing method names
            if (this.isCompletingMethod(linePrefix, document, position)) {
                console.log('✅ Method completion detected');
                checkCancellation();
                const methodCompletions = await this.getMethodCompletions(linePrefix, position, document, token);
                checkCancellation(); // Check again after async operation
                completions.push(...methodCompletions);
                console.log(`➕ Added ${methodCompletions.length} method completions`);
            }

            // Add webOS completions only for non-method contexts
            if (completions.length === 0 && !this.isCompletingMethod(linePrefix, document, position)) {
                console.log('🔧 No specific completions found, adding default webOS items');
                
                // Always provide webOS service request
                const webosRequest = new vscode.CompletionItem(
                    'webOS.service.request',
                    vscode.CompletionItemKind.Snippet
                );
                webosRequest.insertText = new vscode.SnippetString(
                    `webOS.service.request('\${1:luna://service.name}', {
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
                webosRequest.documentation = new vscode.MarkdownString('🚀 **webOS TV Luna Service API call**');
                webosRequest.detail = 'webOS TV API Assistant';
                webosRequest.sortText = '0000_webos';
                completions.push(webosRequest);

                // Add debug completion
                const debugCompletion = new vscode.CompletionItem(
                    '🚀 webOS TV API Assistant is active!',
                    vscode.CompletionItemKind.Text
                );
                debugCompletion.detail = 'Debug: Extension is working';
                debugCompletion.documentation = new vscode.MarkdownString('✅ If you see this, the webOS TV API Assistant extension is active and working.');
                debugCompletion.sortText = 'zzz_debug';
                completions.push(debugCompletion);
            }

            console.log(`🎯 Final result: ${completions.length} completions`);
            return completions;
        } catch (error) {
            // Handle cancellation gracefully
            if ((error instanceof Error && error.message === 'Completion was cancelled') || token.isCancellationRequested) {
                console.log('⚡ Completion cancelled gracefully');
                return [];
            }
            console.error('❌ Error in webOS completion provider:', error);
            return [];
        }
    }

    private isWebOSRelatedContext(document: vscode.TextDocument, position: vscode.Position): boolean {
        // Check the entire document for webOS-related content
        const fullText = document.getText();
        return fullText.includes('webOS') || fullText.includes('luna://');
    }

    private isTypingWebOSService(linePrefix: string, currentWord: string): boolean {
        // Check if user is typing webOS.service.request
        const webOSPatterns = [
            /\bw$/,           // just 'w'
            /\bwe$/,          // 'we'
            /\bweb$/,         // 'web'
            /\bwebO$/,        // 'webO'
            /\bwebOS$/,       // 'webOS'
            /\bwebOS\.$/,     // 'webOS.'
            /\bwebOS\.s$/,    // 'webOS.s'
            /\bwebOS\.se$/,   // 'webOS.se'
            /\bwebOS\.ser$/,  // 'webOS.ser'
            /\bwebOS\.serv$/,  // 'webOS.serv'
            /\bwebOS\.servi$/, // 'webOS.servi'
            /\bwebOS\.servic$/, // 'webOS.servic'
            /\bwebOS\.service$/, // 'webOS.service'
            /\bwebOS\.service\.$/, // 'webOS.service.'
            /\bwebOS\.service\.r$/, // 'webOS.service.r'
            /\bwebOS\.service\.re$/, // 'webOS.service.re'
            /\bwebOS\.service\.req$/, // 'webOS.service.req'
            /\bwebOS\.service\.requ$/, // 'webOS.service.requ'
            /\bwebOS\.service\.reque$/, // 'webOS.service.reque'
            /\bwebOS\.service\.reques$/, // 'webOS.service.reques'
        ];

        return webOSPatterns.some(pattern => pattern.test(linePrefix)) ||
               linePrefix.includes('webOS.service.request') ||
               linePrefix.includes('webOS.service.call');
    }

    private isInWebOSServiceContext(linePrefix: string): boolean {
        return linePrefix.includes('webOS.service.request') ||
               linePrefix.includes('webOS.service.call');
    }

    private isCompletingServiceURI(linePrefix: string): boolean {
        console.log('Checking if completing service URI for:', linePrefix);
        
        // First, check if we're definitely in a webOS.service context
        const inWebOSContext = this.isInWebOSServiceContext(linePrefix);
        
        // Check for complete luna:// URIs (including placeholders)
        if (linePrefix.includes('luna://')) {
            console.log('Found complete luna:// in line prefix');
            return true;
        }
        
        // Check for placeholder service URIs
        if (linePrefix.includes('service.uri') || linePrefix.includes('service.name') || linePrefix.includes('service.')) {
            console.log('Found service URI placeholder in line prefix');
            return true;
        }
        
        // Check if we're typing luna:// after quotes in webOS context
        if (inWebOSContext && (linePrefix.includes('"luna://') || linePrefix.includes("'luna://"))) {
            console.log('Found quoted luna:// in webOS context');
            return true;
        }
        
        // Enhanced pattern matching for partial typing
        const partialPatterns = [
            // Direct luna patterns
            /['"]luna:\/\/$/,                    // 'luna:// or "luna://
            /['"]luna:\/[^'"\s]*$/,             // 'luna:/something (more flexible)
            /['"]luna:[^'"\s]*$/,               // 'luna:something
            /['"]lun[a-z]*$/,                   // 'luna, 'lun
            /['"]lu[n]*$/,                      // 'lu, 'lun
            /['"]l[una]*$/,                     // 'l, 'lu, 'lun, 'luna
            
            // Service URI patterns including placeholders
            /['"]luna:\/\/[^'"\s]*service[^'"\s]*$/,  // luna://...service...
            /['"]luna:\/\/[^'"\s]*\.uri[^'"\s]*$/,    // luna://...uri...
            /['"]luna:\/\/[^'"\s]*\.name[^'"\s]*$/,   // luna://...name...
            /['"]service\.uri$/,                      // service.uri
            /['"]service\.name$/,                     // service.name
            /['"].*\.uri$/,                           // anything.uri
            /['"].*\.name$/,                          // anything.name
            
            // In webOS service context with quotes
            /webOS\.service\.(request|call)\s*\(\s*['"][^'"]*$/,  // webOS.service.request('...
        ];
        
        // Check if in webOS context and starting to type in quotes
        if (inWebOSContext) {
            const webOSQuotePatterns = [
                /webOS\.service\.(request|call)\s*\(\s*['"]$/,           // webOS.service.request('
                /webOS\.service\.(request|call)\s*\(\s*['"][^'"]*$/,     // webOS.service.request('something
            ];
            
            for (const pattern of webOSQuotePatterns) {
                if (pattern.test(linePrefix)) {
                    console.log('Matched webOS quote pattern:', pattern);
                    return true;
                }
            }
        }
        
        for (const pattern of partialPatterns) {
            if (pattern.test(linePrefix)) {
                console.log('Matched partial pattern:', pattern);
                return true;
            }
        }
        
        console.log('No URI completion pattern matched');
        return false;
    }

    private isCompletingMethod(linePrefix: string, document?: vscode.TextDocument, position?: vscode.Position): boolean {
        console.log('🔍 isCompletingMethod - checking linePrefix:', JSON.stringify(linePrefix));
        
        // Enhanced method detection with full line analysis
        if (document && position) {
            const fullLine = document.lineAt(position.line).text;
            const cursorPos = position.character;
            
            console.log('📄 Full line method analysis:', { fullLine, cursorPos });
            
            // Check if cursor is within a method property (including incomplete strings)
            const methodRegex = /\bmethod\s*:\s*(['"])([^'"]*?)(?:\1|$)/g;
            let match;
            while ((match = methodRegex.exec(fullLine)) !== null) {
                const quote = match[1];
                const content = match[2];
                const methodStartPos = match.index;
                const quoteStartPos = match.index + match[0].indexOf(quote);
                const contentStartPos = quoteStartPos + 1; // after opening quote
                
                let contentEndPos;
                // Check if string is complete (has closing quote)
                if (match[0].endsWith(quote)) {
                    contentEndPos = match.index + match[0].length - 1; // before closing quote
                } else {
                    contentEndPos = match.index + match[0].length; // end of content
                }
                
                console.log('🔍 Checking method property:', { 
                    methodStartPos, quoteStartPos, contentStartPos, contentEndPos, content, cursorPos, 
                    complete: match[0].endsWith(quote),
                    fullMatch: match[0]
                });
                
                // Check if cursor is within the method property area (including the property name)
                if (cursorPos >= methodStartPos && cursorPos <= contentEndPos) {
                    console.log('✅ Cursor is within method property area:', content);
                    return true;
                }
                
                // Also check specifically within the quoted content
                if (cursorPos >= contentStartPos && cursorPos <= contentEndPos) {
                    console.log('✅ Cursor is within method property content:', content);
                    return true;
                }
            }
        }
        
        // Simplified and more reliable method detection (fallback)
        // Look for method property with various quote patterns
        const methodPropertyRegex = /\bmethod\s*:\s*['"`]([^'"`]*)$/;
        const match = linePrefix.match(methodPropertyRegex);
        
        if (match) {
            console.log('✅ Method property detected with value:', match[1]);
            return true;
        }
        
        // Also check for method property without any content after quotes
        const emptyMethodRegex = /\bmethod\s*:\s*['"`]\s*$/;
        if (emptyMethodRegex.test(linePrefix)) {
            console.log('✅ Empty method property detected');
            return true;
        }
        
        // Check for method property without quotes (for completion after colon)
        const methodColonRegex = /\bmethod\s*:\s*$/;
        if (methodColonRegex.test(linePrefix)) {
            console.log('✅ Method colon detected');
            return true;
        }
        
        // Check for methodName placeholder or similar patterns
        if (linePrefix.includes('methodName') || linePrefix.includes('method:')) {
            console.log('✅ Method placeholder detected');
            return true;
        }
        
        console.log('❌ No method completion patterns matched');
        return false;
    }

    private getWebOSServiceCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        // webOS.service.request snippet
        const requestCompletion = new vscode.CompletionItem(
            'webOS.service.request',
            vscode.CompletionItemKind.Snippet
        );
        requestCompletion.insertText = new vscode.SnippetString(
            `webOS.service.request('\${1:luna://service.name}', {
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
            '🚀 **webOS TV Luna Service API call**\n\nGenerate a complete webOS service request with callbacks'
        );
        requestCompletion.detail = 'webOS TV API Assistant';
        requestCompletion.sortText = '0000_webos_request'; // High priority
        requestCompletion.filterText = 'webOS service request luna';
        completions.push(requestCompletion);

        // Additional webOS shortcuts
        const webosCompletion = new vscode.CompletionItem(
            'webOS',
            vscode.CompletionItemKind.Class
        );
        webosCompletion.insertText = 'webOS';
        webosCompletion.documentation = new vscode.MarkdownString('🌟 **webOS Global Object**\n\nMain webOS namespace for TV APIs');
        webosCompletion.detail = 'webOS TV Global Object';
        webosCompletion.sortText = '0001_webos';
        completions.push(webosCompletion);

        return completions;
    }

    private getSmartCompletion(fullText: string, linePrefix: string, position: vscode.Position, document: vscode.TextDocument): { insertText: string; additionalTextEdits?: vscode.TextEdit[] } {
        console.log('🔍 Smart completion analysis:', { fullText, linePrefix, position: position.character });
        
        // Get the full line to better analyze the context
        const fullLine = document.lineAt(position.line).text;
        const cursorPos = position.character;
        
        console.log('📄 Full line analysis:', { fullLine, cursorPos });
        
        // Find quoted string that contains the cursor position (including incomplete strings)
        const quotedRegex = /(['"])([^'"]*?)(?:\1|$)/g;  // Allow incomplete strings without closing quote
        let match;
        while ((match = quotedRegex.exec(fullLine)) !== null) {
            const quote = match[1];
            const content = match[2];
            const startPos = match.index + 1; // after opening quote
            let endPos;
            
            // Check if string is complete (has closing quote)
            if (match[0].endsWith(quote)) {
                endPos = match.index + match[0].length - 1; // before closing quote
            } else {
                endPos = match.index + match[0].length; // end of content
            }
            
            console.log('🔍 Checking quoted string:', { startPos, endPos, content, cursorPos, complete: match[0].endsWith(quote) });
            
            // Check if cursor is within this quoted string
            if (cursorPos >= startPos && cursorPos <= endPos) {
                console.log('🎯 Cursor is within quoted string:', content);
                
                // Check if this content should be replaced
                if (content && (
                    content.includes('luna://') || 
                    content.includes('service.uri') || 
                    content.includes('service.name') || // new placeholder
                    content.includes('methodName') ||
                    content.includes('.uri') ||
                    content.includes('.name') ||
                    content.includes('service.') ||
                    content === 'getVolume' ||
                    content.includes('com.webos') ||
                    content.startsWith('l') || // partial luna typing
                    content.includes('audio') || // partial service names
                    content.includes('system') ||
                    content.length > 0 // replace any non-empty content within quotes
                )) {
                    const range = new vscode.Range(
                        new vscode.Position(position.line, startPos),
                        new vscode.Position(position.line, endPos)
                    );
                    
                    console.log('📝 Will replace quoted content:', content, 'with:', fullText, 'at range:', range);
                    
                    return {
                        insertText: '',
                        additionalTextEdits: [vscode.TextEdit.replace(range, fullText)]
                    };
                }
            }
        }
        
        // Fallback: Look for quoted strings at end of linePrefix (original logic)
        const quotedMatch = linePrefix.match(/(['"])([^'"]*?)$/);
        if (quotedMatch) {
            const quote = quotedMatch[1];
            const existing = quotedMatch[2];
            
            console.log('🎯 Found quoted content at end:', { quote, existing });
            
            // Check if existing content should be replaced
            if (existing && (
                existing.includes('luna://') || 
                existing.includes('service.uri') || 
                existing.includes('service.name') || // new placeholder
                existing.includes('methodName') ||
                existing.startsWith('l') || // partial luna typing
                existing.includes('.uri') ||
                existing.includes('.name') ||
                existing.includes('service.') ||
                existing === 'getVolume' || // default method name
                existing === 'audio' || // partial service name
                existing.includes('com.webos') // partial service URI
            )) {
                const startPos = position.character - existing.length;
                const range = new vscode.Range(
                    new vscode.Position(position.line, startPos),
                    new vscode.Position(position.line, position.character)
                );
                
                console.log('📝 Will replace existing content:', existing, 'with:', fullText, 'at range:', range);
                
                return {
                    insertText: '',
                    additionalTextEdits: [vscode.TextEdit.replace(range, fullText)]
                };
            }
        }
        
        // Check for other patterns like partial typing without quotes
        const partialLunaMatch = linePrefix.match(/(luna:\/\/[^\s'"]*?)$/);
        if (partialLunaMatch) {
            const partialURI = partialLunaMatch[1];
            console.log('🔍 Found partial luna URI without quotes:', partialURI);
            
            if (fullText.startsWith(partialURI)) {
                // Replace the partial URI
                const startPos = linePrefix.lastIndexOf(partialURI);
                if (startPos !== -1) {
                    const range = new vscode.Range(
                        new vscode.Position(position.line, startPos),
                        new vscode.Position(position.line, startPos + partialURI.length)
                    );
                    
                    return {
                        insertText: '',
                        additionalTextEdits: [vscode.TextEdit.replace(range, fullText)]
                    };
                }
            }
        }
        
        // If no existing URI, return full text
        return { insertText: fullText };
    }

    private getSmartMethodCompletion(methodName: string, linePrefix: string, position: vscode.Position, document: vscode.TextDocument): { insertText: string; additionalTextEdits?: vscode.TextEdit[] } {
        console.log('🔍 Smart method completion analysis:', { methodName, linePrefix, position: position.character });
        
        // Get the full line to better analyze the context
        const fullLine = document.lineAt(position.line).text;
        const cursorPos = position.character;
        
        console.log('📄 Full line method analysis:', { fullLine, cursorPos });
        
        // Find method property quoted string that contains the cursor position (including incomplete strings)
        const methodRegex = /\bmethod\s*:\s*(['"])([^'"]*?)(?:\1|$)/g;
        let match;
        while ((match = methodRegex.exec(fullLine)) !== null) {
            const quote = match[1];
            const content = match[2];
            const quoteStartPos = match.index + match[0].indexOf(quote);
            const contentStartPos = quoteStartPos + 1; // after opening quote
            
            let contentEndPos;
            // Check if string is complete (has closing quote)
            if (match[0].endsWith(quote)) {
                contentEndPos = match.index + match[0].length - 1; // before closing quote
            } else {
                contentEndPos = match.index + match[0].length; // end of content
            }
            
            console.log('🔍 Checking method quoted string:', { 
                contentStartPos, contentEndPos, content, cursorPos, 
                complete: match[0].endsWith(quote),
                fullMatch: match[0]
            });
            
            // Check if cursor is within this method property content
            if (cursorPos >= contentStartPos && cursorPos <= contentEndPos) {
                console.log('🎯 Cursor is within method property, replacing:', content, 'with:', methodName);
                
                const range = new vscode.Range(
                    new vscode.Position(position.line, contentStartPos),
                    new vscode.Position(position.line, contentEndPos)
                );
                
                return {
                    insertText: '',
                    additionalTextEdits: [vscode.TextEdit.replace(range, methodName)]
                };
            }
        }
        
        // Fallback: Look for quoted method values or placeholders at end of linePrefix
        const quotedMatch = linePrefix.match(/(['"])([^'"]*?)$/);
        if (quotedMatch) {
            const quote = quotedMatch[1];
            const existing = quotedMatch[2];
            
            console.log('🎯 Found quoted method content at end:', { quote, existing });
            
            // Check if existing content should be replaced (methodName placeholder, getVolume default, partial method names, etc.)
            if (existing && (
                existing === 'methodName' ||
                existing === 'getVolume' ||
                existing.includes('method') ||
                existing.startsWith('get') ||
                existing.startsWith('set') ||
                existing.length > 0 // replace any existing method name
            )) {
                const startPos = position.character - existing.length;
                const range = new vscode.Range(
                    new vscode.Position(position.line, startPos),
                    new vscode.Position(position.line, position.character)
                );
                
                console.log('📝 Will replace existing method:', existing, 'with:', methodName, 'at range:', range);
                
                return {
                    insertText: '',
                    additionalTextEdits: [vscode.TextEdit.replace(range, methodName)]
                };
            }
        }
        
        // Check for method pattern without quotes
        const methodMatch = linePrefix.match(/\bmethod\s*:\s*([^'",\s]+)$/);
        if (methodMatch) {
            const existing = methodMatch[1];
            const startPos = position.character - existing.length;
            const range = new vscode.Range(
                new vscode.Position(position.line, startPos),
                new vscode.Position(position.line, position.character)
            );
            
            console.log('📝 Will replace unquoted method:', existing, 'with:', methodName);
            
            return {
                insertText: '',
                additionalTextEdits: [vscode.TextEdit.replace(range, methodName)]
            };
        }
        
        // If no replacement needed, just insert
        console.log('📝 Simple method insertion:', methodName);
        return { insertText: methodName };
    }

    private getServiceURICompletions(linePrefix?: string, position?: vscode.Position, document?: vscode.TextDocument): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Check if API provider is ready
        if (!this.apiProvider.isReady()) {
            console.log('API Provider not ready yet');
            // Return a more helpful placeholder completion
            const loadingCompletion = new vscode.CompletionItem(
                'luna://com.webos... (Loading APIs)',
                vscode.CompletionItemKind.Text
            );
            loadingCompletion.detail = 'webOS TV APIs are being loaded from MCP server';
            loadingCompletion.documentation = new vscode.MarkdownString(
                '⏳ Please wait while webOS TV API data is being loaded from the MCP server.\n\nOnce loaded, you will see all available Luna service URIs.'
            );
            loadingCompletion.insertText = '';
            loadingCompletion.sortText = 'zzz_loading'; // Put at end
            return [loadingCompletion];
        }
        
        const apis = this.apiProvider.getAPIs();
        console.log(`Found ${apis.length} APIs for completion`);

        // If no APIs available, provide comprehensive fallback URIs
        if (apis.length === 0) {
            console.log('🔄 Providing fallback completions (MCP server unavailable)');
            const fallbackURIs = [
                // Most commonly used services (high priority)
                { uri: 'luna://com.webos.service.audio', name: 'Audio Service', category: 'media', desc: '🔊 Audio volume and settings control' },
                { uri: 'luna://com.palm.activitymanager', name: 'Activity Manager', category: 'system', desc: '⚡ Activity lifecycle management' },
                { uri: 'luna://com.webos.service.settings', name: 'Settings Service', category: 'system', desc: '⚙️ System settings management' },
                { uri: 'luna://com.webos.service.systemservice', name: 'System Service', category: 'system', desc: '🖥️ System information and control' },
                { uri: 'luna://com.webos.applicationManager', name: 'Application Manager', category: 'system', desc: '📱 Application lifecycle management' },
                
                // Additional useful services
                { uri: 'luna://com.webos.service.tv', name: 'TV Service', category: 'media', desc: '📺 TV channel and input control' },
                { uri: 'luna://com.webos.media', name: 'Media Service', category: 'media', desc: '🎵 Media playback and control' },
                { uri: 'luna://com.webos.service.connectionmanager', name: 'Connection Manager', category: 'network', desc: '🌐 Network connection management' },
                { uri: 'luna://com.webos.service.db', name: 'Database Service', category: 'storage', desc: '🗃️ Database operations' },
                { uri: 'luna://com.webos.service.pdm', name: 'Physical Device Manager', category: 'device', desc: '🔌 USB and external device management' },
                { uri: 'luna://com.webos.service.bluetooth2', name: 'Bluetooth Service', category: 'device', desc: '📶 Bluetooth device management' },
                { uri: 'luna://com.webos.service.camera', name: 'Camera Service', category: 'device', desc: '📷 Camera device control' }
            ];

            for (const fallback of fallbackURIs) {
                const completion = new vscode.CompletionItem(
                    fallback.uri,
                    vscode.CompletionItemKind.Value
                );
                completion.detail = `${fallback.name} (fallback)`;
                completion.documentation = new vscode.MarkdownString(
                    `**${fallback.name}** (${fallback.category})\\n\\n${fallback.desc}\\n\\n*Note: This is a fallback completion. For full API support, ensure MCP server is running.*`
                );
                
                                // Use smart completion to avoid duplication
                if (linePrefix && position && document) {
                    const smartCompletion = this.getSmartCompletion(fallback.uri, linePrefix, position, document);
                    if (smartCompletion.additionalTextEdits && smartCompletion.additionalTextEdits.length > 0) {
                        // Use range-based replacement for more precise control
                        const replaceRange = smartCompletion.additionalTextEdits[0].range;
                        completion.insertText = fallback.uri;
                        completion.range = replaceRange;
                        console.log('🎯 Using range-based replacement for fallback:', { replaceRange, uri: fallback.uri });
                    } else {
                        completion.insertText = smartCompletion.insertText;
                        completion.additionalTextEdits = smartCompletion.additionalTextEdits;
                    }
                } else {
                completion.insertText = fallback.uri;
                }
                
                completion.sortText = `fallback_${fallback.uri}`;
                completion.kind = vscode.CompletionItemKind.Constant;
                completions.push(completion);
            }
            
            return completions;
        }

        // Create completions from API data
        for (const api of apis) {
            const completion = new vscode.CompletionItem(
                api.serviceUri,
                vscode.CompletionItemKind.Value
            );
            completion.detail = `${api.serviceName} (${api.category})`;
            completion.documentation = new vscode.MarkdownString(
                `**${api.serviceName}** (${api.category})\\n\\n${api.description || 'webOS TV Luna Service'}\\n\\n📋 **URI:** \`${api.serviceUri}\``
            );
            
                            // Use smart completion to avoid duplication
                if (linePrefix && position && document) {
                    const smartCompletion = this.getSmartCompletion(api.serviceUri, linePrefix, position, document);
                    if (smartCompletion.additionalTextEdits && smartCompletion.additionalTextEdits.length > 0) {
                        // Use range-based replacement for more precise control
                        const replaceRange = smartCompletion.additionalTextEdits[0].range;
                        completion.insertText = api.serviceUri;
                        completion.range = replaceRange;
                        console.log('🎯 Using range-based replacement:', { replaceRange, uri: api.serviceUri });
                    } else {
                        completion.insertText = smartCompletion.insertText;
                        completion.additionalTextEdits = smartCompletion.additionalTextEdits;
                    }
                } else {
            completion.insertText = api.serviceUri;
                }
            
            // Improved sorting - prioritize commonly used APIs
            const commonAPIs = ['audio', 'activity', 'settings', 'system', 'application'];
            const isCommon = commonAPIs.some(common => api.serviceUri.toLowerCase().includes(common));
            completion.sortText = isCommon ? `0_${api.serviceName}` : `1_${api.serviceName}`;
            
            // Better icons based on category
            switch (api.category?.toLowerCase()) {
                case 'system':
                    completion.kind = vscode.CompletionItemKind.Module;
                    break;
                case 'media':
                case 'audio':
                    completion.kind = vscode.CompletionItemKind.Event;
                    break;
                case 'device':
                case 'hardware':
                    completion.kind = vscode.CompletionItemKind.Interface;
                    break;
                case 'network':
                case 'connection':
                    completion.kind = vscode.CompletionItemKind.Reference;
                    break;
                case 'database':
                case 'storage':
                    completion.kind = vscode.CompletionItemKind.Struct;
                    break;
                default:
                    completion.kind = vscode.CompletionItemKind.Value;
            }
            
            // Add filtering support
            completion.filterText = `${api.serviceUri} ${api.serviceName} ${api.category}`;
            
            completions.push(completion);
        }

        console.log(`Generated ${completions.length} URI completions`);
        return completions;
    }

    private async getMethodCompletions(linePrefix: string, position?: vscode.Position, document?: vscode.TextDocument, token?: vscode.CancellationToken): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];

        console.log('🔍 Getting method completions for:', linePrefix);

        // Check cancellation at start of method completion
        if (token?.isCancellationRequested) {
            console.log('❌ Method completion cancelled');
            return [];
        }

        // Extract service URI from the entire webOS service call context
        let serviceURI = '';
        
        // Look for service URI in current line or previous lines
        if (document && position) {
            // Search backwards through lines to find the service URI
            for (let lineNum = position.line; lineNum >= Math.max(0, position.line - 10); lineNum--) {
                const line = document.lineAt(lineNum).text;
                const uriMatch = line.match(/(['"])(luna:\/\/[^'"]+)\1/);
                if (uriMatch) {
                    serviceURI = uriMatch[2];
                    console.log('🎯 Found service URI:', serviceURI);
                    break;
                }
            }
        }
        
        // Fallback: extract from current linePrefix
        if (!serviceURI) {
            const serviceURIMatch = linePrefix.match(/luna:\/\/[^'"'\s,}]*/);
            if (serviceURIMatch) {
                serviceURI = serviceURIMatch[0];
            }
        }

        if (!serviceURI) {
            console.log('❌ No service URI found for method completion');
            return completions;
        }

        console.log('🔍 Looking for API with URI:', serviceURI);
        const api = this.apiProvider.getAPIs().find(a => a.serviceUri === serviceURI);
        
        if (!api) {
            console.log('❌ No API found for URI:', serviceURI);
            // Provide fallback methods based on URI patterns
            return this.getFallbackMethodCompletions(serviceURI);
        }

        console.log('✅ Found API:', api.serviceName);

        try {
            // Check cancellation before expensive MCP call
            if (token?.isCancellationRequested) {
                console.log('❌ MCP method search cancelled');
                return completions;
            }
            
            // Try to get methods from MCP server (with quick failure detection)
            console.log(`🔍 Attempting MCP search for ${api.serviceName}...`);
            const mcpMethods = await this.getMethodsFromMCP(api.serviceName, serviceURI);
            
            // Check cancellation after MCP call
            if (token?.isCancellationRequested) {
                console.log('❌ Method completion cancelled after MCP call');
                return [];
            }
            
            if (mcpMethods.length > 0) {
                console.log(`📋 Got ${mcpMethods.length} methods from MCP server`);
                return mcpMethods;
            }
        } catch (error) {
            if (error instanceof Error && error.message === 'Completion was cancelled') {
                return [];
            }
            console.warn('⚠️ Failed to get methods from MCP:', error);
        }

        // Fallback to hardcoded common methods
        const commonMethods = this.getCommonMethodsForAPI(api.serviceName);
        console.log(`📋 Using ${commonMethods.length} fallback methods for service: "${api.serviceName}"`);
        
        if (commonMethods.length === 0) {
            console.log('⚠️ No fallback methods found for service:', api.serviceName);
            const availableServices = this.apiProvider.listFallbackAPIs();
            console.log(`📝 Available fallback services: (${availableServices.length}) [${availableServices.join(', ')}]`);
            
            // Try file-based fallback directly
            console.log(`🔍 Trying file-based fallback for service: "${api.serviceName}"`);
            const fileFallbackMethods = this.apiProvider.getFallbackMethods(api.serviceName);
            console.log(`📋 File-based fallback result: ${fileFallbackMethods.length} methods`);
            
            if (fileFallbackMethods.length > 0) {
                console.log(`✅ Using file-based fallback methods`);
                for (const method of fileFallbackMethods) {
                    const completion = new vscode.CompletionItem(
                        method.name,
                        vscode.CompletionItemKind.Method
                    );
                    completion.detail = `${api.serviceName}.${method.name}`;
                    completion.documentation = new vscode.MarkdownString(method.description);
                    completion.insertText = method.name;
                    completion.sortText = `file_fallback_${method.name}`;
                    
                    if (method.deprecated) {
                        completion.tags = [vscode.CompletionItemTag.Deprecated];
                    }
                    
                    completions.push(completion);
                }
                return completions;
            }
        }
        
        for (const method of commonMethods) {
            const completion = new vscode.CompletionItem(
                method.name,
                vscode.CompletionItemKind.Method
            );
            completion.detail = `${api.serviceName}.${method.name}`;
            completion.documentation = new vscode.MarkdownString(method.description);
            
                        // Smart method insertion - replace existing partial method name
            if (linePrefix && position && document) {
                const methodSmartCompletion = this.getSmartMethodCompletion(method.name, linePrefix, position, document);
                if (methodSmartCompletion.additionalTextEdits && methodSmartCompletion.additionalTextEdits.length > 0) {
                    // Use range-based replacement for more precise control
                    const replaceRange = methodSmartCompletion.additionalTextEdits[0].range;
                    completion.insertText = method.name;
                    completion.range = replaceRange;
                    console.log('🎯 Using range-based replacement for method:', { replaceRange, methodName: method.name });
                } else {
                    completion.insertText = methodSmartCompletion.insertText;
                    completion.additionalTextEdits = methodSmartCompletion.additionalTextEdits;
                }
            } else {
            completion.insertText = method.name;
            }
            
            completion.sortText = `method_${method.name}`;
            
            if (method.deprecated) {
                completion.tags = [vscode.CompletionItemTag.Deprecated];
            }
            
            completions.push(completion);
        }

        return completions;
    }

    private async getMethodsFromMCP(serviceName: string, serviceURI: string): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        
        if (!this.apiProvider.isReady()) {
            return completions;
        }

        try {
            // Try to get detailed API info with methods from MCP server
            const response = await this.apiProvider.searchAndGetMethods(serviceName);
            
            if (response && Array.isArray(response) && response.length > 0) {
                console.log(`✅ MCP returned ${response.length} methods for ${serviceName}`);
                for (const method of response) {
                    const completion = new vscode.CompletionItem(
                        method.name || method.methodName,
                        vscode.CompletionItemKind.Method
                    );
                    completion.detail = `${serviceName}.${method.name || method.methodName}`;
                    completion.documentation = new vscode.MarkdownString(
                        method.description || `${method.name || method.methodName} method for ${serviceName}`
                    );
                    completion.insertText = method.name || method.methodName;
                    completion.sortText = `mcp_${method.name || method.methodName}`;
                    
                    if (method.deprecated) {
                        completion.tags = [vscode.CompletionItemTag.Deprecated];
                    }
                    
                    completions.push(completion);
                }
            } else {
                console.log(`⚠️ MCP returned 0 or invalid methods for ${serviceName}, trying file-based fallback`);
                
                // Try file-based fallback immediately
                const fileFallbackMethods = this.apiProvider.getFallbackMethods(serviceName);
                if (fileFallbackMethods.length > 0) {
                    console.log(`✅ Using ${fileFallbackMethods.length} file-based methods for ${serviceName}`);
                    
                    for (const method of fileFallbackMethods) {
                        const completion = new vscode.CompletionItem(
                            method.name,
                            vscode.CompletionItemKind.Method
                        );
                        completion.detail = `${serviceName}.${method.name}`;
                        completion.documentation = new vscode.MarkdownString(method.description);
                        completion.insertText = method.name;
                        completion.sortText = `file_fallback_${method.name}`;
                        
                        if (method.deprecated) {
                            completion.tags = [vscode.CompletionItemTag.Deprecated];
                        }
                        
                        completions.push(completion);
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to get methods from MCP server:', error);
            
            // Try file-based fallback on error too
            const fileFallbackMethods = this.apiProvider.getFallbackMethods(serviceName);
            if (fileFallbackMethods.length > 0) {
                console.log(`✅ Using ${fileFallbackMethods.length} file-based methods for ${serviceName} (MCP error fallback)`);
                
                for (const method of fileFallbackMethods) {
                    const completion = new vscode.CompletionItem(
                        method.name,
                        vscode.CompletionItemKind.Method
                    );
                    completion.detail = `${serviceName}.${method.name}`;
                    completion.documentation = new vscode.MarkdownString(method.description);
                    completion.insertText = method.name;
                    completion.sortText = `file_fallback_${method.name}`;
                    
                    if (method.deprecated) {
                        completion.tags = [vscode.CompletionItemTag.Deprecated];
                    }
                    
                    completions.push(completion);
                }
            }
        }

        return completions;
    }

    private getFallbackMethodCompletions(serviceURI: string): vscode.CompletionItem[] {
        console.log(`🔍 getFallbackMethodCompletions called with serviceURI: "${serviceURI}"`);
        const completions: vscode.CompletionItem[] = [];
        
        // First try to get methods from file-based fallback
        const serviceName = this.getServiceNameFromURI(serviceURI);
        if (serviceName) {
            console.log(`🎯 Extracted service name: "${serviceName}" from URI: "${serviceURI}"`);
            const fallbackMethods = this.apiProvider.getFallbackMethods(serviceName);
            
            if (fallbackMethods.length > 0) {
                console.log(`✅ Found ${fallbackMethods.length} file-based fallback methods for ${serviceName}`);
                for (const method of fallbackMethods) {
                    const completion = new vscode.CompletionItem(
                        method.name,
                        vscode.CompletionItemKind.Method
                    );
                    completion.detail = `${serviceName}.${method.name}`;
                    completion.documentation = new vscode.MarkdownString(method.description);
                    completion.insertText = method.name;
                    completion.sortText = `file_fallback_${method.name}`;
                    
                    // Add deprecated indicator
                    if (method.deprecated) {
                        completion.tags = [vscode.CompletionItemTag.Deprecated];
                    }
                    
                    completions.push(completion);
                }
                return completions;
            }
        }
        
        // Legacy hardcoded fallback as last resort
        console.log('⚠️ Using legacy hardcoded fallback');
        
        // Provide common methods based on service URI patterns
        const methodsByURI: Record<string, Array<{name: string, description: string}>> = {
            'luna://com.webos.service.audio': [
                { name: 'getVolume', description: '현재 볼륨 수준을 조회합니다' },
                { name: 'setVolume', description: '볼륨 수준을 설정합니다' },
                { name: 'getMute', description: '음소거 상태를 조회합니다' },
                { name: 'setMute', description: '음소거 상태를 설정합니다' },
                { name: 'getSoundOutput', description: '사운드 출력 설정을 조회합니다' }
            ],
            'luna://com.palm.activitymanager': [
                { name: 'adopt', description: '앱이나 서비스가 Activity의 부모로 전환되려는 의지를 등록합니다' },
                { name: 'cancel', description: '지정된 Activity를 종료하고 모든 구독자에게 cancel 이벤트를 보냅니다' },
                { name: 'create', description: '새로운 Activity를 생성하고 해당 ID를 반환합니다' },
                { name: 'complete', description: 'Activity를 완료 상태로 설정합니다' },
                { name: 'getDetails', description: 'Activity의 상세 정보를 조회합니다' }
            ],
            'luna://com.webos.service.settings': [
                { name: 'getSystemSettings', description: '시스템 설정 값들을 조회합니다' },
                { name: 'setSystemSettings', description: '시스템 설정 값을 설정합니다' },
                { name: 'getSystemSettingValues', description: '특정 시스템 설정 값을 조회합니다' },
                { name: 'setSystemSettingValues', description: '특정 시스템 설정 값을 설정합니다' }
            ],
            'luna://com.webos.service.systemservice': [
                { name: 'getSystemInfo', description: '시스템 정보를 조회합니다' },
                { name: 'osInfo', description: 'OS 정보를 조회합니다' },
                { name: 'time', description: '시스템 시간 정보를 조회합니다' }
            ],
            'luna://com.webos.applicationManager': [
                { name: 'launch', description: '앱을 실행합니다' },
                { name: 'close', description: '앱을 종료합니다' },
                { name: 'getAppInfo', description: '앱 정보를 조회합니다' },
                { name: 'listApps', description: '설치된 앱 목록을 조회합니다' }
            ],
            'luna://com.webos.service.connectionmanager': [
                { name: 'getStatus', description: '네트워크 연결 상태를 조회합니다' },
                { name: 'connect', description: '네트워크에 연결합니다' },
                { name: 'disconnect', description: '네트워크 연결을 해제합니다' },
                { name: 'getInfo', description: '네트워크 연결 정보를 조회합니다' },
                { name: 'setConfiguration', description: '네트워크 설정을 구성합니다' },
                { name: 'getNetworkInfo', description: '현재 네트워크 정보를 조회합니다' }
            ]
        };

        const methods = methodsByURI[serviceURI];
        if (methods) {
            for (const method of methods) {
                const completion = new vscode.CompletionItem(
                    method.name,
                    vscode.CompletionItemKind.Method
                );
                completion.detail = `${serviceURI}.${method.name}`;
                completion.documentation = new vscode.MarkdownString(method.description);
                completion.insertText = method.name;
                completion.sortText = `fallback_${method.name}`;
                completions.push(completion);
            }
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
            ],
            'Connection Manager': [
                { name: 'getStatus', description: '네트워크 연결 상태를 조회합니다', deprecated: false },
                { name: 'connect', description: '네트워크에 연결합니다', deprecated: false },
                { name: 'disconnect', description: '네트워크 연결을 해제합니다', deprecated: false },
                { name: 'getInfo', description: '네트워크 연결 정보를 조회합니다', deprecated: false },
                { name: 'setConfiguration', description: '네트워크 설정을 구성합니다', deprecated: false }
            ]
        };

        return methodMap[serviceName] || [];
    }

    private getMethodMapKeys(): string[] {
        const methodMap: Record<string, Array<{name: string, description: string, deprecated: boolean}>> = {
            'Audio': [],
            'Activity Manager': [],
            'Settings Service': [],
            'Connection Manager': []
        };
        return Object.keys(methodMap);
    }

    private getServiceNameFromURI(uri: string): string | null {
        // Map of URIs to service names
        const uriToServiceMap: Record<string, string> = {
            'luna://com.webos.service.audio': 'Audio',
            'luna://com.palm.activitymanager': 'Activity Manager',
            'luna://com.webos.applicationManager': 'Application Manager',
            'luna://com.webos.service.connectionmanager': 'Connection Manager',
            'luna://com.webos.service.settings': 'Settings Service',
            'luna://com.webos.service.systemservice': 'System Service',
            'luna://com.webos.service.tv.systemproperty': 'TV Device Information',
            'luna://com.webos.service.db': 'Database',
            'luna://com.webos.service.drm': 'DRM',
            'luna://com.webos.service.ble': 'BLE GATT',
            'luna://com.webos.service.magicremote': 'Magic Remote',
            'luna://com.webos.service.mediadb': 'Media Database',
            'luna://com.webos.service.keymanager': 'Keymanager3',
            'luna://com.webos.service.sm': 'Device Unique ID',
            'luna://com.webos.service.camera': 'Camera'
        };

        // Try exact match first
        const exactMatch = uriToServiceMap[uri];
        if (exactMatch) {
            console.log(`🎯 Exact URI match: ${uri} → ${exactMatch}`);
            return exactMatch;
        }

        // Try partial matching
        for (const [uriPattern, serviceName] of Object.entries(uriToServiceMap)) {
            if (uri.includes(uriPattern) || uriPattern.includes(uri)) {
                console.log(`🎯 Partial URI match: ${uri} → ${serviceName}`);
                return serviceName;
            }
        }

        console.log(`❌ No service name found for URI: ${uri}`);
        return null;
    }
}
