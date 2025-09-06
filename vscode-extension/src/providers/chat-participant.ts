import * as vscode from 'vscode';
import { MCPClient } from '../services/mcp-client';

export class WebOSChatParticipant {
    private mcpClient: MCPClient | null = null;
    private llmProvider: vscode.LanguageModelChat | null = null;

    constructor(mcpClient: MCPClient | null) {
        this.mcpClient = mcpClient;
        this.initializeLLMProvider();
    }

    private async initializeLLMProvider() {
        try {
            // VS Code LM API를 사용하여 스마트한 응답 생성
            const models = await vscode.lm.selectChatModels({ 
                vendor: 'copilot', 
                family: 'gpt-4o' 
            });
            
            if (models.length > 0) {
                this.llmProvider = models[0];
                console.log('✅ LLM Provider initialized successfully');
            } else {
                console.log('⚠️ No LLM models available, using enhanced MCP responses');
                this.llmProvider = null;
            }
        } catch (error) {
            console.log('⚠️ LLM initialization failed, using enhanced MCP responses:', error);
            this.llmProvider = null;
        }
    }

    async handleRequest(request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void> {
        
        try {
            const userQuery = request.prompt;
            console.log('🤖 Chat Participant - User Query:', userQuery);

            // LLM이 사용 가능한 경우 스마트한 응답 생성
            if (this.llmProvider) {
                await this.generateIntelligentLLMResponse(userQuery, context, stream, token);
            } else {
                // LLM이 없는 경우 향상된 MCP 서버 기반 응답
                await this.generateEnhancedResponse(userQuery, context, stream, token);
            }

        } catch (error) {
            console.error('❌ Chat Participant Error:', error);
            stream.markdown(`❌ **오류가 발생했습니다:**\n\`\`\`\n${error}\n\`\`\``);
        }
    }

    private async generateIntelligentLLMResponse(
        userQuery: string,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            // 1단계: MCP 서버에서 최신 정보 먼저 조회
            console.log('🔍 Step 1: Gathering MCP server information...');
            const mcpContext = await this.gatherMCPContext(userQuery, context);
            
            // 2단계: 컨텍스트 정보 수집
            console.log('🔍 Step 2: Gathering VS Code context...');
            const contextInfo = await this.gatherContextInfo(context);
            
            // 3단계: MCP 정보와 컨텍스트를 결합하여 강화된 프롬프트 구성
            console.log('🔍 Step 3: Building enhanced prompt with MCP data...');
            const systemPrompt = this.buildEnhancedWebOSExpertPrompt(contextInfo, mcpContext);
            
            // 4단계: LLM 요청 메시지 구성
            const messages = [
                vscode.LanguageModelChatMessage.User(systemPrompt),
                vscode.LanguageModelChatMessage.User(userQuery)
            ];

            console.log('🚀 Step 4: Sending enhanced request to LLM...');
            
            // 5단계: LLM에 요청 전송 및 스트리밍 응답 처리
            const chatResponse = await this.llmProvider!.sendRequest(messages, {}, token);
            
            // 6단계: 스트리밍 응답 처리
            for await (const fragment of chatResponse.text) {
                if (token.isCancellationRequested) {
                    break;
                }
                stream.markdown(fragment);
            }
            
        } catch (error) {
            if (error instanceof vscode.LanguageModelError) {
                console.error('❌ LLM Error:', error.message, error.code);
                stream.markdown(`❌ **LLM 오류가 발생했습니다:** ${error.message}\n\n대신 MCP 서버 기반 응답을 제공합니다.`);
                // LLM 오류 시 MCP 서버 기반 폴백 응답
                await this.generateMCPBasedResponse(userQuery, context, stream, token);
            } else {
                console.error('❌ Unexpected error:', error);
                stream.markdown(`❌ **예상치 못한 오류가 발생했습니다:**\n\`\`\`\n${error}\n\`\`\``);
            }
        }
    }

