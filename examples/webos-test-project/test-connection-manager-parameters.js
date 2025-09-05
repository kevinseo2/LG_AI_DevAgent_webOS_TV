// Connection Manager API Parameter 자동완성 테스트
// luna://com.webos.service.connectionmanager의 getStatus 메서드 파라미터 테스트

console.log('🌐 Connection Manager API Parameter 자동완성 테스트');

// =============================================================================
// 테스트 1: Connection Manager getStatus 파라미터 자동완성
// =============================================================================

console.log('\n📝 테스트 1: Connection Manager getStatus 파라미터 자동완성');

function testConnectionManagerParameters() {
    console.log('Connection Manager API의 getStatus 메서드 파라미터 자동완성 테스트:');
    
    // 테스트 케이스 1-1: 기본 getStatus 파라미터
    const connectionAPI = webOS.service.request(
        'luna://com.webos.service.connectionmanager',
        {
            method: 'getStatus',
            parameters: {
                // ← 여기서 Ctrl+Space: subscribe 파라미터 자동완성 기대
            },
            onSuccess: function(response) {
                console.log('Internet available:', response.isInternetConnectionAvailable);
                console.log('WiFi connected:', response.connectedViaWifi);
                console.log('Ethernet connected:', response.connectedViaEthernet);
            },
            onFailure: function(error) {
                console.error('Connection error:', error.errorText);
            }
        }
    );
    
    // 테스트 케이스 1-2: subscribe 파라미터 사용
    const connectionAPIWithSubscribe = webOS.service.request(
        'luna://com.webos.service.connectionmanager',
        {
            method: 'getStatus',
            parameters: {
                subscribe: true // ← 이 파라미터가 자동완성으로 제안되어야 함
            },
            onSuccess: function(response) {
                console.log('Connection status:', response);
            },
            onFailure: function(error) {
                console.error('Error:', error.errorText);
            }
        }
    );
}

// =============================================================================
// 테스트 2: 여러 줄 상황에서의 Connection Manager 파라미터
// =============================================================================

console.log('\n📝 테스트 2: 여러 줄 상황에서의 Connection Manager 파라미터');

function testMultilineConnectionManager() {
    console.log('여러 줄에 걸친 Connection Manager API 호출에서 파라미터 자동완성:');
    
    // 테스트 케이스 2-1: 여러 줄 구조
    const connectionAPI = webOS.service.request(
        'luna://com.webos.service.connectionmanager',
        {
            method: 'getStatus',
            parameters: {
                // ← 여기서 Ctrl+Space: subscribe 파라미터 자동완성 기대
            },
            onSuccess: function(response) {
                console.log('Network status updated:', response);
            },
            onFailure: function(error) {
                console.error('Network error:', error.errorText);
            }
        }
    );
    
    // 테스트 케이스 2-2: 복잡한 여러 줄 구조
    function checkNetworkStatus() {
        return webOS.service.request(
            'luna://com.webos.service.connectionmanager',
            {
                method: 'getStatus',
                parameters: {
                    // ← 여기서 Ctrl+Space: subscribe 파라미터 자동완성 기대
                },
                onSuccess: function(response) {
                    if (response.isInternetConnectionAvailable) {
                        console.log('Internet is available');
                        if (response.connectedViaWifi) {
                            console.log('Connected via WiFi');
                        } else if (response.connectedViaEthernet) {
                            console.log('Connected via Ethernet');
                        }
                    } else {
                        console.log('No internet connection');
                    }
                },
                onFailure: function(error) {
                    console.error('Failed to get network status:', error.errorText);
                }
            }
        );
    }
}

// =============================================================================
// 테스트 3: Connection Manager API 응답 처리
// =============================================================================

console.log('\n📝 테스트 3: Connection Manager API 응답 처리');

