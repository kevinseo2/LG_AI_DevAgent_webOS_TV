// webOS TV API Assistant 확장 테스트 파일
// 이 파일에서 VS Code 확장의 모든 기능을 테스트할 수 있습니다

console.log('webOS TV API Test Started');

// 🧪 테스트 1: 자동완성 테스트
// 아래 줄에서 'webOS.service.request(' 를 입력해보세요
// Luna Service URI가 자동완성으로 나타나야 합니다


// 🧪 테스트 2: 스니펫 테스트  
// 새 줄에서 'webos-request' 입력 후 Tab을 눌러보세요


// 🧪 테스트 3: Audio API 테스트
function testAudioVolume() {
    // 여기에 webOS.service.request를 입력하면 자동완성이 동작해야 합니다
    // luna://com.webos.service.audio 선택
    // method: 'getVolume' 선택
    // parameters 자동완성 확인
    
}

// 🧪 테스트 4: Network API 테스트 
function checkNetworkStatus() {
    // Connection Manager API 자동완성 테스트
    // luna://com.webos.service.connectionmanager
    
}

// 🧪 테스트 5: 에러 처리 누락 감지 테스트
function badAPICall() {
    // 이 함수는 의도적으로 onFailure가 누락되었습니다
    // Quick Fix가 제안되어야 합니다
    webOS.service.request('luna://com.webos.service.audio', {
        method: 'getVolume',
        parameters: {},
        onSuccess: function(response) {
            console.log('Volume:', response.volume);
        }
        // onFailure 누락 - Quick Fix 제안되어야 함
    });
}

// 🧪 테스트 6: Device Info API
function getDeviceInfo() {
    // System Property API 테스트
    // 호버로 API 설명을 확인해보세요
    
}

// 🧪 테스트 7: 완전한 API 호출 예제
function completeAPIExample() {
    webOS.service.request('luna://com.webos.service.audio', {
        method: 'getVolume',
        parameters: {
            subscribe: true
        },
        onSuccess: function(response) {
            console.log('Current volume:', response.volume);
            console.log('Muted:', response.muted);
        },
        onFailure: function(error) {
            console.error('Failed to get volume:', error.errorText);
        }
    });
}

// 🎯 테스트 체크리스트:
// ✅ 1. Luna Service URI 자동완성 작동
// ✅ 2. 메서드 자동완성 작동  
// ✅ 3. 파라미터 자동완성 작동
// ✅ 4. 스니펫 정상 작동
// ✅ 5. Quick Fix 에러 감지
// ✅ 6. 호버 정보 표시
// ✅ 7. 명령 팔레트 명령 실행
