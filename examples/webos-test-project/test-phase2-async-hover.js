/**
 * Phase 2 테스트: 비동기 Hover 처리 개선
 * 
 * 이 파일은 Phase 2에서 구현된 비동기 Hover 처리 기능을 테스트합니다:
 * - 타임아웃 설정 (2초)
 * - 로딩 상태 표시
 * - 취소 토큰 지원
 * - Fallback Hover 제공
 */

console.log('🧪 Phase 2 테스트: 비동기 Hover 처리 개선');
console.log('==========================================');

// 테스트 1: 빠른 응답 Hover (MCP 서버 정상)
console.log('\n1. 빠른 응답 Hover 테스트');
console.log('MCP 서버가 정상적으로 응답하는 경우:');

const audioService = webOS.service.request(
    'luna://com.webos.audio', // 이 URI에 마우스를 올려보세요
    {
        method: 'getVolume', // 이 메서드에 마우스를 올려보세요
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

// 테스트 2: 느린 응답 Hover (MCP 서버 지연)
console.log('\n2. 느린 응답 Hover 테스트');
console.log('MCP 서버 응답이 느린 경우 (타임아웃 테스트):');

const connectionService = webOS.service.request(
    'luna://com.webos.service.connectionmanager', // 이 URI에 마우스를 올려보세요
    {
        method: 'getStatus', // 이 메서드에 마우스를 올려보세요
        parameters: {
            subscribe: true
        },
        onSuccess: function(response) {
            console.log('Connection status:', response);
        },
        onFailure: function(error) {
            console.error('Error:', error.errorText);
        }
    }
);

// 테스트 3: Fallback Hover (MCP 서버 실패)
console.log('\n3. Fallback Hover 테스트');
console.log('MCP 서버가 실패하는 경우 (Fallback 정보 제공):');

const unknownService = webOS.service.request(
    'luna://com.webos.service.unknown', // 이 URI에 마우스를 올려보세요
    {
        method: 'unknownMethod', // 이 메서드에 마우스를 올려보세요
        parameters: {},
        onSuccess: function(response) {
            console.log('Response:', response);
        },
        onFailure: function(error) {
            console.error('Error:', error.errorText);
        }
    }
);

// 테스트 4: webOS.service.request Hover
console.log('\n4. webOS.service.request Hover 테스트');
console.log('webOS.service.request에 마우스를 올려보세요');

// 테스트 5: 복잡한 시나리오
console.log('\n5. 복잡한 시나리오 테스트');
console.log('여러 줄, 중첩된 상황에서의 Hover:');

const complexService = webOS.service.request(
    'luna://com.webos.service.tv.systemproperty', // 이 URI에 마우스를 올려보세요
    {
        method: 'getSystemInfo', // 이 메서드에 마우스를 올려보세요
        parameters: {
            keys: [
                'modelName',
                'firmwareVersion',
                'UHD'
            ]
        },
        onSuccess: function(response) {
            console.log('System Info:', response);
        },
        onFailure: function(error) {
            console.error('Error:', error.errorText);
        }
    }
);

console.log('\n✅ Phase 2 Hover 테스트 완료');
console.log('📝 테스트 방법:');
console.log('1. 각 URI와 메서드에 마우스를 올려보세요');
console.log('2. 로딩 상태 표시를 확인하세요');
console.log('3. 타임아웃 후 Fallback 정보가 표시되는지 확인하세요');
console.log('4. VS Code 개발자 도구에서 로그를 확인하세요');
