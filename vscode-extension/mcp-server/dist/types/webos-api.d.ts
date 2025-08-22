export interface WebOSAPIInfo {
    serviceName: string;
    serviceUri: string;
    category: 'system' | 'media' | 'device' | 'network';
    description: string;
    version: string;
    lastUpdated: string;
    compatibility: {
        webOSTV: Record<string, boolean | string>;
        simulator: boolean | string;
        emulator: Record<string, boolean | string>;
    };
}
export interface WebOSAPIMethod {
    name: string;
    description: string;
    emulatorSupport: boolean;
    deprecated: boolean;
    parameters: WebOSParameter[];
    returns: {
        parameters: WebOSParameter[];
        subscription?: Record<string, any>;
    };
    errors: WebOSError[];
    examples: WebOSExample[];
}
export interface WebOSParameter {
    name: string;
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    defaultValue?: any;
    enum?: any[];
}
export interface WebOSError {
    code: number | string;
    message: string;
    description?: string;
}
export interface WebOSExample {
    title: string;
    code: string;
    language: 'javascript' | 'json';
}
export interface WebOSAPI {
    apiInfo: WebOSAPIInfo;
    methods: WebOSAPIMethod[];
    objects?: WebOSObject[];
    vscodeExtension?: {
        snippets: WebOSSnippet[];
        completionItems?: any[];
        diagnostics?: any[];
    };
}
export interface WebOSObject {
    name: string;
    description: string;
    properties: {
        name: string;
        type: string;
        required: boolean;
        description: string;
    }[];
}
export interface WebOSSnippet {
    prefix: string;
    body: string[];
    description: string;
}
export interface APIListOptions {
    category?: string;
    status?: 'active' | 'deprecated';
    version?: string;
}
export interface APISearchOptions {
    query: string;
    apiName?: string;
    includeDeprecated?: boolean;
}
export interface CodeGenerationOptions {
    serviceName: string;
    methodName: string;
    parameters?: Record<string, any>;
    includeErrorHandling?: boolean;
    codeStyle?: 'callback' | 'async' | 'promise';
}
//# sourceMappingURL=webos-api.d.ts.map