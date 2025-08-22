# webOS TV API Assistant

webOS TV 개발자를 위한 VS Code 확장입니다. Luna Service API 자동완성, 코드 생성, Quick Fix 등의 기능을 제공합니다.

## 🚀 주요 기능

### 🎯 스마트 자동완성
- Luna Service URI 자동완성
- API 메서드 자동완성
- 파라미터 힌트 및 타입 체크
- 실시간 호환성 검사

### 🛠️ 코드 생성
- API 호출 코드 자동 생성
- Callback, Async/Await, Promise 스타일 지원
- 에러 처리 코드 자동 추가
- 사용자 정의 템플릿

### 🔧 Quick Fix
- 누락된 에러 처리 추가
- Deprecated API 경고 및 대안 제안
- 파라미터 자동 추가
- 코드 스타일 변환

### 📖 인라인 문서
- API 메서드 hover 정보
- 파라미터 설명
- 예제 코드
- 호환성 정보

### 🔍 API 탐색
- 전체 API 검색
- 카테고리별 필터링
- 기능 기반 검색
- 인터랙티브 문서 뷰어

## 📦 설치

1. VS Code Extensions에서 "webOS TV API Assistant" 검색
2. Install 클릭
3. 확장이 활성화되면 상태바에 🚀 webOS TV 아이콘이 표시됩니다

## ⚙️ 설정

### MCP 서버 경로 설정
```json
{
  "webos-api.mcpServerPath": "/path/to/webos-tv-api-mcp-server/dist/index.js"
}
```

### 기본 설정
```json
{
  "webos-api.enableAutoComplete": true,
  "webos-api.enableQuickFix": true,
  "webos-api.codeStyle": "callback",
  "webos-api.targetVersion": "6.x"
}
```

## 🎮 사용법

### 1. 자동완성 사용
JavaScript/TypeScript 파일에서 `webOS.service.request`를 입력하면 자동완성이 활성화됩니다:

```javascript
webOS.service.request('luna://com.webos.service.audio', {
    method: 'getVolume', // 메서드 자동완성
    parameters: {
        subscribe: true // 파라미터 자동완성
    },
    onSuccess: function(response) {
        console.log('Volume:', response.volume);
    },
    onFailure: function(error) {
        console.log('Error:', error.errorText);
    }
});
```

### 2. Quick Fix 사용
코드에 문제가 있을 때 💡 아이콘을 클릭하거나 `Ctrl+.`을 눌러 Quick Fix를 사용하세요:

- **에러 처리 추가**: onFailure 핸들러 자동 생성
- **코드 스타일 변환**: Callback → Async/Await 변환
- **파라미터 추가**: 필수 파라미터 자동 추가
- **Deprecated API 수정**: 최신 API로 교체 제안

### 3. 명령 사용

#### API 검색 (`Ctrl+Shift+P` → "Search webOS TV APIs")
```
Search webOS TV APIs: volume
```
→ 볼륨 관련 API 메서드들을 보여줍니다

#### 코드 생성 (`Ctrl+Shift+P` → "Generate API Code")
대화형 방식으로 API 호출 코드를 생성합니다:
1. API 선택
2. 메서드 선택  
3. 파라미터 입력
4. 코드 스타일 선택

### 4. 스니펫 사용

| Prefix | 설명 |
|--------|------|
| `webos-request` | 기본 API 호출 |
| `webos-request-sub` | 구독 포함 API 호출 |
| `webos-audio-getvolume` | 볼륨 조회 |
| `webos-audio-setvolume` | 볼륨 설정 |
| `webos-activity-adopt` | Activity 채택 |
| `webos-settings-get` | 시스템 설정 조회 |
| `webos-connection-status` | 네트워크 상태 조회 |
| `webos-db-put` | 데이터 저장 |
| `webos-db-find` | 데이터 검색 |
| `webos-tv-info` | TV 정보 조회 |

## 🎯 지원되는 API

### System APIs
- **Activity Manager** - 시스템 작업 관리
- **Application Manager** - 앱 실행 관리
- **Database** - 데이터 저장소
- **Settings Service** - 시스템 설정
- **System Service** - 시스템 정보

### Media APIs  
- **Audio** - 볼륨 제어
- **DRM** - 디지털 권한 관리
- **Media Database** - 미디어 메타데이터

### Device APIs
- **Magic Remote** - 리모컨 센서
- **TV Device Information** - TV 하드웨어 정보
- **Device Unique ID** - 디바이스 식별

### Network APIs
- **Connection Manager** - 네트워크 상태
- **BLE GATT** - 블루투스 LE

## 🔧 문제 해결

### MCP 서버 연결 실패
1. MCP 서버 경로가 올바른지 확인
2. Node.js가 설치되어 있는지 확인
3. VS Code 출력 패널에서 "webOS TV API Assistant" 로그 확인

### 자동완성이 작동하지 않음
1. JavaScript/TypeScript 파일인지 확인
2. `webos-api.enableAutoComplete` 설정 확인
3. 확장을 재시작: `Ctrl+Shift+P` → "Reload Window"

### Quick Fix가 표시되지 않음
1. `webos-api.enableQuickFix` 설정 확인
2. 커서가 webOS API 호출 부분에 있는지 확인
3. `Ctrl+.` 또는 💡 아이콘 클릭

## 📋 요구사항

- VS Code 1.74.0 이상
- Node.js 18.0.0 이상
- webOS TV API MCP Server

## 🤝 기여하기

1. Repository Fork
2. Feature Branch 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 Commit (`git commit -m 'Add amazing feature'`)
4. Branch Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 📝 라이선스

MIT License

## 🔗 관련 링크

- [webOS TV 개발자 사이트](https://webostv.developer.lge.com/)
- [Luna Service API 문서](https://webostv.developer.lge.com/develop/references/)
- [webOS TV SDK](https://webostv.developer.lge.com/develop/tools/sdk-introduction)

---

**Made with ❤️ for webOS TV Developers**
