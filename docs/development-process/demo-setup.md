# webOS TV API Assistant - 데모 설정 가이드

webOS TV API MCP 서버와 VS Code 확장을 함께 테스트하기 위한 설정 가이드입니다.

## 🎯 완성된 구성요소

### 1. MCP 서버 (Phase 1 완료)
- **위치**: `./src/` (루트 디렉터리)
- **기능**: 15개 webOS TV Luna Service API 제공
- **도구**: 5가지 MCP tool commands

### 2. VS Code 확장 (Phase 2 완료)  
- **위치**: `./vscode-extension/`
- **기능**: 자동완성, Quick Fix, Hover, 스니펫
- **연동**: MCP 서버와 통신

## 🚀 설정 및 실행

### Step 1: MCP 서버 실행
```bash
# 루트 디렉터리에서
npm run dev
# 또는
npx tsx src/index.ts
```

**확인사항**: 
- "webOS TV API MCP Server started successfully" 메시지 확인
- "Loaded 15 webOS TV APIs" 메시지 확인

### Step 2: VS Code 확장 설정

#### 방법 1: 개발 모드로 테스트
1. VS Code에서 `vscode-extension` 폴더 열기
2. `F5` 키 누르기 (Extension Development Host 실행)
3. 새 VS Code 창에서 JavaScript/TypeScript 파일 생성

#### 방법 2: 패키지 설치 (선택사항)
```bash
cd vscode-extension
npm run package  # .vsix 파일 생성
code --install-extension webos-tv-api-assistant-1.0.0.vsix
```

### Step 3: 확장 설정
VS Code 설정 (`Ctrl+,`)에서 다음 추가:
```json
{
  "webos-api.mcpServerPath": "C:/dev/LG_AI_DevAgent_for_webOS_TV/dist/index.js",
  "webos-api.enableAutoComplete": true,
  "webos-api.enableQuickFix": true,
  "webos-api.codeStyle": "callback"
}
```

## 🧪 테스트 시나리오

### 1. 자동완성 테스트
JavaScript 파일에서 다음 입력:
```javascript
webOS.service.request('
```
→ Luna Service URI 자동완성 확인

```javascript
webOS.service.request('luna://com.webos.service.audio', {
    method: '
```
→ 메서드 자동완성 확인

### 2. Quick Fix 테스트
에러 처리가 없는 코드 작성:
```javascript
webOS.service.request('luna://com.webos.service.audio', {
    method: 'getVolume',
    parameters: {},
    onSuccess: function(response) {
        console.log(response);
    }
    // onFailure 누락
});
```
→ 💡 Quick Fix 아이콘 클릭으로 onFailure 추가

### 3. Hover 정보 테스트
다음 요소들에 마우스 hover:
- `luna://com.webos.service.audio` → API 정보 표시
- `getVolume` → 메서드 정보 표시  
- `webOS.service.request` → 사용법 정보 표시

### 4. 스니펫 테스트
JavaScript 파일에서 다음 입력 후 Tab:
- `webos-request` → 기본 API 호출 코드
- `webos-audio-getvolume` → 볼륨 조회 코드
- `webos-activity-adopt` → Activity 채택 코드

### 5. 명령 테스트
Command Palette (`Ctrl+Shift+P`)에서:
- "Search webOS TV APIs" → API 검색 창
- "Generate API Code" → 코드 생성 마법사
- "Refresh API Cache" → 캐시 새로고침

## 📊 기대 결과

### MCP 서버 응답 예시
```json
{
  "result": {
    "content": [{
      "type": "text", 
      "text": "Found 6 webOS TV APIs:\n\n**Activity Manager** (system)..."
    }]
  }
}
```

### VS Code 확장 동작
- ✅ 상태바에 "🚀 webOS TV (15 APIs)" 표시
- ✅ JavaScript/TypeScript 파일에서 자동완성 활성화
- ✅ 에러가 있는 코드에서 Quick Fix 제안
- ✅ API 호출 부분에서 hover 정보 표시

## 🔧 문제 해결

### MCP 서버 연결 실패
```bash
# 의존성 재설치
npm install @modelcontextprotocol/sdk zod glob ajv

# 서버 재시작
npx tsx src/index.ts
```

### VS Code 확장 오류
```bash
# 확장 재컴파일
cd vscode-extension
npm run compile

# VS Code 재시작
Ctrl+Shift+P → "Reload Window"
```

### API 로딩 실패
- `apis/` 폴더에 모든 JSON 파일이 있는지 확인
- JSON 파일 형식이 올바른지 확인
- MCP 서버 로그에서 "Loaded 15 webOS TV APIs" 메시지 확인

## 🎉 성공 지표

✅ **MCP 서버**: 5가지 tool command 모두 정상 응답  
✅ **VS Code 확장**: 자동완성, Quick Fix, Hover, 스니펫 모두 동작  
✅ **통합 테스트**: 확장에서 MCP 서버로 API 정보 조회 성공  
✅ **사용자 경험**: 개발자가 webOS TV API를 쉽게 사용할 수 있음

## 📹 데모 스크립트

1. **MCP 서버 시연**: 터미널에서 API 목록 조회, 코드 생성
2. **VS Code 자동완성**: Luna Service URI와 메서드 자동완성
3. **Quick Fix**: 에러 처리 추가, 코드 스타일 변환
4. **API 검색**: Command Palette에서 API 검색 및 문서 확인
5. **전체 워크플로우**: 새 webOS TV 앱 개발 시 전체 과정 시연

---

**🚀 webOS TV 개발자를 위한 완전한 개발 도구 완성!**
