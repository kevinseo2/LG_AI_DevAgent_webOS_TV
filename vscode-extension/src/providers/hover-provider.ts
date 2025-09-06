import * as vscode from 'vscode';
import { WebOSAPIProvider } from './api-provider';
import { URINormalizer } from '../utils/uri-normalizer';

export class WebOSHoverProvider implements vscode.HoverProvider {
    constructor(private apiProvider: WebOSAPIProvider) {}

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        // Safety check for position parameter
        if (!position || typeof position.line !== 'number' || typeof position.character !== 'number') {
            console.warn('⚠️ Invalid position parameter in hover provider:', position);
            return undefined;
        }

        // Safety check for document bounds
        if (position.line >= document.lineCount || position.line < 0) {
            console.warn('⚠️ Position line out of bounds in hover provider:', position.line, 'document lines:', document.lineCount);
            return undefined;
        }

        // Check for cancellation
        if (token.isCancellationRequested) {
            console.log('🚫 Hover request cancelled');
            return undefined;
        }

        const line = document.lineAt(position.line).text;
        console.log(`🔍 Hover at position (${position.line}, ${position.character}): "${line}"`);

        // Check if hovering over a complete Luna service URI
        const fullURI = this.extractFullURIFromLine(line, position.character);
        if (fullURI) {
            console.log(`🎯 Found full URI: "${fullURI}"`);
            return this.createServiceURIHover(fullURI);
        }

