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
exports.WebOSCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const uri_normalizer_1 = require("../utils/uri-normalizer");
const smart_completion_1 = require("../utils/smart-completion");
const fallback_provider_1 = require("../utils/fallback-provider");
class WebOSCompletionProvider {
    constructor(apiProvider) {
        this.apiProvider = apiProvider;
    }
    async provideCompletionItems(document, position, token, context) {
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
            const completions = [];
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
            // More aggressive Luna URI detection (including placeholder detection)
            if (this.isCompletingServiceURI(linePrefix, document, position) ||
                linePrefix.includes("'l") || linePrefix.includes('"l') ||
                linePrefix.includes("'luna") || linePrefix.includes('"luna') ||
                linePrefix.includes("service.name") || linePrefix.includes("service.uri") || // Add placeholder detection
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
            // Check if we're completing parameters
            if (this.isCompletingParameters(linePrefix, document, position)) {
                console.log('✅ Parameter completion detected');
                checkCancellation();
                const parameterCompletions = await this.getParameterCompletions(linePrefix, position, document, token);
                checkCancellation(); // Check again after async operation
                completions.push(...parameterCompletions);
                console.log(`➕ Added ${parameterCompletions.length} parameter completions`);
            }
            // Add webOS completions only for non-method contexts
            if (completions.length === 0 && !this.isCompletingMethod(linePrefix, document, position)) {
                console.log('🔧 No specific completions found, adding default webOS items');
                // Check if we're in fallback mode and provide appropriate snippets
                if (this.apiProvider.isInFallbackMode()) {
                    console.log('📦 Adding fallback snippets');
                    const fallbackSnippets = fallback_provider_1.FallbackProvider.createBasicSnippets();
                    completions.push(...fallbackSnippets);
                }
                else {
                    // Always provide webOS service request
                    const webosRequest = new vscode.CompletionItem('webOS.service.request', vscode.CompletionItemKind.Snippet);
                    webosRequest.insertText = new vscode.SnippetString(`webOS.service.request('\${1:luna://service.name}', {
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
});`);
                    webosRequest.documentation = new vscode.MarkdownString('🚀 **webOS TV Luna Service API call**');
                    webosRequest.detail = 'webOS TV API Assistant';
                    webosRequest.sortText = '0000_webos';
                    completions.push(webosRequest);
                }
                // Add debug completion with fallback mode indication
                const debugCompletion = new vscode.CompletionItem(this.apiProvider.isInFallbackMode() ?
                    '⚠️ webOS TV API Assistant (Fallback Mode)' :
                    '🚀 webOS TV API Assistant is active!', vscode.CompletionItemKind.Text);
                debugCompletion.detail = this.apiProvider.isInFallbackMode() ?
                    'Debug: Extension in fallback mode' :
                    'Debug: Extension is working';
                debugCompletion.documentation = new vscode.MarkdownString(this.apiProvider.isInFallbackMode() ?
                    '⚠️ Extension is running in fallback mode. Some features may be limited.' :
                    '✅ If you see this, the webOS TV API Assistant extension is active and working.');
                debugCompletion.sortText = 'zzz_debug';
                completions.push(debugCompletion);
            }
            console.log(`🎯 Final result: ${completions.length} completions`);
            return completions;
        }
        catch (error) {
            // Handle cancellation gracefully
            if ((error instanceof Error && error.message === 'Completion was cancelled') || token.isCancellationRequested) {
                console.log('⚡ Completion cancelled gracefully');
                return [];
            }
            console.error('❌ Error in webOS completion provider:', error);
            return [];
        }
    }
    isWebOSRelatedContext(document, position) {
        // Check the entire document for webOS-related content
        const fullText = document.getText();
        return fullText.includes('webOS') || fullText.includes('luna://');
    }
    isTypingWebOSService(linePrefix, currentWord) {
        // Check if user is typing webOS.service.request
        const webOSPatterns = [
            /\bw$/, // just 'w'
            /\bwe$/, // 'we'
            /\bweb$/, // 'web'
            /\bwebO$/, // 'webO'
            /\bwebOS$/, // 'webOS'
            /\bwebOS\.$/, // 'webOS.'
            /\bwebOS\.s$/, // 'webOS.s'
            /\bwebOS\.se$/, // 'webOS.se'
            /\bwebOS\.ser$/, // 'webOS.ser'
            /\bwebOS\.serv$/, // 'webOS.serv'
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
    isInWebOSServiceContext(linePrefix, document, position) {
        // 현재 라인에서 webOS 컨텍스트 확인
        if (linePrefix.includes('webOS.service.request') ||
            linePrefix.includes('webOS.service.call')) {
            return true;
        }
        // 전체 라인에서 webOS 컨텍스트 확인 (여러 줄 상황)
        if (document && position) {
            const fullLine = document.lineAt(position.line).text;
            if (fullLine.includes('webOS.service.request') ||
                fullLine.includes('webOS.service.call')) {
                return true;
            }
            // 이전 라인들도 확인 (여러 줄에 걸친 webOS 호출)
            for (let i = Math.max(0, position.line - 5); i < position.line; i++) {
                const line = document.lineAt(i).text;
                if (line.includes('webOS.service.request') ||
                    line.includes('webOS.service.call')) {
                    return true;
                }
            }
        }
        return false;
    }
    isCompletingServiceURI(linePrefix, document, position) {
        console.log('Checking if completing service URI for:', linePrefix);
        // First, check if we're definitely in a webOS.service context
        const inWebOSContext = this.isInWebOSServiceContext(linePrefix, document, position);
        // Check for complete luna:// URIs (including placeholders)
        if (linePrefix.includes('luna://')) {
            console.log('Found complete luna:// in line prefix');
            return true;
        }
        // Check for partial service names that need URI completion
        if (inWebOSContext && linePrefix.match(/['"][a-zA-Z][^'"]*['"]\s*,?\s*$/)) {
            console.log('Found partial service name in quotes, suggesting URI completion');
            return true;
        }
        // Check for incomplete service names in quotes (like 'audio', 'database', etc.)
        if (inWebOSContext && linePrefix.match(/['"][a-zA-Z][^'"]*['"]\s*,\s*\{/)) {
            console.log('Found service name followed by object, suggesting URI completion');
            return true;
        }
        // Check for specific service names that need URI completion
        const serviceNames = ['audio', 'database', 'system', 'network', 'device', 'security', 'application', 'connection', 'settings', 'activity', 'media', 'drm', 'keymanager', 'magic', 'remote', 'ble', 'gatt', 'camera', 'device', 'unique', 'id', 'tv', 'information'];
        for (const serviceName of serviceNames) {
            if (inWebOSContext && linePrefix.includes(`'${serviceName}'`) || linePrefix.includes(`"${serviceName}"`)) {
                console.log(`Found specific service name '${serviceName}', suggesting URI completion`);
                return true;
            }
        }
        // Check for placeholder service URIs (더 정확한 검사)
        if (linePrefix.match(/['"]service\.uri['"]?$/) ||
            linePrefix.match(/['"]service\.name['"]?$/) ||
            linePrefix.match(/['"]service\.['"]?$/)) {
            console.log('Found service URI placeholder in line prefix');
            return true;
        }
        // 추가: 여러 줄에 걸친 webOS.service.request에서 service. 패턴 감지
        if (inWebOSContext && linePrefix.match(/['"]service\.[^'"]*$/)) {
            console.log('Found service placeholder in multiline webOS context');
            return true;
        }
        // 추가: 현재 상황 감지 - 따옴표 안에서 service.uri 타이핑 중
        if (linePrefix.match(/['"]service\.uri['"]?$/) ||
            linePrefix.match(/['"]service\.uri['"]?,\s*$/) ||
            linePrefix.match(/['"]service\.uri['"]?\s*,\s*\/\/.*$/)) {
            console.log('Found service.uri pattern in quotes');
            return true;
        }
        // 추가: 전체 라인에서 service.uri 패턴 확인
        if (document && position) {
            const fullLine = document.lineAt(position.line).text;
            if (fullLine.includes("'service.uri'") || fullLine.includes('"service.uri"')) {
                console.log('Found service.uri in full line analysis');
                return true;
            }
        }
        // Check if we're typing luna:// after quotes in webOS context
        if (inWebOSContext && (linePrefix.includes('"luna://') || linePrefix.includes("'luna://"))) {
            console.log('Found quoted luna:// in webOS context');
            return true;
        }
        // Enhanced pattern matching for partial typing
        const partialPatterns = [
            // Direct luna patterns
            /['"]luna:\/\/$/, // 'luna:// or "luna://
            /['"]luna:\/[^'"\s]*$/, // 'luna:/something (more flexible)
            /['"]luna:[^'"\s]*$/, // 'luna:something
            /['"]lun[a-z]*$/, // 'luna, 'lun
            /['"]lu[n]*$/, // 'lu, 'lun
            /['"]l[una]*$/, // 'l, 'lu, 'lun, 'luna
            // Service URI patterns including placeholders
            /['"]luna:\/\/[^'"\s]*service[^'"\s]*$/, // luna://...service...
            /['"]luna:\/\/[^'"\s]*\.uri[^'"\s]*$/, // luna://...uri...
            /['"]luna:\/\/[^'"\s]*\.name[^'"\s]*$/, // luna://...name...
            /['"]service\.uri$/, // service.uri
            /['"]service\.name$/, // service.name
            /['"].*\.uri$/, // anything.uri
            /['"].*\.name$/, // anything.name
            // In webOS service context with quotes
            /webOS\.service\.(request|call)\s*\(\s*['"][^'"]*$/, // webOS.service.request('...
        ];
        // Check if in webOS context and starting to type in quotes
        if (inWebOSContext) {
            const webOSQuotePatterns = [
                /webOS\.service\.(request|call)\s*\(\s*['"]$/, // webOS.service.request('
                /webOS\.service\.(request|call)\s*\(\s*['"][^'"]*$/, // webOS.service.request('something
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
    isCompletingMethod(linePrefix, document, position) {
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
                }
                else {
                    contentEndPos = match.index + match[0].length; // end of content
                }
                console.log('🔍 Checking method property:', {
                    methodStartPos, quoteStartPos, contentStartPos, contentEndPos, content, cursorPos,
                    complete: match[0].endsWith(quote),
                    fullMatch: match[0]
                });
                // Check if cursor is within the quoted content of method property
                if (cursorPos >= contentStartPos && cursorPos <= contentEndPos) {
                    console.log('✅ Cursor is within method property content:', content);
                    // 추가 검증: 이상한 문자열 패턴 방지
                    if (content.includes('methodName') && content !== 'methodName') {
                        console.log('⚠️ Detected corrupted method content, treating as method completion:', content);
                    }
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
    getWebOSServiceCompletions() {
        const completions = [];
        // webOS.service.request snippet
        const requestCompletion = new vscode.CompletionItem('webOS.service.request', vscode.CompletionItemKind.Snippet);
        requestCompletion.insertText = new vscode.SnippetString(`webOS.service.request('\${1:luna://service.name}', {
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
});`);
        requestCompletion.documentation = new vscode.MarkdownString('🚀 **webOS TV Luna Service API call**\n\nGenerate a complete webOS service request with callbacks');
        requestCompletion.detail = 'webOS TV API Assistant';
        requestCompletion.sortText = '0000_webos_request'; // High priority
        requestCompletion.filterText = 'webOS service request luna';
        completions.push(requestCompletion);
        // Additional webOS shortcuts
        const webosCompletion = new vscode.CompletionItem('webOS', vscode.CompletionItemKind.Class);
        webosCompletion.insertText = 'webOS';
        webosCompletion.documentation = new vscode.MarkdownString('🌟 **webOS Global Object**\n\nMain webOS namespace for TV APIs');
        webosCompletion.detail = 'webOS TV Global Object';
        webosCompletion.sortText = '0001_webos';
        completions.push(webosCompletion);
        return completions;
    }
    // Legacy method - deprecated, use SmartCompletionEngine instead
    getSmartCompletion(fullText, linePrefix, position, document) {
        console.log('⚠️ Using deprecated getSmartCompletion - consider using SmartCompletionEngine');
        return { insertText: fullText };
    }
    // Legacy method - deprecated, use SmartCompletionEngine instead
    getSmartMethodCompletion(methodName, linePrefix, position, document) {
        console.log('⚠️ Using deprecated getSmartMethodCompletion - consider using SmartCompletionEngine');
        return { insertText: methodName };
    }
    getServiceURICompletions(linePrefix, position, document) {
        const completions = [];
        // Check if API provider is ready
        if (!this.apiProvider.isReady()) {
            console.log('API Provider not ready yet');
            // Return a more helpful placeholder completion
            const loadingCompletion = new vscode.CompletionItem('luna://com.webos... (Loading APIs)', vscode.CompletionItemKind.Text);
            loadingCompletion.detail = 'webOS TV APIs are being loaded from MCP server';
            loadingCompletion.documentation = new vscode.MarkdownString('⏳ Please wait while webOS TV API data is being loaded from the MCP server.\n\nOnce loaded, you will see all available Luna service URIs.');
            loadingCompletion.insertText = '';
            loadingCompletion.sortText = 'zzz_loading'; // Put at end
            return [loadingCompletion];
        }
        const apis = this.apiProvider.getAPIs();
        console.log(`Found ${apis.length} APIs for completion`);
        // If no APIs available, use enhanced fallback system
        if (apis.length === 0) {
            console.log('🔄 No APIs from provider, using enhanced fallback system...');
            // Try file-based fallback first
            const fallbackAPIList = this.apiProvider.listFallbackAPIs();
            console.log(`📁 Found ${fallbackAPIList.length} file-based fallback APIs:`, fallbackAPIList);
            if (fallbackAPIList.length > 0) {
                // Create completions from file-based fallback APIs
                for (const serviceName of fallbackAPIList) {
                    const serviceURI = this.getServiceURIFromName(serviceName);
                    if (serviceURI) {
                        const completion = new vscode.CompletionItem(serviceURI, vscode.CompletionItemKind.Value);
                        completion.detail = `${serviceName} (file-based fallback)`;
                        completion.documentation = new vscode.MarkdownString(`**${serviceName}**\\n\\nwebOS TV Luna Service from local API files\\n\\n📋 **URI:** \`${serviceURI}\`\\n\\n*Note: Loaded from local API files since MCP server is unavailable.*`);
                        // Use smart completion to avoid duplication
                        if (linePrefix && position && document) {
                            const context = {
                                document,
                                position,
                                linePrefix,
                                fullLine: document.lineAt(position.line).text,
                                cursorPos: position.character
                            };
                            const smartCompletion = smart_completion_1.SmartCompletionEngine.getServiceURICompletion(serviceURI, context);
                            completion.insertText = smartCompletion.insertText;
                            if (smartCompletion.additionalTextEdits) {
                                completion.additionalTextEdits = smartCompletion.additionalTextEdits;
                            }
                        }
                        else {
                            completion.insertText = serviceURI;
                        }
                        completion.sortText = `file_fallback_${serviceName}`;
                        completion.kind = vscode.CompletionItemKind.Constant;
                        completions.push(completion);
                    }
                }
                console.log(`📁 Generated ${completions.length} file-based URI completions`);
                return completions;
            }
            // Use minimal fallback provider as final safety net
            console.log('📦 Using minimal fallback provider for URI completions');
            const fallbackCompletions = fallback_provider_1.FallbackProvider.createAPICompletionItems();
            // Apply smart completion to fallback items
            if (linePrefix && position && document) {
                const context = {
                    document,
                    position,
                    linePrefix,
                    fullLine: document.lineAt(position.line).text,
                    cursorPos: position.character
                };
                for (const completion of fallbackCompletions) {
                    const smartCompletion = smart_completion_1.SmartCompletionEngine.getServiceURICompletion(completion.insertText, context);
                    completion.insertText = smartCompletion.insertText;
                    if (smartCompletion.additionalTextEdits) {
                        completion.additionalTextEdits = smartCompletion.additionalTextEdits;
                    }
                }
            }
            console.log(`📦 Generated ${fallbackCompletions.length} minimal fallback URI completions`);
            return fallbackCompletions;
        }
        // Create completions from API data
        for (const api of apis) {
            // URI 정규화 적용
            const normalizedUri = uri_normalizer_1.URINormalizer.normalizeURI(api.serviceUri) || api.serviceUri;
            const completion = new vscode.CompletionItem(normalizedUri, vscode.CompletionItemKind.Value);
            completion.detail = `${api.serviceName} (${api.category}) - Normalized`;
            completion.documentation = new vscode.MarkdownString(`**${api.serviceName}** (${api.category})\\n\\n${api.description || 'webOS TV Luna Service'}\\n\\n📋 **Standard URI:** \`${normalizedUri}\`${api.serviceUri !== normalizedUri ? `\\n🔄 **Original URI:** \`${api.serviceUri}\`` : ''}`);
            // Use smart completion to avoid duplication
            if (linePrefix && position && document) {
                const context = {
                    document,
                    position,
                    linePrefix,
                    fullLine: document.lineAt(position.line).text,
                    cursorPos: position.character
                };
                const smartCompletion = smart_completion_1.SmartCompletionEngine.getServiceURICompletion(normalizedUri, context);
                completion.insertText = smartCompletion.insertText;
                if (smartCompletion.additionalTextEdits) {
                    completion.additionalTextEdits = smartCompletion.additionalTextEdits;
                }
            }
            else {
                completion.insertText = normalizedUri;
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
    async getMethodCompletions(linePrefix, position, document, token) {
        const completions = [];
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
                // Apply smart method completion to MCP results (including file-based fallback)
                for (const completion of mcpMethods) {
                    if (linePrefix && position && document) {
                        const context = {
                            document,
                            position,
                            linePrefix,
                            fullLine: document.lineAt(position.line).text,
                            cursorPos: position.character
                        };
                        const methodSmartCompletion = smart_completion_1.SmartCompletionEngine.getMethodCompletion(completion.label, context);
                        completion.insertText = methodSmartCompletion.insertText;
                        if (methodSmartCompletion.additionalTextEdits) {
                            completion.additionalTextEdits = methodSmartCompletion.additionalTextEdits;
                            console.log(`🎯 Applied smart completion to MCP method: ${completion.label}`);
                        }
                    }
                }
                return mcpMethods;
            }
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Completion was cancelled') {
                return [];
            }
            console.warn('⚠️ Failed to get methods from MCP:', error);
        }
        // Try enhanced fallback (file-based + minimal fallback)
        console.log(`🔍 Trying enhanced fallback for service: "${api.serviceName}"`);
        const fallbackMethods = this.apiProvider.getFallbackMethodsEnhanced(api.serviceName);
        console.log(`📋 Enhanced fallback result: ${fallbackMethods.length} methods`);
        if (fallbackMethods.length > 0) {
            console.log(`✅ Using enhanced fallback methods`);
            for (const method of fallbackMethods) {
                const completion = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
                completion.detail = `${api.serviceName}.${method.name} (file-based)`;
                completion.documentation = new vscode.MarkdownString(`${method.description}\\n\\n*Loaded from local API files*`);
                // Smart method insertion - replace existing partial method name
                if (linePrefix && position && document) {
                    const context = {
                        document,
                        position,
                        linePrefix,
                        fullLine: document.lineAt(position.line).text,
                        cursorPos: position.character
                    };
                    const methodSmartCompletion = smart_completion_1.SmartCompletionEngine.getMethodCompletion(method.name, context);
                    completion.insertText = methodSmartCompletion.insertText;
                    if (methodSmartCompletion.additionalTextEdits) {
                        completion.additionalTextEdits = methodSmartCompletion.additionalTextEdits;
                        console.log(`🎯 Using smart completion for file-based method: ${method.name}`);
                    }
                }
                else {
                    completion.insertText = method.name;
                    console.log(`🎯 Using default insertText for file-based method: ${method.name}`);
                }
                completion.sortText = `file_fallback_${method.name}`;
                if (method.deprecated) {
                    completion.tags = [vscode.CompletionItemTag.Deprecated];
                }
                completions.push(completion);
            }
            return completions;
        }
        // Only as last resort, use minimal hardcoded methods
        console.log('⚠️ No file-based methods found, using minimal hardcoded fallback');
        const commonMethods = this.getCommonMethodsForAPI(api.serviceName);
        console.log(`📋 Using ${commonMethods.length} minimal fallback methods for service: "${api.serviceName}"`);
        for (const method of commonMethods) {
            const completion = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            completion.detail = `${api.serviceName}.${method.name}`;
            completion.documentation = new vscode.MarkdownString(method.description);
            // Smart method insertion - replace existing partial method name
            if (linePrefix && position && document) {
                const context = {
                    document,
                    position,
                    linePrefix,
                    fullLine: document.lineAt(position.line).text,
                    cursorPos: position.character
                };
                const methodSmartCompletion = smart_completion_1.SmartCompletionEngine.getMethodCompletion(method.name, context);
                completion.insertText = methodSmartCompletion.insertText;
                if (methodSmartCompletion.additionalTextEdits) {
                    completion.additionalTextEdits = methodSmartCompletion.additionalTextEdits;
                }
            }
            else {
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
    async getMethodsFromMCP(serviceName, serviceURI) {
        const completions = [];
        if (!this.apiProvider.isReady()) {
            return completions;
        }
        try {
            // Try to get detailed API info with methods from MCP server
            const response = await this.apiProvider.searchAndGetMethods(serviceName);
            if (response && Array.isArray(response) && response.length > 0) {
                console.log(`✅ MCP returned ${response.length} methods for ${serviceName}`);
                for (const method of response) {
                    const completion = new vscode.CompletionItem(method.name || method.methodName, vscode.CompletionItemKind.Method);
                    completion.detail = `${serviceName}.${method.name || method.methodName}`;
                    completion.documentation = new vscode.MarkdownString(method.description || `${method.name || method.methodName} method for ${serviceName}`);
                    completion.insertText = method.name || method.methodName;
                    completion.sortText = `mcp_${method.name || method.methodName}`;
                    if (method.deprecated) {
                        completion.tags = [vscode.CompletionItemTag.Deprecated];
                    }
                    completions.push(completion);
                }
            }
            else {
                console.log(`⚠️ MCP returned 0 or invalid methods for ${serviceName}, trying file-based fallback`);
                // Try file-based fallback immediately
                const fileFallbackMethods = this.apiProvider.getFallbackMethods(serviceName);
                if (fileFallbackMethods.length > 0) {
                    console.log(`✅ Using ${fileFallbackMethods.length} file-based methods for ${serviceName}`);
                    for (const method of fileFallbackMethods) {
                        const completion = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
                        completion.detail = `${serviceName}.${method.name} (file-based)`;
                        completion.documentation = new vscode.MarkdownString(`${method.description}\\n\\n*Loaded from local API files*`);
                        // Note: Smart completion can't be applied here because this is in getMethodsFromMCP
                        // which doesn't have access to linePrefix, position, document
                        completion.insertText = method.name;
                        completion.sortText = `file_fallback_${method.name}`;
                        if (method.deprecated) {
                            completion.tags = [vscode.CompletionItemTag.Deprecated];
                        }
                        completions.push(completion);
                    }
                }
            }
        }
        catch (error) {
            console.warn('Failed to get methods from MCP server:', error);
            // Try file-based fallback on error too
            const fileFallbackMethods = this.apiProvider.getFallbackMethods(serviceName);
            if (fileFallbackMethods.length > 0) {
                console.log(`✅ Using ${fileFallbackMethods.length} file-based methods for ${serviceName} (MCP error fallback)`);
                for (const method of fileFallbackMethods) {
                    const completion = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
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
    getFallbackMethodCompletions(serviceURI) {
        console.log(`🔍 getFallbackMethodCompletions called with serviceURI: "${serviceURI}"`);
        const completions = [];
        // First try to get methods from file-based fallback
        const serviceName = this.getServiceNameFromURI(serviceURI);
        if (serviceName) {
            console.log(`🎯 Extracted service name: "${serviceName}" from URI: "${serviceURI}"`);
            const fallbackMethods = this.apiProvider.getFallbackMethods(serviceName);
            if (fallbackMethods.length > 0) {
                console.log(`✅ Found ${fallbackMethods.length} file-based fallback methods for ${serviceName}`);
                for (const method of fallbackMethods) {
                    const completion = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
                    completion.detail = `${serviceName}.${method.name} (file-based)`;
                    completion.documentation = new vscode.MarkdownString(`${method.description}\\n\\n*Loaded from local API files*`);
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
        // Minimal hardcoded fallback as last resort
        console.log('⚠️ Using minimal hardcoded fallback for unknown service');
        // Minimal hardcoded methods for most common services only
        const minimalMethodsByURI = {
            'luna://com.webos.audio': [
                { name: 'getVolume', description: '현재 볼륨 수준을 조회합니다' }
            ],
            'luna://com.palm.activitymanager': [
                { name: 'adopt', description: 'Activity 관리 메서드' }
            ],
            'luna://com.webos.service.settings': [
                { name: 'getSystemSettings', description: '시스템 설정을 조회합니다' }
            ]
        };
        const methods = minimalMethodsByURI[serviceURI];
        if (methods) {
            for (const method of methods) {
                const completion = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
                completion.detail = `${serviceURI}.${method.name}`;
                completion.documentation = new vscode.MarkdownString(method.description);
                completion.insertText = method.name;
                completion.sortText = `fallback_${method.name}`;
                completions.push(completion);
            }
        }
        return completions;
    }
    getCommonMethodsForAPI(serviceName) {
        // Minimal hardcoded methods - only for most essential services as last resort
        const minimalMethodMap = {
            'Audio': [
                { name: 'getVolume', description: '현재 볼륨 수준을 조회합니다', deprecated: false }
            ],
            'Activity Manager': [
                { name: 'adopt', description: 'Activity 관리 메서드', deprecated: false }
            ],
            'Settings Service': [
                { name: 'getSystemSettings', description: '시스템 설정 값들을 조회합니다', deprecated: false }
            ]
        };
        return minimalMethodMap[serviceName] || [];
    }
    getMethodMapKeys() {
        const methodMap = {
            'Audio': [],
            'Activity Manager': [],
            'Settings Service': [],
            'Connection Manager': []
        };
        return Object.keys(methodMap);
    }
    getServiceNameFromURI(uri) {
        // URI 정규화를 통한 서비스명 추출
        const serviceName = uri_normalizer_1.URINormalizer.getServiceNameFromURI(uri);
        if (serviceName) {
            console.log(`🎯 Service name from normalized URI: ${uri} → ${serviceName}`);
            return serviceName;
        }
        console.log(`❌ No service name found for URI: ${uri}`);
        return null;
    }
    getServiceURIFromName(serviceName) {
        // URI 정규화를 통한 표준 URI 추출
        const standardUri = uri_normalizer_1.URINormalizer.getStandardURIFromServiceName(serviceName);
        if (standardUri) {
            console.log(`🎯 Standard URI from service name: ${serviceName} → ${standardUri}`);
            return standardUri;
        }
        console.log(`❌ No URI found for service: ${serviceName}`);
        return null;
    }
    isCompletingParameters(linePrefix, document, position) {
        console.log('🔍 isCompletingParameters - checking linePrefix:', JSON.stringify(linePrefix));
        // Check if we're in a method line - only exclude if we're actually completing the method value
        if (document && position) {
            const fullLine = document.lineAt(position.line).text;
            const cursorPos = position.character;
            // Check if cursor is within method property value (not just any line with method:)
            const methodRegex = /\bmethod\s*:\s*(['"])([^'"]*?)(?:\1|$)/g;
            let match;
            while ((match = methodRegex.exec(fullLine)) !== null) {
                const quote = match[1];
                const content = match[2];
                const methodStartPos = match.index;
                const quoteStartPos = match.index + match[0].indexOf(quote);
                const contentStartPos = quoteStartPos + 1;
                let contentEndPos;
                if (match[0].endsWith(quote)) {
                    contentEndPos = match.index + match[0].length - 1;
                }
                else {
                    contentEndPos = match.index + match[0].length;
                }
                // Only exclude if cursor is actually within the method property value
                if (cursorPos >= contentStartPos && cursorPos <= contentEndPos) {
                    console.log('❌ Cursor is within method property value, not parameter completion');
                    return false;
                }
            }
        }
        // Enhanced parameter detection with full line analysis
        if (document && position) {
            const fullLine = document.lineAt(position.line).text;
            const cursorPos = position.character;
            console.log('📄 Full line parameter analysis:', { fullLine, cursorPos });
            // Check if cursor is within a parameters object (including incomplete ones)
            const parametersRegex = /\bparameters\s*:\s*\{([^}]*?)(?:\}|$)/g;
            let match;
            while ((match = parametersRegex.exec(fullLine)) !== null) {
                const content = match[1];
                const parametersStartPos = match.index;
                const openBracePos = match.index + match[0].indexOf('{');
                const contentStartPos = openBracePos + 1; // after opening brace
                let contentEndPos;
                // Check if object is complete (has closing brace)
                if (match[0].endsWith('}')) {
                    contentEndPos = match.index + match[0].length - 1; // before closing brace
                }
                else {
                    contentEndPos = match.index + match[0].length; // end of content
                }
                console.log('🔍 Checking parameters object:', {
                    parametersStartPos, openBracePos, contentStartPos, contentEndPos, content, cursorPos,
                    complete: match[0].endsWith('}'),
                    fullMatch: match[0]
                });
                // Check if cursor is within the parameters object area
                if (cursorPos >= contentStartPos && cursorPos <= contentEndPos) {
                    console.log('✅ Cursor is within parameters object:', content);
                    return true;
                }
            }
        }
        // Enhanced fallback detection - more flexible patterns
        const parameterPropertyRegex = /\bparameters\s*:\s*\{[^}]*$/;
        if (parameterPropertyRegex.test(linePrefix)) {
            console.log('✅ Parameters object detected (fallback)');
            return true;
        }
        // Check for parameter property patterns (more flexible)
        if (linePrefix.includes('parameters:') && linePrefix.includes('{')) {
            console.log('✅ Parameters property detected');
            return true;
        }
        // Additional patterns for parameter completion
        if (linePrefix.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*$/) || // "paramName: " pattern
            linePrefix.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*$/) || // "paramName" pattern
            linePrefix.match(/^\s*$/)) { // Empty line in parameters object
            console.log('✅ Parameter name pattern detected');
            return true;
        }
        console.log('❌ No parameter completion patterns matched');
        return false;
    }
    async getParameterCompletions(linePrefix, position, document, token) {
        const completions = [];
        console.log('🔍 Getting parameter completions for:', linePrefix);
        // Check cancellation at start of parameter completion
        if (token?.isCancellationRequested) {
            console.log('❌ Parameter completion cancelled');
            return [];
        }
        // Extract service URI and method name from the webOS service call context
        let serviceURI = '';
        let methodName = '';
        // Look for service URI and method in current line or previous lines
        if (document && position) {
            // Search backwards through lines to find the service URI and method
            for (let lineNum = position.line; lineNum >= Math.max(0, position.line - 10); lineNum--) {
                const line = document.lineAt(lineNum).text;
                // Look for service URI
                if (!serviceURI) {
                    const uriMatch = line.match(/(['"])(luna:\/\/[^'"]+)\1/);
                    if (uriMatch) {
                        serviceURI = uriMatch[2];
                        console.log('🎯 Found service URI:', serviceURI);
                    }
                }
                // Look for method name
                if (!methodName) {
                    const methodMatch = line.match(/\bmethod\s*:\s*(['"])([^'"]+)\1/);
                    if (methodMatch) {
                        methodName = methodMatch[2];
                        console.log('🎯 Found method name:', methodName);
                    }
                }
                // Break if we found both
                if (serviceURI && methodName) {
                    break;
                }
            }
        }
        if (!serviceURI || !methodName) {
            console.log('❌ No service URI or method found for parameter completion');
            // Return common parameters as fallback
            return this.getCommonParameterCompletions();
        }
        console.log('🔍 Looking for API with URI:', serviceURI);
        const api = this.apiProvider.getAPIs().find(a => a.serviceUri === serviceURI);
        if (!api) {
            console.log('❌ No API found for URI:', serviceURI);
            // Provide fallback parameters based on URI patterns
            return this.getFallbackParameterCompletions(serviceURI, methodName);
        }
        console.log('✅ Found API:', api.serviceName);
        // First, try to get parameters from local API file
        console.log(`🔍 Looking for method "${methodName}" in local API file...`);
        const localMethod = this.apiProvider.getMethodFromLocalFile(serviceURI, methodName);
        if (localMethod && localMethod.parameters && localMethod.parameters.length > 0) {
            console.log(`📋 Found ${localMethod.parameters.length} parameters in local API file`);
            for (const param of localMethod.parameters) {
                console.log(`🔍 Processing parameter:`, {
                    name: param.name,
                    type: param.type,
                    required: param.required,
                    description: param.description
                });
                const completion = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Property);
                completion.detail = `${param.type} - ${param.required ? 'required' : 'optional'}`;
                completion.documentation = new vscode.MarkdownString(`**${param.name}** (${param.type})\\n\\n${param.description || 'Parameter for ' + methodName}\\n\\n${param.required ? '**Required**' : '*Optional*'}`);
                // Smart parameter insertion with type-appropriate values
                const paramValue = this.getParameterDefaultValue(param);
                console.log(`🔍 Parameter value for ${param.name}:`, paramValue);
                // Try both snippet and simple text insertion
                completion.insertText = new vscode.SnippetString(`${param.name}: \${1:${paramValue}}`);
                completion.insertText = `${param.name}: ${paramValue}`; // Fallback to simple text
                completion.sortText = `local_${param.name}`;
                // Ensure the completion item has proper label and filtering
                completion.label = param.name;
                completion.kind = vscode.CompletionItemKind.Property;
                completion.filterText = param.name; // Ensure it can be filtered by name
                completion.preselect = true; // Make it more prominent
                console.log(`✅ Created completion item for parameter: ${param.name}`, {
                    label: completion.label,
                    detail: completion.detail,
                    insertText: completion.insertText,
                    sortText: completion.sortText,
                    filterText: completion.filterText,
                    preselect: completion.preselect
                });
                completions.push(completion);
            }
            console.log(`✅ Added ${completions.length} parameter completions from local API file`);
            return completions;
        }
        try {
            // Check cancellation before expensive MCP call
            if (token?.isCancellationRequested) {
                console.log('❌ MCP parameter search cancelled');
                return completions;
            }
            // Try to get method details from MCP server to get parameter info
            console.log(`🔍 Attempting MCP search for ${api.serviceName}.${methodName} parameters...`);
            const mcpMethods = await this.apiProvider.searchAndGetMethods(api.serviceName);
            // Check cancellation after MCP call
            if (token?.isCancellationRequested) {
                console.log('❌ Parameter completion cancelled after MCP call');
                return [];
            }
            if (mcpMethods && mcpMethods.length > 0) {
                const method = mcpMethods.find((m) => m.name === methodName);
                if (method && method.parameters && method.parameters.length > 0) {
                    console.log(`📋 Got ${method.parameters.length} parameters from MCP server`);
                    for (const param of method.parameters) {
                        const completion = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Property);
                        completion.detail = `${param.type} - ${param.required ? 'required' : 'optional'}`;
                        completion.documentation = new vscode.MarkdownString(`**${param.name}** (${param.type})\\n\\n${param.description || 'Parameter for ' + methodName}\\n\\n${param.required ? '**Required**' : '*Optional*'}`);
                        // Smart parameter insertion with type-appropriate values
                        const paramValue = this.getParameterDefaultValue(param);
                        completion.insertText = new vscode.SnippetString(`${param.name}: \${1:${paramValue}}`);
                        completion.sortText = param.required ? `0_${param.name}` : `1_${param.name}`; // Required first
                        completions.push(completion);
                    }
                    return completions;
                }
            }
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Completion was cancelled') {
                return [];
            }
            console.warn('⚠️ Failed to get parameters from MCP:', error);
        }
        // Try file-based parameter fallback first
        console.log(`🔍 Trying file-based parameter fallback for ${api.serviceName}.${methodName}`);
        const fileFallbackMethods = this.apiProvider.getFallbackMethods(api.serviceName);
        if (fileFallbackMethods.length > 0) {
            const method = fileFallbackMethods.find(m => m.name === methodName);
            if (method && method.parameters && method.parameters.length > 0) {
                console.log(`📋 Found ${method.parameters.length} file-based parameters for ${methodName}`);
                for (const param of method.parameters) {
                    const completion = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Property);
                    completion.detail = `${param.type || 'any'} - ${param.required ? 'required' : 'optional'} (file-based)`;
                    completion.documentation = new vscode.MarkdownString(`**${param.name}** (${param.type || 'any'})\\n\\n${param.description || 'Parameter for ' + methodName}\\n\\n${param.required ? '**Required**' : '*Optional*'}\\n\\n*Loaded from local API files*`);
                    // Smart parameter insertion with type-appropriate values
                    const paramValue = this.getParameterDefaultValue(param);
                    completion.insertText = new vscode.SnippetString(`${param.name}: \${1:${paramValue}}`);
                    completion.sortText = param.required ? `0_file_${param.name}` : `1_file_${param.name}`; // Required first
                    completions.push(completion);
                }
                return completions;
            }
        }
        // Fallback to minimal hardcoded common parameters
        console.log('⚠️ No file-based parameters found, using minimal hardcoded fallback');
        return this.getFallbackParameterCompletions(serviceURI, methodName);
    }
    getParameterDefaultValue(param) {
        const type = param.type?.toLowerCase() || 'string';
        console.log(`🔍 getParameterDefaultValue called for:`, {
            name: param.name,
            type: param.type,
            lowerType: type
        });
        if (param.name === 'subscribe') {
            console.log(`✅ Special case: subscribe parameter, returning 'true'`);
            return 'true';
        }
        let defaultValue;
        switch (type) {
            case 'boolean':
                defaultValue = 'true';
                break;
            case 'number':
            case 'integer':
                defaultValue = '0';
                break;
            case 'array':
                defaultValue = '[]';
                break;
            case 'object':
                defaultValue = '{}';
                break;
            default:
                defaultValue = `"${param.name}Value"`;
                break;
        }
        console.log(`🔍 Default value for ${param.name} (${type}):`, defaultValue);
        return defaultValue;
    }
    getCommonParameterCompletions() {
        const commonParams = [
            { name: 'subscribe', type: 'boolean', description: '변경 알림을 구독할지 여부', required: false },
            { name: 'returnValue', type: 'boolean', description: '성공 여부를 나타내는 값', required: false },
            { name: 'volume', type: 'number', description: '볼륨 레벨 (0-100)', required: false },
            { name: 'muted', type: 'boolean', description: '음소거 상태', required: false },
            { name: 'source', type: 'string', description: '오디오 소스', required: false },
            { name: 'category', type: 'string', description: '카테고리', required: false },
            { name: 'id', type: 'string', description: '식별자', required: false },
            { name: 'name', type: 'string', description: '이름', required: false },
            { name: 'value', type: 'any', description: '값', required: false },
            { name: 'enabled', type: 'boolean', description: '활성화 상태', required: false },
        ];
        return commonParams.map(param => {
            const completion = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Property);
            completion.detail = `${param.type} - ${param.required ? 'required' : 'optional'}`;
            completion.documentation = new vscode.MarkdownString(`**${param.name}** (${param.type})\\n\\n${param.description}\\n\\n${param.required ? '**Required**' : '*Optional*'}`);
            const paramValue = this.getParameterDefaultValue(param);
            completion.insertText = new vscode.SnippetString(`${param.name}: \${1:${paramValue}}`);
            completion.sortText = `common_${param.name}`;
            return completion;
        });
    }
    getFallbackParameterCompletions(serviceURI, methodName) {
        console.log(`🔍 getFallbackParameterCompletions called with serviceURI: "${serviceURI}", methodName: "${methodName}"`);
        const completions = [];
        // Enhanced method-specific parameters for common webOS methods
        const minimalMethodParameterMap = {
            'getVolume': [
                { name: 'subscribe', type: 'boolean', description: '볼륨 변경 알림을 구독할지 여부', required: false }
            ],
            'setVolume': [
                { name: 'volume', type: 'number', description: '설정할 볼륨 수준 (0-100)', required: true }
            ],
            'setMuted': [
                { name: 'muted', type: 'boolean', description: '음소거 상태', required: true }
            ],
            'getMuted': [
                { name: 'subscribe', type: 'boolean', description: '음소거 상태 변경 알림을 구독할지 여부', required: false }
            ],
            'getSystemInfo': [
                { name: 'subscribe', type: 'boolean', description: '시스템 정보 변경 알림을 구독할지 여부', required: false }
            ],
            'getSystemSettings': [
                { name: 'keys', type: 'array', description: '조회할 설정 키 목록', required: true }
            ],
            'setSystemSettings': [
                { name: 'settings', type: 'object', description: '설정할 값들', required: true }
            ]
        };
        // Minimal service-specific common parameters
        const minimalServiceParameterMap = {
            'luna://com.webos.audio': [
                { name: 'subscribe', type: 'boolean', description: '변경 알림 구독 여부', required: false }
            ]
        };
        // Get method-specific parameters first
        const methodParams = minimalMethodParameterMap[methodName] || [];
        // Get service-specific parameters
        const serviceParams = minimalServiceParameterMap[serviceURI] || [];
        // Combine and deduplicate
        const allParams = [...methodParams];
        for (const serviceParam of serviceParams) {
            if (!allParams.find(p => p.name === serviceParam.name)) {
                allParams.push(serviceParam);
            }
        }
        // Add common fallback parameters if none found
        if (allParams.length === 0) {
            allParams.push({ name: 'subscribe', type: 'boolean', description: '변경 알림을 구독할지 여부', required: false });
        }
        for (const param of allParams) {
            const completion = new vscode.CompletionItem(param.name, vscode.CompletionItemKind.Property);
            completion.detail = `${param.type} - ${param.required ? 'required' : 'optional'}`;
            completion.documentation = new vscode.MarkdownString(`**${param.name}** (${param.type})\\n\\n${param.description}\\n\\n${param.required ? '**Required**' : '*Optional*'}`);
            const paramValue = this.getParameterDefaultValue(param);
            completion.insertText = new vscode.SnippetString(`${param.name}: \${1:${paramValue}}`);
            completion.sortText = param.required ? `0_fallback_${param.name}` : `1_fallback_${param.name}`;
            completions.push(completion);
        }
        return completions;
    }
}
exports.WebOSCompletionProvider = WebOSCompletionProvider;
//# sourceMappingURL=completion-provider.js.map