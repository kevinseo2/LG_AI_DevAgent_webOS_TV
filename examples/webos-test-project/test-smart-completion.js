// Smart Completion 테스트 파일
// 개선된 자동완성 기능을 테스트합니다

console.log('🔥 Smart Completion 테스트 시작');

// 🧪 테스트 1: Service URI Smart Completion
// 아래 줄에서 따옴표 안의 기존 텍스트가 정확히 교체되는지 확인
function testServiceURIReplacement() {
    // 기존 텍스트: 'service.uri' → 새 URI로 정확히 교체되어야 함
    webOS.service.request('service.uri', {
        method: 'getVolume'
    });
    
    // 기존 텍스트: 'luna://' → 완전한 URI로 확장되어야 함
    webOS.service.request('luna://', {
        method: 'getVolume'
    });
    
    // 기존 텍스트: 'luna://com.webos' → 정확한 URI로 완성되어야 함
    webOS.service.request('luna://com.webos', {
        method: 'getVolume'
    });
}

// 🧪 테스트 2: Method Smart Completion  
// 기존의 'getPointerStatemethodName' 같은 버그가 발생하지 않는지 확인
function testMethodReplacement() {
    webOS.service.request('luna://com.webos.service.audio', {
        // 'methodName' → 정확한 메서드명으로 교체되어야 함
        method: 'methodName',
        parameters: {}
    });
    
    webOS.service.request('luna://com.webos.service.audio', {
        // 'getVolume' → 다른 메서드명으로 교체 시 정확히 교체되어야 함
        method: 'getVolume',
        parameters: {}
    });
    
    webOS.service.request('luna://com.webos.service.audio', {
        // 빈 따옴표 → 메서드명이 정확히 삽입되어야 함
        method: '',
        parameters: {}
    });
}

// 🧪 테스트 3: 복잡한 상황에서의 Smart Completion
function testComplexScenarios() {
    // 여러 줄에 걸친 webOS 호출
    webOS.service.request(
        'service.uri', // 이 부분이 정확히 교체되어야 함
        {
            method: 'methodName', // 이 부분도 정확히 교체되어야 함
            parameters: {
                subscribe: true
            },
            onSuccess: function(response) {
                console.log('Success:', response);
            },
            onFailure: function(error) {
                console.log('Error:', error.errorText);
            }
        }
    );
}

// 🧪 테스트 4: 부분 입력 상황
function testPartialInput() {
    // 'l' → 'luna://com.webos.service.audio' 완성
    webOS.service.request('l', {
        method: 'g' // 'g' → 'getVolume' 완성
    });
    
    // 'audio' → 'luna://com.webos.service.audio' 완성  
    webOS.service.request('audio', {
        method: 'set' // 'set' → 'setVolume' 완성
    });
}

// 🧪 테스트 5: 엣지 케이스
function testEdgeCases() {
    // 쌍따옴표와 홑따옴표 혼용
    webOS.service.request("service.uri", {
        method: "methodName"
    });
    
    // 공백이 있는 경우
    webOS.service.request(' service.uri ', {
        method: ' methodName '
    });
    
    // 불완전한 문자열 (닫는 따옴표 없음)
    webOS.service.request('service.uri
}

// 🎯 테스트 체크리스트:
console.log(`
✅ Smart Completion 테스트 항목:
1. Service URI 교체가 정확한지 확인
2. Method 이름 교체가 정확한지 확인  
3. 기존 버그 (getPointerStatemethodName) 해결 확인
4. 부분 입력 상황에서 올바른 확장
5. 엣지 케이스 처리
6. 성능 개선 확인
`);

// 📋 기대 결과:
// - 'service.uri' → 'luna://com.webos.service.audio' 정확히 교체
// - 'methodName' → 'getVolume' 정확히 교체
// - 이상한 문자열 조합 없음
// - 빠른 응답 속도
// - 안정적인 동작
