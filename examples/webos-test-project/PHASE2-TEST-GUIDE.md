# Phase 2 테스트 가이드

## 📋 개요

Phase 2에서는 다음 두 가지 주요 개선사항을 구현했습니다:

1. **비동기 Hover 처리 개선**
2. **MCP 연결 관리 개선**

## 🎯 Phase 2 개선사항

### 1. 비동기 Hover 처리 개선

#### ✅ 구현된 기능
- **타임아웃 설정**: 2초 타임아웃으로 UI 블록 방지
- **로딩 상태 표시**: "⏳ Loading method information..." 표시
- **취소 토큰 지원**: 사용자가 마우스를 이동하면 요청 취소
- **Fallback Hover**: MCP 실패 시 기본 정보 제공
- **에러 처리**: 타임아웃/실패 시 적절한 fallback

#### 🧪 테스트 파일
- `test-phase2-async-hover.js`: 비동기 Hover 처리 테스트

### 2. MCP 연결 관리 개선

#### ✅ 구현된 기능
- **자동 재연결**: 최대 5회, 30초 간격으로 자동 재연결
- **연결 상태 모니터링**: 실시간 연결 상태 추적
- **상태바 표시**: VS Code 상태바에 연결 상태 표시
- **에러 복구 메커니즘**: 연결 실패 시 자동 복구 시도
- **수동 재연결**: Command Palette에서 수동 재연결 가능

#### 🧪 테스트 파일
- `test-phase2-mcp-connection.js`: MCP 연결 관리 테스트

## 🚀 테스트 실행 방법

### 1. 확장 프로그램 설치

```bash
# Phase 2 개선사항이 포함된 확장 프로그램 빌드
cd vscode-extension
npm run compile
npm run package

# VSIX 파일 설치
code --install-extension webos-tv-api-assistant-1.0.0.vsix
```

### 2. 테스트 파일 열기

VS Code에서 다음 파일들을 열어 테스트하세요:

1. `test-phase2-async-hover.js`
2. `test-phase2-mcp-connection.js`
3. `test-phase2-integration.js`

### 3. 비동기 Hover 테스트

#### 테스트 1: 빠른 응답 Hover
```javascript
const audioService = webOS.service.request(
    'luna://com.webos.audio', // 이 URI에 마우스를 올려보세요
    {
        method: 'getVolume', // 이 메서드에 마우스를 올려보세요
        // ...
    }
);
```

**예상 결과:**
- 빠른 응답 (1초 이내)
- 상세한 메서드 정보 표시
- 파라미터 및 예제 코드 포함

#### 테스트 2: 느린 응답 Hover
```javascript
const connectionService = webOS.service.request(
    'luna://com.webos.service.connectionmanager', // 이 URI에 마우스를 올려보세요
    {
        method: 'getStatus', // 이 메서드에 마우스를 올려보세요
        // ...
    }
);
```

**예상 결과:**
- 로딩 상태 표시: "⏳ Loading method information..."
- 2초 후 타임아웃
- Fallback 정보 표시

#### 테스트 3: Fallback Hover
```javascript
const unknownService = webOS.service.request(
    'luna://com.webos.service.unknown', // 이 URI에 마우스를 올려보세요
    {
        method: 'unknownMethod', // 이 메서드에 마우스를 올려보세요
        // ...
    }
);
```

**예상 결과:**
- 즉시 Fallback 정보 표시
- 기본 사용법 예제 제공
- 문서 링크 포함

### 4. MCP 연결 관리 테스트

#### 테스트 1: 정상 연결 상태
**확인 사항:**
- VS Code 상태바에 "✅ webOS API" 표시
- Hover 정보 정상 제공
- 자동완성 정상 동작

#### 테스트 2: 연결 끊김 시뮬레이션
**단계:**
1. 작업 관리자에서 Node.js 프로세스 종료
2. 30초 후 자동 재연결 시도 확인
3. 상태바에 "🔄 webOS API" 표시 확인

**예상 결과:**
- 자동 재연결 시도 (최대 5회)
- 재연결 성공 시 "✅ webOS API" 표시
- 재연결 실패 시 "❌ webOS API" 표시

#### 테스트 3: 수동 재연결
**단계:**
1. Command Palette 열기 (Ctrl+Shift+P)
2. "webOS TV: Reconnect MCP Server" 실행
3. 연결 상태 확인

**예상 결과:**
- 재연결 시도 메시지 표시
- 성공 시 "Successfully reconnected" 메시지
- 실패 시 에러 메시지 표시

### 5. 통합 테스트

#### 테스트 1: 연결 상태에 따른 Hover 동작
- **정상 연결**: 빠른 응답, 상세 정보
- **연결 불안정**: 타임아웃 후 Fallback
- **연결 실패**: 즉시 Fallback

#### 테스트 2: 상태바와 Hover 연동
- 상태바 표시와 Hover 정보 일관성 확인
- 재연결 과정에서의 상태 변화 확인

## 📊 성능 지표

### Hover 응답성
- **정상 응답**: 1초 이내
- **타임아웃**: 2초
- **Fallback**: 즉시

### MCP 연결 관리
- **재연결 시도**: 최대 5회
- **재연결 간격**: 30초
- **상태 업데이트**: 실시간

## 🔍 디버깅

### VS Code 개발자 도구
1. Help > Toggle Developer Tools
2. Console 탭에서 로그 확인

### 주요 로그 메시지
```
⏱️ Creating method hover with timeout for: "getVolume"
🔄 Attempting to get method info from MCP...
✅ Method hover completed successfully for: "getVolume"
🔄 Scheduling reconnection attempt 1/5 in 30 seconds
✅ MCP Server started successfully!
```

### 상태바 아이콘 의미
- `✅`: 연결됨
- `🔄`: 재연결 중
- `❌`: 연결 실패
- `⏰`: 타임아웃

## 🐛 문제 해결

### Hover가 표시되지 않는 경우
1. MCP 서버 연결 상태 확인
2. VS Code 개발자 도구에서 에러 로그 확인
3. Fallback 모드로 동작하는지 확인

### 자동 재연결이 작동하지 않는 경우
1. MCP 서버 경로 설정 확인
2. Node.js 프로세스 상태 확인
3. 수동 재연결 명령 시도

### 상태바가 표시되지 않는 경우
1. 확장 프로그램 재시작
2. VS Code 재시작
3. 확장 프로그램 재설치

## 📝 테스트 체크리스트

### 비동기 Hover 처리
- [ ] 빠른 응답 Hover (1초 이내)
- [ ] 로딩 상태 표시
- [ ] 타임아웃 후 Fallback
- [ ] 취소 토큰 동작
- [ ] 에러 처리

### MCP 연결 관리
- [ ] 정상 연결 상태 표시
- [ ] 자동 재연결 (5회 시도)
- [ ] 상태바 업데이트
- [ ] 수동 재연결 명령
- [ ] 에러 복구 메커니즘

### 통합 기능
- [ ] 연결 상태에 따른 Hover 동작
- [ ] 상태바와 Hover 연동
- [ ] Fallback 시스템 통합
- [ ] 성능 지표 달성

## 🎉 성공 기준

Phase 2가 성공적으로 완료된 경우:

1. **Hover 응답 시간**: 2초 이내
2. **UI 블록 없음**: 타임아웃으로 방지
3. **자동 재연결**: 30초 이내 복구
4. **사용자 개입 없음**: 자동 복구
5. **상태 표시**: 실시간 상태바 업데이트

---

**Phase 2 테스트 완료 후 Phase 3 (Medium Priority Issues)로 진행합니다.**
