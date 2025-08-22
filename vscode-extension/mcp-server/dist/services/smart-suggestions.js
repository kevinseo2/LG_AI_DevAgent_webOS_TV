export class SmartSuggestionEngine {
    apis;
    usagePatterns = new Map();
    contextualRules = [];
    constructor(apis) {
        this.apis = apis;
        this.initializeContextualRules();
    }
    async generateSuggestions(request) {
        const suggestions = [];
        // Intent-based suggestions
        const intentSuggestions = await this.generateIntentBasedSuggestions(request);
        suggestions.push(...intentSuggestions);
        // Context-aware suggestions
        const contextSuggestions = this.generateContextualSuggestions(request.context);
        suggestions.push(...contextSuggestions);
        // Pattern-based suggestions
        const patternSuggestions = this.generatePatternSuggestions(request.context);
        suggestions.push(...patternSuggestions);
        // Completion-based suggestions
        const completionSuggestions = this.generateCompletionSuggestions(request.context);
        suggestions.push(...completionSuggestions);
        // Sort by priority and relevance
        const sortedSuggestions = this.rankSuggestions(suggestions, request);
        // Limit results
        const maxSuggestions = request.maxSuggestions || 5;
        return sortedSuggestions.slice(0, maxSuggestions);
    }
    async generateIntentBasedSuggestions(request) {
        const intent = request.intent.toLowerCase();
        const suggestions = [];
        // Audio-related intents
        if (intent.includes('volume') || intent.includes('audio') || intent.includes('sound')) {
            suggestions.push({
                type: 'api',
                priority: 'high',
                title: 'Audio Volume Control',
                description: 'Get and control TV volume',
                code: this.generateAudioVolumeCode(request.preferredStyle),
                reasoning: 'Audio service provides comprehensive volume control for webOS TV',
                tags: ['audio', 'volume', 'media'],
                estimatedTime: '2 minutes'
            });
        }
        // Network-related intents
        if (intent.includes('network') || intent.includes('internet') || intent.includes('connection')) {
            suggestions.push({
                type: 'api',
                priority: 'high',
                title: 'Network Status Check',
                description: 'Monitor internet connectivity',
                code: this.generateNetworkStatusCode(request.preferredStyle),
                reasoning: 'Connection Manager helps ensure your app responds appropriately to network changes',
                tags: ['network', 'connectivity', 'status'],
                estimatedTime: '3 minutes'
            });
        }
        // Storage-related intents
        if (intent.includes('save') || intent.includes('store') || intent.includes('data') || intent.includes('database')) {
            suggestions.push({
                type: 'api',
                priority: 'high',
                title: 'Data Storage',
                description: 'Store and retrieve app data',
                code: this.generateDatabaseCode(request.preferredStyle),
                reasoning: 'Database service provides persistent storage for app settings and user data',
                tags: ['storage', 'database', 'persistence'],
                estimatedTime: '5 minutes'
            });
        }
        // Settings-related intents
        if (intent.includes('setting') || intent.includes('config') || intent.includes('preference')) {
            suggestions.push({
                type: 'api',
                priority: 'medium',
                title: 'System Settings Access',
                description: 'Read system configuration',
                code: this.generateSettingsCode(request.preferredStyle),
                reasoning: 'Access system settings to adapt your app to user preferences',
                tags: ['settings', 'system', 'configuration'],
                estimatedTime: '3 minutes'
            });
        }
        // Device info intents
        if (intent.includes('device') || intent.includes('tv') || intent.includes('model') || intent.includes('info')) {
            suggestions.push({
                type: 'api',
                priority: 'medium',
                title: 'Device Information',
                description: 'Get TV model and capabilities',
                code: this.generateDeviceInfoCode(request.preferredStyle),
                reasoning: 'Device info helps optimize your app for specific TV models and capabilities',
                tags: ['device', 'info', 'compatibility'],
                estimatedTime: '2 minutes'
            });
        }
        return suggestions;
    }
    generateContextualSuggestions(context) {
        const suggestions = [];
        // Project type-based suggestions
        if (context.projectType === 'media') {
            suggestions.push({
                type: 'pattern',
                priority: 'high',
                title: 'Media App Pattern',
                description: 'Common pattern for media applications',
                code: this.generateMediaAppPattern(),
                reasoning: 'Media apps typically need volume control, network status, and device capabilities',
                tags: ['media', 'pattern', 'template'],
                estimatedTime: '10 minutes'
            });
        }
        if (context.projectType === 'game') {
            suggestions.push({
                type: 'pattern',
                priority: 'high',
                title: 'Game Input Handling',
                description: 'Magic Remote integration for games',
                code: this.generateGameInputPattern(),
                reasoning: 'Games need responsive input handling and can benefit from Magic Remote sensors',
                tags: ['game', 'input', 'remote'],
                estimatedTime: '15 minutes'
            });
        }
        // Code context suggestions
        if (context.currentCode.includes('onSuccess') && !context.currentCode.includes('onFailure')) {
            suggestions.push({
                type: 'method',
                priority: 'high',
                title: 'Add Error Handling',
                description: 'Complete your API call with error handling',
                code: this.generateErrorHandlingCode(),
                reasoning: 'Proper error handling improves app reliability and user experience',
                tags: ['error-handling', 'reliability'],
                estimatedTime: '1 minute'
            });
        }
        return suggestions;
    }
    generatePatternSuggestions(context) {
        const suggestions = [];
        // Check for incomplete patterns
        if (context.currentCode.includes('webOS.service.request') &&
            !context.currentCode.includes('parameters')) {
            suggestions.push({
                type: 'parameter',
                priority: 'medium',
                title: 'Complete API Parameters',
                description: 'Add parameters to your API call',
                code: 'parameters: {\n    // Add your parameters here\n}',
                reasoning: 'Most webOS TV APIs require specific parameters to function correctly',
                tags: ['parameters', 'completion'],
                estimatedTime: '1 minute'
            });
        }
        // Suggest subscription patterns
        if (context.currentCode.includes('getVolume') ||
            context.currentCode.includes('getStatus')) {
            suggestions.push({
                type: 'pattern',
                priority: 'medium',
                title: 'Add Real-time Updates',
                description: 'Subscribe to live data updates',
                code: 'parameters: {\n    subscribe: true\n}',
                reasoning: 'Subscribing provides real-time updates for dynamic user interfaces',
                tags: ['subscription', 'real-time'],
                estimatedTime: '2 minutes'
            });
        }
        return suggestions;
    }
    generateCompletionSuggestions(context) {
        const suggestions = [];
        // Service URI completion
        if (context.currentCode.includes('luna://') && context.currentCode.includes('webos.service')) {
            const incomplete = context.currentCode.match(/luna:\/\/com\.webos\.service\.(\w*)/);
            if (incomplete) {
                const partial = incomplete[1];
                const matchingAPIs = Array.from(this.apis.values())
                    .filter(api => api.apiInfo.serviceUri.includes(partial))
                    .slice(0, 3);
                matchingAPIs.forEach(api => {
                    suggestions.push({
                        type: 'api',
                        priority: 'high',
                        title: `Complete ${api.apiInfo.serviceName}`,
                        description: api.apiInfo.description,
                        code: `'${api.apiInfo.serviceUri}'`,
                        reasoning: `${api.apiInfo.serviceName} provides ${api.apiInfo.description.toLowerCase()}`,
                        tags: [api.apiInfo.category],
                        estimatedTime: '1 minute'
                    });
                });
            }
        }
        return suggestions;
    }
    rankSuggestions(suggestions, request) {
        return suggestions.sort((a, b) => {
            // Priority weight
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            // Type weight (prefer API > method > parameter > pattern)
            const typeWeight = { api: 4, method: 3, parameter: 2, pattern: 1 };
            const typeDiff = typeWeight[b.type] - typeWeight[a.type];
            if (typeDiff !== 0)
                return typeDiff;
            // Usage pattern weight (prefer commonly used patterns)
            const aUsage = this.usagePatterns.get(a.title) || 0;
            const bUsage = this.usagePatterns.get(b.title) || 0;
            return bUsage - aUsage;
        });
    }
    generateAudioVolumeCode(style) {
        switch (style) {
            case 'async':
                return `async function getVolume() {
    try {
        const response = await new Promise((resolve, reject) => {
            webOS.service.request('luna://com.webos.service.audio', {
                method: 'getVolume',
                parameters: { subscribe: true },
                onSuccess: resolve,
                onFailure: reject
            });
        });
        console.log('Current volume:', response.volume);
        return response;
    } catch (error) {
        console.error('Failed to get volume:', error.errorText);
    }
}`;
            case 'promise':
                return `const getVolume = () => {
    return new Promise((resolve, reject) => {
        webOS.service.request('luna://com.webos.service.audio', {
            method: 'getVolume',
            parameters: { subscribe: true },
            onSuccess: resolve,
            onFailure: reject
        });
    });
};`;
            default:
                return `webOS.service.request('luna://com.webos.service.audio', {
    method: 'getVolume',
    parameters: {
        subscribe: true
    },
    onSuccess: function(response) {
        console.log('Current volume:', response.volume);
        console.log('Muted:', response.muted);
    },
    onFailure: function(error) {
        console.error('Failed to get volume:', error.errorText);
    }
});`;
        }
    }
    generateNetworkStatusCode(style) {
        return `webOS.service.request('luna://com.webos.service.connectionmanager', {
    method: 'getStatus',
    parameters: {
        subscribe: true
    },
    onSuccess: function(response) {
        if (response.isInternetConnectionAvailable) {
            console.log('Internet available via:', response.connectedViaWifi ? 'WiFi' : 'Ethernet');
        } else {
            console.log('No internet connection');
            // Handle offline mode
        }
    },
    onFailure: function(error) {
        console.error('Failed to get connection status:', error.errorText);
    }
});`;
    }
    generateDatabaseCode(style) {
        return `// Store data
webOS.service.request('luna://com.webos.service.db', {
    method: 'put',
    parameters: {
        objects: [{
            _kind: 'com.mycompany.myapp:1',
            userId: 'user123',
            preferences: {
                theme: 'dark',
                language: 'en'
            }
        }]
    },
    onSuccess: function(response) {
        console.log('Data saved:', response.results);
    },
    onFailure: function(error) {
        console.error('Failed to save data:', error.errorText);
    }
});`;
    }
    generateSettingsCode(style) {
        return `webOS.service.request('luna://com.webos.service.settings', {
    method: 'getSystemSettings',
    parameters: {
        keys: ['localeInfo', 'country', 'timezone']
    },
    onSuccess: function(response) {
        const settings = response.settings;
        console.log('Locale:', settings.localeInfo);
        console.log('Country:', settings.country);
        // Adapt your app based on user's region
    },
    onFailure: function(error) {
        console.error('Failed to get settings:', error.errorText);
    }
});`;
    }
    generateDeviceInfoCode(style) {
        return `webOS.service.request('luna://com.webos.service.tv.systemproperty', {
    method: 'getSystemInfo',
    parameters: {
        keys: ['modelName', 'firmwareVersion', 'UHD', 'sdkVersion']
    },
    onSuccess: function(response) {
        console.log('TV Model:', response.modelName);
        console.log('Firmware:', response.firmwareVersion);
        console.log('UHD Support:', response.UHD);
        // Optimize app features based on capabilities
    },
    onFailure: function(error) {
        console.error('Failed to get device info:', error.errorText);
    }
});`;
    }
    generateMediaAppPattern() {
        return `// Media App Initialization Pattern
class MediaApp {
    constructor() {
        this.volume = 50;
        this.isConnected = false;
        this.deviceCapabilities = {};
        
        this.initializeApp();
    }
    
    async initializeApp() {
        // Check device capabilities
        await this.getDeviceInfo();
        
        // Monitor network status
        this.setupNetworkMonitoring();
        
        // Initialize volume control
        this.setupVolumeControl();
        
        console.log('Media app initialized');
    }
    
    getDeviceInfo() {
        return new Promise((resolve) => {
            webOS.service.request('luna://com.webos.service.tv.systemproperty', {
                method: 'getSystemInfo',
                parameters: { keys: ['modelName', 'UHD'] },
                onSuccess: (response) => {
                    this.deviceCapabilities = response;
                    resolve(response);
                }
            });
        });
    }
    
    setupNetworkMonitoring() {
        webOS.service.request('luna://com.webos.service.connectionmanager', {
            method: 'getStatus',
            parameters: { subscribe: true },
            onSuccess: (response) => {
                this.isConnected = response.isInternetConnectionAvailable;
                this.onNetworkStatusChange(this.isConnected);
            }
        });
    }
    
    setupVolumeControl() {
        webOS.service.request('luna://com.webos.service.audio', {
            method: 'getVolume',
            parameters: { subscribe: true },
            onSuccess: (response) => {
                this.volume = response.volume;
                this.onVolumeChange(this.volume);
            }
        });
    }
    
    onNetworkStatusChange(connected) {
        // Handle network changes
        console.log('Network status:', connected ? 'Connected' : 'Disconnected');
    }
    
    onVolumeChange(volume) {
        // Handle volume changes
        console.log('Volume changed to:', volume);
    }
}

// Initialize the app
const app = new MediaApp();`;
    }
    generateGameInputPattern() {
        return `// Game Input Handling Pattern
class GameInputHandler {
    constructor() {
        this.setupMagicRemote();
        this.setupKeyHandlers();
    }
    
    setupMagicRemote() {
        // Get sensor data for motion controls
        webOS.service.request('luna://com.webos.service.magicremote', {
            method: 'getSensorData',
            parameters: { subscribe: true },
            onSuccess: (response) => {
                this.handleMotionInput(response);
            }
        });
        
        // Monitor pointer state
        webOS.service.request('luna://com.webos.service.magicremote', {
            method: 'getPointerState',
            parameters: { subscribe: true },
            onSuccess: (response) => {
                this.handlePointerState(response.pointerVisible);
            }
        });
    }
    
    setupKeyHandlers() {
        document.addEventListener('keydown', (event) => {
            switch(event.keyCode) {
                case 13: // Enter/OK
                    this.onSelectPressed();
                    break;
                case 37: // Left
                    this.onDirectionPressed('left');
                    break;
                case 39: // Right
                    this.onDirectionPressed('right');
                    break;
                case 38: // Up
                    this.onDirectionPressed('up');
                    break;
                case 40: // Down
                    this.onDirectionPressed('down');
                    break;
            }
        });
    }
    
    handleMotionInput(sensorData) {
        // Process gyroscope and accelerometer data
        if (sensorData.gyroscope) {
            const { x, y, z } = sensorData.gyroscope;
            // Use motion data for game controls
        }
    }
    
    handlePointerState(visible) {
        // Show/hide cursor based on pointer state
        document.body.style.cursor = visible ? 'default' : 'none';
    }
    
    onSelectPressed() {
        // Handle select/OK button
        console.log('Select pressed');
    }
    
    onDirectionPressed(direction) {
        // Handle directional input
        console.log('Direction pressed:', direction);
    }
}`;
    }
    generateErrorHandlingCode() {
        return `,
    onFailure: function(error) {
        console.error('API call failed:', error.errorText);
        // Handle the error appropriately
        // Show user-friendly message or fallback behavior
    }`;
    }
    initializeContextualRules() {
        // Initialize rules for contextual suggestions
        // This would be expanded based on usage analytics
    }
    trackUsage(suggestionTitle) {
        const current = this.usagePatterns.get(suggestionTitle) || 0;
        this.usagePatterns.set(suggestionTitle, current + 1);
    }
}
//# sourceMappingURL=smart-suggestions.js.map