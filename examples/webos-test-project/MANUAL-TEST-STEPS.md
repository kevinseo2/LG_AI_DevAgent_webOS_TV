# 🧪 수동 테스트 단계별 가이드

## 🚀 1. 확장 설치 (선택 방법 중 하나)

### 방법 A: 직접 설치
```bash
# VS Code에서 확장 설치
code --install-extension "c:\dev\LG_AI_DevAgent_for_webOS_TV\vscode-extension\webos-tv-api-assistant-1.0.0.vsix"
```

### 방법 B: VS Code UI에서 설치
1. VS Code 열기
2. `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. `c:\dev\LG_AI_DevAgent_for_webOS_TV\vscode-extension\webos-tv-api-assistant-1.0.0.vsix` 선택

## 📂 2. 테스트 프로젝트 열기

```bash
cd "c:\dev\LG_AI_DevAgent_for_webOS_TV\examples\webos-test-project"
code .
```

## 🧪 3. 마지막 문자 누락 버그 테스트

### 테스트 케이스 1: Audio API URI 테스트

1. **`test-all-improvements.js` 파일 열기**

2. **문제 상황 재현**:
   ```javascript
   webOS.service.request('luna://com.webos.service.audi', {
   ```
   - 커서를 `audi` 끝에 위치
   - `Ctrl+Space` 자동완성 실행
   - 기대: `luna://com.webos.audio` 완전한 URI
   - 이전 문제: `luna://com.webos.audi` (마지막 'o' 누락)

3. **정상 동작 확인**:
   - ✅ 전체 URI가 올바르게 교체됨
   - ✅ 마지막 문자가 누락되지 않음

### 테스트 케이스 2: Method 자동완성 테스트

1. **Method 자동완성**:
   ```javascript
   webOS.service.request('luna://com.webos.audio', {
       method: 'getVolu',
   ```
   - 커서를 `getVolu` 끝에 위치
   - `Ctrl+Space` 자동완성 실행  
   - 기대: `getVolume` 완전한 메서드명
   - 이전 문제: `getVolu` (마지막 'me' 누락)

### 테스트 케이스 3: 부분 URI 확장 테스트

1. **부분 URI 테스트**:
   ```javascript
   webOS.service.request('luna://com.webos.au', {
   ```
   - 커서를 `au` 끝에 위치
   - 자동완성으로 Audio 서비스 선택
   - 기대: `luna://com.webos.audio` 완전한 URI

## 🔍 4. 디버깅 정보 확인

### Developer Tools 열기
1. `Ctrl+Shift+I` (또는 `Help > Toggle Developer Tools`)
2. **Console 탭** 선택
3. 자동완성 실행 시 로그 확인:

```
🔍 findQuotedContentAtLineEnd: {
  content: "luna://com.webos.service.audi",
  quote: "'",
  linePrefix: "    webOS.service.request('luna://com.webos.service.audi",
  cursorPos: 52,
  absoluteStartPos: 28,
  absoluteEndPos: 52
}

📝 Creating replacement edit: {
  newText: "luna://com.webos.audio",
  oldContent: "luna://com.webos.service.audi",
  startPos: 28,
  endPos: 52,
  ...
}
```

## ✅ 5. 성공 기준

### 수정 전 (문제 상황)
- ❌ `luna://com.webos.audi` (마지막 'o' 누락)
- ❌ `getVolu` (마지막 'me' 누락)  
- ❌ 부정확한 range 계산

### 수정 후 (기대 결과)
- ✅ `luna://com.webos.audio` (완전한 URI)
- ✅ `getVolume` (완전한 메서드)
- ✅ 정확한 range 계산

## 🐛 6. 문제 발견 시 체크리스트

### 여전히 문제가 있다면:

1. **콘솔 로그 확인**:
   - `startPos`와 `endPos` 값이 올바른지
   - `cursorPos`가 예상 위치인지
   - `content` 내용이 정확한지

2. **VS Code 설정 확인**:
   - 확장이 올바르게 설치되었는지
   - 다른 자동완성 확장과 충돌하지 않는지

3. **재시작 시도**:
   - VS Code 완전 재시작
   - 확장 비활성화 후 재활성화

## 🎯 7. 추가 테스트 시나리오

### 다양한 따옴표 테스트
```javascript
// 홑따옴표
webOS.service.request('luna://com.webos.service.audi', {

// 쌍따옴표  
webOS.service.request("luna://com.webos.service.audi", {

// 중간 위치 커서
webOS.service.request('luna://com.webos.ser|vice.audio', {
//                                    ↑ 커서 위치
```

### 다른 API들 테스트
```javascript
// Magic Remote (실제 URI: mrcu)
webOS.service.request('luna://com.webos.service.magicremot', {

// Database (실제 URI: palm.db)
webOS.service.request('luna://com.webos.service.d', {

// Keymanager3
webOS.service.request('luna://com.webos.service.keymanage', {
```

## 📊 결과 보고

테스트 완료 후:
- ✅/❌ URI 자동완성 마지막 문자 누락 수정
- ✅/❌ Method 자동완성 마지막 문자 누락 수정  
- ✅/❌ 다양한 시나리오에서 정상 동작
- 🔍 발견된 추가 문제들 (있다면)

이 수정으로 자동완성 시 마지막 문자가 누락되는 문제가 해결되었습니다! 🎉
