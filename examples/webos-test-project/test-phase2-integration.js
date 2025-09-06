/**
 * Phase 2 통합 테스트: 비동기 Hover + MCP 연결 관리
 * 
 * 이 파일은 Phase 2의 모든 개선사항을 통합하여 테스트합니다:
 * - 비동기 Hover 처리와 MCP 연결 관리의 상호작용
 * - 연결 상태에 따른 Hover 동작 변화
 * - 재연결 과정에서의 Hover 응답성
 * - Fallback 시스템의 통합 동작
 */

console.log('🧪 Phase 2 통합 테스트: 비동기 Hover + MCP 연결 관리');
console.log('==================================================');

// 테스트 1: 정상 연결 상태에서의 Hover
console.log('\n1. 정상 연결 상태에서의 Hover 테스트');
console.log('MCP 서버가 정상 연결된 상태에서 Hover 정보 제공:');

const normalService = webOS.service.request(
    'luna://com.webos.audio', // 이 URI에 마우스를 올려보세요 - 빠른 응답 예상
    {
        method: 'getVolume', // 이 메서드에 마우스를 올려보세요 - 상세 정보 예상
        parameters: {
            subscribe: true
        },
        onSuccess: function(response) {
            console.log('✅ Normal service call successful');
            console.log('Volume:', response.volume);
        },
        onFailure: function(error) {
            console.error('❌ Normal service call failed:', error.errorText);
        }
    }
);

// 테스트 2: 연결 불안정 상태에서의 Hover
console.log('\n2. 연결 불안정 상태에서의 Hover 테스트');
console.log('MCP 서버 연결이 불안정한 상태에서 Hover 동작:');

const unstableService = webOS.service.request(
    'luna://com.webos.service.connectionmanager', // 이 URI에 마우스를 올려보세요 - 타임아웃 후 Fallback 예상
    {
        method: 'getStatus', // 이 메서드에 마우스를 올려보세요 - 로딩 상태 표시 예상
        parameters: {
            subscribe: true
        },
        onSuccess: function(response) {
            console.log('✅ Unstable service call successful');
            console.log('Status:', response);
        },
        onFailure: function(error) {
            console.error('❌ Unstable service call failed:', error.errorText);
        }
    }
);

// 테스트 3: 재연결 과정에서의 Hover
console.log('\n3. 재연결 과정에서의 Hover 테스트');
console.log('MCP 서버 재연결 과정에서 Hover 응답성:');

// 이 테스트는 MCP 서버를 종료한 후 실행해보세요
const reconnectingService = webOS.service.request(
    'luna://com.webos.service.tv.systemproperty', // 이 URI에 마우스를 올려보세요 - 재연결 중 상태 표시 예상
    {
        method: 'getSystemInfo', // 이 메서드에 마우스를 올려보세요 - Fallback 정보 예상
        parameters: {
            keys: ['modelName', 'firmwareVersion', 'UHD']
        },
        onSuccess: function(response) {
            console.log('✅ Reconnecting service call successful');
            console.log('System Info:', response);
        },
        onFailure: function(error) {
            console.error('❌ Reconnecting service call failed:', error.errorText);
        }
    }
);

// 테스트 4: 완전한 Fallback 모드에서의 Hover
console.log('\n4. 완전한 Fallback 모드에서의 Hover 테스트');
console.log('MCP 서버가 완전히 실패한 상태에서 Hover 동작:');

const fallbackService = webOS.service.request(
    'luna://com.webos.service.unknown', // 이 URI에 마우스를 올려보세요 - 즉시 Fallback 정보 예상
    {
        method: 'unknownMethod', // 이 메서드에 마우스를 올려보세요 - 기본 정보 예상
        parameters: {},
        onSuccess: function(response) {
            console.log('✅ Fallback service call successful');
            console.log('Response:', response);
        },
        onFailure: function(error) {
            console.error('❌ Fallback service call failed:', error.errorText);
        }
    }
);

// 테스트 5: 복합 시나리오 - 여러 서비스 동시 호출
console.log('\n5. 복합 시나리오 테스트');
console.log('여러 서비스를 동시에 호출하면서 Hover 테스트:');

// Audio 서비스
const audioService = webOS.service.request(
    'luna://com.webos.audio', // 이 URI에 마우스를 올려보세요
    {
        method: 'setVolume', // 이 메서드에 마우스를 올려보세요
        parameters: {
            volume: 75
        },
        onSuccess: function(response) {
            console.log('✅ Audio service successful');
        },
        onFailure: function(error) {
            console.error('❌ Audio service failed:', error.errorText);
        }
    }
);

// Database 서비스
const databaseService = webOS.service.request(
    'luna://com.webos.service.db', // 이 URI에 마우스를 올려보세요
    {
        method: 'put', // 이 메서드에 마우스를 올려보세요
        parameters: {
            objects: [
                {
                    _kind: 'test',
                    _id: 'test1',
                    value: 'test data'
                }
            ]
        },
        onSuccess: function(response) {
            console.log('✅ Database service successful');
        },
        onFailure: function(error) {
            console.error('❌ Database service failed:', error.errorText);
        }
    }
);

// 테스트 6: 상태바와 Hover의 연동
console.log('\n6. 상태바와 Hover 연동 테스트');
console.log('상태바 표시와 Hover 정보의 일관성 확인:');

const statusService = webOS.service.request(
    'luna://com.webos.service.audio', // 이 URI에 마우스를 올려보세요
    {
        method: 'getMuted', // 이 메서드에 마우스를 올려보세요
        parameters: {},
        onSuccess: function(response) {
            console.log('✅ Status service successful');
            console.log('Muted:', response.muted);
        },
        onFailure: function(error) {
            console.error('❌ Status service failed:', error.errorText);
        }
    }
);

console.log('\n✅ Phase 2 통합 테스트 완료');
console.log('📝 통합 테스트 방법:');
console.log('1. 정상 상태에서 Hover 응답 속도 확인');
console.log('2. MCP 서버 종료 후 Hover Fallback 동작 확인');
console.log('3. 재연결 과정에서 상태바와 Hover 연동 확인');
console.log('4. 여러 서비스 동시 호출 시 Hover 일관성 확인');
console.log('5. VS Code 개발자 도구에서 전체 로그 확인');

console.log('\n🔧 고급 테스트 시나리오:');
console.log('1. MCP 서버를 주기적으로 종료/시작하면서 Hover 테스트');
console.log('2. 네트워크 불안정 상황 시뮬레이션');
console.log('3. 대용량 API 응답 시 Hover 타임아웃 테스트');
console.log('4. 동시에 여러 Hover 요청 시 응답성 테스트');
console.log('5. 메모리 사용량 모니터링');

console.log('\n📊 성능 지표 확인:');
console.log('- Hover 응답 시간: 2초 이내');
console.log('- 재연결 시도: 최대 5회, 30초 간격');
console.log('- Fallback 전환: 즉시');
console.log('- 상태바 업데이트: 실시간');
