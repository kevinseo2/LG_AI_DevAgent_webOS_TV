# 🧪 webOS TV AI 개발 에이전트 예제

이 디렉터리는 webOS TV AI 개발 에이전트의 사용 예제와 테스트 프로젝트를 포함합니다.

## 📁 예제 구조

### 🎮 [webOS 테스트 프로젝트](webos-test-project/)

실제 webOS TV 앱 구조를 가진 테스트 프로젝트로, VS Code 확장의 모든 기능을 체험할 수 있습니다.

#### 파일 구성
```
webos-test-project/
├── 📱 appinfo.json                    # webOS TV 앱 설정
├── 🌐 index.html                      # 메인 HTML
├── 📁 js/
│   └── main.js                        # 메인 JavaScript (테스트용)
├── 🧪 test-extension.js               # VS Code 확장 기능 테스트
├── 📖 VS-Code-Extension-Test-Guide.md # 확장 테스트 가이드
└── 🚀 mcp-deployment-demo.md          # MCP 배포 전략 데모
```

#### 테스트할 수 있는 기능

1. **자동완성 (IntelliSense)**
   - Luna Service URI 자동 제안
   - 메서드 및 파라미터 자동완성

2. **스니펫 (Code Snippets)**
   - `webos-request` - 기본 API 호출 템플릿
   - `webos-audio-volume` - 오디오 볼륨 제어
   - `webos-network-status` - 네트워크 상태 확인

3. **Quick Fix**
   - 에러 처리 누락 감지
   - `onFailure` 핸들러 자동 추가

4. **호버 정보**
   - API 메서드 설명
   - 파라미터 및 리턴값 정보

## 🚀 사용 방법

### 1. VS Code로 예제 열기

```bash
# 프로젝트 루트에서
cd examples/webos-test-project
code .
```

### 2. 확장 기능 테스트

1. `test-extension.js` 파일 열기
2. 각 테스트 함수에서 webOS API 코드 작성
3. 자동완성, Quick Fix, 호버 기능 확인

### 3. 실제 앱 테스트

1. `js/main.js` 파일에서 실제 API 호출 구현
2. webOS TV 시뮬레이터나 실제 디바이스에서 테스트

## 📋 테스트 시나리오

### 시나리오 1: 오디오 API 테스트
```javascript
function testAudioAPI() {
    // 여기서 'webOS.service.request(' 입력 시
    // luna://com.webos.service.audio 자동완성 확인
}
```

### 시나리오 2: 네트워크 API 테스트  
```javascript
function testNetworkAPI() {
    // Connection Manager API 자동완성 테스트
    // getStatus 메서드 제안 확인
}
```

### 시나리오 3: 에러 처리 테스트
```javascript
function badAPICall() {
    // onFailure 누락 시 Quick Fix 제안 확인
    webOS.service.request('luna://com.webos.service.audio', {
        method: 'getVolume',
        onSuccess: function(response) {
            console.log(response.volume);
        }
        // onFailure 누락 - Quick Fix 알림 확인
    });
}
```

## 🎯 기대 결과

정상적으로 확장이 작동한다면:

- ✅ **15개 Luna Service API** 자동완성
- ✅ **10개 스니펫** 정상 작동
- ✅ **실시간 에러 감지** 및 수정 제안
- ✅ **상세한 호버 문서** 표시
- ✅ **AI 기반 제안** (MCP 서버 연동 시)

## 🔧 문제 해결

### 자동완성이 작동하지 않는 경우
1. VS Code 확장 탭에서 "webOS TV API Assistant" 활성화 확인
2. JavaScript 언어 모드 확인
3. VS Code 재시작 (`Ctrl + Shift + P` → "Reload Window")

### Quick Fix가 나타나지 않는 경우
1. 의도적으로 에러가 있는 코드 작성
2. 전구 아이콘(💡) 또는 `Ctrl + .` 확인
3. 개발자 도구에서 확장 로그 확인

## 📚 추가 리소스

- **[테스트 가이드](webos-test-project/VS-Code-Extension-Test-Guide.md)**: 상세한 테스트 절차
- **[MCP 배포 데모](webos-test-project/mcp-deployment-demo.md)**: 배포 전략 실증
- **[메인 문서](../docs/)**: 전체 프로젝트 문서
- **[API 문서](../apis/)**: Luna Service API 정의

---

**Happy Testing! 🎉**

webOS TV AI 개발 에이전트가 여러분의 개발 생산성을 크게 향상시킬 것입니다!
