#!/usr/bin/env node

/**
 * webOS TV API 데이터 마이그레이션 도구
 * 
 * 이 도구는 기존 API 파일들을 표준 스키마 v2.0으로 마이그레이션합니다.
 * 
 * 사용법:
 *   node api-migrator.js [options]
 * 
 * 옵션:
 *   --file <path>     특정 API 파일 마이그레이션
 *   --all            모든 API 파일 마이그레이션
 *   --backup         백업 파일 생성
 *   --dry-run        실제 변경 없이 미리보기
 *   --verbose        상세 로그 출력
 *   --help           도움말 표시
 */

const fs = require('fs');
const path = require('path');

class APIMigrator {
    constructor(options = {}) {
        this.options = {
            verbose: options.verbose || false,
            backup: options.backup || false,
            dryRun: options.dryRun || false,
            ...options
        };
        
        this.migrationResults = [];
        this.backupDir = path.join(__dirname, '../backups');
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

    createBackup(filePath) {
        if (!this.options.backup) return null;

        try {
            // 백업 디렉토리 생성
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
            }

            const fileName = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `${fileName}.backup.${timestamp}`);

            fs.copyFileSync(filePath, backupPath);
            this.log(`💾 백업 생성: ${backupPath}`);
            return backupPath;
        } catch (error) {
            this.log(`❌ 백업 생성 실패: ${error.message}`, 'error');
            return null;
        }
    }

    migrateFile(filePath) {
        this.log(`🔄 마이그레이션 중: ${filePath}`);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            const result = {
                file: filePath,
                success: true,
                changes: [],
                errors: [],
                backupPath: null
            };

            // 백업 생성
            if (this.options.backup) {
                result.backupPath = this.createBackup(filePath);
            }

            // 파일명에 따라 적절한 마이그레이션 수행
            const isIndexFile = path.basename(filePath) === 'api-index.json';
            const migratedData = isIndexFile ? 
                this.migrateApiIndex(data, result) : 
                this.migrateApiFile(data, result);

            if (result.errors.length > 0) {
                result.success = false;
                this.log(`❌ 마이그레이션 실패: ${filePath}`, 'error');
            } else {
                // 파일 저장 (dry-run이 아닌 경우)
                if (!this.options.dryRun) {
                    const migratedContent = JSON.stringify(migratedData, null, 2);
                    fs.writeFileSync(filePath, migratedContent, 'utf8');
                    this.log(`✅ 마이그레이션 완료: ${filePath}`);
                } else {
                    this.log(`🔍 Dry-run 완료: ${filePath}`);
                }
            }

            this.migrationResults.push(result);
            return result;

        } catch (error) {
            const result = {
                file: filePath,
                success: false,
                changes: [],
                errors: [`파일 처리 오류: ${error.message}`],
                backupPath: null
            };
            
            this.migrationResults.push(result);
            this.log(`❌ 파일 처리 실패: ${filePath} - ${error.message}`, 'error');
            return result;
        }
    }

    migrateApiFile(data, result) {
        const migrated = JSON.parse(JSON.stringify(data)); // Deep copy

        // 1. apiInfo 섹션 표준화
        if (migrated.apiInfo) {
            this.migrateApiInfo(migrated.apiInfo, result);
        }

        // 2. methods 섹션 표준화
        if (migrated.methods && Array.isArray(migrated.methods)) {
            migrated.methods.forEach((method, index) => {
                this.migrateMethod(method, index, result);
            });
        }

        // 3. vscodeExtension 섹션 표준화
        if (migrated.vscodeExtension) {
            this.migrateVSCodeExtension(migrated.vscodeExtension, result);
        }

        return migrated;
    }

    migrateApiInfo(apiInfo, result) {
        // 버전 형식 표준화
        if (apiInfo.version && !apiInfo.version.match(/^\d+\.\d+$/)) {
            const oldVersion = apiInfo.version;
            apiInfo.version = '1.0';
            result.changes.push({
                path: 'apiInfo.version',
                message: '버전 형식을 표준 형식으로 변경',
                oldValue: oldVersion,
                newValue: apiInfo.version
            });
        }

        // 날짜 형식 표준화
        if (apiInfo.lastUpdated && !apiInfo.lastUpdated.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const oldDate = apiInfo.lastUpdated;
            apiInfo.lastUpdated = new Date().toISOString().split('T')[0];
            result.changes.push({
                path: 'apiInfo.lastUpdated',
                message: '날짜 형식을 YYYY-MM-DD로 변경',
                oldValue: oldDate,
                newValue: apiInfo.lastUpdated
            });
        }

        // 기본값 추가
        if (!apiInfo.status) {
            apiInfo.status = 'active';
            result.changes.push({
                path: 'apiInfo.status',
                message: '기본 상태값 추가',
                oldValue: undefined,
                newValue: 'active'
            });
        }

        if (!apiInfo.webosVersion) {
            apiInfo.webosVersion = '6.x';
            result.changes.push({
                path: 'apiInfo.webosVersion',
                message: '기본 webOS 버전 추가',
                oldValue: undefined,
                newValue: '6.x'
            });
        }
    }

    migrateMethod(method, index, result) {
        // 필수 필드 추가
        if (!method.emulatorSupport) {
            method.emulatorSupport = true;
            result.changes.push({
                path: `methods[${index}].emulatorSupport`,
                message: '기본 에뮬레이터 지원값 추가',
                oldValue: undefined,
                newValue: true
            });
        }

        if (method.deprecated === undefined) {
            method.deprecated = false;
            result.changes.push({
                path: `methods[${index}].deprecated`,
                message: '기본 deprecated 값 추가',
                oldValue: undefined,
                newValue: false
            });
        }

        // parameters 표준화
        if (method.parameters && Array.isArray(method.parameters)) {
            method.parameters.forEach((param, paramIndex) => {
                this.migrateParameter(param, index, paramIndex, result);
            });
        }

        // returns 표준화
        if (method.returns) {
            this.migrateReturns(method.returns, index, result);
        }

        // errors 표준화
        if (!method.errors) {
            method.errors = [];
            result.changes.push({
                path: `methods[${index}].errors`,
                message: '기본 errors 배열 추가',
                oldValue: undefined,
                newValue: []
            });
        }

        // examples 표준화 (example -> examples)
        if (method.example && !method.examples) {
            method.examples = [method.example];
            delete method.example;
            result.changes.push({
                path: `methods[${index}].examples`,
                message: 'example 필드를 examples 배열로 변경',
                oldValue: method.example,
                newValue: method.examples
            });
        }

        // examples 배열 표준화
        if (method.examples && Array.isArray(method.examples)) {
            method.examples.forEach((example, exampleIndex) => {
                this.migrateExample(example, index, exampleIndex, result);
            });
        }
    }

    migrateParameter(param, methodIndex, paramIndex, result) {
        // 필수 필드 추가
        if (param.required === undefined) {
            param.required = false;
            result.changes.push({
                path: `methods[${methodIndex}].parameters[${paramIndex}].required`,
                message: '기본 required 값 추가',
                oldValue: undefined,
                newValue: false
            });
        }

        // 타입 표준화
        if (!param.type) {
            param.type = 'any';
            result.changes.push({
                path: `methods[${methodIndex}].parameters[${paramIndex}].type`,
                message: '기본 타입 추가',
                oldValue: undefined,
                newValue: 'any'
            });
        }

        // 설명 표준화
        if (!param.description) {
            param.description = `${param.name} 파라미터`;
            result.changes.push({
                path: `methods[${methodIndex}].parameters[${paramIndex}].description`,
                message: '기본 설명 추가',
                oldValue: undefined,
                newValue: param.description
            });
        }
    }

    migrateReturns(returns, methodIndex, result) {
        if (!returns.parameters) {
            returns.parameters = [];
            result.changes.push({
                path: `methods[${methodIndex}].returns.parameters`,
                message: '기본 returns.parameters 배열 추가',
                oldValue: undefined,
                newValue: []
            });
        }

        // returns.parameters 표준화
        if (returns.parameters && Array.isArray(returns.parameters)) {
            returns.parameters.forEach((param, paramIndex) => {
                if (param.required === undefined) {
                    param.required = false;
                    result.changes.push({
                        path: `methods[${methodIndex}].returns.parameters[${paramIndex}].required`,
                        message: '기본 required 값 추가',
                        oldValue: undefined,
                        newValue: false
                    });
                }

                if (!param.description) {
                    param.description = `${param.name} 반환값`;
                    result.changes.push({
                        path: `methods[${methodIndex}].returns.parameters[${paramIndex}].description`,
                        message: '기본 설명 추가',
                        oldValue: undefined,
                        newValue: param.description
                    });
                }
            });
        }
    }

    migrateExample(example, methodIndex, exampleIndex, result) {
        // 필수 필드 추가
        if (!example.title) {
            example.title = `예제 ${exampleIndex + 1}`;
            result.changes.push({
                path: `methods[${methodIndex}].examples[${exampleIndex}].title`,
                message: '기본 제목 추가',
                oldValue: undefined,
                newValue: example.title
            });
        }

        if (!example.language) {
            example.language = 'javascript';
            result.changes.push({
                path: `methods[${methodIndex}].examples[${exampleIndex}].language`,
                message: '기본 언어 추가',
                oldValue: undefined,
                newValue: 'javascript'
            });
        }
    }

    migrateVSCodeExtension(vscodeExtension, result) {
        // snippets 표준화
        if (vscodeExtension.snippets && Array.isArray(vscodeExtension.snippets)) {
            vscodeExtension.snippets.forEach((snippet, index) => {
                if (!snippet.scope) {
                    snippet.scope = 'javascript';
                    result.changes.push({
                        path: `vscodeExtension.snippets[${index}].scope`,
                        message: '기본 스코프 추가',
                        oldValue: undefined,
                        newValue: 'javascript'
                    });
                }
            });
        }
    }

    migrateApiIndex(data, result) {
        const migrated = JSON.parse(JSON.stringify(data)); // Deep copy

        if (migrated.webOSTV_APIs) {
            // 버전 형식 표준화
            if (migrated.webOSTV_APIs.version && !migrated.webOSTV_APIs.version.match(/^\d+\.\d+$/)) {
                const oldVersion = migrated.webOSTV_APIs.version;
                migrated.webOSTV_APIs.version = '1.0';
                result.changes.push({
                    path: 'webOSTV_APIs.version',
                    message: '버전 형식을 표준 형식으로 변경',
                    oldValue: oldVersion,
                    newValue: migrated.webOSTV_APIs.version
                });
            }

            // 날짜 형식 표준화
            if (migrated.webOSTV_APIs.lastUpdated && !migrated.webOSTV_APIs.lastUpdated.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const oldDate = migrated.webOSTV_APIs.lastUpdated;
                migrated.webOSTV_APIs.lastUpdated = new Date().toISOString().split('T')[0];
                result.changes.push({
                    path: 'webOSTV_APIs.lastUpdated',
                    message: '날짜 형식을 YYYY-MM-DD로 변경',
                    oldValue: oldDate,
                    newValue: migrated.webOSTV_APIs.lastUpdated
                });
            }

            // APIs 배열 표준화
            if (migrated.webOSTV_APIs.apis && Array.isArray(migrated.webOSTV_APIs.apis)) {
                migrated.webOSTV_APIs.apis.forEach((api, index) => {
                    this.migrateApiIndexItem(api, index, result);
                });

                // 통계 정보 추가
                this.addStatistics(migrated.webOSTV_APIs, result);
            }
        }

        return migrated;
    }

    migrateApiIndexItem(api, index, result) {
        // 기본값 추가
        if (!api.status) {
            api.status = 'active';
            result.changes.push({
                path: `webOSTV_APIs.apis[${index}].status`,
                message: '기본 상태값 추가',
                oldValue: undefined,
                newValue: 'active'
            });
        }

        if (!api.webosVersion) {
            api.webosVersion = '6.x';
            result.changes.push({
                path: `webOSTV_APIs.apis[${index}].webosVersion`,
                message: '기본 webOS 버전 추가',
                oldValue: undefined,
                newValue: '6.x'
            });
        }

        if (!api.lastUpdated) {
            api.lastUpdated = new Date().toISOString().split('T')[0];
            result.changes.push({
                path: `webOSTV_APIs.apis[${index}].lastUpdated`,
                message: '기본 업데이트 날짜 추가',
                oldValue: undefined,
                newValue: api.lastUpdated
            });
        }

        // 메서드 개수 계산 (파일에서 읽어와서)
        try {
            const apiFilePath = path.join(__dirname, '../apis', api.fileName);
            if (fs.existsSync(apiFilePath)) {
                const apiContent = fs.readFileSync(apiFilePath, 'utf8');
                const apiData = JSON.parse(apiContent);
                
                if (apiData.methods && Array.isArray(apiData.methods)) {
                    api.methodCount = apiData.methods.length;
                    api.deprecatedMethodCount = apiData.methods.filter(m => m.deprecated).length;
                    
                    result.changes.push({
                        path: `webOSTV_APIs.apis[${index}].methodCount`,
                        message: '메서드 개수 추가',
                        oldValue: undefined,
                        newValue: api.methodCount
                    });
                }
            }
        } catch (error) {
            this.log(`⚠️ 메서드 개수 계산 실패: ${api.fileName}`, 'warn');
        }
    }

    addStatistics(webOSTV_APIs, result) {
        const apis = webOSTV_APIs.apis;
        const statistics = {
            totalAPIs: apis.length,
            activeAPIs: apis.filter(api => api.status === 'active').length,
            deprecatedAPIs: apis.filter(api => api.status === 'deprecated').length,
            totalMethods: apis.reduce((sum, api) => sum + (api.methodCount || 0), 0),
            categories: {}
        };

        // 카테고리별 통계
        apis.forEach(api => {
            const category = api.category || 'other';
            statistics.categories[category] = (statistics.categories[category] || 0) + 1;
        });

        webOSTV_APIs.statistics = statistics;
        result.changes.push({
            path: 'webOSTV_APIs.statistics',
            message: '통계 정보 추가',
            oldValue: undefined,
            newValue: statistics
        });
    }

    migrateAll() {
        this.log('🔄 모든 API 파일 마이그레이션 시작');
        
        const apisDir = path.join(__dirname, '../apis');
        const files = fs.readdirSync(apisDir).filter(file => file.endsWith('.json'));
        
        files.forEach(file => {
            const filePath = path.join(apisDir, file);
            this.migrateFile(filePath);
        });

        this.printSummary();
    }

    printSummary() {
        console.log('\n📊 마이그레이션 결과 요약');
        console.log('==========================');
        
        const total = this.migrationResults.length;
        const successful = this.migrationResults.filter(r => r.success).length;
        const failed = total - successful;
        
        console.log(`총 파일 수: ${total}`);
        console.log(`✅ 성공한 파일: ${successful}`);
        console.log(`❌ 실패한 파일: ${failed}`);
        
        const totalChanges = this.migrationResults.reduce((sum, r) => sum + r.changes.length, 0);
        console.log(`🔧 총 변경 사항: ${totalChanges}`);
        
        if (this.options.backup) {
            const backupCount = this.migrationResults.filter(r => r.backupPath).length;
            console.log(`💾 백업 파일 수: ${backupCount}`);
        }

        if (failed > 0) {
            console.log('\n❌ 실패한 파일들:');
            this.migrationResults
                .filter(r => !r.success)
                .forEach(result => {
                    console.log(`  - ${result.file}`);
                    result.errors.forEach(error => {
                        console.log(`    • ${error}`);
                    });
                });
        }

        if (this.options.verbose && totalChanges > 0) {
            console.log('\n🔧 변경 사항 상세:');
            this.migrationResults.forEach(result => {
                if (result.changes.length > 0) {
                    console.log(`\n📄 ${result.file}:`);
                    result.changes.forEach(change => {
                        console.log(`  • ${change.path}: ${change.message}`);
                        if (change.oldValue !== undefined) {
                            console.log(`    이전: ${change.oldValue}`);
                        }
                        console.log(`    이후: ${change.newValue}`);
                    });
                }
            });
        }
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
            case '--backup':
                options.backup = true;
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--help':
                console.log(`
webOS TV API 데이터 마이그레이션 도구

사용법:
  node api-migrator.js [options]

옵션:
  --file <path>     특정 API 파일 마이그레이션
  --all            모든 API 파일 마이그레이션
  --backup         백업 파일 생성
  --dry-run        실제 변경 없이 미리보기
  --verbose        상세 로그 출력
  --help           이 도움말 표시

예제:
  node api-migrator.js --all --backup --verbose
  node api-migrator.js --file apis/audio-api.json --dry-run
                `);
                process.exit(0);
                break;
        }
    }

    const migrator = new APIMigrator(options);

    if (options.file) {
        migrator.migrateFile(options.file);
    } else if (options.all) {
        migrator.migrateAll();
    } else {
        console.log('옵션을 지정해주세요. --help를 참조하세요.');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = APIMigrator;
