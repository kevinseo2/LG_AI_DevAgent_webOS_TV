# 🧪 webOS TV API Assistant 개선사항 테스트 가이드

## 📋 개요

이 가이드는 webOS TV API Assistant 확장 프로그램의 Phase 1 개선사항들을 체계적으로 테스트하는 방법을 설명합니다.

## 🚀 설치 및 준비

### 1. 확장 프로그램 설치

```bash
# 1. 기존 확장 제거 (있는 경우)
code --uninstall-extension webos-tv-developer.webos-tv-api-assistant

# 2. 새 확장 설치
code --install-extension webos-tv-api-assistant-1.0.0.vsix
```

### 2. VS Code 설정

1. **Developer Tools 열기**: `Help > Toggle Developer Tools`
2. **콘솔 탭 선택**: 확장 프로그램 로그 확인용
3. **JavaScript 파일 열기**: 테스트용 파일들 열기

### 3. 테스트 프로젝트 열기

```bash
cd examples/webos-test-project
code .
```

## 🔍 개선사항별 테스트

### 🔄 1. URI 정규화 테스트 (Phase 1-1)

**테스트 파일**: `test-uri-normalization.js`

#### 1.1 기본 정규화 테스트

1. **파일 열기**: `test-uri-normalization.js`
2. **테스트 실행**:
   ```javascript
   webOS.service.request('luna://com.webos.audio', {
   ```
3. **기대 결과**:
   - 자동완성에서 `luna://com.webos.service.audio` 제안
   - 선택 시 정확히 교체됨

#### 1.2 Hover 정보 확인

1. **URI에 마우스 올리기**: `luna://com.webos.audio`
2. **기대 결과**:
   ```
   ### Audio Service
   **Standard URI:** luna://com.webos.service.audio
   **Original URI:** luna://com.webos.audio
   🔄 **Note:** URI has been normalized to standard format
   ```

#### ✅ 성공 기준
- [ ] 구형 URI가 신형 URI로 자동완성
- [ ] Hover에서 정규화 정보 표시
- [ ] 정규화 후 메서드 자동완성 정상 동작
- [ ] 기존 코드 호환성 유지

---

### 🧠 2. Smart Completion 테스트 (Phase 1-2)

**테스트 파일**: `test-smart-completion.js`

#### 2.1 Service URI 스마트 교체

1. **Placeholder 교체 테스트**:
   ```javascript
   webOS.service.request('service.uri', {
   ```
2. **자동완성 선택**: 실제 URI 선택
3. **기대 결과**: `'service.uri'` → `'luna://com.webos.service.audio'` 정확한 교체

#### 2.2 Method 스마트 교체

1. **Method Placeholder 테스트**:
   ```javascript
   method: 'methodName',
   ```
2. **자동완성 선택**: 실제 메서드 선택
3. **기대 결과**: `'methodName'` → `'getVolume'` 정확한 교체
4. **버그 확인**: `getPointerStatemethodName` 같은 이상한 문자열 없음

#### ✅ 성공 기준
- [ ] Placeholder가 정확히 교체됨
- [ ] 이상한 문자열 생성 없음
- [ ] 복잡한 상황에서도 정확한 교체
- [ ] 성능 저하 없음

---

### 🛡️ 3. Fallback 시스템 테스트 (Phase 1-3)

**테스트 파일**: `test-fallback-system.js`

#### 3.1 MCP 서버 연결 실패 시뮬레이션

1. **MCP 서버 중지**: 의도적으로 연결 차단
2. **VS Code 재시작**: 확장 프로그램 재로드
3. **상태바 확인**: `$(warning) webOS TV (7 APIs)`
4. **자동완성 테스트**: 기본 API들이 여전히 동작하는지 확인

#### 3.2 Fallback 자동완성 확인

1. **URI 자동완성**:
   ```javascript
   webOS.service.request('', {
   ```
2. **기대 결과**: 최소 7개 API 자동완성
   - `luna://com.webos.service.audio`
   - `luna://com.palm.activitymanager`
   - `luna://com.webos.applicationManager`
   - `luna://com.webos.service.connectionmanager`
   - `luna://com.webos.service.settings`
   - `luna://com.webos.service.systemservice`
   - `luna://com.webos.service.tv.systemproperty`

#### 3.3 Fallback 메서드 자동완성

1. **오디오 메서드 테스트**:
   ```javascript
   webOS.service.request('luna://com.webos.service.audio', {
       method: '', // 자동완성 확인
   ```
2. **기대 결과**: `getVolume`, `setVolume`, `setMuted` 자동완성

#### ✅ 성공 기준
- [ ] MCP 서버 실패해도 기본 기능 동작
- [ ] 상태바에 fallback 모드 표시
- [ ] 최소 7개 API 사용 가능
- [ ] 각 API의 기본 메서드 제공
- [ ] 재시도 기능 동작

