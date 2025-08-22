# webOS TV API MCP Server

webOS TV 개발자를 위한 Model Context Protocol (MCP) 서버입니다. Luna Service API 정보 제공, 코드 생성, 자동완성 등의 기능을 제공합니다.

## 🚀 기능

### Phase 1 (현재 구현)
- ✅ **API 목록 조회**: 카테고리, 상태, 버전별 필터링
- ✅ **API 상세 정보**: 메서드, 파라미터, 호환성 정보 조회
- ✅ **메서드 검색**: 이름이나 기능으로 API 메서드 검색
- ✅ **코드 생성**: Callback, Async, Promise 스타일 지원
- ✅ **VS Code 스니펫**: 개발 환경 통합을 위한 스니펫 제공

## 📦 설치

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
