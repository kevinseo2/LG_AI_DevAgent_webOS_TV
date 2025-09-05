"use strict";
/**
 * Fallback Provider
 *
 * MCP 서버 연결이 실패했을 때 기본 기능을 제공하는 fallback 시스템
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackProvider = void 0;
const vscode = __importStar(require("vscode"));
const uri_normalizer_1 = require("./uri-normalizer");
class FallbackProvider {
    /**
     * 최소 API 목록 가져오기
     */
    static getMinimalAPIList() {
        console.log('📦 Providing minimal API list as fallback');
        return this.MINIMAL_API_SET.map(api => ({
            ...api,
            serviceUri: uri_normalizer_1.URINormalizer.normalizeURI(api.serviceUri) || api.serviceUri
        }));
    }
    /**
     * 서비스의 최소 메서드 목록 가져오기
     */
    static getMinimalMethods(serviceName) {
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
    static createAPICompletionItems() {
        console.log('📦 Creating fallback API completion items');
        const completions = [];
        for (const api of this.MINIMAL_API_SET) {
            const completion = new vscode.CompletionItem(api.serviceUri, vscode.CompletionItemKind.Value);
            completion.detail = `${api.serviceName} (${api.category}) - Fallback`;
            completion.documentation = new vscode.MarkdownString(`**${api.serviceName}** (${api.category})\\n\\n${api.description}\\n\\n📋 **URI:** \`${api.serviceUri}\`\\n\\n⚠️ *Fallback mode - Limited functionality*`);
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
    static createMethodCompletionItems(serviceName) {
        console.log(`📦 Creating fallback method completion items for: ${serviceName}`);
        const methods = this.getMinimalMethods(serviceName);
        const completions = [];
        for (const method of methods) {
            const completion = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            completion.detail = `${serviceName}.${method.name} - Fallback`;
            completion.documentation = new vscode.MarkdownString(`**${method.name}**\\n\\n${method.description}\\n\\n` +
                `**Parameters:**\\n${method.parameters.map(p => `- \`${p.name}\` (${p.type}) - ${p.required ? '**required**' : '*optional*'} - ${p.description}`).join('\\n')}\\n\\n⚠️ *Fallback mode - Basic information only*`);
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
    static createBasicSnippets() {
        console.log('📦 Creating basic webOS snippets as fallback');
        const snippets = [];
        // Basic webOS.service.request snippet
        const basicRequest = new vscode.CompletionItem('webOS.service.request', vscode.CompletionItemKind.Snippet);
        basicRequest.insertText = new vscode.SnippetString(`webOS.service.request('\${1:luna://com.webos.service.audio}', {
    method: '\${2:getVolume}',
    parameters: {
        \${3:subscribe: true}
    },
    onSuccess: function(response) {
        \${4:console.log('Success:', response);}
    },
    onFailure: function(error) {
        \${5:console.error('Error:', error.errorText);}
    }
});`);
        basicRequest.documentation = new vscode.MarkdownString('🚀 **Basic webOS Service Request** (Fallback)\\n\\nGenerate a complete webOS service request template');
        basicRequest.detail = 'webOS TV API Assistant - Fallback';
        basicRequest.sortText = '0000_fallback_webos';
        snippets.push(basicRequest);
        // Audio API snippet
        const audioSnippet = new vscode.CompletionItem('webOS Audio API', vscode.CompletionItemKind.Snippet);
        audioSnippet.insertText = new vscode.SnippetString(`webOS.service.request('luna://com.webos.service.audio', {
    method: '\${1|getVolume,setVolume,setMuted|}',
    parameters: {
        \${2:// parameters}
    },
    onSuccess: function(response) {
        console.log('Audio API Success:', response);
    },
    onFailure: function(error) {
        console.error('Audio API Error:', error.errorText);
    }
});`);
        audioSnippet.detail = 'Audio Service Template - Fallback';
        audioSnippet.sortText = '0001_fallback_audio';
        snippets.push(audioSnippet);
        return snippets;
    }
    /**
     * 연결 상태 확인
     */
    static checkMCPConnection() {
        // 실제 구현에서는 MCP 클라이언트 상태를 확인
        // 여기서는 간단한 예시
        return false; // fallback 모드로 가정
    }
    /**
     * 사용자에게 fallback 모드 알림
     */
    static showFallbackNotification() {
        const message = 'webOS TV API Assistant is running in fallback mode. Some features may be limited.';
        vscode.window.showWarningMessage(message, 'Learn More', 'Retry Connection').then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo/webos-extension'));
            }
            else if (selection === 'Retry Connection') {
                vscode.commands.executeCommand('webos-api.refreshAPIs');
            }
        });
    }
    /**
     * Fallback 상태 상태바 아이템 생성
     */
    static createFallbackStatusBarItem() {
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.text = '$(warning) webOS TV (Fallback)';
        statusBarItem.tooltip = 'webOS TV API Assistant - Running in fallback mode\nClick to retry connection';
        statusBarItem.command = 'webos-api.refreshAPIs';
        return statusBarItem;
    }
}
exports.FallbackProvider = FallbackProvider;
FallbackProvider.MINIMAL_API_SET = [
    {
        serviceName: 'Audio',
        serviceUri: 'luna://com.webos.service.audio',
        category: 'media',
        description: '오디오 볼륨 및 음소거 제어를 위한 메서드를 제공합니다.',
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
FallbackProvider.MINIMAL_METHOD_SET = {
    'Audio': [
        {
            name: 'getVolume',
            description: '현재 볼륨 수준을 조회합니다.',
            deprecated: false,
            parameters: [
                {
                    name: 'subscribe',
                    type: 'boolean',
                    required: false,
                    description: '볼륨 변경 알림을 구독할지 여부'
                }
            ]
        },
        {
            name: 'setVolume',
            description: '볼륨 수준을 설정합니다.',
            deprecated: false,
            parameters: [
                {
                    name: 'volume',
                    type: 'number',
                    required: true,
                    description: '설정할 볼륨 수준 (0-100)'
                }
            ]
        },
        {
            name: 'setMuted',
            description: '음소거 상태를 설정합니다.',
            deprecated: false,
            parameters: [
                {
                    name: 'muted',
                    type: 'boolean',
                    required: true,
                    description: '음소거 여부 (true: 음소거, false: 해제)'
                }
            ]
        }
    ],
    'Activity Manager': [
        {
            name: 'adopt',
            description: 'Activity의 부모로 전환하려는 의지를 등록합니다.',
            deprecated: false,
            parameters: [
                {
                    name: 'activityId',
                    type: 'number',
                    required: true,
                    description: 'Activity ID'
                },
                {
                    name: 'wait',
                    type: 'boolean',
                    required: true,
                    description: 'Activity가 해제될 때까지 대기할지 여부'
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
                    description: '조회할 설정 키 목록'
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
//# sourceMappingURL=fallback-provider.js.map