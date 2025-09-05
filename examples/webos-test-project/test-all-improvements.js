// webOS TV API Assistant 개선사항 종합 테스트
// 모든 Phase 1 개선사항을 체계적으로 테스트합니다

console.log('🚀 webOS TV API Assistant 개선사항 종합 테스트 시작');
console.log('=========================================================');

// 📊 테스트 결과 추적
const testResults = {
    uriNormalization: { passed: 0, failed: 0 },
    smartCompletion: { passed: 0, failed: 0 },
    fallbackSystem: { passed: 0, failed: 0 },
    overall: { passed: 0, failed: 0 }
};

function logTest(category, testName, status, details = '') {
    const icon = status ? '✅' : '❌';
    console.log(`${icon} [${category}] ${testName}${details ? ': ' + details : ''}`);
    
    if (testResults[category]) {
        testResults[category][status ? 'passed' : 'failed']++;
    }
    testResults.overall[status ? 'passed' : 'failed']++;
}

// =============================================================================
// 🔄 1. URI 정규화 테스트
// =============================================================================
console.log('\n🔄 1. URI 정규화 테스트');
console.log('─────────────────────────────────');

function testURINormalization() {
    console.log('📝 다음 항목들을 테스트하세요:');
    
    // 테스트 1-1: 기본 URI 정규화
    console.log('\n1-1. 기본 URI 정규화');
    console.log('아래 줄에서 자동완성할 때 정규화된 URI가 제안되는지 확인:');
    console.log('- 입력: "luna://com.webos.audio"');
    console.log('- 기대: "luna://com.webos.service.audio" 자동완성');
    
    webOS.service.request('luna://com.webos.audio', {
        method: 'getVolume'
    });
    
    // 테스트 1-2: 호환성 확인
    console.log('\n1-2. 호환성 확인');
    console.log('기존 형식과 새 형식 모두 인식되는지 확인:');
    
    // 기존 형식 (정규화되어야 함)
    webOS.service.request('', { // 여기에 'luna://com.webos.audio' 입력
        method: 'getVolume'
    });
    
    // 새 형식 (그대로 유지)
    webOS.service.request('', { // 여기에 'luna://com.webos.service.audio' 입력
        method: 'getVolume'
    });
    
    // 테스트 1-3: Hover 정보에서 정규화 표시
    console.log('\n1-3. Hover 정보 확인');
    console.log('아래 URI에 마우스를 올렸을 때 정규화 정보가 표시되는지 확인:');
    
    webOS.service.request('luna://com.webos.audio', { // 이 URI에 hover
        method: 'getVolume'
    });
    
    logTest('uriNormalization', 'URI 정규화 설정 완료', true, '수동 테스트 필요');
}

// =============================================================================
// 🧠 2. Smart Completion 테스트
// =============================================================================
console.log('\n🧠 2. Smart Completion 테스트');
console.log('─────────────────────────────────');

