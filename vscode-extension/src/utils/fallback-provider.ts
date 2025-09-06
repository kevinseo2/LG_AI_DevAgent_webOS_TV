/**
 * Fallback Provider
 * 
 * MCP 서버 연결이 실패했을 때 기본 기능을 제공하는 fallback 시스템
 */

import * as vscode from 'vscode';
import { URINormalizer } from './uri-normalizer';

export interface FallbackAPIInfo {
    serviceName: string;
    serviceUri: string;
    category: string;
    description: string;
    status: string;
}

export interface FallbackMethod {
    name: string;
    description: string;
    deprecated: boolean;
    parameters: Array<{
        name: string;
        type: string;
        required: boolean;
        description: string;
    }>;
}

export class FallbackProvider {
    private static readonly MINIMAL_API_SET: FallbackAPIInfo[] = [
        {
            serviceName: 'Audio',
            serviceUri: 'luna://com.webos.audio',
            category: 'media',
            description: '볼륨 음소거 및 증감 제어 메서드를 제공합니다.',
            status: 'active'
        },
        {
            serviceName: 'Activity Manager',
            serviceUri: 'luna://com.palm.activitymanager',
            category: 'system',
            description: '시스템 액티비티 관리를 위한 메서드를 제공합니다.',
            status: 'active'
        },
        {
            serviceName: 'Application Manager',
            serviceUri: 'luna://com.webos.applicationManager',
            category: 'system',
            description: '애플리케이션 실행 및 관리를 위한 메서드를 제공합니다.',
            status: 'active'
        },
        {
            serviceName: 'Connection Manager',
            serviceUri: 'luna://com.webos.service.connectionmanager',
            category: 'network',
            description: '네트워크 연결 상태 관리를 위한 메서드를 제공합니다.',
            status: 'active'
        },
        {
            serviceName: 'Settings Service',
            serviceUri: 'luna://com.webos.service.settings',
            category: 'system',
            description: '시스템 설정 관리를 위한 메서드를 제공합니다.',
            status: 'active'
        },
        {
            serviceName: 'System Service',
            serviceUri: 'luna://com.webos.service.systemservice',
            category: 'system',
            description: '시스템 정보 및 제어를 위한 메서드를 제공합니다.',
            status: 'active'
        },
        {
            serviceName: 'TV Device Information',
            serviceUri: 'luna://com.webos.service.tv.systemproperty',
            category: 'device',
            description: 'TV 디바이스 정보 조회를 위한 메서드를 제공합니다.',
            status: 'active'
        }
    ];

    private static readonly MINIMAL_METHOD_SET: Record<string, FallbackMethod[]> = {
        'Audio': [
            {
                name: 'setMuted',
                description: '볼륨을 음소거하거나 음소거 해제합니다.',
                deprecated: false,
                parameters: [
                    {
                        name: 'muted',
                        type: 'boolean',
                        required: true,
                        description: '음소거/해제 여부 (true: 음소거, false: 해제)'
                    }
                ]
            },
            {
                name: 'volumeDown',
                description: '볼륨을 1 감소시킵니다.',
                deprecated: false,
                parameters: []
            },
            {
                name: 'volumeUp',
                description: '볼륨을 1 증가시킵니다.',
                deprecated: false,
                parameters: []
            }
        ],
        'Activity Manager': [
            {
                name: 'adopt',
                description: '앱이나 서비스가 Activity의 부모로 전환되려는 의지를 등록합니다.',
                deprecated: false,
                parameters: [
                    {
                        name: 'activityId',
                        type: 'number',
                        required: false,
                        description: 'Activity ID. activityName과 둘 중 하나는 필수입니다.'
                    },
                    {
                        name: 'activityName',
                        type: 'string',
                        required: false,
                        description: 'Activity 이름. activityId와 둘 중 하나는 필수입니다.'
                    },
                    {
                        name: 'wait',
                        type: 'boolean',
                        required: true,
                        description: 'Activity가 해제될 때까지 대기할지 여부를 결정하는 플래그입니다.'
                    },
                    {
                        name: 'subscribe',
                        type: 'boolean',
                        required: true,
                        description: '구독 여부를 결정하는 플래그입니다. true: 구독, false: 구독하지 않음 (기본값)'
                    },
                    {
                        name: 'detailedEvents',
                        type: 'boolean',
                        required: false,
                        description: 'Activity Manager가 Activity의 요구사항 상태가 변경될 때 update 이벤트를 생성하도록 하는 플래그입니다.'
                    }
                ]
            },
            {
                name: 'cancel',
                description: 'Activity를 취소합니다.',
                deprecated: false,
                parameters: [
                    {
                        name: 'activityId',
                        type: 'number',
                        required: true,
                        description: '취소할 Activity ID'
                    }
                ]
            }
        ],
        'Connection Manager': [
            {
                name: 'getStatus',
                description: '네트워크 연결 상태를 조회합니다.',
                deprecated: false,
                parameters: [
                    {
                        name: 'subscribe',
                        type: 'boolean',
                        required: false,
                        description: '상태 변경 알림을 구독할지 여부'
                    }
                ]
            }
        ],
        'Settings Service': [
            {
                name: 'getSystemSettings',
                description: '시스템 설정 값들을 조회합니다.',
                deprecated: false,
                parameters: [
                    {
                        name: 'keys',
                        type: 'array',
                        required: true,
                        description: '조회할 설정 키 배열'
                    },
                    {
                        name: 'subscribe',
                        type: 'boolean',
                        required: false,
                        description: '설정 변경 구독 여부'
                    }
                ]
            }
        ],
        'TV Device Information': [
            {
                name: 'getSystemInfo',
                description: 'TV 시스템 정보를 조회합니다.',
                deprecated: false,
                parameters: [
                    {
                        name: 'keys',
                        type: 'array',
                        required: true,
                        description: '조회할 시스템 정보 키 목록'
                    }
                ]
            }
        ]
    };

