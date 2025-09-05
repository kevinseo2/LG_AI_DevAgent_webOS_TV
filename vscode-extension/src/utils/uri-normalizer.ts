/**
 * webOS TV Luna Service URI 정규화 유틸리티
 * 
 * 이 클래스는 다양한 형태의 Luna Service URI를 표준 형태로 정규화하고,
 * 호환성을 위한 별칭(alias) 지원을 제공합니다.
 */

export interface ServiceURIMapping {
    serviceName: string;
    standardUri: string;
    aliases: string[];
    category: string;
}

export class URINormalizer {
    private static readonly SERVICE_URI_MAPPINGS: ServiceURIMapping[] = [
        {
            serviceName: 'Audio',
            standardUri: 'luna://com.webos.audio',
            aliases: ['luna://com.webos.service.audio'],
            category: 'media'
        },
        {
            serviceName: 'Activity Manager',
            standardUri: 'luna://com.palm.activitymanager',
            aliases: ['luna://com.webos.activitymanager'],
            category: 'system'
        },
        {
            serviceName: 'Application Manager',
            standardUri: 'luna://com.webos.applicationManager',
            aliases: ['luna://com.webos.service.applicationmanager'],
            category: 'system'
        },
        {
            serviceName: 'Connection Manager',
            standardUri: 'luna://com.webos.service.connectionmanager',
            aliases: ['luna://com.webos.connectionmanager'],
            category: 'network'
        },
        {
            serviceName: 'Settings Service',
            standardUri: 'luna://com.webos.service.settings',
            aliases: ['luna://com.webos.settings'],
            category: 'system'
        },
        {
            serviceName: 'System Service',
            standardUri: 'luna://com.webos.service.systemservice',
            aliases: ['luna://com.webos.systemservice'],
            category: 'system'
        },
        {
            serviceName: 'TV Device Information',
            standardUri: 'luna://com.webos.service.tv.systemproperty',
            aliases: ['luna://com.webos.tv.systemproperty', 'luna://com.webos.service.tv'],
            category: 'device'
        },
        {
            serviceName: 'Database',
            standardUri: 'luna://com.palm.db',
            aliases: ['luna://com.webos.service.db', 'luna://com.webos.db'],
            category: 'system'
        },
        {
            serviceName: 'DRM',
            standardUri: 'luna://com.webos.service.drm',
            aliases: ['luna://com.webos.drm'],
            category: 'media'
        },
        {
            serviceName: 'BLE GATT',
            standardUri: 'luna://com.webos.service.blegatt',
            aliases: ['luna://com.webos.service.ble', 'luna://com.webos.ble'],
            category: 'network'
        },
        {
            serviceName: 'Magic Remote',
            standardUri: 'luna://com.webos.service.mrcu',
            aliases: ['luna://com.webos.service.magicremote', 'luna://com.webos.magicremote'],
            category: 'device'
        },
        {
            serviceName: 'Media Database',
            standardUri: 'luna://com.webos.service.mediadb',
            aliases: ['luna://com.webos.mediadb'],
            category: 'media'
        },
        {
            serviceName: 'Keymanager3',
            standardUri: 'luna://com.webos.service.keymanager3',
            aliases: ['luna://com.webos.service.keymanager', 'luna://com.webos.keymanager'],
            category: 'security'
        },
        {
            serviceName: 'Device Unique ID',
            standardUri: 'luna://com.webos.service.sm',
            aliases: ['luna://com.webos.sm'],
            category: 'security'
        },
        {
            serviceName: 'Camera',
            standardUri: 'luna://com.webos.service.camera',
            aliases: ['luna://com.webos.camera'],
            category: 'device'
        }
    ];

    // URI 매핑 캐시 (성능 최적화)
    private static uriToStandardCache = new Map<string, string>();
    private static serviceNameToUriCache = new Map<string, string>();
    private static initialized = false;

    /**
     * 캐시 초기화
     */
    private static initializeCache(): void {
        if (this.initialized) return;

        this.SERVICE_URI_MAPPINGS.forEach(mapping => {
            // 표준 URI 매핑
            this.uriToStandardCache.set(mapping.standardUri, mapping.standardUri);
            this.serviceNameToUriCache.set(mapping.serviceName, mapping.standardUri);

            // 별칭 매핑
            mapping.aliases.forEach(alias => {
                this.uriToStandardCache.set(alias, mapping.standardUri);
            });

            // 서비스명 변형 매핑 (소문자, 공백 제거 등)
            const normalizedServiceName = mapping.serviceName.toLowerCase().replace(/\s+/g, '');
            this.serviceNameToUriCache.set(normalizedServiceName, mapping.standardUri);
        });

        this.initialized = true;
    }

