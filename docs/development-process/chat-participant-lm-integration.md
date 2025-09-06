# Chat Participant LM API 통합

## 개요

webOS TV 개발자용 VS Code 확장 프로그램의 Chat Participant에 VS Code Language Model API를 통합하여 템플릿 기반 응답에서 진정한 AI 기반 지능형 응답으로 업그레이드했습니다.

## 주요 개선사항

### 1. VS Code LM API 통합

#### 모델 선택 전략
```typescript
const models = await vscode.lm.selectChatModels({ 
    vendor: 'copilot', 
    family: 'gpt-4o' 
});
```

- **1차 선택**: GPT-4o (Copilot 기반)
  - 최고 성능과 품질 제공
  - 64K 토큰 제한
  - 실시간 스트리밍 응답
- **2차 폴백**: 향상된 MCP 서버 기반 응답
- **3차 폴백**: 기본 API 목록 제공

#### 사용자 동의 처리
VS Code LM API 사용 시 사용자 동의가 필요하며, 인증 대화상자를 통해 처리됩니다.

### 2. 고급 프롬프트 엔지니어링

#### webOS 전문가 역할 정의
```typescript
private buildWebOSExpertPrompt(contextInfo: any, apiInfo: any): string {
    return `당신은 webOS TV 개발 전문가입니다. 사용자의 질문에 대해 정확하고 실용적인 답변을 제공해주세요.

## 🎯 역할 및 전문성
- **webOS TV 플랫폼 전문가**: Luna Service API, webOS 앱 개발, TV 특화 기능에 대한 깊은 지식
- **실용적인 개발자**: 실제 코드 예제, 베스트 프랙티스, 문제 해결 방법 제공
- **한국어 응답**: 모든 답변을 한국어로 제공하되, 코드와 기술 용어는 원문 유지

## 📋 현재 개발 컨텍스트
${workspaceInfo}
${fileInfo}
${projectType}
${projectStructure}
${currentFileContent}

## 🔧 사용 가능한 webOS TV API
${availableAPIs}

## 💡 응답 가이드라인
1. **구체적인 코드 예제**: 실제 사용 가능한 webOS.service.request() 코드 제공
2. **단계별 설명**: 복잡한 기능은 단계별로 설명
3. **오류 처리**: onSuccess/onFailure 콜백 포함
4. **최신 정보**: webOS 6.0+ 기준의 최신 API 사용
5. **실용적 조언**: 성능, 보안, 사용자 경험 고려
6. **컨텍스트 활용**: 현재 프로젝트와 파일 내용을 고려한 맞춤형 답변

## 🚫 피해야 할 것
- 추상적이거나 일반적인 답변
- webOS와 관련 없는 일반적인 웹 개발 조언
- 구식이거나 더 이상 사용되지 않는 API

사용자의 질문에 대해 위의 가이드라인을 따라 정확하고 실용적인 답변을 제공해주세요.`;
}
```

### 3. 지능형 컨텍스트 수집

#### 풍부한 프로젝트 정보 수집
```typescript
private async gatherContextInfo(context: vscode.ChatContext): Promise<any> {
    const contextInfo: any = {
        workspace: null,
        activeFile: null,
        projectType: 'unknown',
        webOSVersion: '6.x',
        fileContent: '',
        projectStructure: ''
    };

    // 워크스페이스 정보
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspace = vscode.workspace.workspaceFolders[0];
        contextInfo.workspace = {
            name: workspace.name,
            path: workspace.uri.fsPath
        };
        
        // 프로젝트 구조 파악
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

    return contextInfo;
}
```

#### 수집되는 컨텍스트 정보
- **워크스페이스 정보**: 프로젝트명, 경로
- **프로젝트 구조**: 관련 파일들 (appinfo, package.json, .js, .html, .css)
- **활성 파일**: 파일명, 언어, 라인 수
- **파일 내용**: 최대 1000자의 현재 파일 내용
- **API 정보**: MCP 서버에서 실시간 수집한 webOS TV API 목록

### 4. 스트리밍 응답 처리

