import * as vscode from 'vscode';
import { MCPClient } from '../services/mcp-client';

export class WebOSChatParticipant {
    private mcpClient: MCPClient | null = null;

    constructor(mcpClient: MCPClient | null) {
        this.mcpClient = mcpClient;
    }

    async handleRequest(request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void> {
        
        try {
            // MCP 서버가 연결되어 있는지 확인
            if (!this.mcpClient || !this.mcpClient.isConnected()) {
                stream.markdown('⚠️ **MCP 서버에 연결할 수 없습니다.**\n\n' +
                    'webOS TV API 정보를 가져오기 위해 MCP 서버가 필요합니다.\n' +
                    '다음 명령어로 서버를 재연결해보세요:\n' +
                    '`webOS API: Reconnect MCP Server`');
                return;
            }

            // 사용자 질문 분석
            const userQuery = request.prompt;
            console.log('🤖 Chat Participant - User Query:', userQuery);

            // 질문 유형에 따른 응답 생성
            const response = await this.generateResponse(userQuery, context, token);
            
            if (response) {
                stream.markdown(response);
            } else {
                stream.markdown('죄송합니다. 요청을 처리할 수 없습니다. 다시 시도해주세요.');
            }

        } catch (error) {
            console.error('❌ Chat Participant Error:', error);
            stream.markdown(`❌ **오류가 발생했습니다:**\n\`\`\`\n${error}\n\`\`\``);
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
        // 간단한 API 이름 추출 로직
        const apiKeywords = ['audio', 'database', 'settings', 'connection', 'device', 'camera', 'drm', 'magic', 'remote', 'ble', 'gatt'];
        
        for (const keyword of apiKeywords) {
            if (query.toLowerCase().includes(keyword)) {
                return keyword;
            }
        }
        
        return null;
    }

    private async handleAPIListQuery(queryType: any): Promise<string> {
        try {
            if (!this.mcpClient) {
                return '❌ MCP 서버에 연결할 수 없습니다.';
            }

            // MCP 서버에서 API 목록 가져오기
            const result = await this.mcpClient.callTool('webos_list_apis', {});
            
            if (result && result.content) {
                const apis = JSON.parse(result.content[0].text);
                
                let response = '## 📋 webOS TV API 목록\n\n';
                
                // 카테고리별로 그룹화
                const categories = {
                    'system': '🔧 시스템',
                    'media': '🎵 미디어', 
                    'device': '📱 디바이스',
                    'network': '🌐 네트워크'
                };

                for (const [category, displayName] of Object.entries(categories)) {
                    const categoryAPIs = apis.filter((api: any) => api.category === category);
                    if (categoryAPIs.length > 0) {
                        response += `### ${displayName}\n`;
                        for (const api of categoryAPIs) {
                            response += `- **${api.serviceName}**: \`${api.serviceUri}\`\n`;
                        }
                        response += '\n';
                    }
                }

                response += '💡 **사용법**: 특정 API에 대해 더 자세한 정보를 원하시면 "Audio API 정보 알려줘"와 같이 질문해주세요.';
                
                return response;
            }

            return '❌ API 목록을 가져올 수 없습니다.';

        } catch (error) {
            console.error('❌ API List Query Error:', error);
            return `❌ **API 목록 조회 중 오류가 발생했습니다:**\n\`\`\`\n${error}\n\`\`\``;
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

            // MCP 서버에서 API 정보 가져오기
            const result = await this.mcpClient.callTool('webos_get_api_info', {
                serviceName: apiName,
                includeExamples: true,
                includeCompatibility: true
            });

            if (result && result.content) {
                const apiInfo = JSON.parse(result.content[0].text);
                
                let response = `## 📚 ${apiInfo.apiInfo.serviceName} API\n\n`;
                response += `**서비스 URI**: \`${apiInfo.apiInfo.serviceUri}\`\n`;
                response += `**카테고리**: ${apiInfo.apiInfo.category}\n`;
                response += `**설명**: ${apiInfo.apiInfo.description}\n\n`;

                if (apiInfo.methods && apiInfo.methods.length > 0) {
                    response += '### 🔧 사용 가능한 메서드\n\n';
                    for (const method of apiInfo.methods.slice(0, 5)) { // 처음 5개만 표시
                        response += `- **${method.name}**: ${method.description}\n`;
                    }
                    if (apiInfo.methods.length > 5) {
                        response += `- ... 및 ${apiInfo.methods.length - 5}개 더\n`;
                    }
                }

                response += '\n💡 **코드 생성**: "Audio API로 볼륨 조절 코드 만들어줘"와 같이 질문해주세요.';
                
                return response;
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
}
