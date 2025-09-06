/**
 * Phase 2 테스트: MCP 연결 관리 개선
 * 
 * 이 파일은 Phase 2에서 구현된 MCP 연결 관리 기능을 테스트합니다:
 * - 자동 재연결 (최대 5회, 30초 간격)
 * - 연결 상태 모니터링
 * - 상태바 표시
 * - 에러 복구 메커니즘
 * - 수동 재연결 명령
 */

console.log('🧪 Phase 2 테스트: MCP 연결 관리 개선');
console.log('=====================================');

// 테스트 1: 정상 연결 상태 확인
console.log('\n1. 정상 연결 상태 테스트');
console.log('MCP 서버가 정상적으로 연결된 상태에서 API 호출:');

const audioService = webOS.service.request(
    'luna://com.webos.audio',
    {
        method: 'getVolume',
        parameters: {
            subscribe: true
        },
        onSuccess: function(response) {
            console.log('✅ Audio service connected successfully');
            console.log('Volume:', response.volume);
        },
        onFailure: function(error) {
            console.error('❌ Audio service failed:', error.errorText);
        }
    }
);

// 테스트 2: 연결 끊김 시뮬레이션
console.log('\n2. 연결 끊김 시뮬레이션 테스트');
console.log('MCP 서버 연결이 끊어진 상황을 시뮬레이션:');

// 이 코드는 MCP 서버를 강제로 종료한 후 실행해보세요
const connectionService = webOS.service.request(
    'luna://com.webos.service.connectionmanager',
    {
        method: 'getStatus',
        parameters: {
            subscribe: true
        },
        onSuccess: function(response) {
            console.log('✅ Connection service connected successfully');
            console.log('Status:', response);
        },
        onFailure: function(error) {
            console.error('❌ Connection service failed:', error.errorText);
            console.log('🔄 This should trigger automatic reconnection...');
        }
    }
);

// 테스트 3: 재연결 후 정상 동작 확인
console.log('\n3. 재연결 후 정상 동작 테스트');
console.log('자동 재연결이 성공한 후 API 호출:');

const systemService = webOS.service.request(
    'luna://com.webos.service.tv.systemproperty',
    {
        method: 'getSystemInfo',
        parameters: {
            keys: ['modelName', 'firmwareVersion']
        },
        onSuccess: function(response) {
            console.log('✅ System service reconnected successfully');
            console.log('System Info:', response);
        },
        onFailure: function(error) {
            console.error('❌ System service failed:', error.errorText);
        }
    }
);

// 테스트 4: 상태바 표시 확인
console.log('\n4. 상태바 표시 테스트');
console.log('VS Code 상태바에서 MCP 연결 상태를 확인하세요:');
console.log('- ✅ Connected: MCP 서버 연결됨');
console.log('- 🔄 Reconnecting: 재연결 시도 중');
console.log('- ❌ Error: 연결 실패');
console.log('- ⏰ Timeout: 연결 타임아웃');

// 테스트 5: 수동 재연결 명령 테스트
console.log('\n5. 수동 재연결 명령 테스트');
console.log('Command Palette에서 다음 명령을 실행해보세요:');
console.log('- "webOS TV: Reconnect MCP Server"');
console.log('- "webOS TV: Show Connection Status"');

// 테스트 6: 최대 재연결 시도 후 Fallback 모드
console.log('\n6. 최대 재연결 시도 후 Fallback 모드 테스트');
console.log('MCP 서버를 완전히 종료하고 최대 재연결 시도 후:');

const fallbackService = webOS.service.request(
    'luna://com.webos.audio',
    {
        method: 'setVolume',
        parameters: {
            volume: 50
        },
        onSuccess: function(response) {
            console.log('✅ Fallback mode working');
            console.log('Response:', response);
        },
        onFailure: function(error) {
            console.error('❌ Even fallback mode failed:', error.errorText);
        }
    }
);

console.log('\n✅ Phase 2 MCP 연결 관리 테스트 완료');
console.log('📝 테스트 방법:');
console.log('1. VS Code 상태바에서 연결 상태 확인');
console.log('2. MCP 서버를 종료하고 자동 재연결 확인');
console.log('3. Command Palette에서 수동 재연결 명령 실행');
console.log('4. 최대 재연결 시도 후 Fallback 모드 확인');
console.log('5. VS Code 개발자 도구에서 재연결 로그 확인');

console.log('\n🔧 수동 테스트 단계:');
console.log('1. MCP 서버 프로세스 종료 (작업 관리자에서 node 프로세스 종료)');
console.log('2. 30초 후 자동 재연결 시도 확인');
console.log('3. 최대 5회 재연결 시도 후 Fallback 모드 전환 확인');
console.log('4. Command Palette > "webOS TV: Reconnect MCP Server" 실행');
console.log('5. 상태바 아이템 클릭하여 연결 상태 확인');
