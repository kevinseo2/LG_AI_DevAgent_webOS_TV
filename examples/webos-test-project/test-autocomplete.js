// webOS TV API 자동완성 테스트 파일
// VS Code의 개발자 도구 콘솔을 열어서 로그를 확인하세요 (Help > Toggle Developer Tools > Console)

console.log('webOS TV API 자동완성 테스트 시작 - 개선된 버전');

// 1. webOS.service.request 자동완성 테스트
// 아래에서 'w' 부터 타이핑하면 webOS.service.request 스니펫이 표시되어야 함
// 테스트: w -> we -> web -> webO -> webOS -> webOS. -> webOS.s -> ... -> webOS.service.request
// w

// 2. 빈 줄에서 webOS 타이핑 테스트
// 아래 빈 줄에서 webOS를 타이핑해보세요


// 3. Luna Service URI 자동완성 테스트  
// 아래 줄에서 따옴표 안에 luna://를 타이핑해보세요
webOS.service.request('', {
    method: 'getVolume',
    parameters: {},
    onSuccess: function (response) {
        console.log('Success:', response);
    },
    onFailure: function (error) {
        console.log('Failed:', error.errorText);
    }
});

// 4. 큰따옴표로 luna:// 자동완성 테스트
// 아래 줄에서 큰따옴표 안에 luna://를 타이핑해보세요
webOS.service.request("", {
    method: 'setVolume',
    parameters: {
        volume: 50
    }
});

// 5. 점진적 타이핑 테스트 (권장 테스트 순서)
// 아래 줄에서 따옴표 안에서 다음 순서로 타이핑해보세요:
// 'l' -> 'lu' -> 'lun' -> 'luna' -> 'luna:' -> 'luna:/' -> 'luna://' -> ...
webOS.service.request('');

// 6. 기존 luna:// 수정 테스트
// 아래 줄에서 luna:// 뒤에 커서를 두고 자동완성을 확인해보세요
webOS.service.request('luna://');

// 7. 부분 완성된 URI 확장 테스트
// 아래 줄에서 기존 URI를 확장해보세요
webOS.service.request('luna://com.webos');

// 8. 다른 위치에서의 자동완성 테스트
function testFunction() {
    // 함수 내부에서도 자동완성이 작동하는지 테스트
    webOS.service.request('');
}

// 9. 들여쓰기된 상황에서의 테스트
if (true) {
    webOS.service.request('');
}

// 10. 객체 내부에서의 테스트
const apiCalls = {
    audioCall: function() {
        webOS.service.request('');
    }
};

// 11. 완전한 서비스 URI 예시들 (참고용)
/*
자주 사용되는 Luna Service URIs:
- luna://com.webos.service.audio (오디오 서비스)
- luna://com.palm.activitymanager (액티비티 매니저)
- luna://com.webos.service.settings (설정 서비스)
- luna://com.webos.service.systemservice (시스템 서비스)
- luna://com.webos.applicationManager (애플리케이션 매니저)
- luna://com.webos.service.tv (TV 서비스)
- luna://com.webos.media (미디어 서비스)
- luna://com.webos.service.connectionmanager (연결 매니저)
*/

// 12. 메서드 자동완성 테스트 (향후 구현 예정)
webOS.service.request('luna://com.webos.service.audio', {
    method: '', // 여기서 메서드 자동완성이 나타나야 함
    parameters: {},
    onSuccess: function (response) {
        console.log('Success:', response);
    },
    onFailure: function (error) {
        console.log('Failed:', error.errorText);
    }
});

console.log('자동완성 테스트 준비 완료! 위의 주석을 참고하여 각 섹션을 테스트해보세요.');
console.log('문제가 있다면 VS Code 개발자 도구 콘솔에서 오류 메시지를 확인하세요.');
