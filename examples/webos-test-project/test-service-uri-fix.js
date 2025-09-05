// service.uri 자동완성 수정 테스트
// 'luna://com.webos.audioservice.uri' 같은 이상한 문자열 생성 방지

console.log('🔧 service.uri 자동완성 수정 테스트');

// =============================================================================
// 테스트 1: 기본 service.uri 자동완성
// =============================================================================

console.log('\n📝 테스트 1: 기본 service.uri 자동완성');

function testBasicServiceURI() {
    console.log('기본적인 service.uri 자동완성 테스트:');
    
    // 테스트 케이스 1-1: 단순한 service.uri
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
    
    // 테스트 케이스 1-2: 쌍따옴표 사용
    const systemAPI = webOS.service.request(
        "service.uri", // ← 이 부분에서 자동완성
        {
            method: 'getSystemInfo'
        }
    );
}

// =============================================================================
// 테스트 2: 여러 줄 상황에서의 service.uri
// =============================================================================

console.log('\n📝 테스트 2: 여러 줄 상황에서의 service.uri');

function testMultilineServiceURI() {
    console.log('여러 줄에 걸친 webOS.service.request에서 service.uri 자동완성:');
    
    // 테스트 케이스 2-1: 여러 줄 webOS 호출
    const audioAPI = webOS.service.request(
        'service.uri', // ← 이 부분이 정확히 교체되어야 함
        {
            method: 'setMuted',
            parameters: {
                muted: true
            },
            onSuccess: function(response) {
                console.log('Mute status:', response.muted);
            },
            onFailure: function(error) {
                console.error('Error:', error.errorText);
            }
        }
    );
    
    // 테스트 케이스 2-2: 복잡한 여러 줄 구조
    function handleAudioControl() {
        return webOS.service.request(
            'service.uri', // ← 이 부분이 정확히 교체되어야 함
            {
                method: 'getVolume',
                parameters: {
                    subscribe: true
                },
                onSuccess: function(response) {
                    console.log('Volume changed:', response.volume);
                },
                onFailure: function(error) {
                    console.error('Volume error:', error.errorText);
                }
            }
        );
    }
}

// =============================================================================
// 테스트 3: 이상한 문자열 생성 방지
// =============================================================================

console.log('\n📝 테스트 3: 이상한 문자열 생성 방지');

function testCorruptedStringPrevention() {
    console.log('이전에 발생했던 luna://com.webos.audioservice.uri 같은 이상한 문자열 생성 방지:');
    
    // 문제 상황: service.uri가 완전히 교체되지 않고 일부가 남아있는 경우
    webOS.service.request(
        'service.uri', // ← 이 부분이 luna://com.webos.audio로 완전히 교체되어야 함
        // 기대: 'luna://com.webos.audio' (완전한 교체)
        // 문제: 'luna://com.webos.audioservice.uri' (부분 교체)
        {
            method: 'getVolume',
            parameters: {}
        }
    );
    
    // 다른 문제 패턴들
    webOS.service.request(
        'service.uri', // ← 완전한 교체 기대
        {
            method: 'setMuted',
            parameters: { muted: true }
        }
    );
    
    webOS.service.request(
        "service.uri", // ← 쌍따옴표에서도 완전한 교체 기대
        {
            method: 'getSystemInfo',
            parameters: {}
        }
    );
}

// =============================================================================
// 테스트 4: 다양한 따옴표와 공백 패턴
// =============================================================================

console.log('\n📝 테스트 4: 다양한 따옴표와 공백 패턴');

function testQuoteAndSpacePatterns() {
    console.log('다양한 따옴표와 공백 상황에서의 service.uri 자동완성:');
    
    // 테스트 케이스 4-1: 공백이 많은 경우
    webOS.service.request(
        'service.uri'    ,     { // ← 공백이 많아도 정상 동작
            method: 'getVolume',
            parameters: {}
        }
    );
    
    // 테스트 케이스 4-2: 탭과 공백 혼합
    webOS.service.request(	'service.uri'	, {
		method: 'setMuted',
		parameters: { muted: true }
	});
    
    // 테스트 케이스 4-3: 주석이 있는 경우
    webOS.service.request(
        'service.uri', // 이 부분이 정확히 교체되어야 함
        {
            method: 'getVolume'
        }
    );
}

// =============================================================================
// 테스트 5: 에러 상황에서의 fallback
// =============================================================================

console.log('\n📝 테스트 5: 에러 상황에서의 fallback');

function testErrorFallback() {
    console.log('비정상적인 상황에서도 기본 자동완성 제공:');
    
    // 불완전한 문법
    webOS.service.request('service.', { // ← 끝이 잘린 상황
        method: 'getVolume'
    });
    
    // 오타가 있는 상황
    webOS.service.request('servic.uri', { // ← 오타
        method: 'getVolume'
    });
    
    // 매우 긴 이상한 문자열
    webOS.service.request('service.uri.placeholder.long.string', { // ← 이상한 긴 문자열
        method: 'getVolume'
    });
}

// =============================================================================
// 실행 및 결과 확인
// =============================================================================

console.log('\n🚀 테스트 실행');
console.log('================');

console.log('\n📋 테스트 가이드:');
console.log('1. 각 함수의 webOS.service.request 호출에서 service.uri 자동완성 테스트');
console.log('2. service.uri → luna://com.webos.audio 등으로 정확히 교체되는지 확인');
console.log('3. 이상한 문자열 생성 없음 확인 (luna://com.webos.audioservice.uri 방지)');
console.log('4. 여러 줄, 다양한 상황에서 일관된 동작 확인');

console.log('\n✅ 성공 기준:');
console.log('- service.uri가 luna://com.webos.audio로 완전히 교체');
console.log('- luna://com.webos.audioservice.uri 같은 이상한 문자열 생성 없음');
console.log('- 여러 줄, 중첩 상황에서도 정상 동작');
console.log('- 다양한 따옴표와 공백 패턴에서 일관된 동작');
console.log('- 에러 상황에서도 최소한의 자동완성 제공');

console.log('\n❌ 실패 패턴:');
console.log('- luna://com.webos.audioservice.uri (부분 교체)');
console.log('- service.uri가 전혀 교체되지 않음');
console.log('- 이상한 조합 문자열 생성');

// 실제 테스트 호출
testBasicServiceURI();
testMultilineServiceURI();
testCorruptedStringPrevention();
testQuoteAndSpacePatterns();
testErrorFallback();

console.log('\n🎉 service.uri 자동완성 수정 테스트 준비 완료!');
console.log('이제 VS Code에서 각 상황을 실제로 테스트해보세요.');
console.log('\n🔍 디버깅 팁:');
console.log('- VS Code 개발자 도구에서 로그 확인');
console.log('- "Found service.uri in webOS call" 로그 확인');
console.log('- "Smart service URI completion" 로그 확인');
