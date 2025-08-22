// webOS TV Test App - Main JavaScript

function updateStatus(message) {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = message;
    console.log(message);
}

// 여기서 VS Code 확장 기능을 테스트해보세요!
// 아래에 webOS API 호출을 작성해보면 자동완성이 동작합니다.

function testAudioAPI() {
    updateStatus('Testing Audio API...');
    
    // 타이핑해보세요: webOS.service.request(
    // 자동완성이 Luna Service URI를 제안할 것입니다
    
}

function testNetworkAPI() {
    updateStatus('Testing Network API...');
    
    // 여기에 Connection Manager API 호출 추가
    
}

function testDeviceInfo() {
    updateStatus('Testing Device Info API...');
    
    // 여기에 System Property API 호출 추가
    
}
