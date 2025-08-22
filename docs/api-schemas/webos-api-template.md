# {serviceName}

## 개요
**서비스 URI**: `{serviceUri}`  
**카테고리**: {category}  
**버전**: {version}  
**마지막 업데이트**: {lastUpdated}

{description}

## 메서드 목록

| 메서드 | 설명 | 에뮬레이터 지원 | 상태 |
|--------|------|----------------|------|
| [{methodName}](#{methodName}) | {shortDescription} | {emulatorSupport} | {deprecated} |

## 메서드 상세

### {methodName}

**설명**: {detailedDescription}

**파라미터**:

| 이름 | 필수 | 타입 | 설명 | 기본값 |
|------|------|------|------|--------|
| {paramName} | {required} | {type} | {description} | {defaultValue} |

**반환값**:

| 이름 | 필수 | 타입 | 설명 |
|------|------|------|------|
| {returnName} | {required} | {type} | {description} |

**구독 응답** (해당하는 경우):

| 이름 | 필수 | 타입 | 설명 |
|------|------|------|------|
| {subscriptionField} | {required} | {type} | {description} |

**오류 코드**:

| 코드 | 메시지 | 설명 |
|------|--------|------|
| {errorCode} | {errorMessage} | {errorDescription} |

**예제**:

```javascript
// {exampleTitle}
var request = webOS.service.request('luna://{serviceUri}', {
    method: '{methodName}',
    parameters: {
        {exampleParameters}
    },
    onSuccess: function (inResponse) {
        console.log('Success:', inResponse);
        // {successHandling}
    },
    onFailure: function (inError) {
        console.log('Failed:', inError);
        // {errorHandling}
    }
});
```

**사용 사례**:
- {useCase1}
- {useCase2}

## 객체 정의

### {objectName}

{objectDescription}

**속성**:

| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| {propertyName} | {type} | {required} | {description} |

**예제**:

```json
{
  "{propertyName}": {exampleValue}
}
```

## 관련 문서
- [webOS TV 개발자 가이드]({relatedDocsUrl})
- [API 샘플 코드]({sampleCodeUrl})

## 버전 히스토리
- **{version}**: {changeDescription}

---
*이 문서는 webOS TV API 문서 자동화 시스템에 의해 생성되었습니다.*