    /**
     * 최소 API 목록 가져오기
     */
    static getMinimalAPIList(): FallbackAPIInfo[] {
        console.log('📦 Providing minimal API list as fallback');
        return this.MINIMAL_API_SET.map(api => ({
            ...api,
            serviceUri: URINormalizer.normalizeURI(api.serviceUri) || api.serviceUri
        }));
    }

    /**
     * 서비스의 최소 메서드 목록 가져오기
     */
    static getMinimalMethods(serviceName: string): FallbackMethod[] {
        console.log(`📦 Providing minimal methods for service: ${serviceName}`);
        
        // 정확한 매치 시도
        let methods = this.MINIMAL_METHOD_SET[serviceName];
        if (methods) {
            return methods;
        }

        // 부분 매치 시도
        for (const [key, methodList] of Object.entries(this.MINIMAL_METHOD_SET)) {
            if (key.toLowerCase().includes(serviceName.toLowerCase()) || 
                serviceName.toLowerCase().includes(key.toLowerCase())) {
                console.log(`📦 Found partial match: ${serviceName} → ${key}`);
                return methodList;
            }
        }

        // 기본 메서드 반환
        console.log(`📦 Returning default methods for unknown service: ${serviceName}`);
        return [
            {
                name: 'getStatus',
                description: `${serviceName} 상태를 조회합니다.`,
                deprecated: false,
                parameters: [
                    {
                        name: 'subscribe',
                        type: 'boolean',
                        required: false,
                        description: '상태 변경 알림을 구독할지 여부'
                    }
                ]
            }
        ];
    }

    /**
     * API 자동완성 아이템 생성
     */
    static createAPICompletionItems(): vscode.CompletionItem[] {
        console.log('📦 Creating fallback API completion items');
        
        const completions: vscode.CompletionItem[] = [];
        
        for (const api of this.MINIMAL_API_SET) {
            const completion = new vscode.CompletionItem(
                api.serviceUri,
                vscode.CompletionItemKind.Value
            );
            completion.detail = `${api.serviceName} (${api.category}) - Fallback`;
            completion.documentation = new vscode.MarkdownString(
                `**${api.serviceName}** (${api.category})\\n\\n${api.description}\\n\\n📋 **URI:** \`${api.serviceUri}\`\\n\\n⚠️ *Fallback mode - Limited functionality*`
            );
            completion.insertText = api.serviceUri;
            completion.sortText = `fallback_${api.serviceName}`;
            
            // Category-based icons
            switch (api.category) {
                case 'media':
                    completion.kind = vscode.CompletionItemKind.Event;
                    break;
                case 'system':
                    completion.kind = vscode.CompletionItemKind.Module;
                    break;
                case 'network':
                    completion.kind = vscode.CompletionItemKind.Reference;
                    break;
                case 'device':
                    completion.kind = vscode.CompletionItemKind.Interface;
                    break;
                default:
                    completion.kind = vscode.CompletionItemKind.Value;
            }
            
            completions.push(completion);
        }
        
        return completions;
    }

