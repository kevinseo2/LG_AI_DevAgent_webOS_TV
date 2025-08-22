# webOS TV appinfo.json 완전한 스펙 문서

## 개요

webOS TV 플랫폼은 앱 메타데이터를 사용하여 앱을 식별하고 앱을 설치하고 실행하는 데 필요한 기타 정보를 획득합니다. 앱을 패키징하기 전에 `appinfo.json` 파일에 앱의 메타데이터를 작성해야 합니다. `appinfo.json` 파일은 앱의 루트 디렉토리에 위치하며 단일 JSON 객체를 포함합니다.

## JSON 구문 팁

- 주석(`/*` 또는 `//`)을 포함하지 마세요.
- 속성 주위에는 작은따옴표가 아닌 큰따옴표를 사용하세요.

## 필수 속성 (LG Content Store 제출 필수)

다음 속성들은 앱을 LG Content Store에 제출하기 위해 특별히 필요합니다:

- `id`
- `title`
- `type`
- `main`
- `icon`
- `version`

## 속성 상세 설명

### 필수 속성

#### `id`
- **타입**: String (필수)
- **설명**: 앱 ID를 지정합니다.
- **예시**: `"com.newcompany.app.myapp"`
- **규칙**:
  - 역방향 DNS 명명 규칙에 따라 고유한 ID여야 함
  - 소문자(a-z), 숫자(0-9), 마이너스 기호, 마침표만 사용 가능
  - 영숫자 문자로 시작하고 최소 2자 이상이어야 함
  - 앱이 게시된 후에는 변경할 수 없음
- **제한사항**:
  - JS 서비스를 추가할 경우 마이너스 기호(-) 또는 .(마침표)+숫자 포함 불가
  - 예약된 도메인 이름으로 시작 불가: `com.palm`, `com.webos`, `com.lge`, `com.palmdts`
- **권장사항**:
  - 회사/기관의 역방향 도메인으로 시작
  - `app.app-name` 하위 도메인으로 끝내기

#### `title`
- **타입**: String (필수)
- **설명**: 런처와 앱 윈도우에 표시될 앱 제목을 지정합니다.

#### `main`
- **타입**: String (필수)
- **설명**: 앱의 시작점을 지정합니다.
- **기본값**: `"index.html"`
- **규칙**: appinfo.json 파일에 상대적인 경로이며 HTML 파일을 가리켜야 함

#### `icon`
- **타입**: String (필수)
- **설명**: 앱의 작은 아이콘 파일을 지정합니다.
- **형식**: PNG 형식, 80x80 픽셀
- **용도**: 앱 제출 및 앱 테스트용 (LG Content Store에서는 별도 업로드한 400x400 픽셀 아이콘 사용)

#### `type`
- **타입**: String (필수)
- **설명**: 앱 타입을 지정합니다.
- **허용값**: `"web"` (현재 유일한 허용값)

#### `version`
- **타입**: String (필수)
- **설명**: 앱 버전 번호를 지정합니다.
- **형식**: 마침표로 구분된 세 개의 음이 아닌 정수
- **기본값**: `"1.0.0"`
- **규칙**:
  - 선행 0을 포함하지 않음 (예: `2.1.0`, `002.1.0` 아님)
  - 주, 부, 수정 번호는 모두 필수 (예: `2.1.0`, `2.1` 아님)
  - 각 번호는 최대 9자리 (최대 버전: `999999999.999999999.999999999`)
  - 번호는 개별적 (예: `1.5.3`은 `1.15.3`보다 낮은 버전)
  - 동일한 버전은 LG Content Store에 재업로드 불가

### 선택적 속성

#### `largeIcon`
- **타입**: String (선택)
- **설명**: 앱의 큰 아이콘 파일을 지정합니다.
- **형식**: PNG 형식, 130x130 픽셀
- **용도**: 앱 제출 및 앱 테스트용

#### `vendor`
- **타입**: String (선택)
- **설명**: 런처 및 기기 정보 대화상자에서 사용될 앱 소유자를 지정합니다.

#### `appDescription`
- **타입**: String (선택)
- **설명**: 앱에 대한 간단한 정보를 지정합니다.
- **제한**: 60자 이하

#### `resolution`
- **타입**: String (선택)
- **설명**: 앱의 그래픽 디스플레이 화면 해상도를 지정합니다.
- **기본값**: `"1920x1080"`
- **지원 해상도**:
  - `"1920x1080"` (기본값) - FHD 해상도
  - `"1280x720"` - HD 해상도
- **참고**: webOS TV는 웹 앱의 UHD 해상도를 지원하지 않음

#### `bgColor`
- **타입**: String (선택)
- **설명**: 런처에 표시될 앱의 배경색을 지정합니다.
- **지원 버전**: webOS TV 1.x 및 2.x만 (이후 버전에서는 무시됨)
- **형식**: 16진수 값 또는 HTML 색상 이름
- **예시**: `"#5e70a2"`, `"#ffffff"`