---

## 🌍 4. 실제 시나리오 테스트

**테스트 파일**: `test-real-world-scenarios.js`

### 4.1 미디어 플레이어 앱 시나리오

1. **MediaPlayerApp 클래스 테스트**
2. **볼륨 조회 기능**:
   ```javascript
   async getVolume() {
       webOS.service.request('', { // URI 자동완성
           method: '', // 메서드 자동완성
           parameters: { // 파라미터 자동완성
   ```

### 4.2 스마트 홈 앱 시나리오

1. **SmartHomeApp 클래스 테스트**
2. **네트워크 상태 확인**:
   ```javascript
   async checkNetworkStatus() {
       webOS.service.request('', { // Connection Manager API
   ```

### 4.3 게임 앱 시나리오

1. **GameApp 클래스 테스트**
2. **매직 리모컨 설정**:
   ```javascript
   async setupMagicRemote() {
       webOS.service.request('', { // Magic Remote API
   ```

### ✅ 성공 기준
- [ ] 모든 클래스의 메서드에서 자동완성 동작
- [ ] URI, 메서드, 파라미터 순차 자동완성
- [ ] 실제 개발 패턴과 유사한 경험
- [ ] Hover로 API 문서 확인 가능

---

## 📊 5. 성능 및 안정성 테스트

### 5.1 성능 측정

1. **자동완성 응답 시간**:
   - 목표: 500ms 이내
   - 측정 방법: Developer Tools의 Performance 탭

2. **Hover 응답 시간**:
   - 목표: 2초 이내
   - 측정 방법: 실제 사용자 경험

3. **확장 시작 시간**:
   - 목표: 5초 이내
   - 측정 방법: VS Code 시작 후 첫 자동완성까지

### 5.2 안정성 확인

1. **메모리 누수 확인**:
   - 장시간 사용 후 성능 저하 없음
   - Developer Tools의 Memory 탭으로 확인

2. **에러 처리 확인**:
   - 잘못된 입력에 대한 적절한 처리
   - 콘솔에 과도한 에러 로그 없음

### ✅ 성공 기준
- [ ] 자동완성 500ms 이내
- [ ] Hover 2초 이내
- [ ] 확장 시작 5초 이내
- [ ] 메모리 누수 없음
- [ ] 안정적인 에러 처리

---

## 🐛 문제 리포트

테스트 중 문제를 발견하면 다음 정보와 함께 리포트해주세요:

### 문제 정보
- **카테고리**: URI 정규화 / Smart Completion / Fallback 시스템
- **발생 상황**: 구체적인 재현 단계
- **기대 결과**: 원래 예상했던 동작
- **실제 결과**: 실제로 발생한 동작
- **에러 메시지**: 콘솔의 에러 로그 (있는 경우)

### 환경 정보
- **VS Code 버전**: Help > About
- **확장 버전**: 1.0.0
- **운영체제**: Windows/Mac/Linux
- **테스트 파일**: 어떤 파일에서 테스트했는지

---

## ✅ 전체 테스트 체크리스트

### URI 정규화 (Phase 1-1)
- [ ] 구형 URI → 신형 URI 자동완성
- [ ] Hover에서 정규화 정보 표시
- [ ] 정규화 후 메서드 자동완성 정상
- [ ] 역호환성 유지

### Smart Completion (Phase 1-2)
- [ ] Service URI 스마트 교체
- [ ] Method 스마트 교체
- [ ] 이상한 문자열 생성 없음
- [ ] 복잡한 상황에서도 정확한 동작

### Fallback 시스템 (Phase 1-3)
- [ ] MCP 서버 실패 시 기본 기능 동작
- [ ] 상태바에 fallback 모드 표시
- [ ] 최소 API 세트 제공
- [ ] 재시도 기능 동작

### 실제 시나리오
- [ ] 미디어 플레이어 시나리오
- [ ] 스마트 홈 앱 시나리오
- [ ] 게임 앱 시나리오
- [ ] 개발 도구 시나리오

### 성능 및 안정성
- [ ] 자동완성 응답 시간
- [ ] Hover 응답 시간
- [ ] 메모리 누수 없음
- [ ] 안정적인 에러 처리

---

## 🎉 테스트 완료

모든 테스트를 완료하면:

1. **결과 요약**: 성공/실패한 테스트 항목 정리
2. **개선 제안**: 추가로 개선이 필요한 부분
3. **사용자 경험**: 전반적인 사용 경험 평가

이 개선된 확장 프로그램이 webOS TV 개발 생산성을 크게 향상시켰기를 바랍니다! 🚀