    /**
     * 메서드 자동완성 아이템 생성
     */
    static createMethodCompletionItems(serviceName: string): vscode.CompletionItem[] {
        console.log(`📦 Creating fallback method completion items for: ${serviceName}`);
        
        const methods = this.getMinimalMethods(serviceName);
        const completions: vscode.CompletionItem[] = [];
        
        for (const method of methods) {
            const completion = new vscode.CompletionItem(
                method.name,
                vscode.CompletionItemKind.Method
            );
            completion.detail = `${serviceName}.${method.name} - Fallback`;
            completion.documentation = new vscode.MarkdownString(
                `**${method.name}**\\n\\n${method.description}\\n\\n` +
                `**Parameters:**\\n${method.parameters.map(p => 
                    `- \`${p.name}\` (${p.type}) - ${p.required ? '**required**' : '*optional*'} - ${p.description}`
                ).join('\\n')}\\n\\n⚠️ *Fallback mode - Basic information only*`
            );
            completion.insertText = method.name;
            completion.sortText = `fallback_${method.name}`;
            
            if (method.deprecated) {
                completion.tags = [vscode.CompletionItemTag.Deprecated];
            }
            
            completions.push(completion);
        }
        
        return completions;
    }

    /**
     * 기본 webOS 스니펫 생성
     */
    static createBasicSnippets(): vscode.CompletionItem[] {
        console.log('📦 Creating basic webOS snippets as fallback');
        
        const snippets: vscode.CompletionItem[] = [];
        
        // Basic webOS.service.request snippet
        const basicRequest = new vscode.CompletionItem(
            'webOS.service.request',
            vscode.CompletionItemKind.Snippet
        );
        basicRequest.insertText = new vscode.SnippetString(
            `webOS.service.request('\${1:luna://com.webos.audio}', {
    method: '\${2:setMuted}',
    parameters: {
        \${3:muted: true}
    },
    onSuccess: function(response) {
        \${4:console.log('Success:', response);}
    },
    onFailure: function(error) {
        \${5:console.error('Error:', error.errorText);}
    }
});`
        );
        basicRequest.documentation = new vscode.MarkdownString(
            '🚀 **Basic webOS Service Request** (Fallback)\\n\\nGenerate a complete webOS service request template'
        );
        basicRequest.detail = 'webOS TV API Assistant - Fallback';
        basicRequest.sortText = '0000_fallback_webos';
        snippets.push(basicRequest);
        
        // Audio API snippet
        const audioSnippet = new vscode.CompletionItem(
            'webOS Audio API',
            vscode.CompletionItemKind.Snippet
        );
        audioSnippet.insertText = new vscode.SnippetString(
            `webOS.service.request('luna://com.webos.audio', {
    method: '\${1|setMuted,volumeDown,volumeUp|}',
    parameters: {
        \${2:// parameters}
    },
    onSuccess: function(response) {
        console.log('Audio API Success:', response);
    },
    onFailure: function(error) {
        console.error('Audio API Error:', error.errorText);
    }
});`
        );
        audioSnippet.detail = 'Audio Service Template - Fallback';
        audioSnippet.sortText = '0001_fallback_audio';
        snippets.push(audioSnippet);
        
        return snippets;
    }

    /**
     * 연결 상태 확인
     */
    static checkMCPConnection(): boolean {
        // 실제 구현에서는 MCP 클라이언트 상태를 확인
        // 여기서는 간단한 예시
        return false; // fallback 모드로 가정
    }

    /**
     * 사용자에게 fallback 모드 알림
     */
    static showFallbackNotification(): void {
        const message = 'webOS TV API Assistant is running in fallback mode. Some features may be limited.';
        vscode.window.showWarningMessage(
            message,
            'Learn More',
            'Retry Connection'
        ).then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo/webos-extension'));
            } else if (selection === 'Retry Connection') {
                vscode.commands.executeCommand('webos-api.refreshAPIs');
            }
        });
    }

    /**
     * Fallback 상태 상태바 아이템 생성
     */
    static createFallbackStatusBarItem(): vscode.StatusBarItem {
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBarItem.text = '$(warning) webOS TV (Fallback)';
        statusBarItem.tooltip = 'webOS TV API Assistant - Running in fallback mode\nClick to retry connection';
        statusBarItem.command = 'webos-api.refreshAPIs';
        return statusBarItem;
    }
}
