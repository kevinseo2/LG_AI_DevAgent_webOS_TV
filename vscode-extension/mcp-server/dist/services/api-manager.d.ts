import type { WebOSAPI, APIListOptions, APISearchOptions, CodeGenerationOptions, WebOSSnippet } from '../types/webos-api.js';
export declare class APIManager {
    private apis;
    private apiIndex;
    private initialized;
    initialize(): Promise<void>;
    listAPIs(options?: APIListOptions): Promise<any[]>;
    getAPIInfo(serviceName: string, includeExamples?: boolean, includeCompatibility?: boolean): Promise<WebOSAPI | null>;
    searchMethods(options: APISearchOptions): Promise<any[]>;
    generateCode(options: CodeGenerationOptions): Promise<string>;
    getSnippets(apiName?: string, methodName?: string, format?: string): Promise<WebOSSnippet[]>;
    private getDefaultValueForType;
    private generateCodeByStyle;
    private generateCallbackCode;
    private generateAsyncCode;
    private generatePromiseCode;
}
//# sourceMappingURL=api-manager.d.ts.map