        // Check if hovering over a method name in webOS service call
        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange) {
            const word = document.getText(wordRange);
            console.log(`📝 Word under cursor: "${word}"`);
            
            if (this.isMethodName(word, line)) {
                console.log(`🎯 Detected method name: "${word}"`);
                return this.createMethodHoverWithTimeout(word, line, token);
            }

            // Check if hovering over webOS.service.request
            if (word === 'webOS' || word === 'service' || word === 'request') {
                if (line.includes('webOS.service.request')) {
                    console.log('🎯 Detected webOS.service.request');
                    return this.createWebOSServiceHover();
                }
            }
        }

        return undefined;
    }

    private extractFullURIFromLine(line: string, character: number): string | null {
        // Extract complete luna:// URI from the line
        const uriMatch = line.match(/luna:\/\/[a-zA-Z0-9.-]+/g);
        if (!uriMatch) return null;

        // Find which URI the cursor is positioned over
        for (const uri of uriMatch) {
            const startIndex = line.indexOf(uri);
            const endIndex = startIndex + uri.length;
            
            if (character >= startIndex && character <= endIndex) {
                console.log(`🎯 Cursor is over URI: "${uri}" (position ${character} between ${startIndex}-${endIndex})`);
                return uri;
            }
        }

        return null;
    }

    private isMethodName(word: string, line: string): boolean {
        // Check if the word is in method context and properly quoted
        const hasMethodContext = line.includes('method:');
        const isQuoted = line.includes(`'${word}'`) || line.includes(`"${word}"`);
        
        console.log(`🔍 Method check for "${word}": hasMethodContext=${hasMethodContext}, isQuoted=${isQuoted}`);
        return hasMethodContext && isQuoted;
    }

    private createServiceURIHover(serviceURI: string): vscode.Hover {
        console.log(`🔍 Looking for API info for URI: "${serviceURI}"`);
        
        // URI 정규화 적용
        const normalizedURI = URINormalizer.normalizeURI(serviceURI) || serviceURI;
        console.log(`🔄 Normalized URI: "${serviceURI}" → "${normalizedURI}"`);
        
        const apis = this.apiProvider.getAPIs();
        console.log(`📋 Available APIs: ${apis.map(a => a.serviceUri).join(', ')}`);
        
        // Try exact match with normalized URI first
        let api = apis.find(a => {
            const apiNormalizedUri = URINormalizer.normalizeURI(a.serviceUri) || a.serviceUri;
            return apiNormalizedUri === normalizedURI;
        });
        
        // If no exact match, try with original URI
        if (!api) {
            api = apis.find(a => a.serviceUri === serviceURI);
        }
        
        // If still no match, try partial matching
        if (!api) {
            api = apis.find(a => {
                const apiNormalizedUri = URINormalizer.normalizeURI(a.serviceUri) || a.serviceUri;
                return apiNormalizedUri.includes(normalizedURI) || normalizedURI.includes(apiNormalizedUri);
            });
        }
        
        console.log(`🎯 Found API: ${api ? api.serviceName : 'none'}`);

        if (api) {
            const markdown = new vscode.MarkdownString();
            markdown.isTrusted = true;
            markdown.supportHtml = true;

            markdown.appendMarkdown(`### ${api.serviceName}\n\n`);
            
            // 정규화된 URI 정보 표시
            if (normalizedURI !== serviceURI) {
                markdown.appendMarkdown(`**Standard URI:** \`${normalizedURI}\`\n\n`);
                markdown.appendMarkdown(`**Original URI:** \`${serviceURI}\`\n\n`);
                markdown.appendMarkdown(`🔄 **Note:** URI has been normalized to standard format\n\n`);
            } else {
                markdown.appendMarkdown(`**Service URI:** \`${api.serviceUri}\`\n\n`);
            }
            
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
        
        console.log(`🔍 Creating method hover for: "${methodName}" in line: "${line}"`);
        
        // Extract service URI from the line
        const serviceMatch = line.match(/luna:\/\/[^'"]+/);
        if (serviceMatch) {
            const serviceURI = serviceMatch[0];
            console.log(`🔗 Extracted service URI: "${serviceURI}"`);
            
            const apis = this.apiProvider.getAPIs();
            let api = apis.find(a => a.serviceUri === serviceURI);
            
            if (api) {
                console.log(`🎯 Found API: ${api.serviceName}`);
                const methodInfo = this.getMethodInfo(api.serviceName, methodName);
                
                markdown.appendMarkdown(`### ${api.serviceName}.${methodName}\n\n`);
                
                if (methodInfo) {
                    console.log(`✅ Found method info for ${methodName}`);
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
                    console.log(`❌ No method info found for ${methodName} in ${api.serviceName}`);
                    markdown.appendMarkdown(`Method in ${api.serviceName}\n\n`);
                }
                
                markdown.appendMarkdown(`[📖 ${api.serviceName} Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);
            } else {
                console.log(`❌ No API found for URI: ${serviceURI}`);
                // Fallback for unrecognized service
                markdown.appendMarkdown(`### ${methodName}\n\n`);
                markdown.appendMarkdown(`Method in Luna Service: \`${serviceURI}\`\n\n`);
            }
        } else {
            console.log(`❌ No service URI found in line`);
        }

        return new vscode.Hover(markdown);
    }

    private async createMethodHoverWithTimeout(
        methodName: string, 
        line: string, 
        token: vscode.CancellationToken
    ): Promise<vscode.Hover> {
        console.log(`⏱️ Creating method hover with timeout for: "${methodName}"`);
        
        // Create a timeout promise
        const timeoutPromise = new Promise<vscode.Hover>((_, reject) => {
            setTimeout(() => {
                reject(new Error('Hover request timeout'));
            }, 2000); // 2초 타임아웃
        });

        // Create the actual hover promise
        const hoverPromise = this.createMethodHoverAsync(methodName, line, token);

        try {
            // Race between timeout and actual hover
            const result = await Promise.race([hoverPromise, timeoutPromise]);
            console.log(`✅ Method hover completed successfully for: "${methodName}"`);
            return result;
        } catch (error) {
            console.warn(`⚠️ Method hover failed or timed out for: "${methodName}", using fallback`);
            
            // Return fallback hover immediately
            return this.createFallbackMethodHover(methodName, line);
        }
    }

    private async createMethodHoverAsync(
        methodName: string, 
        line: string, 
        token?: vscode.CancellationToken
    ): Promise<vscode.Hover> {
        const markdown = new vscode.MarkdownString();
        
        console.log(`🔍 Creating async method hover for: "${methodName}" in line: "${line}"`);
        
        // Check for cancellation before starting
        if (token?.isCancellationRequested) {
            console.log('🚫 Method hover cancelled before processing');
            throw new Error('Hover request cancelled');
        }
        
        // Extract service URI from the line
        const serviceMatch = line.match(/luna:\/\/[^'"]+/);
        if (serviceMatch) {
            const serviceURI = serviceMatch[0];
            console.log(`🔗 Extracted service URI: "${serviceURI}"`);
            
            const apis = this.apiProvider.getAPIs();
            let api = apis.find(a => a.serviceUri === serviceURI);
            
            if (api) {
                console.log(`🎯 Found API: ${api.serviceName}`);
                
                // Show loading state
                markdown.appendMarkdown(`### ${api.serviceName}.${methodName}\n\n`);
                markdown.appendMarkdown(`⏳ Loading method information...\n\n`);
                
                // Try to get method info from MCP first (with cancellation support)
                let methodInfo: any = null;
                try {
                    if (!token?.isCancellationRequested) {
                        console.log(`🔄 Attempting to get method info from MCP...`);
                        methodInfo = await this.getMethodInfoFromMCPWithTimeout(api.serviceName, methodName, token);
                    }
                } catch (error) {
                    console.log(`⚠️ MCP method info failed: ${error}`);
                }
                
                // Check for cancellation after MCP call
                if (token?.isCancellationRequested) {
                    console.log('🚫 Method hover cancelled after MCP call');
                    throw new Error('Hover request cancelled');
                }
                
                // Fallback to file-based info if MCP fails
                if (!methodInfo) {
                    console.log(`🔄 Falling back to file-based method info...`);
                    methodInfo = this.getMethodInfoFromFile(api.serviceName, methodName);
                }
                
                // Final fallback to hardcoded info
                if (!methodInfo) {
                    console.log(`🔄 Using hardcoded method info...`);
                    methodInfo = this.getMethodInfo(api.serviceName, methodName);
                }
                
                markdown.appendMarkdown(`### ${api.serviceName}.${methodName}\n\n`);
                
                if (methodInfo) {
                    console.log(`✅ Found method info for ${methodName}`);
                    markdown.appendMarkdown(`${methodInfo.description}\n\n`);
                    
                    if (methodInfo.deprecated) {
                        markdown.appendMarkdown(`⚠️ **DEPRECATED** - This method is deprecated\n\n`);
                    }
                    
                    if (methodInfo.parameters && methodInfo.parameters.length > 0) {
                        markdown.appendMarkdown(`**Parameters:**\n`);
                        for (const param of methodInfo.parameters) {
                            const required = param.required ? '**required**' : '*optional*';
                            const paramType = param.type || 'any';
                            const paramDesc = param.description || 'No description available';
                            markdown.appendMarkdown(`- \`${param.name}\` (${paramType}) - ${required} - ${paramDesc}\n`);
                        }
                        markdown.appendMarkdown(`\n`);
                    }
                    
                    if (methodInfo.returnValue) {
                        markdown.appendMarkdown(`**Returns:** ${methodInfo.returnValue}\n\n`);
                    }
                    
                    if (methodInfo.example) {
                        markdown.appendMarkdown(`**Example:**\n`);
                        markdown.appendCodeblock(methodInfo.example, 'javascript');
                        markdown.appendMarkdown(`\n`);
                    }
                } else {
                    console.log(`❌ No method info found for ${methodName} in ${api.serviceName}`);
                    markdown.appendMarkdown(`Method in ${api.serviceName}\n\n`);
                    markdown.appendMarkdown(`More information available from [webOS TV API Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);
                }
                
                markdown.appendMarkdown(`[📖 ${api.serviceName} Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);
            } else {
                console.log(`❌ No API found for URI: ${serviceURI}`);
                // Enhanced fallback for unrecognized service
                markdown.appendMarkdown(`### ${methodName}\n\n`);
                markdown.appendMarkdown(`Method in Luna Service: \`${serviceURI}\`\n\n`);
                markdown.appendMarkdown(`**Usage:**\n`);
                markdown.appendCodeblock(this.generateExampleCode('Unknown Service', methodName, serviceURI), 'javascript');
                markdown.appendMarkdown(`\n[📖 webOS TV API Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);
            }
        } else {
            console.log(`❌ No service URI found in line`);
            // Generic method information
            markdown.appendMarkdown(`### ${methodName}\n\n`);
            markdown.appendMarkdown(`webOS TV Luna Service method\n\n`);
            markdown.appendMarkdown(`[📖 webOS TV API Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);
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
        markdown.appendMarkdown(`- \`uri\` (string) - Luna service URI (e.g., "luna://com.webos.audio")\n`);
        markdown.appendMarkdown(`- \`options\` (object) - Request options:\n`);
        markdown.appendMarkdown(`  - \`method\` (string) - Method name to call\n`);
        markdown.appendMarkdown(`  - \`parameters\` (object) - Method parameters\n`);
        markdown.appendMarkdown(`  - \`onSuccess\` (function) - Success callback\n`);
        markdown.appendMarkdown(`  - \`onFailure\` (function) - Error callback\n`);
        markdown.appendMarkdown(`  - \`subscribe\` (boolean) - Whether to subscribe for updates\n\n`);
        
        markdown.appendMarkdown(`**Example:**\n`);
        markdown.appendCodeblock(`webOS.service.request('luna://com.webos.audio', {
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

    private async getMethodInfoFromMCPWithTimeout(
        serviceName: string, 
        methodName: string, 
        token?: vscode.CancellationToken
    ): Promise<any> {
        try {
            console.log(`🔍 Getting method info from MCP for ${serviceName}.${methodName}`);
            
            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error('MCP request timeout'));
                }, 1500); // 1.5초 타임아웃
            });

            // Create MCP request promise
            const mcpPromise = this.apiProvider.searchAndGetMethods(serviceName);
            
            // Race between timeout and MCP request
            const response = await Promise.race([mcpPromise, timeoutPromise]);
            
            // Check for cancellation
            if (token?.isCancellationRequested) {
                throw new Error('MCP request cancelled');
            }
            
            if (response && response.length > 0) {
                const method = response.find((m: any) => m.name === methodName);
                if (method) {
                    console.log(`✅ Found method info from MCP:`, method);
                    return {
                        description: method.description || `${methodName} method from ${serviceName}`,
                        deprecated: method.deprecated || false,
                        parameters: method.parameters || [],
                        example: method.example || this.generateExampleCode(serviceName, methodName)
                    };
                }
            }
            
            console.log(`⚠️ Method ${methodName} not found in MCP, using fallback`);
            return this.getFallbackMethodInfo(serviceName, methodName);
            
        } catch (error) {
            console.warn(`❌ Failed to get method info from MCP:`, error);
            return this.getFallbackMethodInfo(serviceName, methodName);
        }
    }

    private async getMethodInfoFromMCP(serviceName: string, methodName: string): Promise<any> {
        // Legacy method for backward compatibility
        return this.getMethodInfoFromMCPWithTimeout(serviceName, methodName);
    }

    private getMethodInfo(serviceName: string, methodName: string): any {
        // Legacy synchronous method for compatibility
        // In practice, this should be replaced with async calls
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
                    example: `webOS.service.request('luna://com.webos.audio', {
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
            },
            'TV Device Information': {
                'getSystemInfo': {
                    description: 'TV 시스템 정보를 조회합니다. modelName, firmwareVersion, UHD 지원 여부 등을 확인할 수 있습니다.',
                    deprecated: false,
                    parameters: [
                        {
                            name: 'keys',
                            type: 'array',
                            required: true,
                            description: '조회할 시스템 정보 키 목록 (예: ["modelName", "firmwareVersion", "UHD"])'
                        }
                    ],
                    example: `webOS.service.request('luna://com.webos.service.tv.systemproperty', {
    method: 'getSystemInfo',
    parameters: {
        keys: ['modelName', 'firmwareVersion', 'UHD']
    },
    onSuccess: function(response) {
        console.log('Model:', response.modelName);
        console.log('Firmware:', response.firmwareVersion);
        console.log('UHD Support:', response.UHD);
    },
    onFailure: function(error) {
        console.error('Error:', error.errorText);
    }
});`
                },
                'getSystemProperty': {
                    description: '특정 시스템 속성 값을 조회합니다.',
                    deprecated: false,
                    parameters: [
                        {
                            name: 'key',
                            type: 'string',
                            required: true,
                            description: '조회할 시스템 속성 키'
                        }
                    ]
                }
            }
        };

        return methodDatabase[serviceName]?.[methodName];
    }

    private getFallbackMethodInfo(serviceName: string, methodName: string): any {
        // Enhanced fallback with common webOS TV patterns
        const commonPatterns: Record<string, any> = {
            'get': {
                description: `Retrieves ${methodName.replace('get', '').toLowerCase()} information`,
                parameters: [
                    {
                        name: 'subscribe',
                        type: 'boolean',
                        required: false,
                        description: 'Subscribe for continuous updates'
                    }
                ]
            },
            'set': {
                description: `Sets ${methodName.replace('set', '').toLowerCase()} configuration`,
                parameters: []
            },
            'create': {
                description: `Creates a new ${methodName.replace('create', '').toLowerCase()}`,
                parameters: []
            },
            'delete': {
                description: `Deletes ${methodName.replace('delete', '').toLowerCase()}`,
                parameters: []
            }
        };

        const methodPrefix = Object.keys(commonPatterns).find(prefix => 
            methodName.toLowerCase().startsWith(prefix)
        );

        const baseInfo = methodPrefix ? commonPatterns[methodPrefix] : {
            description: `${methodName} method from ${serviceName}`,
            parameters: []
        };

        return {
            ...baseInfo,
            deprecated: false,
            example: this.generateExampleCode(serviceName, methodName)
        };
    }

    private generateExampleCode(serviceName: string, methodName: string, serviceURI?: string): string {
        const uri = serviceURI || this.getServiceURIFromName(serviceName);
        
        const hasParameters = methodName.toLowerCase().startsWith('set') || 
                            methodName.toLowerCase().includes('create') ||
                            methodName.toLowerCase().includes('config');

        const exampleParams = hasParameters ? `
        parameters: {
            // Add required parameters here
        },` : `
        parameters: {},`;

        return `webOS.service.request('${uri}', {
    method: '${methodName}',${exampleParams}
    onSuccess: function(response) {
        console.log('Success:', response);
    },
    onFailure: function(error) {
        console.error('Error:', error.errorText);
    }
});`;
    }

    private getServiceURIFromName(serviceName: string): string {
        // URI 정규화를 통한 표준 URI 추출
        const standardUri = URINormalizer.getStandardURIFromServiceName(serviceName);
        return standardUri || 'luna://com.webos.service.unknown';
    }

    private getMethodInfoFromFile(serviceName: string, methodName: string): any | null {
        console.log(`🔍 Getting method info from file for ${serviceName}.${methodName}`);
        
        const fallbackMethods = this.apiProvider.getFallbackMethods(serviceName);
        
        if (fallbackMethods.length > 0) {
            const method = fallbackMethods.find(m => m.name === methodName);
            if (method) {
                console.log(`✅ Found file-based method info for ${methodName}`);
                
                // Convert file format to hover format
                return {
                    description: method.description || `${methodName} method from ${serviceName}`,
                    deprecated: method.deprecated || false,
                    parameters: method.parameters || [],
                    returnValue: method.returns ? this.formatReturnValue(method.returns) : undefined,
                    example: method.examples && method.examples.length > 0 ? 
                            method.examples[0].code : 
                            this.generateExampleCode(serviceName, methodName)
                };
            }
        }
        
        console.log(`❌ No file-based method info found for ${methodName} in ${serviceName}`);
        return null;
    }

    private formatReturnValue(returns: any): string {
        if (!returns || !returns.parameters) {
            return 'Object';
        }
        
        const returnParams = returns.parameters.map((param: any) => {
            const required = param.required ? '' : '?';
            return `${param.name}${required}: ${param.type}`;
        }).join(', ');
        
        return `{ ${returnParams} }`;
    }

    private createFallbackMethodHover(methodName: string, line: string): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        
        console.log(`🔄 Creating fallback method hover for: "${methodName}"`);
        
        // Extract service URI from the line
        const serviceMatch = line.match(/luna:\/\/[^'"]+/);
        if (serviceMatch) {
            const serviceURI = serviceMatch[0];
            const serviceName = this.getServiceNameFromURI(serviceURI);
            
            markdown.appendMarkdown(`### ${serviceName}.${methodName}\n\n`);
            markdown.appendMarkdown(`⚠️ **Limited Information Available**\n\n`);
            markdown.appendMarkdown(`Method in Luna Service: \`${serviceURI}\`\n\n`);
            
            // Provide basic usage information
            markdown.appendMarkdown(`**Basic Usage:**\n`);
            markdown.appendCodeblock(this.generateExampleCode(serviceName, methodName, serviceURI), 'javascript');
            
            markdown.appendMarkdown(`\n💡 **Tip:** For detailed information, check the [webOS TV API Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);
        } else {
            markdown.appendMarkdown(`### ${methodName}\n\n`);
            markdown.appendMarkdown(`webOS TV Luna Service method\n\n`);
            markdown.appendMarkdown(`⚠️ **Limited Information Available**\n\n`);
            markdown.appendMarkdown(`[📖 webOS TV API Documentation](https://webostv.developer.lge.com/develop/references/)\n\n`);
        }

        return new vscode.Hover(markdown);
    }

    private getServiceNameFromURI(serviceURI: string): string {
        // Extract service name from URI
        const match = serviceURI.match(/luna:\/\/[^.]*\.([^.]+)/);
        if (match) {
            return match[1].charAt(0).toUpperCase() + match[1].slice(1);
        }
        return 'Unknown Service';
    }
}