    private async gatherMCPContext(userQuery: string, context: vscode.ChatContext): Promise<any> {
        const mcpContext: any = {
            available: false,
            apiList: [],
            relevantAPIs: [],
            specificAPIInfo: null,
            codeExamples: [],
            error: null
        };

        try {
            if (!this.mcpClient || !this.mcpClient.isServerConnected()) {
                console.log('⚠️ MCP server not connected, using fallback data');
                mcpContext.error = 'MCP server not connected';
                return mcpContext;
            }

            console.log('🔍 Gathering MCP context for query:', userQuery);

            // 1. API 목록 조회
            try {
                const apiListResult = await this.mcpClient.callTool('webos_list_apis', {});
                if (apiListResult && apiListResult.content) {
                    const apiListText = apiListResult.content[0].text;
                    console.log('🔍 MCP Server API List Response:', apiListText.substring(0, 200) + '...');
                    
                    // MCP 서버는 마크다운 형식으로 응답하므로 파싱
                    mcpContext.apiList = this.parseAPIListFromMarkdown(apiListText);
                    mcpContext.available = true;
                    console.log('✅ Parsed API list from MCP server:', mcpContext.apiList.length, 'APIs');
                }
            } catch (error) {
                console.error('❌ Failed to get API list from MCP:', error);
                mcpContext.apiList = this.getDefaultAPIs();
            }

            // 2. 사용자 질문과 관련된 API 찾기
            mcpContext.relevantAPIs = this.findRelevantAPIs(userQuery, mcpContext.apiList);

            // 3. 관련된 API들의 상세 정보 조회
            if (mcpContext.relevantAPIs.length > 0) {
                console.log('🔍 Fetching detailed info for relevant APIs:', mcpContext.relevantAPIs.map((api: any) => api.serviceName));
                
                for (const api of mcpContext.relevantAPIs.slice(0, 3)) { // 최대 3개 API만 조회
                    try {
                        const apiInfoResult = await this.mcpClient.callTool('webos_get_api_info', {
                            serviceName: api.serviceName,
                            includeExamples: true,
                            includeCompatibility: true
                        });
                        if (apiInfoResult && apiInfoResult.content) {
                            if (!mcpContext.specificAPIInfo) {
                                mcpContext.specificAPIInfo = '';
                            }
                            mcpContext.specificAPIInfo += `\n## ${api.serviceName} API 상세 정보\n${apiInfoResult.content[0].text}\n`;
                            console.log('✅ Retrieved specific API info for:', api.serviceName);
                        }
                    } catch (error) {
                        console.error('❌ Failed to get specific API info for', api.serviceName, ':', error);
                    }
                }
            }

            // 4. 코드 생성이 요청된 경우 관련 예제 수집
            if (this.isCodeGenerationQuery(userQuery)) {
                // 관련된 API들에 대해 코드 예제 생성
                for (const api of mcpContext.relevantAPIs.slice(0, 2)) { // 최대 2개 API
                    try {
                        const codeResult = await this.mcpClient.callTool('webos_generate_code', {
                            serviceName: api.serviceName,
                            methodName: this.extractMethodName(userQuery) || this.getDefaultMethodForAPI(api.serviceName),
                            includeErrorHandling: true,
                            codeStyle: 'async'
                        });
                        if (codeResult && codeResult.content) {
                            mcpContext.codeExamples.push(`## ${api.serviceName} 예제\n${codeResult.content[0].text}`);
                            console.log('✅ Retrieved code example for:', api.serviceName);
                        }
                    } catch (error) {
                        console.error('❌ Failed to get code example for', api.serviceName, ':', error);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error gathering MCP context:', error);
            mcpContext.error = error instanceof Error ? error.message : String(error);
        }

        return mcpContext;
    }

    private isCodeGenerationQuery(query: string): boolean {
        const lowerQuery = query.toLowerCase();
        return lowerQuery.includes('코드') || 
               lowerQuery.includes('code') || 
               lowerQuery.includes('만들어') || 
               lowerQuery.includes('예제') ||
               lowerQuery.includes('생성');
    }

    private extractMethodName(query: string): string | null {
        const lowerQuery = query.toLowerCase();
        const methodKeywords = ['mute', 'unmute', 'volume', 'play', 'pause', 'stop', 'get', 'set', 'put', 'delete'];
        
        for (const keyword of methodKeywords) {
            if (lowerQuery.includes(keyword)) {
                return keyword;
            }
        }
        
        return null;
    }

    private getDefaultMethodForAPI(apiName: string): string {
        const defaultMethods: { [key: string]: string } = {
            'Audio': 'setMuted',
            'Database': 'put',
            'Settings Service': 'getSystemSettings',
            'Connection Manager': 'getStatus',
            'TV Device Information': 'getDeviceInfo',
            'Camera': 'getCameraList',
            'DRM': 'getDRMInfo',
            'Magic Remote': 'getPointerInputSocket',
            'BLE GATT': 'getStatus',
            'Activity Manager': 'adopt',
            'Application Manager': 'launch',
            'System Service': 'getSystemInfo',
            'Keymanager3': 'getKeyList',
            'Media Database': 'getMediaList',
            'Device Unique ID': 'getDeviceId'
        };
        
        return defaultMethods[apiName] || 'getInfo';
    }

    private parseAPIListFromMarkdown(markdownText: string): any[] {
        const apis: any[] = [];
        const lines = markdownText.split('\n');
        
        let currentAPI: any = {};
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // API 이름과 카테고리 파싱: **ServiceName** (category)
            const apiNameMatch = trimmedLine.match(/\*\*(.*?)\*\*\s*\(([^)]+)\)/);
            if (apiNameMatch) {
                // 이전 API가 있으면 저장
                if (currentAPI.serviceName) {
                    apis.push(currentAPI);
                }
                
                // 새 API 시작
                currentAPI = {
                    serviceName: apiNameMatch[1].trim(),
                    category: apiNameMatch[2].trim()
                };
                continue;
            }
            
            // URI 파싱: - URI: `luna://...`
            const uriMatch = trimmedLine.match(/- URI:\s*`([^`]+)`/);
            if (uriMatch && currentAPI.serviceName) {
                currentAPI.serviceUri = uriMatch[1].trim();
                continue;
            }
            
            // Status 파싱: - Status: active/deprecated
            const statusMatch = trimmedLine.match(/- Status:\s*(.+)/);
            if (statusMatch && currentAPI.serviceName) {
                currentAPI.status = statusMatch[1].trim();
                continue;
            }
            
            // Description 파싱: - Description: ...
            const descMatch = trimmedLine.match(/- Description:\s*(.+)/);
            if (descMatch && currentAPI.serviceName) {
                currentAPI.description = descMatch[1].trim();
                continue;
            }
        }
        
        // 마지막 API 추가
        if (currentAPI.serviceName) {
            apis.push(currentAPI);
        }
        
        console.log('🔍 Parsed APIs from markdown:', apis.length, 'APIs found');
        return apis;
    }

    private buildEnhancedWebOSExpertPrompt(contextInfo: any, mcpContext: any): string {
        const workspaceInfo = contextInfo.workspace?.name ? `현재 작업 중인 프로젝트: **${contextInfo.workspace.name}**` : '';
        const fileInfo = contextInfo.activeFile?.fileName ? `현재 열린 파일: \`${contextInfo.activeFile.fileName}\` (${contextInfo.activeFile.language})` : '';
        const projectType = contextInfo.projectType ? `프로젝트 유형: **${contextInfo.projectType}**` : '';
        const projectStructure = contextInfo.projectStructure ? `프로젝트 구조: ${contextInfo.projectStructure}` : '';
        const currentFileContent = contextInfo.fileContent ? 
            `\n## 📄 현재 파일 내용 (참고용)\n\`\`\`${contextInfo.activeFile?.language || 'javascript'}\n${contextInfo.fileContent}\n\`\`\`` : '';

        // MCP 서버에서 가져온 최신 API 정보 구성
        const mcpApiInfo = mcpContext.available ? 
            `## 🔧 최신 webOS TV API 정보 (MCP 서버에서 실시간 조회)
${mcpContext.apiList.map((api: any) => 
    `- **${api.serviceName}**: \`${api.serviceUri}\` (${api.category}) - ${api.description || 'No description'}`
).join('\n')}` : 
            '## ⚠️ API 정보를 MCP 서버에서 가져올 수 없습니다. 기본 정보를 사용합니다.';

        // 관련 API 정보
        const relevantApiInfo = mcpContext.relevantAPIs.length > 0 ?
            `## 🎯 사용자 질문과 관련된 API들
${mcpContext.relevantAPIs.map((api: any) => 
    `- **${api.serviceName}**: \`${api.serviceUri}\` - ${api.description || 'No description'}`
).join('\n')}` : '';

        // 특정 API 상세 정보
        const specificApiInfo = mcpContext.specificAPIInfo ?
            `## 📚 특정 API 상세 정보
${mcpContext.specificAPIInfo}` : '';

        // 코드 예제 정보
        const codeExamplesInfo = mcpContext.codeExamples.length > 0 ?
            `## 💻 MCP 서버에서 제공하는 코드 예제
${mcpContext.codeExamples.map((example: string, index: number) => 
    `### 예제 ${index + 1}\n\`\`\`javascript\n${example}\n\`\`\``
).join('\n\n')}` : '';

        return `당신은 webOS TV 개발 전문가입니다. 사용자의 질문에 대해 정확하고 실용적인 답변을 제공해주세요.

## 🎯 역할 및 전문성
- **webOS TV 플랫폼 전문가**: Luna Service API, webOS 앱 개발, TV 특화 기능에 대한 깊은 지식
- **실용적인 개발자**: 실제 코드 예제, 베스트 프랙티스, 문제 해결 방법 제공
- **한국어 응답**: 모든 답변을 한국어로 제공하되, 코드와 기술 용어는 원문 유지
- **최신 정보 활용**: MCP 서버에서 실시간으로 조회한 최신 API 정보를 기반으로 답변

## 📋 현재 개발 컨텍스트
${workspaceInfo}
${fileInfo}
${projectType}
${projectStructure}
${currentFileContent}

${mcpApiInfo}

${relevantApiInfo}

${specificApiInfo}

${codeExamplesInfo}

## 💡 응답 가이드라인
1. **MCP 서버 정보 우선 활용**: 위에 제공된 MCP 서버에서 조회한 최신 API 정보를 우선적으로 활용
2. **구체적인 코드 예제**: 실제 사용 가능한 webOS.service.request() 코드 제공
3. **단계별 설명**: 복잡한 기능은 단계별로 설명
4. **오류 처리**: onSuccess/onFailure 콜백 포함
5. **최신 정보**: webOS 6.0+ 기준의 최신 API 사용
6. **실용적 조언**: 성능, 보안, 사용자 경험 고려
7. **컨텍스트 활용**: 현재 프로젝트와 파일 내용을 고려한 맞춤형 답변

## 🚫 피해야 할 것
- 추상적이거나 일반적인 답변
- webOS와 관련 없는 일반적인 웹 개발 조언
- 구식이거나 더 이상 사용되지 않는 API
- MCP 서버에서 제공한 최신 정보를 무시하는 답변

사용자의 질문에 대해 위의 가이드라인을 따라 정확하고 실용적인 답변을 제공해주세요.`;
    }

    private async generateMCPBasedResponse(
        userQuery: string,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            console.log('🔄 Generating MCP-based fallback response...');
            
            if (!this.mcpClient || !this.mcpClient.isServerConnected()) {
                stream.markdown('⚠️ **MCP 서버에 연결할 수 없습니다.**\n\n' +
                    'webOS TV API 정보를 가져오기 위해 MCP 서버가 필요합니다.\n' +
                    '다음 명령어로 서버를 재연결해보세요:\n' +
                    '`webOS API: Reconnect MCP Server`');
                return;
            }

            // MCP 서버의 Chat Assistant tool을 직접 사용
            const result = await this.mcpClient.callTool('webos_chat_assistant', {
                userQuery: userQuery,
                context: {
                    projectType: 'utility',
                    targetVersion: '6.x'
                }
            });

            if (result && result.content) {
                // MCP 서버에서 이미 포맷된 응답을 받음
                stream.markdown(result.content[0].text);
            } else {
                // MCP 서버 응답이 없는 경우 기본 응답
                stream.markdown('❌ **응답을 생성할 수 없습니다.**\n\n' +
                    'MCP 서버에서 응답을 받지 못했습니다. 다시 시도해주세요.');
            }

        } catch (error) {
            console.error('❌ MCP-based response error:', error);
            stream.markdown(`❌ **MCP 서버 응답 생성 중 오류가 발생했습니다:**\n\`\`\`\n${error}\n\`\`\``);
        }
    }

    private async generateEnhancedResponse(
        userQuery: string, 
        context: vscode.ChatContext, 
        stream: vscode.ChatResponseStream, 
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            // 컨텍스트 정보 수집
            const contextInfo = await this.gatherContextInfo(context);
            
            // webOS TV API 정보 수집
            const apiInfo = await this.gatherAPIInfo(userQuery);
            
            // 향상된 응답 생성
            const response = await this.generateContextualResponse(userQuery, contextInfo, apiInfo);
            
            // 스트리밍 응답 처리
            stream.markdown(response);

        } catch (error) {
            console.error('❌ Enhanced Response Error:', error);
            // 오류 시 폴백 응답
            await this.generateFallbackResponse(userQuery, context, stream, token);
        }
    }

    private async generateContextualResponse(userQuery: string, contextInfo: any, apiInfo: any): Promise<string> {
        const lowerQuery = userQuery.toLowerCase();
        
        // 컨텍스트 기반 맞춤 응답 생성
        let response = '';
        
        // 프로젝트 타입별 맞춤 인사말
        const projectGreeting = this.getProjectGreeting(contextInfo.projectType);
        response += projectGreeting + '\n\n';
        
        // 질문 유형별 지능형 응답
        if (lowerQuery.includes('api') && (lowerQuery.includes('목록') || lowerQuery.includes('list'))) {
            response += await this.generateIntelligentAPIList(apiInfo, contextInfo);
        } else if (lowerQuery.includes('api') && (lowerQuery.includes('정보') || lowerQuery.includes('info'))) {
            response += await this.generateIntelligentAPIInfo(userQuery, apiInfo, contextInfo);
        } else if (lowerQuery.includes('코드') || lowerQuery.includes('code') || lowerQuery.includes('예제') || 
                   lowerQuery.includes('만들어') || lowerQuery.includes('올리고') || lowerQuery.includes('내리고')) {
            response += await this.generateIntelligentCode(userQuery, apiInfo, contextInfo);
        } else if (lowerQuery.includes('리뷰') || lowerQuery.includes('review') || lowerQuery.includes('문제') || 
                   lowerQuery.includes('오류') || lowerQuery.includes('에러')) {
            response += await this.generateIntelligentCodeReview(userQuery, contextInfo);
        } else if (lowerQuery.includes('안돼') || lowerQuery.includes('안됨') || lowerQuery.includes('문제') || 
                   lowerQuery.includes('해결') || lowerQuery.includes('도움')) {
            response += await this.generateIntelligentTroubleshooting(userQuery, contextInfo);
        } else {
            response += await this.generateIntelligentGeneralResponse(userQuery, contextInfo, apiInfo);
        }
        
        return response;
    }

    private getProjectGreeting(projectType: string): string {
        const greetings = {
            'webos-app': '🎯 **webOS TV 앱 개발**을 도와드리겠습니다!',
            'game': '🎮 **webOS TV 게임 개발**에 최적화된 도움을 제공합니다!',
            'media': '🎵 **webOS TV 미디어 앱** 개발을 지원합니다!',
            'smart-home': '🏠 **스마트홈 webOS TV 앱** 개발을 도와드립니다!',
            'utility': '🔧 **webOS TV 유틸리티 앱** 개발을 지원합니다!',
            'unknown': '🚀 **webOS TV 개발**을 도와드리겠습니다!'
        };
        
        return greetings[projectType as keyof typeof greetings] || greetings.unknown;
    }

    private async generateFallbackResponse(
        userQuery: string, 
        context: vscode.ChatContext, 
        stream: vscode.ChatResponseStream, 
        token: vscode.CancellationToken
    ): Promise<void> {
        // MCP 서버가 연결되어 있는지 확인
        if (!this.mcpClient || !this.mcpClient.isServerConnected()) {
            stream.markdown('⚠️ **MCP 서버에 연결할 수 없습니다.**\n\n' +
                'webOS TV API 정보를 가져오기 위해 MCP 서버가 필요합니다.\n' +
                '다음 명령어로 서버를 재연결해보세요:\n' +
                '`webOS API: Reconnect MCP Server`');
            return;
        }

        // 기존 방식으로 응답 생성
        const response = await this.generateResponse(userQuery, context, token);
        
        if (response) {
            stream.markdown(response);
        } else {
            stream.markdown('죄송합니다. 요청을 처리할 수 없습니다. 다시 시도해주세요.');
        }
    }

    private async generateResponse(userQuery: string, context: vscode.ChatContext, token: vscode.CancellationToken): Promise<string | null> {
        try {
            // 질문 유형 분석
            const queryType = this.analyzeQueryType(userQuery);
            console.log('🔍 Query Type:', queryType);

            switch (queryType.type) {
                case 'api_list':
                    return await this.handleAPIListQuery(queryType);
                
                case 'api_info':
                    return await this.handleAPIInfoQuery(queryType);
                
                case 'code_generation':
                    return await this.handleCodeGenerationQuery(queryType);
                
                case 'code_review':
                    return await this.handleCodeReviewQuery(queryType);
                
                case 'troubleshooting':
                    return await this.handleTroubleshootingQuery(queryType);
                
                case 'general':
                default:
                    return await this.handleGeneralQuery(userQuery);
            }

        } catch (error) {
            console.error('❌ Response Generation Error:', error);
            return `❌ **응답 생성 중 오류가 발생했습니다:**\n\`\`\`\n${error}\n\`\`\``;
        }
    }

    private analyzeQueryType(query: string): { type: string; data?: any } {
        const lowerQuery = query.toLowerCase();

        // API 목록 요청
        if (lowerQuery.includes('api') && (lowerQuery.includes('목록') || lowerQuery.includes('list') || lowerQuery.includes('어떤'))) {
            return { type: 'api_list' };
        }

        // 특정 API 정보 요청
        if (lowerQuery.includes('api') && (lowerQuery.includes('정보') || lowerQuery.includes('info') || lowerQuery.includes('설명'))) {
            const apiName = this.extractAPIName(query);
            return { type: 'api_info', data: { apiName } };
        }

        // 코드 생성 요청
        if (lowerQuery.includes('코드') || lowerQuery.includes('code') || lowerQuery.includes('생성') || lowerQuery.includes('만들어') || lowerQuery.includes('예제')) {
            return { type: 'code_generation', data: { query } };
        }

        // 코드 리뷰 요청
        if (lowerQuery.includes('리뷰') || lowerQuery.includes('review') || lowerQuery.includes('문제') || lowerQuery.includes('오류') || lowerQuery.includes('에러')) {
            return { type: 'code_review', data: { query } };
        }

        // 문제 해결 요청
        if (lowerQuery.includes('안돼') || lowerQuery.includes('안됨') || lowerQuery.includes('문제') || lowerQuery.includes('해결') || lowerQuery.includes('도움')) {
            return { type: 'troubleshooting', data: { query } };
        }

        return { type: 'general', data: { query } };
    }

    private extractAPIName(query: string): string | null {
        const lowerQuery = query.toLowerCase();
        
        // API 이름 매핑 (소문자 키워드 -> 정확한 API 이름)
        const apiMapping: { [key: string]: string } = {
            'audio': 'Audio',
            'database': 'Database',
            'settings': 'Settings Service',
            'connection': 'Connection Manager',
            'device': 'TV Device Information',
            'camera': 'Camera',
            'drm': 'DRM',
            'magic': 'Magic Remote',
            'remote': 'Magic Remote',
            'ble': 'BLE GATT',
            'gatt': 'BLE GATT',
            'activity': 'Activity Manager',
            'application': 'Application Manager',
            'system': 'System Service',
            'keymanager': 'Keymanager3',
            'mediadb': 'Media Database',
            'deviceuniqueid': 'Device Unique ID',
            'device unique id': 'Device Unique ID'
        };
        
        // 키워드 매칭
        for (const [keyword, apiName] of Object.entries(apiMapping)) {
            if (lowerQuery.includes(keyword)) {
                return apiName;
            }
        }
        
        return null;
    }

    private async handleAPIListQuery(queryType: any): Promise<string> {
        try {
            if (!this.mcpClient) {
                return '❌ MCP 서버에 연결할 수 없습니다.';
            }

            // MCP 서버의 Chat Assistant tool 사용
            const result = await this.mcpClient.callTool('webos_chat_assistant', {
                userQuery: 'webOS TV API 목록 알려줘',
                context: {
                    projectType: 'utility',
                    targetVersion: '6.x'
                }
            });

            if (result && result.content) {
                // MCP 서버에서 이미 포맷된 응답을 받음
                return result.content[0].text;
            }

            // MCP 서버 응답 실패 시 Fallback 사용
            return this.getFallbackAPIList();

        } catch (error) {
            console.error('❌ API List Query Error:', error);
            // 오류 발생 시 Fallback 사용
            return this.getFallbackAPIList();
        }
    }

    private async handleAPIInfoQuery(queryType: any): Promise<string> {
        try {
            if (!this.mcpClient) {
                return '❌ MCP 서버에 연결할 수 없습니다.';
            }

            const apiName = queryType.data?.apiName;
            if (!apiName) {
                return '❌ API 이름을 찾을 수 없습니다. "Audio API 정보 알려줘"와 같이 질문해주세요.';
            }

            // MCP 서버의 Chat Assistant tool 사용
            const result = await this.mcpClient.callTool('webos_chat_assistant', {
                userQuery: `${apiName} API 정보 알려줘`,
                context: {
                    projectType: 'utility',
                    targetVersion: '6.x'
                }
            });

            if (result && result.content) {
                // MCP 서버에서 이미 포맷된 응답을 받음
                return result.content[0].text;
            }

            return `❌ ${apiName} API 정보를 찾을 수 없습니다.`;

        } catch (error) {
            console.error('❌ API Info Query Error:', error);
            return `❌ **API 정보 조회 중 오류가 발생했습니다:**\n\`\`\`\n${error}\n\`\`\``;
        }
    }

    private async handleCodeGenerationQuery(queryType: any): Promise<string> {
        try {
            if (!this.mcpClient) {
                return '❌ MCP 서버에 연결할 수 없습니다.';
            }

            const query = queryType.data?.query;
            
            // 간단한 코드 생성 예제
            let response = '## 💻 webOS TV API 코드 생성\n\n';
            
            // Audio API 예제
            if (query.toLowerCase().includes('audio') || query.toLowerCase().includes('볼륨')) {
                response += '### 🎵 Audio API 예제\n\n';
                response += '```javascript\n';
                response += '// 볼륨 음소거 설정\n';
                response += 'webOS.service.request(\'luna://com.webos.audio\', {\n';
                response += '    method: \'setMuted\',\n';
                response += '    parameters: {\n';
                response += '        muted: true\n';
                response += '    },\n';
                response += '    onSuccess: function(response) {\n';
                response += '        console.log(\'Volume muted successfully\');\n';
                response += '    },\n';
                response += '    onFailure: function(error) {\n';
                response += '        console.error(\'Failed to mute volume:\', error.errorText);\n';
                response += '    }\n';
                response += '});\n';
                response += '```\n\n';
            }

            // Database API 예제
            if (query.toLowerCase().includes('database') || query.toLowerCase().includes('데이터') || query.toLowerCase().includes('저장')) {
                response += '### 💾 Database API 예제\n\n';
                response += '```javascript\n';
                response += '// 데이터 저장\n';
                response += 'webOS.service.request(\'luna://com.palm.db\', {\n';
                response += '    method: \'put\',\n';
                response += '    parameters: {\n';
                response += '        objects: [{\n';
                response += '            _kind: \'com.myapp:1\',\n';
                response += '            data: { message: \'Hello webOS!\' }\n';
                response += '        }]\n';
                response += '    },\n';
                response += '    onSuccess: function(response) {\n';
                response += '        console.log(\'Data saved:\', response.results);\n';
                response += '    },\n';
                response += '    onFailure: function(error) {\n';
                response += '        console.error(\'Failed to save data:\', error.errorText);\n';
                response += '    }\n';
                response += '});\n';
                response += '```\n\n';
            }

            response += '💡 **더 많은 예제**: 특정 API나 기능에 대해 더 자세한 코드를 원하시면 구체적으로 질문해주세요.';
            
            return response;

        } catch (error) {
            console.error('❌ Code Generation Query Error:', error);
            return `❌ **코드 생성 중 오류가 발생했습니다:**\n\`\`\`\n${error}\n\`\`\``;
        }
    }

    private async handleCodeReviewQuery(queryType: any): Promise<string> {
        return '## 🔍 코드 리뷰 기능\n\n' +
               '코드 리뷰 기능은 현재 개발 중입니다.\n\n' +
               '**지원 예정 기능:**\n' +
               '- webOS TV API 사용법 검증\n' +
               '- 에러 핸들링 체크\n' +
               '- 성능 최적화 제안\n' +
               '- 보안 취약점 검사\n\n' +
               '💡 **현재 사용 가능**: 코드를 붙여넣고 "이 코드에 문제가 있어?"라고 질문해주세요.';
    }

    private async handleTroubleshootingQuery(queryType: any): Promise<string> {
        return '## 🛠️ 문제 해결 가이드\n\n' +
               '**일반적인 webOS TV 개발 문제들:**\n\n' +
               '### 1. webOS.service.request가 작동하지 않을 때\n' +
               '- 서비스 URI 확인: `luna://com.webos.audio` (올바른 형식)\n' +
               '- 메서드명 확인: 실제 존재하는 메서드인지 확인\n' +
               '- 파라미터 검증: 필수 파라미터가 모두 포함되었는지 확인\n\n' +
               '### 2. 에러 핸들링 추가\n' +
               '- `onSuccess`와 `onFailure` 콜백 모두 구현\n' +
               '- 에러 메시지 로깅으로 디버깅\n\n' +
               '### 3. API 호환성 문제\n' +
               '- webOS TV 버전별 API 호환성 확인\n' +
               '- deprecated API 사용 여부 확인\n\n' +
               '💡 **구체적인 문제**: 에러 메시지나 코드를 보여주시면 더 정확한 해결책을 제안해드릴 수 있습니다.';
    }

    private async handleGeneralQuery(query: string): Promise<string> {
        return '## 🤖 webOS TV 개발 어시스턴트\n\n' +
               '안녕하세요! webOS TV 개발을 도와드리는 AI 어시스턴트입니다.\n\n' +
               '**다음과 같은 도움을 드릴 수 있습니다:**\n\n' +
               '📋 **API 정보**: "webOS TV API 목록 알려줘"\n' +
               '📚 **특정 API**: "Audio API 정보 알려줘"\n' +
               '💻 **코드 생성**: "볼륨 조절 코드 만들어줘"\n' +
               '🔍 **코드 리뷰**: "이 코드에 문제가 있어?"\n' +
               '🛠️ **문제 해결**: "webOS.service.request가 안돼"\n\n' +
               '**예시 질문:**\n' +
               '- "webOS TV에서 데이터를 저장하는 방법 알려줘"\n' +
               '- "Audio API로 볼륨 조절하는 코드 만들어줘"\n' +
               '- "Database API 사용법 알려줘"\n\n' +
               '💡 구체적으로 질문해주시면 더 정확한 답변을 드릴 수 있습니다!';
    }

    private async gatherContextInfo(context: vscode.ChatContext): Promise<any> {
        const contextInfo: any = {
            workspace: null,
            activeFile: null,
            projectType: 'unknown',
            webOSVersion: '6.x',
            fileContent: '',
            projectStructure: ''
        };

        try {
            // 현재 워크스페이스 정보
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                const workspace = vscode.workspace.workspaceFolders[0];
                contextInfo.workspace = {
                    name: workspace.name,
                    path: workspace.uri.fsPath
                };
                
                // 프로젝트 구조 파악
                try {
                    const files = await vscode.workspace.fs.readDirectory(workspace.uri);
                    const relevantFiles = files
                        .filter(([name]) => 
                            name.includes('appinfo') || 
                            name.includes('package') || 
                            name.endsWith('.js') || 
                            name.endsWith('.html') ||
                            name.endsWith('.css')
                        )
                        .slice(0, 10)
                        .map(([name]) => name);
                    contextInfo.projectStructure = relevantFiles.join(', ');
                } catch (error) {
                    console.log('⚠️ Could not read workspace structure:', error);
                }
            }

            // 현재 활성 파일 정보
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const document = activeEditor.document;
                contextInfo.activeFile = {
                    fileName: document.fileName,
                    language: document.languageId,
                    lineCount: document.lineCount
                };
                
                // 현재 파일의 내용 일부 가져오기 (컨텍스트용)
                const lineCount = Math.min(document.lineCount, 50);
                contextInfo.fileContent = document.getText(new vscode.Range(0, 0, lineCount, 0)).substring(0, 1000);
            }

            // 프로젝트 타입 추론
            contextInfo.projectType = this.inferProjectType(contextInfo);

        } catch (error) {
            console.error('❌ Context gathering error:', error);
        }

        return contextInfo;
    }

    private async gatherAPIInfo(userQuery: string): Promise<any> {
        // 이 메서드는 이제 gatherMCPContext로 대체되었습니다.
        // 하위 호환성을 위해 기본 API 정보만 반환합니다.
        return {
            available: false,
            apis: this.getDefaultAPIs(),
            relevantAPIs: this.findRelevantAPIs(userQuery, this.getDefaultAPIs())
        };
    }

    private inferProjectType(contextInfo: any): string {
        if (!contextInfo.activeFile) return 'unknown';
        
        const fileName = contextInfo.activeFile.fileName.toLowerCase();
        
        if (fileName.includes('appinfo.json') || fileName.includes('webos')) {
            return 'webos-app';
        } else if (fileName.includes('game') || fileName.includes('controller')) {
            return 'game';
        } else if (fileName.includes('media') || fileName.includes('video') || fileName.includes('audio')) {
            return 'media';
        } else if (fileName.includes('smart') || fileName.includes('home')) {
            return 'smart-home';
        }
        
        return 'utility';
    }

    private findRelevantAPIs(userQuery: string, apis: any[]): any[] {
        const lowerQuery = userQuery.toLowerCase();
        const relevantAPIs: any[] = [];
        const scoredAPIs: { api: any; score: number }[] = [];

        for (const api of apis) {
            const apiName = api.serviceName?.toLowerCase() || '';
            const description = api.description?.toLowerCase() || '';
            let score = 0;

            // 정확한 API 이름 매칭 (높은 점수)
            if (lowerQuery.includes(apiName)) {
                score += 10;
            }

            // API 이름의 일부 매칭
            const apiWords = apiName.split(' ');
            for (const word of apiWords) {
                if (word.length > 2 && lowerQuery.includes(word)) {
                    score += 5;
                }
            }

            // 설명에서 키워드 매칭
            const queryWords = lowerQuery.split(' ');
            for (const word of queryWords) {
                if (word.length > 2 && description.includes(word)) {
                    score += 3;
                }
            }

            // 특정 키워드 매칭
            const keywordMappings: { [key: string]: string[] } = {
                'audio': ['audio', 'sound', 'volume', 'mute', 'unmute'],
                'database': ['database', 'db', 'data', 'store', 'save'],
                'settings': ['settings', 'config', 'preference'],
                'connection': ['connection', 'network', 'wifi', 'ethernet'],
                'device': ['device', 'tv', 'hardware'],
                'camera': ['camera', 'photo', 'image'],
                'drm': ['drm', 'protection', 'encryption'],
                'magic': ['magic', 'remote', 'pointer'],
                'ble': ['ble', 'bluetooth', 'gatt'],
                'activity': ['activity', 'lifecycle', 'adopt'],
                'application': ['application', 'app', 'launch'],
                'system': ['system', 'info', 'status'],
                'keymanager': ['key', 'security', 'manager'],
                'media': ['media', 'video', 'music'],
                'deviceuniqueid': ['unique', 'id', 'identifier']
            };

            for (const [keyword, variations] of Object.entries(keywordMappings)) {
                if (variations.some(variation => lowerQuery.includes(variation))) {
                    if (apiName.includes(keyword) || apiName.includes(keyword.replace('ble', 'ble gatt'))) {
                        score += 8;
                    }
                }
            }

            if (score > 0) {
                scoredAPIs.push({ api, score });
            }
        }

        // 점수순으로 정렬하고 상위 API들 반환
        scoredAPIs.sort((a, b) => b.score - a.score);
        return scoredAPIs.slice(0, 5).map(item => item.api);
    }

    private buildSystemPrompt(contextInfo: any, apiInfo: any): string {
        return `당신은 webOS TV 개발을 위한 전문 AI 어시스턴트입니다. 

## 역할과 책임
- webOS TV 앱 개발에 대한 전문적인 조언 제공
- 실시간 코드 리뷰 및 최적화 제안
- 컨텍스트 기반 학습 가이드 제공
- 프로젝트별 맞춤 제안
- 문제 해결 및 디버깅 지원
- 버전별 호환성 가이드

## 현재 컨텍스트
- 워크스페이스: ${contextInfo.workspace?.name || 'Unknown'}
- 활성 파일: ${contextInfo.activeFile?.fileName || 'None'}
- 프로젝트 타입: ${contextInfo.projectType}
- webOS 버전: ${contextInfo.webOSVersion}

## 사용 가능한 webOS TV APIs
${apiInfo.available ? 
    apiInfo.apis.map((api: any) => `- ${api.serviceName}: ${api.serviceUri}`).join('\n') :
    'API 정보를 가져올 수 없습니다. 기본 webOS TV API를 사용하세요.'
}

## 관련 API 정보
${apiInfo.relevantAPIs.length > 0 ? 
    apiInfo.relevantAPIs.map((api: any) => `- ${api.serviceName}: ${api.description}`).join('\n') :
    '관련 API를 찾을 수 없습니다.'
}

## 응답 가이드라인
1. **구체적이고 실용적인 코드 예제 제공**
2. **에러 핸들링과 best practices 포함**
3. **webOS TV 특화 기능 활용**
4. **성능 최적화 제안**
5. **버전 호환성 고려**
6. **한국어로 친근하게 응답**

사용자의 질문에 대해 전문적이고 도움이 되는 답변을 제공해주세요.`;
    }

    private async generateIntelligentAPIList(apiInfo: any, contextInfo: any): Promise<string> {
        let response = '## 📋 webOS TV API 목록\n\n';
        
        if (contextInfo.projectType !== 'unknown') {
            response += `**${contextInfo.projectType} 프로젝트에 최적화된 API 추천:**\n\n`;
        }
        
        if (apiInfo.available && apiInfo.apis.length > 0) {
            // 카테고리별로 그룹화
            const categories = {
                'system': '🔧 시스템',
                'media': '🎵 미디어', 
                'device': '📱 디바이스',
                'network': '🌐 네트워크'
            };

            for (const [category, displayName] of Object.entries(categories)) {
                const categoryAPIs = apiInfo.apis.filter((api: any) => api.category === category);
                if (categoryAPIs.length > 0) {
                    response += `### ${displayName}\n`;
                    for (const api of categoryAPIs) {
                        response += `- **${api.serviceName}**: \`${api.serviceUri}\`\n`;
                    }
                    response += '\n';
                }
            }
        } else {
            response += this.getFallbackAPIList();
        }
        
        response += '💡 **다음 단계**: 특정 API에 대해 더 자세한 정보를 원하시면 "Audio API 정보 알려줘"와 같이 질문해주세요.';
        
        return response;
    }

    private async generateIntelligentAPIInfo(userQuery: string, apiInfo: any, contextInfo: any): Promise<string> {
        const apiName = this.extractAPIName(userQuery);
        if (!apiName) {
            return '❌ API 이름을 찾을 수 없습니다. "Audio API 정보 알려줘"와 같이 질문해주세요.';
        }

        if (this.mcpClient && this.mcpClient.isServerConnected()) {
            try {
                const result = await this.mcpClient.callTool('webos_chat_assistant', {
                    userQuery: `${apiName} API 정보 알려줘`,
                    context: {
                        projectType: contextInfo.projectType,
                        targetVersion: '6.x'
                    }
                });

                if (result && result.content) {
                    return result.content[0].text;
                }
            } catch (error) {
                console.error('❌ API Info Error:', error);
            }
        }

        return `❌ ${apiName} API 정보를 가져올 수 없습니다. MCP 서버 연결을 확인해주세요.`;
    }

    private async generateIntelligentCode(userQuery: string, apiInfo: any, contextInfo: any): Promise<string> {
        if (this.mcpClient && this.mcpClient.isServerConnected()) {
            try {
                const result = await this.mcpClient.callTool('webos_chat_assistant', {
                    userQuery: userQuery,
                    context: {
                        projectType: contextInfo.projectType,
                        targetVersion: '6.x'
                    }
                });

                if (result && result.content) {
                    return result.content[0].text;
                }
            } catch (error) {
                console.error('❌ Code Generation Error:', error);
            }
        }

        return '❌ 코드 생성에 실패했습니다. MCP 서버 연결을 확인해주세요.';
    }

    private async generateIntelligentCodeReview(userQuery: string, contextInfo: any): Promise<string> {
        return `## 🔍 코드 리뷰 및 최적화 가이드\n\n` +
               `**${contextInfo.projectType} 프로젝트**에 특화된 코드 리뷰를 제공합니다.\n\n` +
               `### 📋 체크리스트\n` +
               `- ✅ webOS TV API 사용법 검증\n` +
               `- ✅ 에러 핸들링 완성도 확인\n` +
               `- ✅ 성능 최적화 제안\n` +
               `- ✅ 보안 취약점 검사\n` +
               `- ✅ webOS TV 6.x 호환성 확인\n\n` +
               `💡 **코드 리뷰 요청**: 리뷰하고 싶은 코드를 붙여넣고 "이 코드에 문제가 있어?"라고 질문해주세요.`;
    }

    private async generateIntelligentTroubleshooting(userQuery: string, contextInfo: any): Promise<string> {
        return `## 🛠️ 문제 해결 및 디버깅 지원\n\n` +
               `**${contextInfo.projectType} 프로젝트**에서 자주 발생하는 문제들을 해결해드립니다.\n\n` +
               `### 🔧 일반적인 문제들\n` +
               `1. **webOS.service.request가 작동하지 않을 때**\n` +
               `   - 서비스 URI 확인: 올바른 형식인지 확인\n` +
               `   - 메서드명 검증: 실제 존재하는 메서드인지 확인\n` +
               `   - 파라미터 검증: 필수 파라미터가 모두 포함되었는지 확인\n\n` +
               `2. **에러 핸들링 추가**\n` +
               `   - onSuccess와 onFailure 콜백 모두 구현\n` +
               `   - 에러 메시지 로깅으로 디버깅\n\n` +
               `3. **API 호환성 문제**\n` +
               `   - webOS TV 버전별 API 호환성 확인\n` +
               `   - deprecated API 사용 여부 확인\n\n` +
               `💡 **구체적인 문제**: 에러 메시지나 코드를 보여주시면 더 정확한 해결책을 제안해드릴 수 있습니다.`;
    }

    private async generateIntelligentGeneralResponse(userQuery: string, contextInfo: any, apiInfo: any): Promise<string> {
        return `## 🤖 webOS TV 개발 어시스턴트\n\n` +
               `**${contextInfo.projectType} 프로젝트**에 최적화된 도움을 제공합니다!\n\n` +
               `### 🚀 다음과 같은 도움을 드릴 수 있습니다:\n\n` +
               `📋 **API 정보**: "webOS TV API 목록 알려줘"\n` +
               `📚 **특정 API**: "Audio API 정보 알려줘"\n` +
               `💻 **코드 생성**: "볼륨 조절 코드 만들어줘"\n` +
               `🔍 **코드 리뷰**: "이 코드에 문제가 있어?"\n` +
               `🛠️ **문제 해결**: "webOS.service.request가 안돼"\n\n` +
               `### 💡 프로젝트별 맞춤 제안:\n` +
               this.getProjectSpecificSuggestions(contextInfo.projectType) +
               `\n\n**예시 질문:**\n` +
               `- "현재 프로젝트에 최적화된 Audio API 코드 만들어줘"\n` +
               `- "webOS TV 6.x에서 권장하는 에러 처리 방법 알려줘"\n` +
               `- "이 코드의 성능을 개선해줘"`;
    }

    private getProjectSpecificSuggestions(projectType: string): string {
        const suggestions = {
            'webos-app': '- **앱 생명주기 관리**: Activity Manager API 활용\n- **설정 관리**: Settings Service API 사용\n- **앱 정보**: TV Device Information API 활용',
            'game': '- **게임 컨트롤러**: Magic Remote API 활용\n- **사운드 효과**: Audio API 활용\n- **게임 데이터**: Database API 사용',
            'media': '- **미디어 재생**: Audio API 활용\n- **카메라 기능**: Camera API 사용\n- **미디어 데이터**: Media Database API 활용',
            'smart-home': '- **디바이스 제어**: Connection Manager API 활용\n- **BLE 통신**: BLE GATT API 사용\n- **보안**: Key Manager API 활용',
            'utility': '- **시스템 정보**: System Service API 활용\n- **데이터 저장**: Database API 사용\n- **고유 ID**: Device Unique ID API 활용',
            'unknown': '- **기본 API**: Audio, Database, Settings Service API부터 시작\n- **단계별 학습**: 간단한 API부터 복잡한 API까지\n- **실습 중심**: 실제 코드 작성하며 학습'
        };
        
        return suggestions[projectType as keyof typeof suggestions] || suggestions.unknown;
    }

    private getDefaultAPIs(): any[] {
        return [
            {
                serviceName: 'Activity Manager',
                serviceUri: 'luna://com.webos.service.activitymanager',
                category: 'system',
                description: '앱 생명주기 관리'
            },
            {
                serviceName: 'Settings Service',
                serviceUri: 'luna://com.webos.service.settings',
                category: 'system',
                description: '시스템 설정 관리'
            },
            {
                serviceName: 'System Service',
                serviceUri: 'luna://com.webos.service.system',
                category: 'system',
                description: '시스템 정보 및 제어'
            },
            {
                serviceName: 'Audio',
                serviceUri: 'luna://com.webos.audio',
                category: 'media',
                description: '오디오 제어 및 관리'
            },
            {
                serviceName: 'Camera',
                serviceUri: 'luna://com.webos.service.camera',
                category: 'media',
                description: '카메라 기능 제어'
            },
            {
                serviceName: 'Media Database',
                serviceUri: 'luna://com.webos.service.mediadb',
                category: 'media',
                description: '미디어 데이터베이스 관리'
            },
            {
                serviceName: 'Device Unique ID',
                serviceUri: 'luna://com.webos.service.deviceuniqueid',
                category: 'device',
                description: '디바이스 고유 ID 관리'
            },
            {
                serviceName: 'TV Device Information',
                serviceUri: 'luna://com.webos.service.tv.deviceinfo',
                category: 'device',
                description: 'TV 디바이스 정보'
            },
            {
                serviceName: 'Magic Remote',
                serviceUri: 'luna://com.webos.service.mrcu',
                category: 'device',
                description: '매직 리모컨 제어'
            },
            {
                serviceName: 'Connection Manager',
                serviceUri: 'luna://com.webos.service.connectionmanager',
                category: 'network',
                description: '네트워크 연결 관리'
            },
            {
                serviceName: 'BLE GATT',
                serviceUri: 'luna://com.webos.service.blegatt',
                category: 'network',
                description: 'BLE GATT 통신'
            },
            {
                serviceName: 'Database',
                serviceUri: 'luna://com.palm.db',
                category: 'data',
                description: '데이터베이스 관리'
            },
            {
                serviceName: 'Key Manager',
                serviceUri: 'luna://com.webos.service.keymanager',
                category: 'data',
                description: '키 관리'
            },
            {
                serviceName: 'DRM',
                serviceUri: 'luna://com.webos.service.drm',
                category: 'data',
                description: 'DRM 보호 콘텐츠 관리'
            }
        ];
    }

    private getFallbackAPIList(): string {
        return '## 📋 webOS TV API 목록\n\n' +
               '### 🔧 시스템\n' +
               '- **Activity Manager**: `luna://com.webos.service.activitymanager`\n' +
               '- **Settings Service**: `luna://com.webos.service.settings`\n' +
               '- **System Service**: `luna://com.webos.service.system`\n\n' +
               '### 🎵 미디어\n' +
               '- **Audio**: `luna://com.webos.audio`\n' +
               '- **Camera**: `luna://com.webos.service.camera`\n' +
               '- **Media Database**: `luna://com.webos.service.mediadb`\n\n' +
               '### 📱 디바이스\n' +
               '- **Device Unique ID**: `luna://com.webos.service.deviceuniqueid`\n' +
               '- **TV Device Information**: `luna://com.webos.service.tv.deviceinfo`\n' +
               '- **Magic Remote**: `luna://com.webos.service.mrcu`\n\n' +
               '### 🌐 네트워크\n' +
               '- **Connection Manager**: `luna://com.webos.service.connectionmanager`\n' +
               '- **BLE GATT**: `luna://com.webos.service.blegatt`\n\n' +
               '### 💾 데이터\n' +
               '- **Database**: `luna://com.palm.db`\n' +
               '- **Key Manager**: `luna://com.webos.service.keymanager`\n' +
               '- **DRM**: `luna://com.webos.service.drm`\n\n' +
               '💡 **사용법**: 특정 API에 대해 더 자세한 정보를 원하시면 "Audio API 정보 알려줘"와 같이 질문해주세요.';
    }
}