    /**
     * URI를 표준 형태로 정규화
     * @param uri 정규화할 URI
     * @returns 표준화된 URI 또는 null (매핑되지 않은 경우)
     */
    static normalizeURI(uri: string): string | null {
        this.initializeCache();

        if (!uri || !uri.startsWith('luna://')) {
            return null;
        }

        // 공백 제거 및 소문자 변환
        const cleanUri = uri.trim();

        // 캐시에서 찾기
        const standardUri = this.uriToStandardCache.get(cleanUri);
        if (standardUri) {
            console.log(`🔄 URI normalized: ${uri} → ${standardUri}`);
            return standardUri;
        }

        // 부분 매칭 시도 (유연한 매칭)
        for (const [cachedUri, standard] of this.uriToStandardCache.entries()) {
            if (cachedUri.includes(cleanUri) || cleanUri.includes(cachedUri)) {
                console.log(`🔄 URI partially matched: ${uri} → ${standard}`);
                return standard;
            }
        }

        console.log(`❌ URI normalization failed: ${uri}`);
        return null;
    }

    /**
     * 서비스명에서 표준 URI 가져오기
     * @param serviceName 서비스명
     * @returns 표준 URI 또는 null
     */
    static getStandardURIFromServiceName(serviceName: string): string | null {
        this.initializeCache();

        if (!serviceName) return null;

        // 정확한 매치 시도
        let standardUri = this.serviceNameToUriCache.get(serviceName);
        if (standardUri) {
            return standardUri;
        }

        // 정규화된 서비스명으로 시도
        const normalizedName = serviceName.toLowerCase().replace(/\s+/g, '');
        standardUri = this.serviceNameToUriCache.get(normalizedName);
        if (standardUri) {
            return standardUri;
        }

        // 부분 매칭 시도
        for (const [cachedName, uri] of this.serviceNameToUriCache.entries()) {
            if (cachedName.includes(normalizedName) || normalizedName.includes(cachedName)) {
                console.log(`🎯 Service name partially matched: ${serviceName} → ${uri}`);
                return uri;
            }
        }

        console.log(`❌ No URI found for service: ${serviceName}`);
        return null;
    }

    /**
     * URI에서 서비스명 추출
     * @param uri Luna Service URI
     * @returns 서비스명 또는 null
     */
    static getServiceNameFromURI(uri: string): string | null {
        this.initializeCache();

        const standardUri = this.normalizeURI(uri);
        if (!standardUri) return null;

        // 매핑에서 서비스명 찾기
        const mapping = this.SERVICE_URI_MAPPINGS.find(
            mapping => mapping.standardUri === standardUri
        );

        return mapping ? mapping.serviceName : null;
    }

    /**
     * 서비스의 모든 URI 변형 가져오기 (표준 + 별칭)
     * @param serviceName 서비스명
     * @returns URI 배열
     */
    static getAllURIVariations(serviceName: string): string[] {
        this.initializeCache();

        const mapping = this.SERVICE_URI_MAPPINGS.find(
            mapping => mapping.serviceName === serviceName
        );

        if (!mapping) return [];

        return [mapping.standardUri, ...mapping.aliases];
    }

    /**
     * 모든 표준 URI 목록 가져오기
     * @returns 표준 URI 배열
     */
    static getAllStandardURIs(): string[] {
        this.initializeCache();
        return this.SERVICE_URI_MAPPINGS.map(mapping => mapping.standardUri);
    }

    /**
     * 카테고리별 URI 목록 가져오기
     * @param category 카테고리 ('media', 'system', 'network', 'device', 'storage', 'security')
     * @returns 해당 카테고리의 URI 배열
     */
    static getURIsByCategory(category: string): string[] {
        this.initializeCache();
        return this.SERVICE_URI_MAPPINGS
            .filter(mapping => mapping.category === category)
            .map(mapping => mapping.standardUri);
    }

    /**
     * URI가 유효한지 확인
     * @param uri 확인할 URI
     * @returns 유효 여부
     */
    static isValidURI(uri: string): boolean {
        return this.normalizeURI(uri) !== null;
    }

    /**
     * 디버깅용 매핑 정보 출력
     */
    static debugMappings(): void {
        this.initializeCache();
        console.log('📊 URI Normalization Mappings:');
        this.SERVICE_URI_MAPPINGS.forEach(mapping => {
            console.log(`  ${mapping.serviceName}:`);
            console.log(`    Standard: ${mapping.standardUri}`);
            console.log(`    Aliases: ${mapping.aliases.join(', ')}`);
            console.log(`    Category: ${mapping.category}`);
        });
        console.log(`Total cached mappings: ${this.uriToStandardCache.size}`);
    }
}
