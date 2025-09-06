# Chat Participant 개선된 동작 흐름

## 개요
Chat Participant가 MCP 서버의 최신 정보를 우선적으로 활용하여 LM API에 컨텍스트로 제공하는 개선된 동작 흐름을 설명합니다.

## 동작 흐름

### 1단계: 사용자 질문 수신
```
사용자 질문 → Chat Participant.handleRequest()
```

### 2단계: MCP 서버 정보 수집 (우선)
```
gatherMCPContext() 실행:
├── webos_list_apis: API 목록 조회
├── 사용자 질문 분석하여 관련 API 식별
├── webos_get_api_info: 특정 API 상세 정보 조회 (필요시)
└── webos_generate_code: 코드 예제 수집 (코드 생성 요청시)
```

### 3단계: VS Code 컨텍스트 수집
```
gatherContextInfo() 실행:
├── 현재 워크스페이스 정보
├── 활성 파일 정보
├── 프로젝트 타입 추론
└── 파일 내용 일부 수집
```

### 4단계: 강화된 프롬프트 구성
```
buildEnhancedWebOSExpertPrompt() 실행:
├── MCP 서버에서 수집한 최신 API 정보 포함
├── 관련 API 정보 포함
├── 특정 API 상세 정보 포함 (해당시)
├── 코드 예제 포함 (해당시)
├── VS Code 컨텍스트 정보 포함
└── webOS 개발 전문가 역할 정의
```

### 5단계: LM API 요청
```
GPT-4o 모델에 요청:
├── 시스템 프롬프트: MCP 정보 + 컨텍스트
├── 사용자 질문
└── 스트리밍 응답 처리
```

### 6단계: 폴백 메커니즘
```
LM API 실패시:
├── generateMCPBasedResponse() 실행
├── MCP 서버의 webos_chat_assistant 직접 호출
└── MCP 서버 기반 응답 제공
```

## 주요 개선 사항

### 1. MCP 서버 우선 정보 수집
- **기존**: LM API가 일반적인 지식으로만 응답
- **개선**: MCP 서버에서 최신 API 정보를 먼저 조회하여 LM에 컨텍스트로 제공

### 2. 동적 정보 수집
- **API 목록**: 모든 webOS TV API 목록 조회
- **관련 API**: 사용자 질문과 관련된 API 자동 식별
- **상세 정보**: 특정 API에 대한 상세 정보 조회
- **코드 예제**: 코드 생성 요청시 실제 사용 가능한 예제 수집

### 3. 강화된 프롬프트
- **최신 정보**: MCP 서버에서 조회한 실시간 API 정보
- **컨텍스트**: 현재 프로젝트와 파일 정보
- **전문성**: webOS TV 개발 전문가 역할 정의
- **가이드라인**: 구체적인 응답 가이드라인 제공

### 4. 폴백 메커니즘
- **LM 실패시**: MCP 서버 기반 응답으로 자동 전환
- **연결 실패시**: 적절한 오류 메시지와 재연결 안내
- **데이터 없음시**: 기본 API 정보로 폴백

## 예시 시나리오

### 시나리오 1: "Audio API로 볼륨 조절하는 코드 만들어줘"

1. **MCP 정보 수집**:
   - `webos_list_apis`: Audio API 정보 조회
   - `webos_get_api_info`: Audio API 상세 정보 조회
   - `webos_generate_code`: 볼륨 조절 코드 예제 생성

2. **LM 프롬프트 구성**:
   - Audio API의 최신 메서드 정보
   - 실제 사용 가능한 코드 예제
   - 현재 프로젝트 컨텍스트

3. **LM 응답**:
   - MCP에서 제공한 최신 정보를 기반으로 정확한 코드 생성
   - 프로젝트에 맞는 맞춤형 코드 제공

### 시나리오 2: LM API 실패시

1. **LM API 오류 발생**
2. **자동 폴백**:
   - `generateMCPBasedResponse()` 실행
   - MCP 서버의 `webos_chat_assistant` 직접 호출
3. **MCP 기반 응답**:
   - MCP 서버에서 직접 생성한 응답 제공

## 장점

1. **최신 정보 반영**: MCP 서버의 최신 API 정보가 LM 응답에 반영
2. **정확성 향상**: 실제 사용 가능한 API 정보 기반 응답
3. **안정성**: LM 실패시에도 MCP 서버 기반 응답 제공
4. **컨텍스트 활용**: 현재 프로젝트 상황을 고려한 맞춤형 답변
5. **사용자 경험**: 일관된 품질의 응답 제공

## 기술적 구현

### 핵심 메서드
- `gatherMCPContext()`: MCP 서버에서 최신 정보 수집
- `parseAPIListFromMarkdown()`: MCP 서버의 마크다운 응답을 파싱
- `buildEnhancedWebOSExpertPrompt()`: 강화된 프롬프트 구성
- `generateMCPBasedResponse()`: MCP 서버 기반 폴백 응답

### 에러 처리
- MCP 서버 연결 실패
- LM API 오류
- 데이터 파싱 오류 (마크다운 → JSON 변환)
- 타임아웃 처리

### 응답 형식 처리
- **MCP 서버 응답**: 마크다운 형식의 텍스트
- **파싱 로직**: 정규식을 사용한 마크다운 파싱
- **폴백**: 파싱 실패시 기본 API 목록 사용

이러한 개선을 통해 Chat Participant는 MCP 서버의 최신 정보를 활용하여 더욱 정확하고 유용한 답변을 제공할 수 있게 되었습니다.