function testSmartCompletion() {
    console.log('📝 다음 시나리오들을 테스트하세요:');
    
    // 테스트 2-1: Service URI 스마트 교체
    console.log('\n2-1. Service URI 스마트 교체');
    console.log('아래 placeholder들이 정확히 교체되는지 확인:');
    
    webOS.service.request('service.uri', { // 'service.uri' → 실제 URI로 교체되어야 함
        method: 'getVolume'
    });
    
    webOS.service.request('luna://', { // 'luna://' → 완전한 URI로 확장되어야 함
        method: 'getVolume'
    });
    
    // 테스트 2-2: Method 스마트 교체
    console.log('\n2-2. Method 스마트 교체');
    console.log('기존 버그가 수정되었는지 확인:');
    
    webOS.service.request('luna://com.webos.service.audio', {
        method: 'methodName', // 'methodName' → 실제 메서드로 교체 (버그 없이)
        parameters: {}
    });
    
    webOS.service.request('luna://com.webos.service.audio', {
        method: 'getVolume', // 기존 메서드 → 다른 메서드로 정확히 교체
        parameters: {}
    });
    
    // 테스트 2-3: 복잡한 상황에서의 스마트 교체
    console.log('\n2-3. 복잡한 상황 테스트');
    console.log('여러 줄, 중첩된 상황에서도 정확히 동작하는지 확인:');
    
    const audioAPI = webOS.service.request(
        'service.uri', // 이 부분이 정확히 교체되어야 함
        {
            method: 'methodName', // 이 부분도 정확히 교체되어야 함
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
    
    logTest('smartCompletion', 'Smart Completion 설정 완료', true, '수동 테스트 필요');
}

// =============================================================================
// 🛡️ 3. Fallback 시스템 테스트
// =============================================================================
console.log('\n🛡️ 3. Fallback 시스템 테스트');
console.log('─────────────────────────────────');

function testFallbackSystem() {
    console.log('📝 다음 상황들을 테스트하세요:');
    
    // 테스트 3-1: MCP 서버 연결 실패 시뮬레이션
    console.log('\n3-1. MCP 서버 연결 실패 시 Fallback 동작');
    console.log('MCP 서버가 연결되지 않은 상태에서:');
    console.log('- 상태바에 "$(warning) webOS TV (7 APIs)" 표시 확인');
    console.log('- 자동완성에 "Fallback" 표시 확인');
    console.log('- 최소 7개 API 사용 가능 확인');
    
    // 테스트 3-2: Fallback API 자동완성
    console.log('\n3-2. Fallback API 자동완성');
    console.log('MCP 서버 없이도 다음 API들이 자동완성되는지 확인:');
    
    webOS.service.request('', { // 다음 URI들이 자동완성되어야 함:
        // - luna://com.webos.service.audio
        // - luna://com.palm.activitymanager  
        // - luna://com.webos.applicationManager
        // - luna://com.webos.service.connectionmanager
        // - luna://com.webos.service.settings
        // - luna://com.webos.service.systemservice
        // - luna://com.webos.service.tv.systemproperty
        method: 'getVolume'
    });
    
    // 테스트 3-3: Fallback 메서드 자동완성
    console.log('\n3-3. Fallback 메서드 자동완성');
    console.log('각 서비스의 기본 메서드들이 자동완성되는지 확인:');
    
    webOS.service.request('luna://com.webos.service.audio', {
        method: '', // getVolume, setVolume, setMuted 자동완성 확인
        parameters: {}
    });
    
    webOS.service.request('luna://com.palm.activitymanager', {
        method: '', // adopt, cancel 자동완성 확인
        parameters: {}
    });
    
    // 테스트 3-4: Fallback 스니펫
    console.log('\n3-4. Fallback 스니펫');
    console.log('Fallback 모드에서 제공되는 기본 스니펫들:');
    console.log('- "webOS" 입력 시 기본 템플릿 제공');
    console.log('- 오디오 API 전용 템플릿 제공');
    
    // 테스트 3-5: 재시도 기능
    console.log('\n3-5. 재시도 기능');
    console.log('상태바 클릭 시 재연결 시도 확인');
    console.log('Command Palette에서 "webOS: Refresh API Cache" 실행 확인');
    
    logTest('fallbackSystem', 'Fallback 시스템 설정 완료', true, '수동 테스트 필요');
}

// =============================================================================
// 🎯 4. 통합 시나리오 테스트
// =============================================================================
console.log('\n🎯 4. 통합 시나리오 테스트');
console.log('─────────────────────────────────');

function testIntegratedScenarios() {
    console.log('📝 실제 개발 시나리오를 테스트하세요:');
    
    // 시나리오 1: 새 프로젝트에서 오디오 API 구현
    console.log('\n시나리오 1: 오디오 볼륨 조절 기능 구현');
    
    function implementVolumeControl() {
        // 1. webOS service request 스니펫 사용
        // 2. Service URI 자동완성으로 오디오 서비스 선택
        // 3. Method 자동완성으로 getVolume/setVolume 선택
        // 4. Parameter 자동완성으로 필요한 파라미터 추가
        
        // 볼륨 조회
        webOS.service.request('', { // Auto-complete: luna://com.webos.service.audio
            method: '', // Auto-complete: getVolume
            parameters: {
                // Auto-complete: subscribe: true
            },
            onSuccess: function(response) {
                console.log('Current volume:', response.volume);
                console.log('Is muted:', response.muted);
            },
            onFailure: function(error) {
                console.error('Failed to get volume:', error.errorText);
            }
        });
        
        // 볼륨 설정
        webOS.service.request('', { // Auto-complete: luna://com.webos.service.audio
            method: '', // Auto-complete: setVolume
            parameters: {
                // Auto-complete: volume: 50
            },
            onSuccess: function(response) {
                console.log('Volume set successfully');
            },
            onFailure: function(error) {
                console.error('Failed to set volume:', error.errorText);
            }
        });
    }
    
    // 시나리오 2: 네트워크 상태 체크 기능 구현
    console.log('\n시나리오 2: 네트워크 상태 체크 기능 구현');
    
    function implementNetworkCheck() {
        webOS.service.request('', { // Auto-complete: luna://com.webos.service.connectionmanager
            method: '', // Auto-complete: getStatus
            parameters: {
                // Auto-complete: subscribe: true
            },
            onSuccess: function(response) {
                console.log('Network status:', response);
            },
            onFailure: function(error) {
                console.error('Network check failed:', error.errorText);
            }
        });
    }
    
    // 시나리오 3: 앱 정보 조회 기능 구현
    console.log('\n시나리오 3: TV 시스템 정보 조회');
    
    function implementSystemInfo() {
        webOS.service.request('', { // Auto-complete: luna://com.webos.service.tv.systemproperty
            method: '', // Auto-complete: getSystemInfo
            parameters: {
                // Auto-complete: keys: ['modelName', 'firmwareVersion']
            },
            onSuccess: function(response) {
                console.log('TV Model:', response.modelName);
                console.log('Firmware:', response.firmwareVersion);
            },
            onFailure: function(error) {
                console.error('System info failed:', error.errorText);
            }
        });
    }
    
    logTest('overall', '통합 시나리오 설정 완료', true, '수동 테스트 필요');
}

// =============================================================================
// 📊 5. 성능 및 안정성 테스트
// =============================================================================
console.log('\n📊 5. 성능 및 안정성 테스트');
console.log('─────────────────────────────────');

function testPerformanceAndStability() {
    console.log('📝 다음 성능 지표들을 확인하세요:');
    
    console.log('\n성능 테스트:');
    console.log('- 자동완성 응답 시간: 500ms 이내');
    console.log('- Hover 정보 표시: 2초 이내');
    console.log('- 확장 프로그램 시작: 5초 이내');
    
    console.log('\n안정성 테스트:');
    console.log('- MCP 서버 연결 실패 시 확장 정상 동작');
    console.log('- 이상한 문자열 생성 없음');
    console.log('- 메모리 누수 없음 (장시간 사용)');
    
    console.log('\n사용자 경험:');
    console.log('- 상태바에 명확한 모드 표시');
    console.log('- 자동완성 항목에 fallback 여부 표시');
    console.log('- 에러 시 유용한 안내 메시지');
    
    logTest('overall', '성능 테스트 항목 설정 완료', true);
}

// =============================================================================
// 🚀 테스트 실행
// =============================================================================

console.log('\n🚀 테스트 함수 호출');
console.log('===================');

testURINormalization();
testSmartCompletion();
testFallbackSystem();
testIntegratedScenarios();
testPerformanceAndStability();

// =============================================================================
// 📊 테스트 결과 요약
// =============================================================================

console.log('\n📊 테스트 결과 요약');
console.log('===================');

function printTestSummary() {
    console.log(`\n전체 테스트 결과:`);
    console.log(`✅ 성공: ${testResults.overall.passed}`);
    console.log(`❌ 실패: ${testResults.overall.failed}`);
    console.log(`📊 성공률: ${((testResults.overall.passed / (testResults.overall.passed + testResults.overall.failed)) * 100).toFixed(1)}%`);
    
    console.log(`\n카테고리별 결과:`);
    Object.entries(testResults).forEach(([category, results]) => {
        if (category !== 'overall') {
            const total = results.passed + results.failed;
            const rate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 'N/A';
            console.log(`- ${category}: ${results.passed}/${total} (${rate}%)`);
        }
    });
    
    console.log(`\n🎯 다음 단계:`);
    console.log(`1. VS Code에서 확장 프로그램 설치`);
    console.log(`2. 위의 테스트 시나리오들을 하나씩 실행`);
    console.log(`3. 각 기능이 예상대로 동작하는지 확인`);
    console.log(`4. 문제 발견 시 리포트`);
}

printTestSummary();

console.log('\n🎉 테스트 준비 완료!');
console.log('이제 실제 VS Code에서 테스트를 진행하세요.');
