// URI 정규화 기능 전용 테스트
// Phase 1-1: Service URI 정규화 테스트

console.log('🔄 URI 정규화 기능 테스트');

// =============================================================================
// 테스트 데이터: 정규화되어야 할 URI들
// =============================================================================

const testCases = [
    {
        name: 'Audio Service',
        oldURI: 'luna://com.webos.service.audio',
        newURI: 'luna://com.webos.audio',
        description: '실제 표준 URI로 정규화되는 케이스'
    },
    {
        name: 'Activity Manager',
        oldURI: 'luna://com.webos.activitymanager',
        newURI: 'luna://com.palm.activitymanager',
        description: 'com.webos → com.palm 변경 케이스'
    },
    {
        name: 'Application Manager',
        oldURI: 'luna://com.webos.service.applicationmanager',
        newURI: 'luna://com.webos.applicationManager',
        description: '대소문자 변경 케이스'
    }
];

console.log('📋 테스트 케이스:', testCases.length, '개');

// =============================================================================
// 테스트 1: 자동완성에서 정규화된 URI 제안
// =============================================================================

console.log('\n📝 테스트 1: 자동완성 정규화');
console.log('다음 줄들에서 자동완성 시 정규화된 URI가 제안되는지 확인:');

function testAutoCompletionNormalization() {
    // 케이스 1: Audio 서비스
    console.log('\n🎵 Audio 서비스 테스트');
    console.log('입력: "luna://com.webos.service.audio"');
    console.log('기대: "luna://com.webos.audio" 자동완성 (실제 표준 URI)');
    
    webOS.service.request('luna://com.webos.service.audio', {
        method: 'getVolume',
        parameters: {}
    });
    
    // 케이스 2: Activity Manager
    console.log('\n⚡ Activity Manager 테스트');
    console.log('입력: "luna://com.webos.activitymanager"');
    console.log('기대: "luna://com.palm.activitymanager" 자동완성');
    
    webOS.service.request('luna://com.webos.activitymanager', {
        method: 'adopt',
        parameters: {}
    });
    
    // 케이스 3: Application Manager
    console.log('\n📱 Application Manager 테스트');
    console.log('입력: "luna://com.webos.service.applicationmanager"');
    console.log('기대: "luna://com.webos.applicationManager" 자동완성');
    
    webOS.service.request('luna://com.webos.service.applicationmanager', {
        method: 'launch',
        parameters: {}
    });
}

// =============================================================================
// 테스트 2: Hover 정보에서 정규화 표시
// =============================================================================

console.log('\n📝 테스트 2: Hover 정보 정규화 표시');
console.log('다음 URI들에 마우스를 올렸을 때 정규화 정보가 표시되는지 확인:');

function testHoverNormalization() {
    // 정규화가 필요한 URI (hover 시 정규화 정보 표시되어야 함)
    webOS.service.request('luna://com.webos.audio', { // ← 이 URI에 hover
        method: 'getVolume'
    });
    
    // 이미 정규화된 URI (기본 정보만 표시되어야 함)
    webOS.service.request('luna://com.webos.service.audio', { // ← 이 URI에 hover
        method: 'getVolume'
    });
    
    console.log('기대 결과:');
    console.log('- 첫 번째: "Standard URI" + "Original URI" + "정규화 노트" 표시');
    console.log('- 두 번째: 기본 "Service URI" 정보만 표시');
}

// =============================================================================
// 테스트 3: 정규화 후 자동완성 품질
// =============================================================================

console.log('\n📝 테스트 3: 정규화 후 자동완성 품질');
console.log('정규화된 URI로 메서드 자동완성이 잘 되는지 확인:');

function testNormalizedURICompletion() {
    // 정규화된 URI로 메서드 자동완성 테스트
    webOS.service.request('luna://com.webos.service.audio', {
        method: '', // ← 여기서 getVolume, setVolume, setMuted 자동완성 확인
        parameters: {}
    });
    
    webOS.service.request('luna://com.palm.activitymanager', {
        method: '', // ← 여기서 adopt, cancel 자동완성 확인
        parameters: {}
    });
    
    console.log('기대 결과:');
    console.log('- Audio: getVolume, setVolume, setMuted 메서드 자동완성');
    console.log('- Activity Manager: adopt, cancel 메서드 자동완성');
}

// =============================================================================
// 테스트 4: 역호환성 확인
// =============================================================================

console.log('\n📝 테스트 4: 역호환성 확인');
console.log('기존 프로젝트의 URI들도 인식되는지 확인:');

function testBackwardCompatibility() {
    // 기존 형식들이 모두 인식되는지 확인
    const legacyURIs = [
        'luna://com.webos.audio',
        'luna://com.webos.service.audio', // 이미 정규화된 것
        'luna://com.webos.activitymanager',
        'luna://com.palm.activitymanager' // 이미 정규화된 것
    ];
    
    legacyURIs.forEach((uri, index) => {
        console.log(`\n테스트 ${index + 1}: ${uri}`);
        
        // 각 URI로 API 호출 (hover와 자동완성 모두 동작해야 함)
        webOS.service.request(uri, {
            method: 'testMethod',
            parameters: {},
            onSuccess: function(response) {
                console.log(`${uri} 호출 성공`);
            },
            onFailure: function(error) {
                console.log(`${uri} 호출 실패:`, error.errorText);
            }
        });
    });
    
    console.log('기대 결과: 모든 URI 형식에 대해 hover와 자동완성 동작');
}

// =============================================================================
// 테스트 5: 정규화 성능 테스트
// =============================================================================

console.log('\n📝 테스트 5: 정규화 성능 테스트');
console.log('대량의 자동완성 요청 시 성능 확인:');

function testNormalizationPerformance() {
    console.log('다음 작업을 빠르게 연속으로 수행하여 성능 측정:');
    
    // 빠른 연속 자동완성 테스트
    for (let i = 0; i < 5; i++) {
        webOS.service.request('', { // 여기서 빠르게 연속 자동완성
            method: '',
            parameters: {}
        });
    }
    
    console.log('기대 결과: 각 자동완성이 500ms 이내에 완료');
    console.log('측정 방법: VS Code Developer Tools에서 타이밍 확인');
}

// =============================================================================
// 테스트 실행 가이드
// =============================================================================

console.log('\n🚀 테스트 실행 가이드');
console.log('====================');
console.log('1. testAutoCompletionNormalization() - 자동완성 정규화');
console.log('2. testHoverNormalization() - Hover 정규화 표시');
console.log('3. testNormalizedURICompletion() - 정규화 후 자동완성');
console.log('4. testBackwardCompatibility() - 역호환성');
console.log('5. testNormalizationPerformance() - 성능 테스트');

console.log('\n📊 성공 기준:');
console.log('- 모든 구형 URI가 신형 URI로 자동완성됨');
console.log('- Hover에서 정규화 정보가 명확히 표시됨');
console.log('- 정규화 후에도 메서드 자동완성이 정상 동작');
console.log('- 기존 코드의 URI들도 인식됨');
console.log('- 자동완성 응답 시간이 500ms 이내');

// 실제 테스트 함수 호출
testAutoCompletionNormalization();
testHoverNormalization();
testNormalizedURICompletion();
testBackwardCompatibility();
testNormalizationPerformance();

console.log('\n✅ URI 정규화 테스트 준비 완료!');
