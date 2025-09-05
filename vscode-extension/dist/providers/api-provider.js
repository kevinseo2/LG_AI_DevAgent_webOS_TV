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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fallback_provider_1 = require("../utils/fallback-provider");
class WebOSAPIProvider {
    constructor(mcpClient) {
        this.mcpClient = mcpClient;
        this.apis = [];
        this.methods = [];
        this.isInitialized = false;
        this.fallbackAPIs = new Map();
        this.isUsingFallback = false;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = '$(rocket) webOS TV (Loading...)';
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
            const apiCount = this.apis.length;
            if (apiCount > 0) {
                this.statusBarItem.text = `$(rocket) webOS TV (${apiCount} APIs)`;
                this.statusBarItem.tooltip = `webOS TV API Assistant - ${apiCount} APIs loaded`;
            }
            else {
                this.statusBarItem.text = '$(rocket) webOS TV (Offline)';
                this.statusBarItem.tooltip = 'webOS TV API Assistant - Using offline completions\nMCP server unavailable - basic functionality available';
            }
            this.isInitialized = true;
            console.log(`API Provider initialized with ${apiCount} APIs`);
        }
        catch (error) {
            console.error('Failed to initialize API provider:', error);
            this.statusBarItem.text = '$(rocket) webOS TV (Limited)';
            this.statusBarItem.tooltip = `webOS TV API Assistant - Limited functionality: ${error}`;
            // Still mark as initialized so fallback completions work
            this.isInitialized = true;
            // Show info message instead of error since extension still works
            vscode.window.showInformationMessage('webOS TV API Assistant started with limited functionality - using fallback completions');
        }
    }
    async loadAPIs() {
        console.log('🔄 Starting API loading with enhanced fallback chain...');
        this.isUsingFallback = false;
        try {
            // 1. Try MCP Server first
            console.log('📡 Attempting to load APIs from MCP server...');
            const response = await this.mcpClient.callTool('webos_list_apis');
            console.log('📡 MCP response received:', response);
            this.apis = this.parseAPIListResponse(response);
            console.log(`📡 Parsed ${this.apis.length} APIs from MCP:`, this.apis);
            if (this.apis.length > 0) {
                console.log(`✅ Successfully loaded ${this.apis.length} APIs from MCP server`);
                this.updateStatusBarSuccess(this.apis.length, 'MCP');
                // Cache frequently used methods for faster completion
                await this.cacheCommonMethods();
                console.log('📋 Common methods cached');
                // Load fallback APIs for emergency use
                await this.loadFallbackAPIs();
                console.log('📦 Fallback APIs loaded for emergency use');
                return;
            }
        }
        catch (mcpError) {
            console.warn('⚠️ MCP server failed:', mcpError);
        }
        try {
            // 2. Try local API files as secondary fallback
            console.log('📁 MCP failed, trying local API files...');
            await this.loadAPIsFromLocalFiles();
            if (this.apis.length > 0) {
                console.log(`✅ Successfully loaded ${this.apis.length} APIs from local files`);
                this.updateStatusBarSuccess(this.apis.length, 'Local Files');
                this.isUsingFallback = true;
                // Load fallback APIs for additional coverage
                await this.loadFallbackAPIs();
                return;
            }
        }
        catch (localError) {
            console.warn('⚠️ Local files also failed:', localError);
        }
        try {
            // 3. Use minimal fallback provider as final safety net
            console.log('📦 Using minimal fallback provider as final safety net...');
            const fallbackAPIs = fallback_provider_1.FallbackProvider.getMinimalAPIList();
            this.apis = fallbackAPIs.map(api => ({
                serviceName: api.serviceName,
                serviceUri: api.serviceUri,
                category: api.category,
                description: api.description,
                status: api.status
            }));
            console.log(`✅ Loaded ${this.apis.length} APIs from minimal fallback provider`);
            this.updateStatusBarFallback(this.apis.length);
            this.isUsingFallback = true;
            // Show fallback notification to user
            fallback_provider_1.FallbackProvider.showFallbackNotification();
        }
        catch (fallbackError) {
            console.error('❌ Even fallback provider failed:', fallbackError);
            // Absolute emergency: provide at least one API
            this.apis = [{
                    serviceName: 'Audio',
                    serviceUri: 'luna://com.webos.service.audio',
                    category: 'media',
                    description: 'Basic audio control (Emergency fallback)',
                    status: 'active'
                }];
            this.updateStatusBarEmergency();
            this.isUsingFallback = true;
            vscode.window.showErrorMessage('webOS TV API Assistant: All data sources failed. Using emergency mode.', 'Retry').then(selection => {
                if (selection === 'Retry') {
                    this.refreshAPIs();
                }
            });
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
    async loadAPIsFromLocalFiles() {
        try {
            const extensionPath = vscode.extensions.getExtension('webos-tv-developer.webos-tv-api-assistant')?.extensionPath;
            if (!extensionPath) {
                throw new Error('Extension path not found');
            }
            const apiIndexPath = path.join(extensionPath, 'mcp-server', 'apis', 'api-index.json');
            console.log('Looking for API index at:', apiIndexPath);
            if (!fs.existsSync(apiIndexPath)) {
                throw new Error(`API index file not found: ${apiIndexPath}`);
            }
            const apiIndexContent = fs.readFileSync(apiIndexPath, 'utf8');
            const apiIndex = JSON.parse(apiIndexContent);
            if (apiIndex.webOSTV_APIs?.apis) {
                this.apis = apiIndex.webOSTV_APIs.apis.map((api) => ({
                    serviceName: api.serviceName,
                    serviceUri: api.serviceUri,
                    category: api.category,
                    description: api.description,
                    status: api.status
                }));
                console.log(`Loaded ${this.apis.length} APIs from local files`);
            }
        }
        catch (error) {
            console.error('Failed to load APIs from local files:', error);
            throw error;
        }
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
        // Safety check for position parameter
        if (!position || typeof position.line !== 'number' || typeof position.character !== 'number') {
            console.warn('⚠️ Invalid cursor position:', position);
            vscode.window.showWarningMessage('Invalid cursor position detected');
            return;
        }
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
        try {
            await this.loadAPIs();
            const apiCount = this.apis.length;
            if (apiCount > 0) {
                this.statusBarItem.text = `$(rocket) webOS TV (${apiCount} APIs)`;
                this.statusBarItem.tooltip = `webOS TV API Assistant - ${apiCount} APIs loaded from MCP server`;
                vscode.window.showInformationMessage(`✅ MCP server connected! Loaded ${apiCount} webOS TV APIs`);
            }
            else {
                this.statusBarItem.text = '$(rocket) webOS TV (Offline)';
                this.statusBarItem.tooltip = 'webOS TV API Assistant - Using offline completions\nMCP server unavailable - basic functionality available';
            }
        }
        catch (error) {
            console.error('Failed to refresh APIs:', error);
            vscode.window.showErrorMessage(`Failed to refresh APIs: ${error}`);
        }
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
    /**
     * 특정 서비스 URI에 대한 메서드 정보를 로컬 API 파일에서 가져오기
     */
    getMethodFromLocalFile(serviceUri, methodName) {
        try {
            const extensionPath = vscode.extensions.getExtension('webos-tv-developer.webos-tv-api-assistant')?.extensionPath;
            if (!extensionPath) {
                return null;
            }
            // API 파일들에서 해당 서비스 URI 찾기
            const apiFiles = [
                'audio-api.json',
                'connection-manager-api.json',
                'database-api.json',
                'device-unique-id-api.json',
                'drm-api.json',
                'keymanager3-api.json',
                'magic-remote-api.json',
                'media-database-api.json',
                'settings-service-api.json',
                'system-service-api.json',
                'tv-device-information-api.json'
            ];
            for (const apiFile of apiFiles) {
                const apiFilePath = path.join(extensionPath, 'mcp-server', 'apis', apiFile);
                if (fs.existsSync(apiFilePath)) {
                    const apiContent = fs.readFileSync(apiFilePath, 'utf8');
                    const apiData = JSON.parse(apiContent);
                    if (apiData.apiInfo?.serviceUri === serviceUri && apiData.methods) {
                        const method = apiData.methods.find((m) => m.name === methodName);
                        if (method) {
                            console.log(`✅ Found method "${methodName}" in local file: ${apiFile}`);
                            return method;
                        }
                    }
                }
            }
            console.log(`❌ Method "${methodName}" not found in local files for URI: ${serviceUri}`);
            return null;
        }
        catch (error) {
            console.error('Error reading local API file:', error);
            return null;
        }
    }
    isReady() {
        // Consider ready if initialized, even with 0 APIs (for fallback completions)
        return this.isInitialized;
    }
    async searchAndGetMethods(serviceName) {
        try {
            console.log('🔍 Searching methods for service:', serviceName);
            // Quick test to see if MCP server is returning any methods at all
            const quickTestResponse = await this.mcpClient.callTool('webos_search_methods', {
                apiName: 'audio', // Try a common service first
                query: '*',
                includeDeprecated: false
            });
            if (quickTestResponse?.content?.[0]?.text) {
                const quickTestMethods = this.parseMethodsResponse(quickTestResponse.content[0].text);
                if (quickTestMethods.length === 0) {
                    console.log('⚠️ MCP server returned 0 methods for audio - likely server issue, skipping MCP search');
                    return [];
                }
                console.log(`✅ MCP server is working (found ${quickTestMethods.length} audio methods), proceeding with search`);
            }
            // Create a comprehensive mapping for service names
            const serviceNameMapping = {
                'Connection Manager': ['connectionmanager', 'connection-manager', 'connection', 'cm'],
                'Activity Manager': ['activitymanager', 'activity-manager', 'activity', 'am', 'palm.activitymanager'],
                'Settings Service': ['settings', 'setting', 'settings-service'],
                'Audio': ['audio', 'audio-service', 'webos.service.audio', 'com.webos.service.audio', 'service.audio'],
                'System Service': ['systemservice', 'system-service', 'system', 'webos.service.systemservice'],
                'Application Manager': ['applicationmanager', 'application-manager', 'app-manager', 'appmanager', 'webos.applicationManager'],
                'BLE GATT': ['ble', 'ble-gatt', 'webos.service.ble', 'com.webos.service.ble'],
                'Database': ['db', 'database', 'webos.service.db', 'com.webos.service.db'],
                'DRM': ['drm', 'webos.service.drm', 'com.webos.service.drm'],
                'Magic Remote': ['magicremote', 'magic-remote', 'webos.service.magicremote'],
                'Media Database': ['mediadb', 'media-database', 'webos.service.mediadb'],
                'TV Device Information': [
                    'tv.systemproperty', 'systemproperty', 'webos.service.tv.systemproperty',
                    'tv-device-information', 'tvdeviceinformation', 'tv_device_information',
                    'device-information', 'deviceinformation', 'device_information',
                    'tv-device', 'tvdevice', 'tv_device', 'tv-info', 'tvinfo', 'tv_info',
                    'system-property', 'systemprop', 'system_property'
                ]
            };
            // Try different variations of the service name
            const baseVariations = [
                serviceName,
                serviceName.toLowerCase(),
                serviceName.replace(/\s+/g, ''),
                serviceName.replace(/\s+/g, '').toLowerCase(),
                serviceName.replace(/\s+/g, '-').toLowerCase()
            ];
            // Add specific mappings if available
            const specificMappings = serviceNameMapping[serviceName] || [];
            const serviceVariations = [...baseVariations, ...specificMappings];
            for (const variation of serviceVariations) {
                console.log(`🔍 Trying service name variation: "${variation}"`);
                const response = await this.mcpClient.callTool('webos_search_methods', {
                    apiName: variation,
                    query: '*', // Get all methods
                    includeDeprecated: false
                });
                if (response?.content?.[0]?.text) {
                    console.log('📋 Raw MCP response for methods:', response.content[0].text);
                    const methods = this.parseMethodsResponse(response.content[0].text);
                    if (methods.length > 0) {
                        console.log(`✅ Found ${methods.length} methods for variation: "${variation}"`);
                        return methods;
                    }
                }
            }
            console.log('❌ No methods found for any service name variation');
            // If no methods found and MCP server seems to be having issues, skip extensive searching
            console.log('❌ No methods found for basic variations, skipping extensive MCP search');
            // Try to get available services from MCP to help with debugging
            try {
                console.log('🔍 Trying to get available services from MCP...');
                const servicesResponse = await this.mcpClient.callTool('webos_list_apis');
                if (servicesResponse?.content?.[0]?.text) {
                    console.log('📋 Available services from MCP:', servicesResponse.content[0].text.substring(0, 500) + '...');
                    // Try to extract URI-based service names first for Audio
                    if (serviceName.toLowerCase() === 'audio') {
                        console.log('🎵 Special handling for Audio service');
                        // Improved regex to extract clean URIs without backticks
                        const audioURIMatches = servicesResponse.content[0].text.match(/luna:\/\/[a-zA-Z0-9.-]+audio[a-zA-Z0-9.-]*/gi);
                        if (audioURIMatches) {
                            console.log('🔗 Found Audio URIs (raw):', audioURIMatches);
                            // Clean URIs by removing backticks and other markdown characters
                            const cleanURIs = audioURIMatches.map((uri) => uri.replace(/[`'"]/g, '').trim());
                            console.log('🧹 Cleaned Audio URIs:', cleanURIs);
                            for (const uri of cleanURIs) {
                                const uriBasedNames = this.extractServiceNameFromURI(uri);
                                console.log(`🎯 Trying URI-based names for Audio: ${uriBasedNames}`);
                                for (const uriName of uriBasedNames) {
                                    console.log(`🔍 Trying URI-based service name: "${uriName}"`);
                                    const response = await this.mcpClient.callTool('webos_search_methods', {
                                        apiName: uriName,
                                        query: '*',
                                        includeDeprecated: false
                                    });
                                    if (response?.content?.[0]?.text) {
                                        const methods = this.parseMethodsResponse(response.content[0].text);
                                        if (methods.length > 0) {
                                            console.log(`✅ Found ${methods.length} methods for URI-based name: "${uriName}"`);
                                            return methods;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Extract service names for debugging only (no extensive testing)
                    const availableServices = this.extractServiceNamesFromListResponse(servicesResponse.content[0].text);
                    console.log('🎯 Available services from MCP:', availableServices.length, 'services found');
                    console.log('📋 Service list:', availableServices.slice(0, 5).join(', '), availableServices.length > 5 ? '...' : '');
                    // Try one closest match only (no extensive scanning)
                    const closestMatch = this.findClosestServiceMatch(serviceName, availableServices);
                    if (closestMatch && closestMatch !== serviceName) {
                        console.log(`🎯 Trying one closest match: "${closestMatch}"`);
                        const response = await this.mcpClient.callTool('webos_search_methods', {
                            apiName: closestMatch,
                            query: '*',
                            includeDeprecated: false
                        });
                        if (response?.content?.[0]?.text) {
                            const methods = this.parseMethodsResponse(response.content[0].text);
                            if (methods.length > 0) {
                                console.log(`✅ Found ${methods.length} methods for closest match: "${closestMatch}"`);
                                return methods;
                            }
                            else {
                                console.log(`❌ Closest match "${closestMatch}" also returned 0 methods - MCP server likely has issues`);
                            }
                        }
                    }
                    else {
                        console.log('❌ No close match found or same as original service name');
                    }
                }
            }
            catch (servicesError) {
                console.warn('⚠️ Failed to get services list from MCP:', servicesError);
            }
        }
        catch (error) {
            console.warn('⚠️ Failed to search methods via MCP:', error);
        }
        return [];
    }
    parseMethodsResponse(text) {
        const methods = [];
        try {
            // Try to parse as JSON first
            const jsonData = JSON.parse(text);
            if (Array.isArray(jsonData)) {
                return jsonData;
            }
            if (jsonData.methods && Array.isArray(jsonData.methods)) {
                return jsonData.methods;
            }
        }
        catch (e) {
            // If not JSON, parse markdown format
            console.log('📝 Parsing methods from markdown format');
            const lines = text.split('\n');
            let currentMethod = {};
            for (const line of lines) {
                if (line.startsWith('**') && line.includes('**')) {
                    // New method entry
                    if (currentMethod.name) {
                        methods.push(currentMethod);
                    }
                    const match = line.match(/\*\*(.*?)\*\*/);
                    if (match) {
                        currentMethod = {
                            name: match[1],
                            deprecated: false
                        };
                    }
                }
                else if (line.startsWith('- Description:')) {
                    currentMethod.description = line.replace('- Description: ', '');
                }
                else if (line.startsWith('- Deprecated:')) {
                    currentMethod.deprecated = line.includes('true');
                }
            }
            // Add the last method
            if (currentMethod.name) {
                methods.push(currentMethod);
            }
        }
        console.log(`📋 Parsed ${methods.length} methods:`, methods);
        return methods;
    }
    extractServiceNamesFromListResponse(text) {
        const serviceNames = [];
        try {
            // Try to parse as JSON first
            const jsonData = JSON.parse(text);
            if (jsonData.webOSTV_APIs?.apis) {
                return jsonData.webOSTV_APIs.apis.map((api) => api.serviceName || api.name);
            }
        }
        catch (e) {
            // If not JSON, parse markdown format
            const lines = text.split('\n');
            for (const line of lines) {
                if (line.startsWith('**') && line.includes('**')) {
                    const match = line.match(/\*\*(.*?)\*\*/);
                    if (match) {
                        serviceNames.push(match[1]);
                    }
                }
            }
        }
        return serviceNames;
    }
    findClosestServiceMatch(targetService, availableServices) {
        const target = targetService.toLowerCase().replace(/\s+/g, '');
        // Exact match first
        for (const service of availableServices) {
            if (service.toLowerCase().replace(/\s+/g, '') === target) {
                return service;
            }
        }
        // Partial match (contains)
        for (const service of availableServices) {
            const serviceNormalized = service.toLowerCase().replace(/\s+/g, '');
            if (serviceNormalized.includes(target) || target.includes(serviceNormalized)) {
                return service;
            }
        }
        // Fuzzy match by checking keywords
        const targetKeywords = targetService.toLowerCase().split(/\s+/);
        for (const service of availableServices) {
            const serviceKeywords = service.toLowerCase().split(/\s+/);
            const intersection = targetKeywords.filter(keyword => serviceKeywords.some(serviceKeyword => serviceKeyword.includes(keyword) || keyword.includes(serviceKeyword)));
            if (intersection.length > 0) {
                return service;
            }
        }
        return null;
    }
    extractServiceNameFromURI(uri) {
        console.log(`🔗 Extracting service name from URI: ${uri}`);
        const variations = [];
        // Extract from luna://com.webos.service.audio -> audio, service.audio, webos.service.audio, com.webos.service.audio
        const uriParts = uri.replace('luna://', '').split('.');
        if (uriParts.length > 0) {
            // Get the last part (e.g., "audio" from "com.webos.service.audio")
            const lastPart = uriParts[uriParts.length - 1];
            variations.push(lastPart);
            // Get combinations like "service.audio"
            if (uriParts.length > 1) {
                variations.push(uriParts.slice(-2).join('.'));
            }
            // Get combinations like "webos.service.audio"
            if (uriParts.length > 2) {
                variations.push(uriParts.slice(-3).join('.'));
            }
            // Get the full service name without luna://
            variations.push(uriParts.join('.'));
        }
        console.log(`📝 Generated URI-based variations: ${variations}`);
        return variations;
    }
    async loadFallbackAPIs() {
        try {
            console.log('🔄 Loading fallback APIs from local files...');
            const extensionPath = this.getExtensionPath();
            if (!extensionPath) {
                console.warn('⚠️ Extension path not found, skipping fallback API loading');
                return;
            }
            const apiDirectory = path.join(extensionPath, 'mcp-server', 'apis');
            console.log(`📁 Looking for API files in: ${apiDirectory}`);
            const apiFiles = [
                'audio-api.json',
                'activity-manager-api.json',
                'application-manager-api.json',
                'connection-manager-api.json',
                'settings-service-api.json',
                'system-service-api.json',
                'tv-device-information-api.json',
                'database-api.json',
                'drm-api.json',
                'ble-gatt-api.json',
                'magic-remote-api.json',
                'media-database-api.json',
                'keymanager3-api.json',
                'device-unique-id-api.json',
                'camera-api.json'
            ];
            for (const fileName of apiFiles) {
                try {
                    const filePath = path.join(apiDirectory, fileName);
                    const fileContent = await new Promise((resolve, reject) => {
                        fs.readFile(filePath, 'utf8', (err, data) => {
                            if (err)
                                reject(err);
                            else
                                resolve(data);
                        });
                    });
                    const apiData = JSON.parse(fileContent);
                    if (apiData.apiInfo && apiData.methods) {
                        const serviceName = apiData.apiInfo.serviceName;
                        this.fallbackAPIs.set(serviceName, apiData);
                        console.log(`✅ Loaded fallback API: ${serviceName} (${apiData.methods.length} methods)`);
                    }
                }
                catch (fileError) {
                    console.warn(`⚠️ Failed to load ${fileName}:`, fileError);
                }
            }
            console.log(`🎯 Loaded ${this.fallbackAPIs.size} fallback APIs`);
        }
        catch (error) {
            console.error('❌ Failed to load fallback APIs:', error);
        }
    }
    getExtensionPath() {
        // Try to get extension path from VS Code context
        const extensions = vscode.extensions.all;
        const thisExtension = extensions.find(ext => ext.id.includes('webos-tv-api-assistant'));
        if (thisExtension) {
            return thisExtension.extensionPath;
        }
        // Fallback: try to determine from current file location
        try {
            const currentPath = __dirname;
            // Navigate up from dist/providers to extension root
            const extensionPath = path.resolve(currentPath, '..', '..');
            return extensionPath;
        }
        catch (error) {
            console.warn('⚠️ Could not determine extension path:', error);
            return undefined;
        }
    }
    getFallbackMethods(serviceName) {
        console.log(`🔍 Getting fallback methods for service: "${serviceName}"`);
        // Try exact match first
        let apiData = this.fallbackAPIs.get(serviceName);
        // If no exact match, try case-insensitive search
        if (!apiData) {
            for (const [key, data] of this.fallbackAPIs.entries()) {
                if (key.toLowerCase() === serviceName.toLowerCase()) {
                    apiData = data;
                    break;
                }
            }
        }
        // Try partial matching
        if (!apiData) {
            for (const [key, data] of this.fallbackAPIs.entries()) {
                if (key.toLowerCase().includes(serviceName.toLowerCase()) ||
                    serviceName.toLowerCase().includes(key.toLowerCase())) {
                    apiData = data;
                    console.log(`🎯 Found partial match: "${key}" for "${serviceName}"`);
                    break;
                }
            }
        }
        if (apiData && apiData.methods) {
            console.log(`✅ Found ${apiData.methods.length} fallback methods for ${serviceName}`);
            return apiData.methods.map((method) => ({
                name: method.name,
                description: method.description || `${method.name} method`,
                deprecated: method.deprecated || false,
                parameters: method.parameters || [],
                returns: method.returns,
                examples: method.examples || []
            }));
        }
        console.log(`❌ No fallback methods found for ${serviceName}`);
        return [];
    }
    getFallbackAPIInfo(serviceName) {
        const apiData = this.fallbackAPIs.get(serviceName);
        return apiData ? apiData.apiInfo : null;
    }
    listFallbackAPIs() {
        return Array.from(this.fallbackAPIs.keys());
    }
    /**
     * 상태바 업데이트 메서드들
     */
    updateStatusBarSuccess(apiCount, source) {
        this.statusBarItem.text = `$(rocket) webOS TV (${apiCount} APIs)`;
        this.statusBarItem.tooltip = `webOS TV API Assistant - ${apiCount} APIs loaded from ${source}`;
        this.statusBarItem.color = undefined; // 기본 색상
    }
    updateStatusBarFallback(apiCount) {
        this.statusBarItem.text = `$(warning) webOS TV (${apiCount} APIs)`;
        this.statusBarItem.tooltip = `webOS TV API Assistant - Fallback mode\n${apiCount} APIs available\nClick to retry full connection`;
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningBackground');
        this.statusBarItem.command = 'webos-api.refreshAPIs';
    }
    updateStatusBarEmergency() {
        this.statusBarItem.text = `$(error) webOS TV (Emergency)`;
        this.statusBarItem.tooltip = `webOS TV API Assistant - Emergency mode\nMinimal functionality only\nClick to retry`;
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorBackground');
        this.statusBarItem.command = 'webos-api.refreshAPIs';
    }
    /**
     * Fallback 모드 확인
     */
    isInFallbackMode() {
        return this.isUsingFallback;
    }
    /**
     * Fallback 메서드 제공 (강화된 버전)
     */
    getFallbackMethodsEnhanced(serviceName) {
        console.log(`🔍 Getting enhanced fallback methods for service: "${serviceName}"`);
        // 1. 기존 파일 기반 fallback 시도
        const fileMethods = this.getFallbackMethods(serviceName);
        if (fileMethods.length > 0) {
            console.log(`✅ Found ${fileMethods.length} file-based methods for ${serviceName}`);
            return fileMethods;
        }
        // 2. 최소 fallback provider 사용
        const minimalMethods = fallback_provider_1.FallbackProvider.getMinimalMethods(serviceName);
        console.log(`📦 Using ${minimalMethods.length} minimal fallback methods for ${serviceName}`);
        return minimalMethods.map((method) => ({
            name: method.name,
            description: method.description + ' (Minimal fallback)',
            deprecated: method.deprecated || false,
            parameters: method.parameters || [],
            returns: undefined,
            examples: []
        }));
    }
}
exports.WebOSAPIProvider = WebOSAPIProvider;
//# sourceMappingURL=api-provider.js.map