function testConnectionManagerResponse() {
    console.log('Connection Manager API 응답 처리 예제:');
    
    webOS.service.request('luna://com.webos.service.connectionmanager', {
        method: 'getStatus',
        parameters: {
            subscribe: true // ← 자동완성으로 제안되어야 함
        },
        onSuccess: function(response) {
            // 응답 파라미터들
            console.log('returnValue:', response.returnValue);
            console.log('isInternetConnectionAvailable:', response.isInternetConnectionAvailable);
            console.log('connectedViaWifi:', response.connectedViaWifi);
            console.log('connectedViaEthernet:', response.connectedViaEthernet);
            
            // 네트워크 상태에 따른 처리
            if (response.isInternetConnectionAvailable) {
                console.log('✅ Internet connection is available');
                
                if (response.connectedViaWifi) {
                    console.log('📶 Connected via WiFi');
                } else if (response.connectedViaEthernet) {
                    console.log('🔌 Connected via Ethernet');
                } else {
                    console.log('❓ Connected via unknown method');
                }
            } else {
                console.log('❌ No internet connection available');
            }
        },
        onFailure: function(error) {
            console.error('❌ Failed to get connection status:', error.errorText);
        }
    });
}

// =============================================================================
// 테스트 4: 네트워크 상태 모니터링
// =============================================================================

console.log('\n📝 테스트 4: 네트워크 상태 모니터링');

function testNetworkStatusMonitoring() {
    console.log('네트워크 상태 모니터링 예제:');
    
    // 네트워크 상태 구독
    const networkMonitor = webOS.service.request(
        'luna://com.webos.service.connectionmanager',
        {
            method: 'getStatus',
            parameters: {
                subscribe: true // ← 자동완성으로 제안되어야 함
            },
            onSuccess: function(response) {
                console.log('Network status changed:', {
                    internet: response.isInternetConnectionAvailable,
                    wifi: response.connectedViaWifi,
                    ethernet: response.connectedViaEthernet
                });
                
                // 상태 변경에 따른 UI 업데이트
                updateNetworkStatusUI(response);
            },
            onFailure: function(error) {
                console.error('Network monitoring error:', error.errorText);
            }
        }
    );
    
    function updateNetworkStatusUI(status) {
        const statusElement = document.getElementById('network-status');
        if (statusElement) {
            if (status.isInternetConnectionAvailable) {
                statusElement.textContent = '🌐 Internet Connected';
                statusElement.className = 'status-connected';
            } else {
                statusElement.textContent = '❌ No Internet';
                statusElement.className = 'status-disconnected';
            }
        }
    }
}

// =============================================================================
// 실행 및 결과 확인
// =============================================================================

console.log('\n🚀 테스트 실행');
console.log('================');

console.log('\n📋 테스트 가이드:');
console.log('1. 각 함수의 parameters 객체 내에서 Ctrl+Space로 자동완성 테스트');
console.log('2. subscribe 파라미터가 제안되는지 확인');
console.log('3. 파라미터 타입(boolean)과 설명이 표시되는지 확인');
console.log('4. 여러 줄, 중첩 상황에서도 정상 동작 확인');

console.log('\n✅ 성공 기준:');
console.log('- parameters 객체 내에서 자동완성 트리거');
console.log('- subscribe 파라미터 제안 (boolean 타입)');
console.log('- 파라미터 설명 표시: "상태 변경 구독 여부"');
console.log('- 여러 줄, 중첩 상황에서도 정상 동작');
console.log('- 로컬 API 파일에서 정확한 파라미터 정보 제공');

console.log('\n❌ 실패 패턴:');
console.log('- parameters 객체 내에서 자동완성이 전혀 동작하지 않음');
console.log('- subscribe 파라미터가 제안되지 않음');
console.log('- 잘못된 파라미터 정보 제공');

console.log('\n🔍 예상 로그:');
console.log('- "Found method getStatus in local file: connection-manager-api.json"');
console.log('- "Found 1 parameters in local API file"');
console.log('- "Added 1 parameter completions from local API file"');

// 실제 테스트 호출
testConnectionManagerParameters();
testMultilineConnectionManager();
testConnectionManagerResponse();
testNetworkStatusMonitoring();

console.log('\n🎉 Connection Manager API Parameter 자동완성 테스트 준비 완료!');
console.log('이제 VS Code에서 각 상황을 실제로 테스트해보세요.');
console.log('\n🔍 디버깅 팁:');
console.log('- VS Code 개발자 도구에서 로그 확인');
console.log('- "Looking for method getStatus in local API file" 로그 확인');
console.log('- "Found method getStatus in local file: connection-manager-api.json" 로그 확인');
console.log('- "Added 1 parameter completions from local API file" 로그 확인');
