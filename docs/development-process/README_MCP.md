# webOS TV API MCP Server & VS Code Extension

webOS TV 개발자를 위한 Model Context Protocol (MCP) 서버와 VS Code 확장 프로그램입니다. Luna Service API 정보 제공, 코드 생성, 자동완성, 그리고 **VS Code LM API 기반 지능형 Chat Participant** 기능을 제공합니다.

## 🚀 주요 기능

### MCP Server (Phase 1-3 완료)
- ✅ **API 목록 조회**: 카테고리, 상태, 버전별 필터링
- ✅ **API 상세 정보**: 메서드, 파라미터, 호환성 정보 조회
- ✅ **메서드 검색**: 이름이나 기능으로 API 메서드 검색
- ✅ **코드 생성**: Callback, Async, Promise 스타일 지원
- ✅ **VS Code 스니펫**: 개발 환경 통합을 위한 스니펫 제공
- ✅ **스마트 제안**: AI 기반 코드 패턴 및 베스트 프랙티스

### VS Code Extension (최신 업데이트)
- ✅ **자동완성**: URI, 메서드, 파라미터 자동완성
- ✅ **호버 도움말**: API 정보 및 사용법 표시
- ✅ **코드 액션**: Quick Fix 및 코드 개선 제안
- ✅ **지능형 Chat Participant**: **MCP 서버 + VS Code LM API 통합 AI 어시스턴트**
  - **MCP 서버 우선 정보 수집**: 최신 API 정보를 먼저 조회
  - **LM API 컨텍스트 강화**: MCP 데이터를 LM에 컨텍스트로 제공
  - **GPT-4o 모델 활용**: 실시간 스트리밍 응답
  - **프로젝트 컨텍스트 인식**: 현재 파일과 프로젝트 구조 분석
  - **webOS TV 개발 전문가 역할**: 최신 정보 기반 정확한 답변
  - **폴백 메커니즘**: LM 실패 시 MCP 서버 기반 응답으로 자동 전환

## 📦 설치

### MCP Server
```bash
# 의존성 설치
npm install

# TypeScript 빌드
npm run build

# 개발 모드 실행
npm run dev

# 프로덕션 실행
npm start
```

### VS Code Extension
```bash
# 확장 프로그램 빌드
cd vscode-extension
npm run compile
vsce package

# 확장 프로그램 설치
code --install-extension webos-tv-api-assistant-1.0.0.vsix
```

## 🤖 Chat Participant 사용법

### 1. Chat Participant 활성화
1. VS Code에서 Chat 패널 열기 (`Ctrl+Shift+L`)
2. `@webos-tv-assistant` 선택
3. webOS TV 개발 관련 질문 입력

### 2. 예시 질문들
- "현재 프로젝트에 맞는 Audio API 코드 만들어줘"
- "webOS TV 앱의 성능 최적화 방법 알려줘"
- "Database API로 데이터 저장하는 코드 작성해줘"
- "Magic Remote 이벤트 처리하는 방법 알려줘"
- "webOS TV 앱 배포 과정 설명해줘"

### 3. AI 모델 정보
- **주 모델**: GPT-4o (Copilot 기반) + MCP 서버 통합
- **폴백**: MCP 서버 기반 응답
- **특징**: 
  - **MCP 서버 우선 정보 수집**: 최신 API 정보를 먼저 조회하여 LM에 컨텍스트로 제공
  - **실시간 스트리밍 응답**: GPT-4o의 자연스러운 응답 생성
  - **프로젝트 컨텍스트 인식**: 현재 파일과 프로젝트 구조 분석
  - **webOS TV 개발 전문가 역할**: 최신 정보 기반 정확한 답변
  - **한국어 응답 지원**: 모든 답변을 한국어로 제공
  - **자동 폴백**: LM API 실패 시 MCP 서버 기반 응답으로 자동 전환

## 🛠️ Available Tools

### 1. webos_list_apis
webOS TV의 모든 Luna Service API 목록을 조회합니다.

**Parameters:**
- `category` (optional): system | media | device | network
- `status` (optional): active | deprecated  
- `version` (optional): webOS TV 버전 (예: "6.x", "24")

**Example:**
```json
{
  "category": "system",
  "status": "active",
  "version": "6.x"
}
```

### 2. webos_get_api_info
특정 webOS TV API의 상세 정보를 조회합니다.

**Parameters:**
- `serviceName` (required): API 서비스명
- `includeExamples` (optional): 예제 코드 포함 여부 (default: true)
- `includeCompatibility` (optional): 호환성 정보 포함 여부 (default: true)

**Example:**
```json
{
  "serviceName": "Activity Manager",
  "includeExamples": true,
  "includeCompatibility": true
}
```

### 3. webos_search_methods
메서드명이나 기능으로 API 메서드를 검색합니다.

**Parameters:**
- `query` (required): 검색어
- `apiName` (optional): 특정 API로 검색 범위 제한
- `includeDeprecated` (optional): deprecated 메서드 포함 여부 (default: false)

**Example:**
```json
{
  "query": "volume",
  "includeDeprecated": false
}
```