#### `iconColor`
- **타입**: String (선택)
- **설명**: 앱 타일의 배경색을 지정합니다.
- **기본값**: `"white"`

#### `bgImage`
- **타입**: String (선택)
- **설명**: 런처에서 활성화될 때 표시될 앱의 배경 이미지를 지정합니다.
- **지원 버전**: webOS TV 1.x 및 2.x만 (이후 버전에서는 무시됨)
- **형식**: PNG 형식, 1920 x 1080 픽셀

#### `closeOnRotation`
- **타입**: Boolean (선택)
- **설명**: 회전 시 앱을 닫을지 여부를 설정합니다.
- **기본값**: `false`

#### `disableBackHistoryAPI`
- **타입**: Boolean (선택)
- **설명**: 뒤로 가기 히스토리 API를 비활성화할지 여부를 설정합니다.
- **기본값**: `false`

#### `handlesRelaunch`
- **타입**: Boolean (선택)
- **설명**: 앱이 `webOSRelaunch` 이벤트를 처리할지 여부를 설정합니다.
- **기본값**: `false`
- **값**:
  - `false` - 앱이 `webOSRelaunch` 이벤트를 처리하지 않음 (자동으로 전체화면 모드 표시)
  - `true` - 앱이 백그라운드에서 `webOSRelaunch` 이벤트를 처리한 후 `PalmSystem.activate()` 메서드를 호출하여 전경으로 나옴

#### `splashBackground`
- **타입**: String (선택)
- **설명**: 앱이 로딩되는 동안 표시될 배경 이미지를 지정합니다.
- **형식**: PNG 형식, 1920 x 1080 해상도

#### `splashColor`
- **타입**: String (선택)
- **설명**: 스플래시 이미지의 배경색(RGB)을 지정합니다.
- **적용 모델**: StanbyME 모델만
- **기본값**: `"gray"`
- **형식**: 16진수 값 또는 HTML 색상 이름 (예: `"#000000"`, `"black"`)

#### `splashFitModeOnPortrait`
- **타입**: String (선택)
- **설명**: 세로 모드에서 스플래시 이미지의 맞춤 모드를 지정합니다.
- **적용 모델**: StanbyME 모델만
- **기본값**: `"none"`
- **값**:
  - `"none"` - 스플래시 이미지가 원본 크기로 표시됨
  - `"width"` - 스플래시 이미지가 화면 너비에 맞게 크기 조정됨

#### `requiredMemory`
- **타입**: Number (선택)
- **설명**: 앱 실행에 필요한 최소 메모리 양을 메가바이트 단위로 설정합니다.
- **참고**: 앱이 소비하는 최대 메모리 사용량과 동일할 필요는 없음

#### `supportPortraitMode`
- **타입**: Boolean (선택)
- **설명**: 앱이 세로 모드를 지원하는지 여부를 지정합니다.
- **적용 모델**: StanbyME 모델만
- **기본값**: `false`
- **값**:
  - `false` - 앱이 세로 모드를 지원하지 않음
  - `true` - 앱이 세로 모드를 지원함

#### `supportTouchMode`
- **타입**: String (선택)
- **설명**: 터치 이벤트 처리 방법을 지정합니다.
- **적용 모델**: StanbyME 모델만
- **기본값**: `"none"`
- **값**:
  - `"none"` - 앱이 터치 입력을 처리하지 않음
  - `"full"` - 앱이 터치 입력을 처리함 (표준 웹 API 사용)
  - `"virtual"` - 터치 이벤트가 키보드 또는 마우스 이벤트로 변환되어 전송됨

#### `transparent`
- **타입**: Boolean (선택)
- **설명**: 앱 배경의 투명도를 설정합니다.
- **기본값**: `false`
- **값**:
  - `false` - 앱 배경의 투명도가 감소하고 시스템 배경이 약간 회색으로 표시됨
  - `true` - 시스템 배경이 명확하게 표시됨

#### `useGalleryMode`
- **타입**: Boolean (선택)
- **설명**: 사진 설정을 갤러리 모드로 변경할지 여부를 설정합니다.
- **용도**: 갤러리 타입 앱의 경우 `true`로 설정
- **주의**: `screenSaverProperties.preferredType`이 `3`으로 설정된 경우 반드시 `true`로 설정해야 함

### 객체 타입 속성

#### `virtualTouch`
- **타입**: Object (선택)
- **설명**: 터치 입력의 세부 값을 설정합니다.
- **적용 조건**: `supportTouchMode`가 `"virtual"`로 설정된 경우에만 (StanbyME 모델)

##### `virtualTouch` 객체 속성

