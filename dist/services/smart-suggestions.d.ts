import type { WebOSAPI } from '../types/webos-api.js';
export interface SmartSuggestion {
    type: 'api' | 'method' | 'parameter' | 'pattern';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    code: string;
    reasoning: string;
    tags: string[];
    estimatedTime: string;
}
export interface ContextInfo {
    projectType?: 'media' | 'game' | 'utility' | 'smart-home';
    currentCode: string;
    cursorPosition: number;
    fileName: string;
    existingAPIs: string[];
    userIntent?: string;
}
export interface SuggestionRequest {
    context: ContextInfo;
    intent: string;
    maxSuggestions?: number;
    preferredStyle?: 'callback' | 'async' | 'promise';
}
export declare class SmartSuggestionEngine {
    private apis;
    private usagePatterns;
    private contextualRules;
    constructor(apis: Map<string, WebOSAPI>);
    generateSuggestions(request: SuggestionRequest): Promise<SmartSuggestion[]>;
    private generateIntentBasedSuggestions;
    private generateContextualSuggestions;
    private generatePatternSuggestions;
    private generateCompletionSuggestions;
    private rankSuggestions;
    private generateAudioVolumeCode;
    private generateNetworkStatusCode;
    private generateDatabaseCode;
    private generateSettingsCode;
    private generateDeviceInfoCode;
    private generateMediaAppPattern;
    private generateGameInputPattern;
    private generateErrorHandlingCode;
    private initializeContextualRules;
    trackUsage(suggestionTitle: string): void;
}
//# sourceMappingURL=smart-suggestions.d.ts.map