# 🧪 webOS TV API Assistant VS Code 확장 테스트 가이드

## 📋 설치 확인

✅ **확장 설치 완료**: `webOS TV API Assistant v1.0.0`

확장이 제대로 설치되었는지 확인하세요:
1. VS Code에서 `Ctrl + Shift + X` (확장 탭)
2. "webOS TV API Assistant" 검색
3. 설치됨으로 표시되어야 함

## 🎯 테스트 시나리오

### 1. **자동완성 (IntelliSense) 테스트**

#### 테스트 1-1: Luna Service URI 자동완성
1. `js/main.js` 파일을 엽니다
2. `testAudioAPI()` 함수 안에서 다음을 입력:
   ```javascript
   webOS.service.request('luna://
   ```
3. **예상 결과**: 
   - Luna Service URI 목록이 자동완성으로 나타남
   - `luna://com.webos.service.audio` 등이 제안됨

#### 테스트 1-2: 메서드 자동완성
1. Luna Service URI를 완성한 후:
   ```javascript
   webOS.service.request('luna://com.webos.service.audio', {
       method: '
   ```
2. **예상 결과**:
   - `getVolume`, `setVolume`, `getMute`, `setMute` 등 메서드 제안

#### 테스트 1-3: 파라미터 자동완성
1. 메서드를 선택한 후:
   ```javascript
   webOS.service.request('luna://com.webos.service.audio', {
       method: 'getVolume',
       parameters: {
   ```
2. **예상 결과**:
   - `subscribe: true/false` 등 파라미터 제안

### 2. **스니펫 테스트**

#### 테스트 2-1: webOS Request 스니펫
1. 새 줄에서 `webos-request` 입력 후 `Tab`
2. **예상 결과**:
   ```javascript
   webOS.service.request('luna://service.uri', {
       method: 'methodName',
       parameters: {
           // parameters
       },
       onSuccess: function(response) {
           // Handle success
       },
       onFailure: function(error) {
           // Handle error
       }
   });
   ```

#### 테스트 2-2: Audio API 스니펫
1. `webos-audio-volume` 입력 후 `Tab`
2. **예상 결과**: Audio volume control 템플릿 생성

### 3. **Quick Fix 테스트**

#### 테스트 3-1: 에러 처리 누락 감지
1. 다음 코드를 작성:
   ```javascript
   webOS.service.request('luna://com.webos.service.audio', {
       method: 'getVolume',
       parameters: {},
       onSuccess: function(response) {
           console.log(response.volume);
       }
       // onFailure 누락
   });
   ```
2. **예상 결과**:
   - 전구 아이콘(💡) 또는 빨간 밑줄 표시
   - Quick Fix 제안: "Add error handling"

#### 테스트 3-2: Quick Fix 적용
1. 전구 아이콘 클릭 또는 `Ctrl + .`
2. "Add error handling" 선택
3. **예상 결과**: `onFailure` 핸들러 자동 추가

### 4. **호버 정보 테스트**

#### 테스트 4-1: API 메서드 호버
1. `getVolume` 위에 마우스 커서를 올림
2. **예상 결과**:
   - API 설명과 파라미터 정보 표시
   - 사용 예제 포함

#### 테스트 4-2: Service URI 호버
1. `luna://com.webos.service.audio` 위에 마우스 커서를 올림
2. **예상 결과**:
   - 서비스 설명과 지원되는 메서드 목록 표시

### 5. **명령 팔레트 테스트**

#### 테스트 5-1: API 검색 명령
1. `Ctrl + Shift + P` 실행
2. "webOS: Search API" 입력
3. **예상 결과**: API 검색 대화상자 열림

#### 테스트 5-2: 코드 생성 명령
1. `Ctrl + Shift + P` 실행
2. "webOS: Generate Code" 입력
3. **예상 결과**: 코드 생성 마법사 실행

## 🔧 고급 테스트

### 테스트 A: 완전한 API 호출 작성
```javascript
function testAudioAPI() {
    updateStatus('Testing Audio API...');
    
    // 이 부분을 자동완성으로 완성해보세요
    webOS.service.request('luna://com.webos.service.audio', {
        method: 'getVolume',
        parameters: {
            subscribe: true
        },
        onSuccess: function(response) {
            updateStatus(`Volume: ${response.volume}%`);
        },
        onFailure: function(error) {
            updateStatus(`Error: ${error.errorText}`);
        }
    });
}
```

### 테스트 B: 네트워크 API 구현
```javascript
function testNetworkAPI() {
    updateStatus('Testing Network API...');
    
    // Connection Manager API를 자동완성으로 구현
    // 예상: luna://com.webos.service.connectionmanager
    // 메서드: getStatus
}
```

### 테스트 C: 다중 API 호출
```javascript
function testDeviceInfo() {
    updateStatus('Testing Device Info API...');
    
    // System Property API + Settings Service API 조합 사용
    // 자동완성이 두 서비스 모두 제안하는지 확인
}
```

## ✅ 성공 기준

확장이 올바르게 작동한다면:

1. **자동완성**: Luna Service URI, 메서드, 파라미터가 정확히 제안됨
2. **스니펫**: 10개 이상의 webOS API 스니펫이 정상 작동
3. **Quick Fix**: 에러 처리 누락 감지 및 자동 수정 제안
4. **호버**: 상세한 API 문서와 예제 표시
5. **명령**: 4개 주요 명령이 모두 정상 실행

## 🚨 문제 해결

### 자동완성이 작동하지 않는 경우:
1. 확장이 활성화되었는지 확인
2. JavaScript/TypeScript 언어 모드 확인
3. VS Code 재시작 시도

### 에러가 발생하는 경우:
1. 개발자 콘솔 확인 (`Help > Toggle Developer Tools`)
2. 확장 로그 확인
3. VS Code Output 패널에서 "webOS TV API Assistant" 채널 확인

## 🎉 추가 기능

실제 webOS TV 시뮬레이터나 디바이스에서 이 코드를 실행하면:
- Audio API가 실제 TV 볼륨을 제어
- Network API가 실제 연결 상태를 반환
- Device API가 실제 TV 모델 정보를 제공

---

**Happy Testing! 🚀**

webOS TV API Assistant가 개발 생산성을 크게 향상시킬 것입니다!
