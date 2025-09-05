# ⚡ 빠른 테스트 체크리스트

> 5분 내에 핵심 개선사항들을 빠르게 확인할 수 있는 체크리스트입니다.

## 🏃‍♂️ 빠른 시작

1. **확장 설치**: `install-and-test.bat` 실행
2. **테스트 파일 열기**: `test-all-improvements.js`
3. **아래 체크리스트 순서대로 테스트**

---

## ✅ 핵심 기능 체크리스트

### 🔄 1. URI 정규화 (30초)

```javascript
webOS.service.request('luna://com.webos.audio', {
```

**체크 포인트:**
- [ ] 자동완성에 `luna://com.webos.service.audio` 나타남
- [ ] 선택 시 정확히 교체됨
- [ ] URI에 hover 시 정규화 정보 표시

---

### 🧠 2. Smart Completion (30초)

```javascript
webOS.service.request('service.uri', {
    method: 'methodName',
```

**체크 포인트:**
- [ ] `'service.uri'` → 실제 URI로 깔끔하게 교체
- [ ] `'methodName'` → 실제 메서드로 깔끔하게 교체
- [ ] 이상한 문자열 (`getPointerStatemethodName`) 생성 안됨

---

### 🛡️ 3. Fallback 시스템 (1분)

**MCP 서버 연결 확인:**
- [ ] 상태바에 `$(rocket) webOS TV (X APIs)` 또는 `$(warning) webOS TV (X APIs)` 표시

**기본 자동완성:**
```javascript
webOS.service.request('', {
```
- [ ] 최소 7개 API 자동완성 목록 표시
- [ ] 각 API 선택 가능

**메서드 자동완성:**
```javascript
webOS.service.request('luna://com.webos.service.audio', {
    method: '',
```
- [ ] `getVolume`, `setVolume`, `setMuted` 등 메서드 자동완성

---

### 🎯 4. 통합 시나리오 (2분)

**완전한 API 호출 작성:**
```javascript
webOS.service.request('', { // 1. URI 자동완성
    method: '', // 2. 메서드 자동완성
    parameters: {
        // 3. 파라미터 자동완성 (있으면)
    },
    onSuccess: function(response) {
        console.log('Success:', response);
    },
    onFailure: function(error) {
        console.error('Error:', error.errorText);
    }
});
```

**체크 포인트:**
- [ ] 1단계: URI 자동완성 동작
- [ ] 2단계: 메서드 자동완성 동작  
- [ ] 3단계: 파라미터 힌트 표시 (있으면)
- [ ] Hover로 API 정보 확인 가능

---

### 🚀 5. 성능 체크 (1분)

**응답 속도:**
- [ ] 자동완성 즉시 표시 (500ms 이내)
- [ ] Hover 정보 빠른 표시 (2초 이내)
- [ ] 확장 프로그램 빠른 시작 (5초 이내)

**안정성:**
- [ ] 콘솔에 과도한 에러 없음
- [ ] 반복 사용 시 성능 저하 없음

---

## 🐛 문제 발견 시

**즉시 확인사항:**
1. **콘솔 에러**: `Ctrl+Shift+I` → Console 탭
2. **확장 상태**: 상태바 우측 하단 아이콘
3. **VS Code 버전**: `Help > About`

**자주 발생하는 문제:**
- **자동완성 안됨**: VS Code 재시작 시도
- **MCP 서버 연결 실패**: Fallback 모드로 동작하는지 확인
- **느린 응답**: Developer Tools에서 성능 확인

---

## ⭐ 성공 기준

**모든 체크 포인트 통과 시:**
- 🎉 **완벽!** 모든 개선사항이 정상 동작
- 📈 **개발 생산성 향상** 확실히 체감 가능
- 🛡️ **안정성 보장** MCP 서버 문제와 무관하게 동작

**일부 실패 시:**
- 📋 **리포트 작성** 실패한 항목과 상황 기록
- 🔧 **부분 성공** 동작하는 기능들은 사용 가능
- 🚀 **점진적 개선** 추가 개선 계획 수립

---

## 📞 지원

문제 발생 시:
1. **TEST-GUIDE.md** 상세 가이드 참조
2. **콘솔 로그** 스크린샷 첨부
3. **재현 단계** 구체적으로 기록

**테스트 완료 후:**
- 개발 생산성 체감도: ⭐⭐⭐⭐⭐ (5점 만점)
- 가장 유용한 기능: ________________
- 추가 개선 제안: ________________

---

🎯 **이 체크리스트로 5분 내에 핵심 개선사항들을 모두 확인할 수 있습니다!**
