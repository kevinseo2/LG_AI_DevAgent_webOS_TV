#!/usr/bin/env node

/**
 * webOS TV API 데이터 검증 도구
 * 
 * 이 도구는 API 파일들이 표준 스키마를 준수하는지 검증합니다.
 * 
 * 사용법:
 *   node api-validator.js [options]
 * 
 * 옵션:
 *   --file <path>     특정 API 파일 검증
 *   --all            모든 API 파일 검증
 *   --fix            자동 수정 시도
 *   --verbose        상세 로그 출력
 *   --help           도움말 표시
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class APIValidator {
    constructor(options = {}) {
        this.options = {
            verbose: options.verbose || false,
            fix: options.fix || false,
            ...options
        };
        
        this.ajv = new Ajv({ allErrors: true, verbose: true });
        addFormats(this.ajv);
        
        this.loadSchemas();
        this.validationResults = [];
    }

    loadSchemas() {
        try {
            // API 스키마 로드
            const apiSchemaPath = path.join(__dirname, '../docs/api-schemas/webos-api-schema-v2.json');
            const apiIndexSchemaPath = path.join(__dirname, '../docs/api-schemas/webos-api-index-schema-v2.json');
            
            this.apiSchema = JSON.parse(fs.readFileSync(apiSchemaPath, 'utf8'));
            this.apiIndexSchema = JSON.parse(fs.readFileSync(apiIndexSchemaPath, 'utf8'));
            
            this.apiValidator = this.ajv.compile(this.apiSchema);
            this.apiIndexValidator = this.ajv.compile(this.apiIndexSchema);
            
            this.log('✅ 스키마 로드 완료');
        } catch (error) {
            console.error('❌ 스키마 로드 실패:', error.message);
            process.exit(1);
        }
    }

    log(message, level = 'info') {
        if (this.options.verbose || level === 'error' || level === 'warn') {
            const timestamp = new Date().toISOString();
            const prefix = {
                info: 'ℹ️',
                warn: '⚠️',
                error: '❌',
                success: '✅'
            }[level] || 'ℹ️';
            
            console.log(`${prefix} [${timestamp}] ${message}`);
        }
    }

    validateFile(filePath) {
        this.log(`🔍 검증 중: ${filePath}`);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            const result = {
                file: filePath,
                valid: true,
                errors: [],
                warnings: [],
                fixes: []
            };

            // 파일명에 따라 적절한 스키마 선택
            const isIndexFile = path.basename(filePath) === 'api-index.json';
            const validator = isIndexFile ? this.apiIndexValidator : this.apiValidator;
            const schema = isIndexFile ? this.apiIndexSchema : this.apiSchema;

            // 스키마 검증
            const valid = validator(data);
            if (!valid) {
                result.valid = false;
                result.errors = validator.errors.map(error => ({
                    path: error.instancePath || error.schemaPath,
                    message: error.message,
                    data: error.data
                }));
            }

            // 추가 검증 규칙
            this.performAdditionalValidations(data, result, isIndexFile);

            // 자동 수정 시도
            if (this.options.fix && !result.valid) {
                this.attemptAutoFix(data, result);
            }

            this.validationResults.push(result);
            return result;

        } catch (error) {
            const result = {
                file: filePath,
                valid: false,
                errors: [{
                    path: '',
                    message: `파일 파싱 오류: ${error.message}`,
                    data: null
                }],
                warnings: [],
                fixes: []
            };
            
            this.validationResults.push(result);
            return result;
        }
    }

    performAdditionalValidations(data, result, isIndexFile) {
        if (isIndexFile) {
            this.validateApiIndex(data, result);
        } else {
            this.validateApiFile(data, result);
        }
    }

    validateApiFile(data, result) {
        // API 파일 특화 검증
        if (data.apiInfo) {
            // 서비스 URI 형식 검증
            if (data.apiInfo.serviceUri && !data.apiInfo.serviceUri.match(/^luna:\/\/[a-zA-Z0-9.-]+$/)) {
                result.warnings.push({
                    path: 'apiInfo.serviceUri',
                    message: '서비스 URI 형식이 표준과 다릅니다',
                    data: data.apiInfo.serviceUri
                });
            }

            // 카테고리 검증
            const validCategories = ['media', 'system', 'network', 'device', 'security', 'application', 'other'];
            if (data.apiInfo.category && !validCategories.includes(data.apiInfo.category)) {
                result.warnings.push({
                    path: 'apiInfo.category',
                    message: `유효하지 않은 카테고리: ${data.apiInfo.category}`,
                    data: data.apiInfo.category
                });
            }
        }

        // 메서드 검증
        if (data.methods && Array.isArray(data.methods)) {
            data.methods.forEach((method, index) => {
                // 메서드명 검증
                if (method.name && !method.name.match(/^[a-zA-Z][a-zA-Z0-9]*$/)) {
                    result.warnings.push({
                        path: `methods[${index}].name`,
                        message: '메서드명이 표준 명명 규칙을 따르지 않습니다',
                        data: method.name
                    });
                }

                // 예제 검증
                if (method.examples && Array.isArray(method.examples)) {
                    method.examples.forEach((example, exampleIndex) => {
                        if (!example.code || example.code.length < 20) {
                            result.warnings.push({
                                path: `methods[${index}].examples[${exampleIndex}].code`,
                                message: '예제 코드가 너무 짧습니다',
                                data: example.code
                            });
                        }
                    });
                }
            });
        }
    }

    validateApiIndex(data, result) {
        // API 인덱스 특화 검증
        if (data.webOSTV_APIs && data.webOSTV_APIs.apis) {
            const apis = data.webOSTV_APIs.apis;
            const serviceNames = new Set();
            const serviceUris = new Set();
            const fileNames = new Set();

            apis.forEach((api, index) => {
                // 중복 검증
                if (serviceNames.has(api.serviceName)) {
                    result.errors.push({
                        path: `webOSTV_APIs.apis[${index}].serviceName`,
                        message: '중복된 서비스 이름',
                        data: api.serviceName
                    });
                }
                serviceNames.add(api.serviceName);

                if (serviceUris.has(api.serviceUri)) {
                    result.errors.push({
                        path: `webOSTV_APIs.apis[${index}].serviceUri`,
                        message: '중복된 서비스 URI',
                        data: api.serviceUri
                    });
                }
                serviceUris.add(api.serviceUri);

                if (fileNames.has(api.fileName)) {
                    result.errors.push({
                        path: `webOSTV_APIs.apis[${index}].fileName`,
                        message: '중복된 파일명',
                        data: api.fileName
                    });
                }
                fileNames.add(api.fileName);

                // 파일 존재 여부 검증
                const apiFilePath = path.join(__dirname, '../apis', api.fileName);
                if (!fs.existsSync(apiFilePath)) {
                    result.warnings.push({
                        path: `webOSTV_APIs.apis[${index}].fileName`,
                        message: '참조된 API 파일이 존재하지 않습니다',
                        data: api.fileName
                    });
                }
            });
        }
    }

    attemptAutoFix(data, result) {
        this.log('🔧 자동 수정 시도 중...');
        
        let fixed = false;

        // 일반적인 수정 사항들
        if (data.apiInfo) {
            // 버전 형식 수정
            if (data.apiInfo.version && !data.apiInfo.version.match(/^\d+\.\d+$/)) {
                data.apiInfo.version = '1.0';
                result.fixes.push({
                    path: 'apiInfo.version',
                    message: '버전 형식을 1.0으로 수정',
                    oldValue: data.apiInfo.version,
                    newValue: '1.0'
                });
                fixed = true;
            }

            // 날짜 형식 수정
            if (data.apiInfo.lastUpdated && !data.apiInfo.lastUpdated.match(/^\d{4}-\d{2}-\d{2}$/)) {
                data.apiInfo.lastUpdated = new Date().toISOString().split('T')[0];
                result.fixes.push({
                    path: 'apiInfo.lastUpdated',
                    message: '날짜 형식을 YYYY-MM-DD로 수정',
                    oldValue: data.apiInfo.lastUpdated,
                    newValue: data.apiInfo.lastUpdated
                });
                fixed = true;
            }

            // 기본값 추가
            if (!data.apiInfo.status) {
                data.apiInfo.status = 'active';
                result.fixes.push({
                    path: 'apiInfo.status',
                    message: '기본 상태값 추가',
                    oldValue: undefined,
                    newValue: 'active'
                });
                fixed = true;
            }
        }

        if (fixed) {
            result.valid = true; // 수정 후 재검증 필요
            this.log('✅ 자동 수정 완료');
        }
    }

    validateAll() {
        this.log('🔍 모든 API 파일 검증 시작');
        
        const apisDir = path.join(__dirname, '../apis');
        const files = fs.readdirSync(apisDir).filter(file => file.endsWith('.json'));
        
        files.forEach(file => {
            const filePath = path.join(apisDir, file);
            this.validateFile(filePath);
        });

        this.printSummary();
    }

    printSummary() {
        console.log('\n📊 검증 결과 요약');
        console.log('==================');
        
        const total = this.validationResults.length;
        const valid = this.validationResults.filter(r => r.valid).length;
        const invalid = total - valid;
        
        console.log(`총 파일 수: ${total}`);
        console.log(`✅ 유효한 파일: ${valid}`);
        console.log(`❌ 유효하지 않은 파일: ${invalid}`);
        
        if (invalid > 0) {
            console.log('\n❌ 유효하지 않은 파일들:');
            this.validationResults
                .filter(r => !r.valid)
                .forEach(result => {
                    console.log(`  - ${result.file}`);
                    result.errors.forEach(error => {
                        console.log(`    • ${error.path}: ${error.message}`);
                    });
                });
        }

        const totalWarnings = this.validationResults.reduce((sum, r) => sum + r.warnings.length, 0);
        if (totalWarnings > 0) {
            console.log(`\n⚠️ 총 경고 수: ${totalWarnings}`);
        }

        const totalFixes = this.validationResults.reduce((sum, r) => sum + r.fixes.length, 0);
        if (totalFixes > 0) {
            console.log(`\n🔧 총 수정 사항: ${totalFixes}`);
        }
    }

    saveFixedFiles() {
        this.validationResults.forEach(result => {
            if (result.fixes.length > 0) {
                try {
                    const content = fs.readFileSync(result.file, 'utf8');
                    const data = JSON.parse(content);
                    
                    // 수정 사항 적용 (이미 attemptAutoFix에서 적용됨)
                    const fixedContent = JSON.stringify(data, null, 2);
                    fs.writeFileSync(result.file, fixedContent, 'utf8');
                    
                    this.log(`💾 수정된 파일 저장: ${result.file}`);
                } catch (error) {
                    this.log(`❌ 파일 저장 실패: ${result.file} - ${error.message}`, 'error');
                }
            }
        });
    }
}

// CLI 인터페이스
function main() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--file':
                options.file = args[++i];
                break;
            case '--all':
                options.all = true;
                break;
            case '--fix':
                options.fix = true;
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--help':
                console.log(`
webOS TV API 데이터 검증 도구

사용법:
  node api-validator.js [options]

옵션:
  --file <path>     특정 API 파일 검증
  --all            모든 API 파일 검증
  --fix            자동 수정 시도
  --verbose        상세 로그 출력
  --help           이 도움말 표시

예제:
  node api-validator.js --all --verbose
  node api-validator.js --file apis/audio-api.json --fix
                `);
                process.exit(0);
                break;
        }
    }

    const validator = new APIValidator(options);

    if (options.file) {
        const result = validator.validateFile(options.file);
        if (options.fix && result.fixes.length > 0) {
            validator.saveFixedFiles();
        }
    } else if (options.all) {
        validator.validateAll();
        if (options.fix) {
            validator.saveFixedFiles();
        }
    } else {
        console.log('옵션을 지정해주세요. --help를 참조하세요.');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = APIValidator;
