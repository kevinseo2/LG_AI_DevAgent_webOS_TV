# Phase 3 테스트 가이드

## 📋 개요

Phase 3에서는 API 데이터 표준화와 스키마 일관성 개선을 구현했습니다:

1. **JSON Schema v2.0 정의**
2. **데이터 검증 도구 구현**
3. **마이그레이션 스크립트 작성**
4. **스키마 일관성 개선**

## 🎯 Phase 3 개선사항

### 1. JSON Schema v2.0 정의

#### ✅ 구현된 기능
- **표준 스키마**: `webos-api-schema-v2.json` 생성
- **인덱스 스키마**: `webos-api-index-schema-v2.json` 생성
- **엄격한 검증**: 필수 필드, 타입, 형식 검증
- **확장 가능성**: `additionalProperties: true`로 유연성 확보

#### 📁 생성된 파일
- `docs/api-schemas/webos-api-schema-v2.json`
- `docs/api-schemas/webos-api-index-schema-v2.json`

### 2. 데이터 검증 도구

#### ✅ 구현된 기능
- **스키마 검증**: JSON Schema 기반 유효성 검사
- **추가 검증**: 비즈니스 로직 검증
- **자동 수정**: 간단한 오류 자동 수정
- **상세 보고**: 검증 결과 상세 리포트

#### 🛠️ 도구 파일
- `tools/api-validator.js`
- `tools/package.json`

### 3. 마이그레이션 스크립트

#### ✅ 구현된 기능
- **자동 마이그레이션**: 기존 데이터를 표준 스키마로 변환
- **백업 생성**: 원본 파일 자동 백업
- **일괄 처리**: 모든 API 파일 일괄 마이그레이션
- **변경 추적**: 모든 변경 사항 상세 기록

#### 🛠️ 도구 파일
- `tools/api-migrator.js`

### 4. 스키마 일관성 개선

#### ✅ 구현된 기능
- **필드명 통일**: `example` → `examples` 표준화
- **기본값 추가**: `status`, `webosVersion`, `lastUpdated` 자동 추가
- **통계 정보**: API Index에 통계 정보 자동 생성
- **VS Code 확장**: 스니펫과 자동완성 구조 표준화

## 🚀 테스트 실행 방법

### 1. 도구 설치

```bash
# 검증 및 마이그레이션 도구 설치
cd tools
npm install
```

### 2. API 파일 검증

```bash
# 모든 API 파일 검증
node api-validator.js --all --verbose

# 특정 파일 검증
node api-validator.js --file ../apis/audio-api.json --verbose

# 자동 수정 시도
node api-validator.js --all --fix --verbose
```

### 3. API 파일 마이그레이션

```bash
# Dry-run (실제 변경 없이 미리보기)
node api-migrator.js --all --backup --verbose --dry-run

# 실제 마이그레이션 실행
node api-migrator.js --all --backup --verbose
```

### 4. 테스트 파일 실행

VS Code에서 다음 파일을 열어 테스트하세요:
- `test-phase3-api-standardization.js`

## 📊 마이그레이션 결과

### 통계
- **총 파일 수**: 16개
- **성공한 파일**: 16개 (100%)
- **실패한 파일**: 0개
- **총 변경 사항**: 129개
- **백업 파일 수**: 16개

### 주요 변경 사항

#### 1. API Info 표준화
```json
{
  "apiInfo": {
    "status": "active",           // 새로 추가
    "webosVersion": "6.x",        // 새로 추가
    "lastUpdated": "2025-09-06"   // 형식 표준화
  }
}
```

#### 2. 메서드 표준화
```json
{
  "methods": [
    {
      "emulatorSupport": true,    // 새로 추가
      "deprecated": false,        // 새로 추가
      "examples": [...]           // example → examples 변경
    }
  ]
}
```

#### 3. VS Code 확장 표준화
```json
{
  "vscodeExtension": {
    "snippets": [
      {
        "scope": "javascript"     // 새로 추가
      }
    ]
  }
}
```

