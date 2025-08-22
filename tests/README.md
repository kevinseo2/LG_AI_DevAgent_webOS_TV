# 🧪 webOS TV AI 개발 에이전트 테스트

이 디렉터리는 MCP 서버와 AI 기능을 테스트하기 위한 스크립트들을 포함합니다.

## 📁 테스트 파일 구조

### 🔧 MCP 서버 테스트

#### `test-mcp.js`
기본 MCP 서버 기능 테스트
- webOS API 목록 조회
- 특정 API 정보 가져오기
- 메서드 검색 기능
- 코드 생성 기능

```bash
# MCP 서버 실행 후
node tests/test-mcp.js
```

#### `test-simple.mjs`
간단한 MCP 도구 테스트
- 5개 기본 도구 테스트
- JSON-RPC 통신 검증
- 응답 시간 측정

```bash
# 사용법
node tests/test-simple.mjs
```

### 🤖 AI 기능 테스트

#### `test-phase3.mjs`
Phase 3 AI 고급 기능 테스트
- AI 스마트 제안 기능
- 코드 분석 및 검증
- 실시간 API 업데이트 확인
- 컨텍스트 기반 제안

```bash
# AI 기능 테스트
node tests/test-phase3.mjs
```

## 🚀 테스트 실행 방법

### 1. 기본 테스트 (권장)
```bash
# 1. MCP 서버 실행 (별도 터미널)
npm run dev

# 2. 간단 테스트 실행
node tests/test-simple.mjs
```

### 2. 고급 AI 테스트
```bash
# AI 기능 테스트
node tests/test-phase3.mjs
```

### 3. 완전한 MCP 테스트
```bash
# 모든 기능 테스트
node tests/test-mcp.js
```

## ✅ 예상 결과

### 성공적인 테스트 결과:
- ✅ 15개 webOS TV API 로드
- ✅ 8개 MCP 도구 정상 작동
- ✅ AI 제안 기능 응답
- ✅ 코드 분석 완료
- ✅ 실시간 업데이트 확인

### 실패 시 확인사항:
- MCP 서버가 실행 중인지 확인
- Node.js 버전 (16.x 이상)
- 필요한 패키지 설치 상태
- 포트 충돌 (기본 3000번)

## 🔧 문제 해결

### MCP 서버 연결 실패
```bash
# 서버 상태 확인
netstat -an | findstr :3000

# 서버 재시작
npm run dev
```

### 패키지 오류
```bash
# 패키지 재설치
npm install

# 캐시 정리
npm cache clean --force
```

## 📊 성능 벤치마크

각 테스트는 다음 지표를 측정합니다:
- **응답 시간**: API 호출 응답 속도
- **정확도**: AI 제안의 관련성
- **안정성**: 연속 테스트 성공률
- **메모리 사용량**: 서버 리소스 사용량

---

**테스트를 통해 webOS TV AI 개발 에이전트의 품질을 보장합니다! 🎯**