###### `verticalThreshold`
- **타입**: Number (선택)
- **설명**: 세로 방향 터치 및 드래그 이벤트를 트리거하는 임계값을 설정합니다.
- **범위**: 10-100 px
- **기본값**: 40

###### `horizontalThreshold`
- **타입**: Number (선택)
- **설명**: 가로 방향 터치 및 드래그 이벤트를 트리거하는 임계값을 설정합니다.
- **범위**: 10-100 px
- **기본값**: 40

###### `positionEventOnPress`
- **타입**: Boolean (선택)
- **설명**: 터치 프레스 이벤트(200ms 미만)를 마우스 위치 이벤트로 전송할지 여부를 설정합니다.
- **기본값**: `false`
- **값**:
  - `false` - 터치 프레스 이벤트는 전송되지 않고, 터치 릴리스 이벤트만 키 또는 마우스 이벤트로 전송됨
  - `true` - 터치 프레스 이벤트가 마우스 위치 이벤트로 전송되고, 터치 릴리스 이벤트가 키 또는 마우스 이벤트로 전송됨

###### `shortTouchThreshold`
- **타입**: Number (선택)
- **설명**: 짧은 터치(클릭과 같은)로 인식되는 클릭 임계값을 설정합니다.
- **범위**: 10-50 px
- **기본값**: 10

#### `accessibility`
- **타입**: Object (선택)
- **설명**: 접근성 기능을 지원하기 위한 객체입니다.

##### `accessibility` 객체 속성

###### `supportsAudioGuidance`
- **타입**: Boolean (선택)
- **설명**: 앱에서 음성 안내를 지원할지 여부를 설정합니다.
- **기본값**: `false`
- **값**:
  - `false` - 앱이 음성 안내를 지원하지 않음
  - `true` - 앱이 음성 안내를 지원함
- **참고**: 음성 안내를 지원하려면 ARIA 태그를 사용해야 함 (webOS TV 3.0 이상 지원)

#### `screenSaverProperties`
- **타입**: Object (선택)
- **설명**: Type 2 또는 Type 3 화면 보호기를 사용하기 위한 속성입니다.

##### `screenSaverProperties` 객체 속성

###### `preferredType`
- **타입**: Number (선택)
- **설명**: 선호하는 화면 보호기 타입을 지정합니다.
- **값**:
  - `2` - 화면 보호기 시간 초과가 30분으로 연장되고, OSD 영역의 밝기가 점진적으로 감소함
  - `3` - 화면 보호기 시간 초과가 30분으로 연장됨 (이 타입을 사용할 경우 `useGalleryMode`를 `true`로 설정해야 함)

## 예시 파일

```json
{
    "id": "com.mycompany.app.appname",
    "title": "AppName",
    "main": "index.html",
    "icon": "AppName_80x80.png",
    "largeIcon": "AppName_130x130.png",
    "type": "web",
    "vendor": "My Company",
    "version": "1.0.0",
    "appDescription": "This's an app tagline",
    "resolution": "1920x1080",
    "bgColor": "red",
    "iconColor": "red",
    "bgImage": "AppName_Preview.png",
    "closeOnRotation": false,
    "disableBackHistoryAPI": false,
    "handlesRelaunch": false,
    "splashBackground": "AppName_Splash.png",
    "splashColor": "#111111",
    "splashFitModeOnPortrait": "width",
    "requiredMemory": 20,
    "supportPortraitMode": true,
    "supportTouchMode": "virtual",
    "transparent": false,
    "virtualTouch": {
        "verticalThreshold": 20,
        "horizontalThreshold": 50,
        "positionEventOnPress": true,
        "shortTouchThreshold": 30
    },
    "accessibility": {
        "supportsAudioGuidance": true
    },
    "screenSaverProperties": {
        "preferredType": 3
    },
    "useGalleryMode": true
}
```

## 추가 참고사항

### HTML `<title>` 요소
앱에서 부제목을 위해 HTML `<title>` 요소를 사용할 수 있습니다. 부제목으로는 앱 버전이나 공급업체 이름이 권장됩니다.

### 앱 해상도 확인
그래픽 디스플레이의 앱 해상도를 확인하려면 `window.innerWidth` 및 `window.innerHeight` 속성을 사용하세요.

### ARIA 지원
접근성을 위한 ARIA 태그에 대한 자세한 정보는 [W3C ARIA 문서](https://www.w3.org/TR/wai-aria/)를 참조하세요.

## 버전별 지원사항

- **webOS TV 1.x/2.x**: `bgColor`, `bgImage` 속성 지원
- **webOS TV 3.0 이상**: `transparent` 속성 기본 적용, 음성 안내 지원
- **webOS TV 3.x**: 음성 안내 부분적 지원
- **StanbyME 모델**: 세로 모드, 터치 모드, 스플래시 관련 속성 지원
