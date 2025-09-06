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
- ✅ **지능형 Chat Participant**: **VS Code LM API 기반 AI 어시스턴트**
  - GPT-4o 모델 활용
  - 실시간 스트리밍 응답
  - 프로젝트 컨텍스트 인식
  - webOS TV 개발 전문가 역할

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
- **주 모델**: GPT-4o (Copilot 기반)
- **폴백**: MCP 서버 기반 응답
- **특징**: 
  - 실시간 스트리밍 응답
  - 프로젝트 컨텍스트 인식
  - webOS TV 개발 전문가 역할
  - 한국어 응답 지원

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

## 🚧 향후 계획

### Phase 2: 고급 분석 기능
- 코드 분석 및 검증
- AI 기반 API 제안
- 자동 코드 수정

### Phase 3: 실시간 업데이트
- API 업데이트 확인
- 프로젝트 전체 검증
- 사용 패턴 분석

## 📄 라이선스

MIT License