### 4. webos_generate_code
webOS TV API 호출을 위한 JavaScript 코드를 생성합니다.

**Parameters:**
- `serviceName` (required): API 서비스명
- `methodName` (required): 호출할 메서드명
- `parameters` (optional): 메서드 파라미터
- `includeErrorHandling` (optional): 에러 처리 코드 포함 여부 (default: true)
- `codeStyle` (optional): callback | async | promise (default: callback)

**Example:**
```json
{
  "serviceName": "Activity Manager",
  "methodName": "adopt",
  "parameters": {
    "activityId": 90,
    "wait": true,
    "subscribe": true
  },
  "codeStyle": "async"
}
```

### 5. webos_get_snippets
VS Code용 webOS TV API 스니펫을 조회합니다.

**Parameters:**
- `apiName` (optional): 특정 API의 스니펫만 조회
- `methodName` (optional): 특정 메서드의 스니펫만 조회
- `format` (optional): vscode | raw (default: vscode)

**Example:**
```json
{
  "apiName": "Activity Manager",
  "format": "vscode"
}
```

## 🗂️ 프로젝트 구조

```
webos-tv-api-mcp-server/
├── src/
│   ├── types/
│   │   └── webos-api.ts          # TypeScript 타입 정의
│   ├── services/
│   │   └── api-manager.ts        # API 데이터 관리 서비스
│   └── index.ts                  # MCP 서버 메인 파일
├── apis/                         # webOS TV API JSON 파일들
├── dist/                         # 빌드된 JavaScript 파일들
├── package.json
├── tsconfig.json
└── README_MCP.md
```

## 🔧 개발

### 로컬 테스트
```bash
# 개발 모드로 서버 시작
npm run dev

# MCP 클라이언트에서 테스트
npx @modelcontextprotocol/inspector
```

### Cursor/Claude와 연동
MCP 설정 파일에 다음을 추가:

```json
{
  "mcpServers": {
    "webos-tv-api": {
      "command": "node",
      "args": ["path/to/webos-tv-api-mcp-server/dist/index.js"]
    }
  }
}
```

## 📋 지원되는 API

현재 지원하는 webOS TV Luna Service APIs:

### System
- Activity Manager
- Application Manager  
- Database
- Keymanager3
- Settings Service
- System Service

### Media
- Audio
- DRM
- Media Database

### Device
- Camera (Deprecated)
- Device Unique ID
- Magic Remote
- TV Device Information

### Network
- BLE GATT
- Connection Manager

## 🚀 최신 개선 사항 (2025-01-06)

### Chat Participant 통합 개선
- **MCP 서버 우선 정보 수집**: 사용자 질문에 대해 MCP 서버에서 최신 API 정보를 먼저 조회
- **LM API 컨텍스트 강화**: MCP 서버에서 수집한 정보를 LM API에 컨텍스트로 제공
- **동적 API 정보 수집**: 사용자 질문 유형에 따라 관련 API 정보를 동적으로 수집
- **강화된 폴백 메커니즘**: LM API 실패 시 MCP 서버 기반 응답으로 자동 전환
- **실시간 코드 예제**: MCP 서버에서 제공하는 최신 코드 예제를 LM에 포함

### 개선된 응답 품질
- **최신 정보 반영**: MCP 서버의 최신 API 정보가 LM 응답에 반영
- **정확한 코드 생성**: 실제 사용 가능한 webOS TV API 코드 제공
- **컨텍스트 기반 답변**: 현재 프로젝트와 파일 내용을 고려한 맞춤형 답변
- **에러 처리 강화**: 다양한 오류 상황에 대한 적절한 폴백 제공

### 버그 수정 (2025-01-06)
- **MCP 응답 파싱 오류 해결**: MCP 서버의 마크다운 형식 응답을 올바르게 파싱
- **JSON 파싱 오류 수정**: "Found 15 w..." 형식의 응답을 정규식으로 파싱
- **안정성 향상**: 파싱 실패시 기본 API 목록으로 폴백

### API 매칭 및 상세 정보 개선 (2025-01-06)
- **정확한 API 이름 매핑**: "audio" → "Audio" 등 소문자 키워드를 정확한 API 이름으로 변환
- **지능형 API 매칭**: 점수 기반 시스템으로 사용자 질문과 가장 관련성 높은 API 식별
- **다중 API 상세 정보**: 관련된 여러 API의 메서드 정보를 동시에 수집하여 LM에 제공
- **API별 기본 메서드**: 각 API에 대한 적절한 기본 메서드 제공
- **향상된 키워드 매칭**: 다양한 키워드 변형을 통한 더 정확한 API 식별

## 🚧 향후 계획

### Phase 2: 고급 분석 기능
- 코드 분석 및 검증
- AI 기반 API 제안
- 자동 코드 수정

### Phase 3: 실시간 업데이트
- API 업데이트 확인
- 프로젝트 전체 검증
- 사용 패턴 분석

## 📚 추가 문서

- [Chat Participant 개선된 동작 흐름](./chat-participant-flow.md) - MCP 서버와 LM API 통합 방식 상세 설명

## 📄 라이선스

MIT License
