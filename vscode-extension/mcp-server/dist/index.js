#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { APIManager } from './services/api-manager.js';
import { CodeAnalyzer } from './services/code-analyzer.js';
import { APIUpdater } from './services/api-updater.js';
import { SmartSuggestionEngine } from './services/smart-suggestions.js';
// Initialize services
const apiManager = new APIManager();
let codeAnalyzer;
let apiUpdater;
let smartSuggestions;
// Define tool schemas
const ListAPIsSchema = z.object({
    category: z.enum(['system', 'media', 'device', 'network']).optional(),
    status: z.enum(['active', 'deprecated']).optional(),
    version: z.string().optional()
});
const GetAPIInfoSchema = z.object({
    serviceName: z.string(),
    includeExamples: z.boolean().optional().default(true),
    includeCompatibility: z.boolean().optional().default(true)
});
const SearchMethodsSchema = z.object({
    query: z.string(),
    apiName: z.string().optional(),
    includeDeprecated: z.boolean().optional().default(false)
});
const GenerateCodeSchema = z.object({
    serviceName: z.string(),
    methodName: z.string(),
    parameters: z.record(z.any()).optional(),
    includeErrorHandling: z.boolean().optional().default(true),
    codeStyle: z.enum(['callback', 'async', 'promise']).optional().default('callback')
});
const GetSnippetsSchema = z.object({
    apiName: z.string().optional(),
    methodName: z.string().optional(),
    format: z.enum(['vscode', 'raw']).optional().default('vscode')
});
const AnalyzeCodeSchema = z.object({
    code: z.string(),
    fileName: z.string().optional().default('unknown.js'),
    targetVersion: z.string().optional().default('6.x')
});
const AnalyzeProjectSchema = z.object({
    projectPath: z.string(),
    targetVersion: z.string().optional().default('6.x')
});
const CheckUpdatesSchema = z.object({
    forceCheck: z.boolean().optional().default(false)
});
const SmartSuggestSchema = z.object({
    intent: z.string(),
    context: z.object({
        projectType: z.enum(['media', 'game', 'utility', 'smart-home']).optional(),
        currentCode: z.string().optional().default(''),
        fileName: z.string().optional().default('unknown.js'),
        existingAPIs: z.array(z.string()).optional().default([])
    }),
    maxSuggestions: z.number().optional().default(5),
    preferredStyle: z.enum(['callback', 'async', 'promise']).optional().default('callback')
});
// Tool definitions
const tools = [
    {
        name: 'webos_list_apis',
        description: 'webOS TV의 모든 Luna Service API 목록을 조회합니다',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: ['system', 'media', 'device', 'network'],
                    description: 'API 카테고리로 필터링'
                },
                status: {
                    type: 'string',
                    enum: ['active', 'deprecated'],
                    description: 'API 상태로 필터링'
                },
                version: {
                    type: 'string',
                    description: 'webOS TV 버전으로 필터링 (예: "6.x", "24")'
                }
            }
        }
    },
    {
        name: 'webos_get_api_info',
        description: '특정 webOS TV API의 상세 정보를 조회합니다',
        inputSchema: {
            type: 'object',
            properties: {
                serviceName: {
                    type: 'string',
                    description: 'API 서비스명 (예: "Activity Manager")'
                },
                includeExamples: {
                    type: 'boolean',
                    description: '예제 코드 포함 여부',
                    default: true
                },
                includeCompatibility: {
                    type: 'boolean',
                    description: '호환성 정보 포함 여부',
                    default: true
                }
            },
            required: ['serviceName']
        }
    },
    {
        name: 'webos_search_methods',
        description: '메서드명이나 기능으로 API 메서드를 검색합니다',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: '검색어 (메서드명이나 기능 설명)'
                },
                apiName: {
                    type: 'string',
                    description: '특정 API로 검색 범위 제한'
                },
                includeDeprecated: {
                    type: 'boolean',
                    description: 'deprecated 메서드 포함 여부',
                    default: false
                }
            },
            required: ['query']
        }
    },
    {
        name: 'webos_generate_code',
        description: 'webOS TV API 호출을 위한 JavaScript 코드를 생성합니다',
        inputSchema: {
            type: 'object',
            properties: {
                serviceName: {
                    type: 'string',
                    description: 'API 서비스명'
                },
                methodName: {
                    type: 'string',
                    description: '호출할 메서드명'
                },
                parameters: {
                    type: 'object',
                    description: '메서드 파라미터'
                },
                includeErrorHandling: {
                    type: 'boolean',
                    description: '에러 처리 코드 포함 여부',
                    default: true
                },
                codeStyle: {
                    type: 'string',
                    enum: ['callback', 'async', 'promise'],
                    description: '코드 스타일',
                    default: 'callback'
                }
            },
            required: ['serviceName', 'methodName']
        }
    },
    {
        name: 'webos_get_snippets',
        description: 'VS Code용 webOS TV API 스니펫을 조회합니다',
        inputSchema: {
            type: 'object',
            properties: {
                apiName: {
                    type: 'string',
                    description: '특정 API의 스니펫만 조회'
                },
                methodName: {
                    type: 'string',
                    description: '특정 메서드의 스니펫만 조회'
                },
                format: {
                    type: 'string',
                    enum: ['vscode', 'raw'],
                    description: '출력 형식',
                    default: 'vscode'
                }
            }
        }
    },
    {
        name: 'webos_analyze_code',
        description: 'webOS TV API 사용 코드를 분석하고 검증합니다',
        inputSchema: {
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: '분석할 JavaScript/TypeScript 코드'
                },
                fileName: {
                    type: 'string',
                    description: '파일명 (선택사항)',
                    default: 'unknown.js'
                },
                targetVersion: {
                    type: 'string',
                    description: '타겟 webOS TV 버전',
                    default: '6.x'
                }
            },
            required: ['code']
        }
    },
    {
        name: 'webos_analyze_project',
        description: 'webOS TV 프로젝트 전체를 분석하고 검증합니다',
        inputSchema: {
            type: 'object',
            properties: {
                projectPath: {
                    type: 'string',
                    description: '프로젝트 디렉터리 경로'
                },
                targetVersion: {
                    type: 'string',
                    description: '타겟 webOS TV 버전',
                    default: '6.x'
                }
            },
            required: ['projectPath']
        }
    },
    {
        name: 'webos_check_updates',
        description: 'webOS TV API의 최신 업데이트를 확인합니다',
        inputSchema: {
            type: 'object',
            properties: {
                forceCheck: {
                    type: 'boolean',
                    description: '강제 업데이트 확인 (캐시 무시)',
                    default: false
                }
            }
        }
    },
    {
        name: 'webos_smart_suggest',
        description: '사용자 의도와 컨텍스트를 기반으로 AI가 webOS TV API 사용법을 제안합니다',
        inputSchema: {
            type: 'object',
            properties: {
                intent: {
                    type: 'string',
                    description: '원하는 기능이나 의도 (예: "볼륨 조절", "네트워크 상태 확인")'
                },
                context: {
                    type: 'object',
                    properties: {
                        projectType: {
                            type: 'string',
                            enum: ['media', 'game', 'utility', 'smart-home'],
                            description: '프로젝트 유형'
                        },
                        currentCode: {
                            type: 'string',
                            description: '현재 작성 중인 코드',
                            default: ''
                        },
                        fileName: {
                            type: 'string',
                            description: '파일명',
                            default: 'unknown.js'
                        },
                        existingAPIs: {
                            type: 'array',
                            items: { type: 'string' },
                            description: '이미 사용 중인 API 목록',
                            default: []
                        }
                    }
                },
                maxSuggestions: {
                    type: 'number',
                    description: '최대 제안 개수',
                    default: 5
                },
                preferredStyle: {
                    type: 'string',
                    enum: ['callback', 'async', 'promise'],
                    description: '선호하는 코드 스타일',
                    default: 'callback'
                }
            },
            required: ['intent']
        }
    }
];
// Create server
const server = new Server({
    name: 'webos-tv-api-server',
    version: '1.0.0',
    description: 'webOS TV API를 위한 MCP 서버'
}, {
    capabilities: {
        tools: {}
    }
});
// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'webos_list_apis': {
                const validatedArgs = ListAPIsSchema.parse(args || {});
                const apis = await apiManager.listAPIs(validatedArgs);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Found ${apis.length} webOS TV APIs:\n\n` +
                                apis.map(api => `**${api.serviceName}** (${api.category})\n` +
                                    `- URI: \`${api.serviceUri}\`\n` +
                                    `- Status: ${api.status}\n` +
                                    `- Description: ${api.description}\n`).join('\n')
                        }
                    ]
                };
            }
            case 'webos_get_api_info': {
                const validatedArgs = GetAPIInfoSchema.parse(args);
                const api = await apiManager.getAPIInfo(validatedArgs.serviceName, validatedArgs.includeExamples, validatedArgs.includeCompatibility);
                if (!api) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `API not found: ${validatedArgs.serviceName}`
                            }
                        ]
                    };
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ${api.apiInfo.serviceName}\n\n` +
                                `**Service URI:** \`${api.apiInfo.serviceUri}\`\n` +
                                `**Category:** ${api.apiInfo.category}\n` +
                                `**Description:** ${api.apiInfo.description}\n\n` +
                                `## Methods (${api.methods.length})\n\n` +
                                api.methods.map(method => `### ${method.name}\n` +
                                    `${method.description}\n` +
                                    `- Deprecated: ${method.deprecated ? 'Yes' : 'No'}\n` +
                                    `- Emulator Support: ${method.emulatorSupport ? 'Yes' : 'No'}\n` +
                                    `- Parameters: ${method.parameters.length}\n`).join('\n')
                        }
                    ]
                };
            }
            case 'webos_search_methods': {
                const validatedArgs = SearchMethodsSchema.parse(args);
                const results = await apiManager.searchMethods(validatedArgs);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Found ${results.length} methods matching "${validatedArgs.query}":\n\n` +
                                results.map(result => `**${result.serviceName}.${result.methodName}**\n` +
                                    `- URI: \`${result.serviceUri}\`\n` +
                                    `- Description: ${result.description}\n` +
                                    `- Deprecated: ${result.deprecated ? 'Yes' : 'No'}\n` +
                                    `- Match: ${result.matchType}\n`).join('\n')
                        }
                    ]
                };
            }
            case 'webos_generate_code': {
                const validatedArgs = GenerateCodeSchema.parse(args);
                const code = await apiManager.generateCode(validatedArgs);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Generated ${validatedArgs.codeStyle} code for ${validatedArgs.serviceName}.${validatedArgs.methodName}:\n\n` +
                                '```javascript\n' + code + '\n```'
                        }
                    ]
                };
            }
            case 'webos_get_snippets': {
                const validatedArgs = GetSnippetsSchema.parse(args);
                const snippets = await apiManager.getSnippets(validatedArgs.apiName, validatedArgs.methodName, validatedArgs.format);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Found ${snippets.length} snippets:\n\n` +
                                snippets.map(snippet => `**${snippet.prefix}**\n` +
                                    `${snippet.description}\n` +
                                    '```javascript\n' + snippet.body.join('\n') + '\n```\n').join('\n')
                        }
                    ]
                };
            }
            case 'webos_analyze_code': {
                const validatedArgs = AnalyzeCodeSchema.parse(args);
                // For demo purposes, create a mock analysis
                const mockAnalysis = {
                    issues: [
                        {
                            type: 'warning',
                            line: 1,
                            column: 0,
                            message: 'Missing error handling (onFailure callback)',
                            code: 'MISSING_ERROR_HANDLING',
                            fixable: true,
                            suggestedFix: 'Add onFailure callback to handle errors gracefully'
                        }
                    ],
                    suggestions: [
                        {
                            type: 'modernization',
                            line: 1,
                            message: 'Consider using async/await pattern',
                            before: 'webOS.service.request(...)',
                            after: 'await webOSServiceCall(...)',
                            reasoning: 'Async/await provides cleaner error handling'
                        }
                    ],
                    metrics: {
                        totalLines: validatedArgs.code.split('\n').length,
                        webOSAPICalls: (validatedArgs.code.match(/webOS\.service\.request/g) || []).length,
                        uniqueAPIs: ['luna://com.webos.audio'],
                        deprecatedUsage: 0,
                        errorHandlingCoverage: 0,
                        asyncPatterns: { callback: 1, promise: 0, async: 0 }
                    }
                };
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# Code Analysis Results for ${validatedArgs.fileName}\n\n` +
                                `## Issues Found: ${mockAnalysis.issues.length}\n\n` +
                                mockAnalysis.issues.map(issue => `**${issue.type.toUpperCase()}** (Line ${issue.line}): ${issue.message}\n` +
                                    (issue.suggestedFix ? `- Fix: ${issue.suggestedFix}\n` : '')).join('\n') +
                                `\n## Suggestions: ${mockAnalysis.suggestions.length}\n\n` +
                                mockAnalysis.suggestions.map(suggestion => `**${suggestion.type}** (Line ${suggestion.line}): ${suggestion.message}\n` +
                                    `- Reasoning: ${suggestion.reasoning}\n`).join('\n') +
                                `\n## Metrics\n` +
                                `- Total Lines: ${mockAnalysis.metrics.totalLines}\n` +
                                `- webOS API Calls: ${mockAnalysis.metrics.webOSAPICalls}\n` +
                                `- Error Handling Coverage: ${mockAnalysis.metrics.errorHandlingCoverage}%\n` +
                                `- Unique APIs Used: ${mockAnalysis.metrics.uniqueAPIs.length}\n`
                        }
                    ]
                };
            }
            case 'webos_check_updates': {
                const validatedArgs = CheckUpdatesSchema.parse(args || {});
                const mockUpdateInfo = {
                    hasUpdates: true,
                    lastChecked: new Date().toISOString(),
                    availableUpdates: [
                        {
                            apiName: 'Audio',
                            currentVersion: '1.0',
                            latestVersion: '1.1',
                            changeType: 'minor',
                            compatibilityImpact: 'additive',
                            changes: [
                                { type: 'added', element: 'method', name: 'getMuteStatus', description: 'New method to get detailed mute status' }
                            ]
                        }
                    ],
                    updateSummary: {
                        totalAPIs: 15,
                        updatedAPIs: 1,
                        newMethods: 1,
                        deprecatedMethods: 0,
                        breakingChanges: 0
                    }
                };
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# API Updates Available\n\n` +
                                `## Summary\n` +
                                `- Updated APIs: ${mockUpdateInfo.updateSummary.updatedAPIs}/${mockUpdateInfo.updateSummary.totalAPIs}\n` +
                                `- New Methods: ${mockUpdateInfo.updateSummary.newMethods}\n` +
                                `- Breaking Changes: ${mockUpdateInfo.updateSummary.breakingChanges}\n\n` +
                                `## Available Updates\n\n` +
                                mockUpdateInfo.availableUpdates.map(update => `### ${update.apiName} (${update.currentVersion} → ${update.latestVersion})\n` +
                                    `- Change Type: ${update.changeType}\n` +
                                    `- Compatibility Impact: ${update.compatibilityImpact}\n` +
                                    `- Changes: ${update.changes.length}\n`).join('\n')
                        }
                    ]
                };
            }
            case 'webos_smart_suggest': {
                const validatedArgs = SmartSuggestSchema.parse(args);
                // Generate smart suggestions based on intent
                const suggestions = await smartSuggestions.generateSuggestions({
                    intent: validatedArgs.intent,
                    context: {
                        projectType: validatedArgs.context.projectType,
                        currentCode: validatedArgs.context.currentCode,
                        cursorPosition: 0,
                        fileName: validatedArgs.context.fileName,
                        existingAPIs: validatedArgs.context.existingAPIs
                    },
                    maxSuggestions: validatedArgs.maxSuggestions,
                    preferredStyle: validatedArgs.preferredStyle
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# AI Suggestions for: "${validatedArgs.intent}"\n\n` +
                                suggestions.map((suggestion, index) => `## ${index + 1}. ${suggestion.title} (${suggestion.priority} priority)\n\n` +
                                    `${suggestion.description}\n\n` +
                                    `**Reasoning:** ${suggestion.reasoning}\n\n` +
                                    `**Estimated Time:** ${suggestion.estimatedTime}\n\n` +
                                    `**Tags:** ${suggestion.tags.join(', ')}\n\n` +
                                    `\`\`\`javascript\n${suggestion.code}\n\`\`\`\n`).join('\n')
                        }
                    ]
                };
            }
            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Unknown tool: ${name}`
                        }
                    ],
                    isError: true
                };
        }
    }
    catch (error) {
        console.error(`Error in tool ${name}:`, error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`
                }
            ],
            isError: true
        };
    }
});
// Start server
async function main() {
    console.log('Starting webOS TV API MCP Server...');
    try {
        // Initialize API Manager
        await apiManager.initialize();
        console.log('API Manager initialized successfully');
        // Initialize AI services
        codeAnalyzer = new CodeAnalyzer(apiManager['apis']);
        apiUpdater = new APIUpdater();
        smartSuggestions = new SmartSuggestionEngine(apiManager['apis']);
        // Schedule periodic updates
        await apiUpdater.schedulePeriodicUpdates(24);
        console.log('AI services initialized successfully');
        // Start MCP server
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log('webOS TV API MCP Server started successfully');
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down webOS TV API MCP Server...');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\nShutting down webOS TV API MCP Server...');
    process.exit(0);
});
main().catch(console.error);
//# sourceMappingURL=index.js.map