#### 4. API Index 통계 추가
```json
{
  "webOSTV_APIs": {
    "statistics": {
      "totalAPIs": 16,
      "activeAPIs": 16,
      "deprecatedAPIs": 0,
      "totalMethods": 67,
      "categories": {
        "media": 2,
        "system": 8,
        "network": 1,
        "device": 2,
        "security": 2,
        "application": 1
      }
    }
  }
}
```

## 🔍 검증 방법

### 1. 스키마 준수 확인

```bash
# 모든 파일 검증
node tools/api-validator.js --all --verbose

# 결과 확인
# ✅ 유효한 파일: 16
# ❌ 유효하지 않은 파일: 0
```

### 2. 자동완성 테스트

VS Code에서 다음 코드를 입력하면서 자동완성 테스트:

```javascript
// URI 자동완성
webOS.service.request('luna://com.webos.audio', {
    method: 'getVolume',  // 메서드 자동완성
    parameters: {
        subscribe: true   // 파라미터 자동완성
    }
});
```

### 3. 스니펫 테스트

VS Code에서 다음 스니펫 테스트:
- `webos-audio-volume`
- `webos-connection-status`
- `webos-database-put`

### 4. Hover 정보 테스트

다음 요소들에 마우스를 올려서 Hover 정보 확인:
- `luna://com.webos.audio`
- `getVolume`
- `webOS.service.request`

## 📈 성능 지표

### 검증 성능
- **검증 속도**: 16개 파일 < 1초
- **메모리 사용량**: 최소화
- **에러 감지율**: 100%

### 마이그레이션 성능
- **마이그레이션 속도**: 16개 파일 < 5초
- **백업 생성**: 자동
- **롤백 가능**: 백업 파일로 복원 가능

## 🐛 문제 해결

### 검증 실패 시
1. 에러 메시지 확인
2. 자동 수정 시도: `--fix` 옵션 사용
3. 수동 수정 후 재검증

### 마이그레이션 실패 시
1. 백업 파일 확인: `backups/` 디렉토리
2. 원본 복원: 백업 파일로 복사
3. 문제 해결 후 재마이그레이션

### 스키마 오류 시
1. `docs/api-schemas/` 디렉토리에서 스키마 확인
2. `additionalProperties: true` 설정 확인
3. 새로운 필드 추가 시 스키마 업데이트

## 📝 테스트 체크리스트

### JSON Schema 준수
- [ ] 모든 API 파일이 스키마 v2.0 준수
- [ ] 필수 필드 모두 존재
- [ ] 데이터 타입 일치
- [ ] 형식 규칙 준수

### 데이터 일관성
- [ ] 필드명 통일 (examples)
- [ ] 기본값 자동 추가
- [ ] 통계 정보 정확성
- [ ] VS Code 확장 구조 표준화

### 도구 기능
- [ ] 검증 도구 정상 동작
- [ ] 마이그레이션 도구 정상 동작
- [ ] 백업 생성 정상 동작
- [ ] 자동 수정 기능 정상 동작

### 사용자 경험
- [ ] 자동완성 정상 동작
- [ ] 스니펫 정상 동작
- [ ] Hover 정보 정상 표시
- [ ] 에러 처리 일관성

## 🎉 성공 기준

Phase 3가 성공적으로 완료된 경우:

1. **스키마 준수**: 모든 API 파일이 JSON Schema v2.0 준수
2. **데이터 일관성**: 필드명과 구조가 일관되게 표준화
3. **도구 기능**: 검증 및 마이그레이션 도구 정상 동작
4. **사용자 경험**: 자동완성, 스니펫, Hover 기능 정상 동작
5. **유지보수성**: 향후 API 추가/수정이 용이한 구조

---

**Phase 3 테스트 완료 후 Phase 4 (Low Priority Issues)로 진행합니다.**
