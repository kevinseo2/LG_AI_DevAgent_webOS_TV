# MCP 서버 vs VS Code 확장 배포 전략 분석

## 🎯 배포 옵션 비교

### 옵션 1: 완전 분리 배포 (현재 구조)
```
📦 MCP Server Package (NPM)
├── 독립 설치: npm install -g webos-tv-mcp-server
├── 독립 실행: webos-tv-mcp-server start
└── 포트: localhost:3000 (JSON-RPC)

📦 VS Code Extension (VSIX/Marketplace)
├── 확장 설치: VS Code Marketplace
├── MCP 서버 연결: 설정에서 서버 주소 지정
└── 통신: HTTP/WebSocket
```

**장점:**
- ✅ 확장성: 다른 에디터에서도 MCP 서버 사용 가능
- ✅ 성능: 서버 독립 실행으로 높은 성능
- ✅ 업데이트: 서버와 클라이언트 독립 업데이트
- ✅ 멀티유저: 여러 개발자가 하나의 서버 공유 가능

**단점:**
- ❌ 복잡성: 두 개 패키지 별도 설치
- ❌ 설정: 서버 주소 설정 필요
- ❌ 의존성: 서버가 실행되지 않으면 확장 기능 제한

### 옵션 2: 임베디드 배포
```
📦 VS Code Extension (All-in-One)
├── MCP 서버 내장: extension/server/
├── 자동 시작: 확장 활성화시 서버 자동 실행
└── 내부 통신: IPC/Local Socket
```

**장점:**
- ✅ 단순성: 하나의 패키지만 설치
- ✅ 자동화: 별도 설정 불필요
- ✅ 안정성: 항상 호환되는 버전

**단점:**
- ❌ 확장성: VS Code에서만 사용 가능
- ❌ 리소스: VS Code 프로세스 내에서 실행
- ❌ 업데이트: 전체 확장 재배포 필요

### 옵션 3: 하이브리드 배포
```
📦 VS Code Extension (기본 기능)
├── 로컬 캐시: 기본 API 데이터 내장
├── 오프라인 모드: 인터넷 없이도 기본 기능
└── 백그라운드 업데이트: 자동 캐시 갱신

📦 MCP Server (고급 기능) - 선택사항
├── AI 기능: 고급 분석 및 제안
├── 실시간 업데이트: 최신 API 정보
└── 팀 기능: 공유 설정 및 패턴
```

**장점:**
- ✅ 점진적 채택: 기본 → 고급 기능 순차 도입
- ✅ 유연성: 필요에 따라 서버 사용
- ✅ 안정성: 서버 없이도 기본 기능 동작

## 🎖️ 권장 전략: 하이브리드 접근법

### Phase 1: VS Code 확장 단독 배포
```typescript
// VS Code Extension (Standalone)
export class WebOSExtension {
  private localAPICache: Map<string, WebOSAPI>;
  private mcpClient?: MCPClient;

  async activate() {
    // 1. 로컬 캐시 로드 (항상 작동)
    await this.loadLocalCache();
    
    // 2. MCP 서버 연결 시도 (옵션)
    try {
      this.mcpClient = await this.connectToMCPServer();
    } catch (error) {
      console.log('MCP server not available, using local cache');
    }
  }

  async provideCompletions() {
    // MCP 서버 우선, 실패시 로컬 캐시 사용
    if (this.mcpClient) {
      return await this.mcpClient.getCompletions();
    } else {
      return this.getLocalCompletions();
    }
  }
}
```

### Phase 2: MCP 서버 추가 배포
```bash
# 고급 사용자를 위한 MCP 서버 설치
npm install -g @webos-tv/api-mcp-server

# 서버 실행
webos-tv-mcp-server --port 3000

# VS Code 설정
{
  "webos.mcpServer.enabled": true,
  "webos.mcpServer.url": "http://localhost:3000"
}
```

## 🚀 구현 방안

### 1. VS Code 확장 개선
```typescript
// 설정 추가
export interface WebOSConfig {
  mcpServer: {
    enabled: boolean;
    url: string;
    timeout: number;
    fallbackToLocal: boolean;
  };
  localCache: {
    autoUpdate: boolean;
    updateInterval: number; // hours
  };
}

// 자동 감지 로직
async function detectMCPServer(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/health');
    return response.ok;
  } catch {
    return false;
  }
}
```

### 2. MCP 서버 패키징
```json
// package.json for MCP Server
{
  "name": "@webos-tv/api-mcp-server",
  "bin": {
    "webos-tv-mcp-server": "./bin/cli.js"
  },
  "main": "./dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "install-service": "node scripts/install-service.js"
  }
}
```

### 3. 배포 전략
```bash
# NPM 패키지 배포
npm publish @webos-tv/api-mcp-server

# VS Code Marketplace 배포
vsce publish

# 설치 순서 (사용자)
1. code --install-extension webos-tv-api-assistant
2. npm install -g @webos-tv/api-mcp-server (선택사항)
```

## 📈 사용자 경험 시나리오

### 기본 사용자 (확장만 설치)
```
1. VS Code Extension 설치
2. webOS 프로젝트 열기
3. 즉시 기본 자동완성 동작
4. 로컬 캐시 기반 기능 사용
```

### 고급 사용자 (MCP 서버 추가)
```
1. VS Code Extension 설치
2. MCP Server 설치 및 실행
3. 확장이 자동으로 서버 감지
4. AI 기반 고급 기능 활용
5. 실시간 API 업데이트 수신
```

### 팀/기업 사용자
```
1. 공유 MCP 서버 설정
2. 팀원들은 확장만 설치
3. 서버 주소를 팀 설정으로 공유
4. 일관된 API 정보 및 패턴 사용
```

## 🎯 최종 권장사항

**즉시 구현**: 하이브리드 접근법
1. VS Code 확장에 기본 API 데이터 내장
2. MCP 서버 연결을 옵션으로 제공
3. 점진적 기능 확장 경로 제공

**장기 비전**: 에코시스템 구축
1. VS Code → IntelliJ → Vim 확장 지원
2. 웹 대시보드 → 모바일 앱 확장
3. LG전자 공식 도구로 발전
