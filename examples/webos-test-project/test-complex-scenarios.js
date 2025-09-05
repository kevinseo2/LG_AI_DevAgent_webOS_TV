// 복잡한 시나리오 자동완성 테스트
// 여러 줄, 중첩된 상황에서의 Smart Completion 테스트

console.log('🧩 복잡한 시나리오 자동완성 테스트');

// =============================================================================
// 테스트 1: 여러 줄 webOS.service.request
// =============================================================================

console.log('\n📝 테스트 1: 여러 줄 webOS.service.request');

function testMultilineWebOSRequest() {
    console.log('다음과 같은 여러 줄 상황에서 자동완성 테스트:');
    
    // 테스트 케이스 1-1: service.uri 자동완성
    const audioAPI = webOS.service.request(
        'service.uri', // ← 이 부분에서 자동완성 (luna://com.webos.audio 기대)
        {
            method: 'getVolume',
            parameters: {
                subscribe: true
            },
            onSuccess: function(response) {
                console.log('Volume:', response.volume);
            },
            onFailure: function(error) {
                console.error('Error:', error.errorText);
            }
        }
    );
    
    // 테스트 케이스 1-2: 부분 URI 자동완성
    const systemAPI = webOS.service.request(
        'luna://com.webos.ser', // ← 이 부분에서 자동완성
        {
            method: 'getSystemInfo'
        }
    );
}

// =============================================================================
// 테스트 2: 이상한 문자열 생성 방지
// =============================================================================

console.log('\n📝 테스트 2: 이상한 문자열 생성 방지 (setMutedmethodName 문제)');

function testCorruptedStringPrevention() {
    console.log('이전에 발생했던 setMutedmethodName 같은 이상한 문자열 생성 방지:');
    
    // 문제 상황 재현 및 수정 확인
    webOS.service.request('luna://com.webos.audio', {
        method: 'setMutedmethodName', // ← 이런 이상한 문자열에서 자동완성 시
        // 기대: 올바른 메서드로 완전히 교체 (setMuted, getVolume 등)
        parameters: {
            muted: true
        }
    });
    
    // 다른 문제 패턴들
    webOS.service.request('luna://com.webos.audio', {
        method: 'getVolumemethodName', // ← 이런 패턴도 올바르게 교체되어야 함
        parameters: {}
    });
    
    webOS.service.request('luna://com.webos.audio', {
        method: 'methodNamesetMuted', // ← 이런 패턴도 올바르게 교체되어야 함
        parameters: {}
    });
}

// =============================================================================
// 테스트 3: 중첩된 함수 호출에서의 자동완성
// =============================================================================

console.log('\n📝 테스트 3: 중첩된 함수 호출에서의 자동완성');

function testNestedFunctionCalls() {
    console.log('중첩된 함수나 복잡한 구조에서의 자동완성:');
    
    // 콜백 함수 내부의 webOS 호출
    function handleUserAction() {
        setTimeout(() => {
            webOS.service.request('service.uri', { // ← 자동완성 테스트
                method: 'methodName', // ← 자동완성 테스트
                onSuccess: (response) => {
                    // 또 다른 nested 호출
                    webOS.service.request('luna://com.webos.service.', { // ← 자동완성 테스트
                        method: '', // ← 자동완성 테스트
                        parameters: {}
                    });
                }
            });
        }, 1000);
    }
    
    // Promise 체인에서의 webOS 호출
    Promise.resolve()
        .then(() => {
            return webOS.service.request('service.', { // ← 자동완성 테스트
                method: 'get', // ← 자동완성 테스트
                parameters: {}
            });
        })
        .then(response => {
            console.log('Response:', response);
        });
}

// =============================================================================
// 테스트 4: 다양한 따옴표와 공백 패턴
// =============================================================================

console.log('\n📝 테스트 4: 다양한 따옴표와 공백 패턴');

function testQuoteAndSpacePatterns() {
    console.log('다양한 따옴표와 공백 상황에서의 자동완성:');
    
    // 쌍따옴표
    webOS.service.request("service.uri", { // ← 자동완성 테스트
        method: "methodName", // ← 자동완성 테스트
        parameters: {}
    });
    
    // 혼합 따옴표
    webOS.service.request('service.uri', {
        method: "methodName", // ← 혼합 상황에서도 정상 동작해야 함
        parameters: {}
    });
    
    // 공백이 많은 경우
    webOS.service.request(
        'service.uri'    ,     { // ← 공백이 많아도 정상 동작
            method    :   'methodName'   , // ← 공백이 많아도 정상 동작
            parameters: {}
        }
    );
    
    // 탭과 공백 혼합
    webOS.service.request(	'service.uri'	, {
		method	:	'methodName'	,
		parameters: {}
	});
}

// =============================================================================
// 테스트 5: 에러 상황에서의 fallback
// =============================================================================

console.log('\n📝 테스트 5: 에러 상황에서의 fallback');

function testErrorFallback() {
    console.log('비정상적인 상황에서도 기본 자동완성 제공:');
    
    // 불완전한 문법
    webOS.service.request('service.', { // ← 끝이 잘린 상황
        method: 'method', // ← 불완전한 메서드명
        // parameters 누락
    });
    
    // 오타가 있는 상황
    webOS.service.request('luna://com.webos.audoi', { // ← 오타
        method: 'getVulome', // ← 오타
        parameters: {}
    });
    
    // 매우 긴 이상한 문자열
    webOS.service.request('service.uri.name.placeholder.long.string', { // ← 이상한 긴 문자열
        method: 'methodNameWithVeryLongCorruptedString', // ← 이상한 긴 문자열
        parameters: {}
    });
}

// =============================================================================
// 실행 및 결과 확인
// =============================================================================

console.log('\n🚀 테스트 실행');
console.log('================');

console.log('\n📋 테스트 가이드:');
console.log('1. 각 함수의 webOS.service.request 호출에서 자동완성 테스트');
console.log('2. service.uri → 올바른 Luna Service URI 자동완성');
console.log('3. methodName → 올바른 메서드명 자동완성');
console.log('4. 이상한 문자열 생성 없음 확인');
console.log('5. 다양한 상황에서 일관된 동작 확인');

console.log('\n✅ 성공 기준:');
console.log('- service.uri가 luna://com.webos.audio 등으로 정확히 교체');
console.log('- setMutedmethodName → setMuted로 완전히 교체');
console.log('- 여러 줄, 중첩 상황에서도 정상 동작');
console.log('- 다양한 따옴표와 공백 패턴에서 일관된 동작');
console.log('- 에러 상황에서도 최소한의 자동완성 제공');

// 실제 테스트 호출
testMultilineWebOSRequest();
testCorruptedStringPrevention();
testNestedFunctionCalls();
testQuoteAndSpacePatterns();
testErrorFallback();

console.log('\n🎉 복잡한 시나리오 테스트 준비 완료!');
console.log('이제 VS Code에서 각 상황을 실제로 테스트해보세요.');