#### 실시간 응답 스트리밍
```typescript
private async generateIntelligentLLMResponse(
    userQuery: string,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<void> {
    try {
        // 컨텍스트 정보 수집
        const contextInfo = await this.gatherContextInfo(context);
        const apiInfo = await this.gatherAPIInfo(userQuery);
        
        // webOS 개발 전문가 프롬프트 구성
        const systemPrompt = this.buildWebOSExpertPrompt(contextInfo, apiInfo);
        
        // LLM 요청 메시지 구성
        const messages = [
            vscode.LanguageModelChatMessage.User(systemPrompt),
            vscode.LanguageModelChatMessage.User(userQuery)
        ];

        // LLM에 요청 전송 및 스트리밍 응답 처리
        const chatResponse = await this.llmProvider!.sendRequest(messages, {}, token);
        
        // 스트리밍 응답 처리
        for await (const fragment of chatResponse.text) {
            if (token.isCancellationRequested) {
                break;
            }
            stream.markdown(fragment);
        }
        
    } catch (error) {
        if (error instanceof vscode.LanguageModelError) {
            console.error('❌ LLM Error:', error.message, error.code);
            stream.markdown(`❌ **LLM 오류가 발생했습니다:** ${error.message}\n\n대신 기본 응답을 제공합니다.`);
            // LLM 오류 시 폴백 응답
            await this.generateEnhancedResponse(userQuery, context, stream, token);
        } else {
            console.error('❌ Unexpected error:', error);
            stream.markdown(`❌ **예상치 못한 오류가 발생했습니다:**\n\`\`\`\n${error}\n\`\`\``);
        }
    }
}
```

### 5. 강화된 오류 처리

#### 다층 폴백 메커니즘
```typescript
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
```

#### 오류 타입별 처리
- **LanguageModelError**: LLM 관련 오류 (모델 없음, 사용자 동의 없음, 할당량 초과)
- **네트워크 오류**: 연결 문제 시 폴백 응답 제공
- **일반 오류**: 예상치 못한 오류에 대한 안전한 처리

## 구현 세부사항

### 파일 구조
```
vscode-extension/src/providers/
├── chat-participant.ts          # 메인 Chat Participant 구현
├── completion-provider.ts       # 자동완성 제공자
├── hover-provider.ts           # 호버 도움말 제공자
├── code-action-provider.ts     # 코드 액션 제공자
└── api-provider.ts             # API 정보 제공자
```

### 주요 메서드
- `initializeLLMProvider()`: LLM 모델 초기화
- `generateIntelligentLLMResponse()`: LLM 기반 지능형 응답 생성
- `buildWebOSExpertPrompt()`: webOS 전문가 프롬프트 구성
- `gatherContextInfo()`: 컨텍스트 정보 수집
- `gatherAPIInfo()`: API 정보 수집

### 의존성
- VS Code API: `^1.90.0` (LM API 지원)
- MCP Client: 기존 MCP 서버 통신
- TypeScript: 최신 타입 지원

## 사용 방법

### 1. 확장 프로그램 설치
```bash
code --install-extension webos-tv-api-assistant-1.0.0.vsix
```

### 2. Chat Participant 사용
1. VS Code에서 Chat 패널 열기
2. `@webos-tv-assistant` 선택
3. webOS TV 개발 관련 질문 입력

### 3. 예시 질문들
- "현재 프로젝트에 맞는 Audio API 코드 만들어줘"
- "webOS TV 앱의 성능 최적화 방법 알려줘"
- "Database API로 데이터 저장하는 코드 작성해줘"
- "Magic Remote 이벤트 처리하는 방법 알려줘"

## 성능 및 제한사항

### 토큰 제한
- GPT-4o: 64K 토큰 제한
- 컨텍스트 정보는 최적화되어 전송

### 사용자 동의
- Copilot 모델 사용 시 사용자 동의 필요
- 인증 대화상자를 통한 동의 처리

### 폴백 메커니즘
- LLM 사용 불가 시 MCP 서버 기반 응답
- MCP 서버 실패 시 기본 API 목록 제공

## 향후 개선 계획

### 1. 프롬프트 최적화
- 더 구체적인 webOS 개발 가이드라인
- 프로젝트 타입별 맞춤 프롬프트

### 2. 컨텍스트 확장
- Git 히스토리 정보 활용
- 프로젝트 설정 파일 분석

### 3. 응답 품질 향상
- 코드 예제 검증
- 베스트 프랙티스 적용

## 결론

VS Code LM API 통합을 통해 Chat Participant가 단순한 템플릿 기반 응답에서 진정한 AI 기반 지능형 webOS TV 개발 어시스턴트로 진화했습니다. 이는 개발자에게 더욱 정확하고 실용적인 도움을 제공하며, webOS TV 앱 개발의 생산성을 크게 향상시킬 것입니다.
