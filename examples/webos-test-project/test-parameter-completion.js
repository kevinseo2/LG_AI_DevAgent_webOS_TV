// Parameter 자동완성 테스트
// parameters 객체 내에서 자동완성이 제대로 동작하는지 확인

console.log('🔧 Parameter 자동완성 테스트');

// =============================================================================
// 테스트 1: 기본 Parameter 자동완성
// =============================================================================

console.log('\n📝 테스트 1: 기본 Parameter 자동완성');

function testBasicParameterCompletion() {
    console.log('기본적인 parameter 자동완성 테스트:');
    
    // 테스트 케이스 1-1: Audio API parameters
    const audioAPI = webOS.service.request(
        'luna://com.webos.audio',
        {
            method: 'getVolume',
            parameters: {
                // ← 여기서 Ctrl+Space: subscribe, volume 등 파라미터 자동완성 기대
            },
            onSuccess: function(response) {
                console.log('Volume:', response.volume);
            },
            onFailure: function(error) {
                console.error('Error:', error.errorText);
            }
        }
    );
    
    // 테스트 케이스 1-2: System API parameters
    const systemAPI = webOS.service.request(
        'luna://com.webos.service.system',
        {
            method: 'getSystemInfo',
            parameters: {
                // ← 여기서 Ctrl+Space: 파라미터 자동완성 기대
            }
        }
    );
}

// =============================================================================
// 테스트 2: 여러 줄 상황에서의 Parameter 자동완성
// =============================================================================

console.log('\n📝 테스트 2: 여러 줄 상황에서의 Parameter 자동완성');

function testMultilineParameterCompletion() {
    console.log('여러 줄에 걸친 webOS.service.request에서 parameter 자동완성:');
    
    // 테스트 케이스 2-1: 여러 줄 parameters
    const audioAPI = webOS.service.request(
        'luna://com.webos.audio',
        {
            method: 'setVolume',
            parameters: {
                // ← 여기서 Ctrl+Space: volume, muted 등 파라미터 자동완성 기대
            },
            onSuccess: function(response) {
                console.log('Volume set:', response.volume);
            },
            onFailure: function(error) {
                console.error('Error:', error.errorText);
            }
        }
    );
    
    // 테스트 케이스 2-2: 복잡한 여러 줄 구조
    function handleVolumeControl() {
        return webOS.service.request(
            'luna://com.webos.audio',
            {
                method: 'getVolume',
                parameters: {
                    // ← 여기서 Ctrl+Space: subscribe 등 파라미터 자동완성 기대
                },
                onSuccess: function(response) {
                    console.log('Volume:', response.volume);
                },
                onFailure: function(error) {
                    console.error('Volume error:', error.errorText);
                }
            }
        );
    }
}

// =============================================================================
// 테스트 3: 다양한 Method에 대한 Parameter 자동완성
// =============================================================================

console.log('\n📝 테스트 3: 다양한 Method에 대한 Parameter 자동완성');

function testVariousMethodParameters() {
    console.log('다양한 메서드에 대한 parameter 자동완성:');
    
    // 테스트 케이스 3-1: Audio API - getVolume
    webOS.service.request('luna://com.webos.audio', {
        method: 'getVolume',
        parameters: {
            // ← 기대 파라미터: subscribe
        }
    });
    
    // 테스트 케이스 3-2: Audio API - setVolume
    webOS.service.request('luna://com.webos.audio', {
        method: 'setVolume',
        parameters: {
            // ← 기대 파라미터: volume, muted
        }
    });
    
    // 테스트 케이스 3-3: Audio API - setMuted
    webOS.service.request('luna://com.webos.audio', {
        method: 'setMuted',
        parameters: {
            // ← 기대 파라미터: muted
        }
    });
    
    // 테스트 케이스 3-4: System API - getSystemInfo
    webOS.service.request('luna://com.webos.service.system', {
        method: 'getSystemInfo',
        parameters: {
            // ← 기대 파라미터: subscribe
        }
    });
}

// =============================================================================
// 테스트 4: 빈 parameters 객체에서의 자동완성
// =============================================================================

console.log('\n📝 테스트 4: 빈 parameters 객체에서의 자동완성');

function testEmptyParametersCompletion() {
    console.log('빈 parameters 객체에서 자동완성:');
    
    // 테스트 케이스 4-1: 완전히 빈 parameters
    webOS.service.request('luna://com.webos.audio', {
        method: 'getVolume',
        parameters: {
            // ← 여기서 Ctrl+Space: 파라미터 자동완성 기대
        }
    });
    
    // 테스트 케이스 4-2: 일부 파라미터가 있는 경우
    webOS.service.request('luna://com.webos.audio', {
        method: 'setVolume',
        parameters: {
            volume: 50,
            // ← 여기서 Ctrl+Space: 추가 파라미터 자동완성 기대
        }
    });
}

// =============================================================================
// 테스트 5: Fallback Parameter 자동완성
// =============================================================================

console.log('\n📝 테스트 5: Fallback Parameter 자동완성');

function testFallbackParameterCompletion() {
    console.log('API 정보가 없을 때의 fallback parameter 자동완성:');
    
    // 테스트 케이스 5-1: 알 수 없는 서비스
    webOS.service.request('luna://com.unknown.service', {
        method: 'unknownMethod',
        parameters: {
            // ← 여기서 Ctrl+Space: 공통 파라미터 자동완성 기대
        }
    });
    
    // 테스트 케이스 5-2: 알 수 없는 메서드
    webOS.service.request('luna://com.webos.audio', {
        method: 'unknownMethod',
        parameters: {
            // ← 여기서 Ctrl+Space: 공통 파라미터 자동완성 기대
        }
    });
}

// =============================================================================
// 실행 및 결과 확인
// =============================================================================

console.log('\n🚀 테스트 실행');
console.log('================');

console.log('\n📋 테스트 가이드:');
console.log('1. 각 함수의 parameters 객체 내에서 Ctrl+Space로 자동완성 테스트');
console.log('2. 올바른 파라미터명이 제안되는지 확인 (subscribe, volume, muted 등)');
console.log('3. 파라미터 타입과 설명이 표시되는지 확인');
console.log('4. 여러 줄, 다양한 상황에서 일관된 동작 확인');

console.log('\n✅ 성공 기준:');
console.log('- parameters 객체 내에서 자동완성 트리거');
console.log('- 올바른 파라미터명 제안 (subscribe, volume, muted 등)');
console.log('- 파라미터 타입과 설명 표시');
console.log('- 여러 줄, 중첩 상황에서도 정상 동작');
console.log('- Fallback 상황에서도 공통 파라미터 제공');

console.log('\n❌ 실패 패턴:');
console.log('- parameters 객체 내에서 자동완성이 전혀 동작하지 않음');
console.log('- 잘못된 파라미터명 제안');
console.log('- 파라미터 정보 없이 빈 자동완성');

// 실제 테스트 호출
testBasicParameterCompletion();
testMultilineParameterCompletion();
testVariousMethodParameters();
testEmptyParametersCompletion();
testFallbackParameterCompletion();

console.log('\n🎉 Parameter 자동완성 테스트 준비 완료!');
console.log('이제 VS Code에서 각 상황을 실제로 테스트해보세요.');
console.log('\n🔍 디버깅 팁:');
console.log('- VS Code 개발자 도구에서 로그 확인');
console.log('- "Parameter completion detected" 로그 확인');
console.log('- "Found service URI" 및 "Found method name" 로그 확인');
console.log('- "Got X parameters from MCP server" 로그 확인');
