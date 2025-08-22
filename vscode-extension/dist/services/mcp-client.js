"use strict";
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
exports.MCPClient = void 0;
const child_process_1 = require("child_process");
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class MCPClient {
    constructor() {
        this.serverProcess = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.isConnected = false;
    }
    async initialize() {
        try {
            const config = vscode.workspace.getConfiguration('webos-api');
            let serverPath = config.get('mcpServerPath');
            if (!serverPath) {
                // Try to find the embedded server in the extension
                const extensionPath = vscode.extensions.getExtension('webos-tv-developer.webos-tv-api-assistant')?.extensionPath;
                if (extensionPath) {
                    serverPath = path.join(extensionPath, 'mcp-server', 'dist', 'index.js');
                }
                else {
                    // Fallback: try to find the server in the workspace
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (workspaceFolder) {
                        serverPath = path.join(workspaceFolder.uri.fsPath, 'dist', 'index.js');
                    }
                }
            }
            if (!serverPath) {
                throw new Error('MCP Server path not configured');
            }
            await this.connectToServer(serverPath);
        }
        catch (error) {
            console.error('Failed to initialize MCP client:', error);
            vscode.window.showErrorMessage(`Failed to connect to webOS TV API server: ${error}`);
        }
    }
    async connectToServer(serverPath) {
        return new Promise((resolve, reject) => {
            try {
                this.serverProcess = (0, child_process_1.spawn)('node', [serverPath], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                this.serverProcess.stdout.on('data', (data) => {
                    this.handleServerOutput(data.toString());
                });
                this.serverProcess.stderr.on('data', (data) => {
                    const output = data.toString();
                    if (output.includes('webOS TV API MCP Server started successfully')) {
                        this.isConnected = true;
                        resolve();
                    }
                    else {
                        console.error('Server error:', output);
                    }
                });
                this.serverProcess.on('close', (code) => {
                    console.log(`MCP Server process exited with code ${code}`);
                    this.isConnected = false;
                    this.serverProcess = null;
                });
                this.serverProcess.on('error', (error) => {
                    console.error('Server process error:', error);
                    reject(error);
                });
                // Wait for server startup message
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Server startup timeout'));
                    }
                }, 5000);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    handleServerOutput(data) {
        const lines = data.trim().split('\n');
        for (const line of lines) {
            if (line.startsWith('{')) {
                try {
                    const response = JSON.parse(line);
                    this.handleResponse(response);
                }
                catch (error) {
                    // Ignore non-JSON lines (they might be log messages)
                }
            }
        }
    }
    handleResponse(response) {
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
                pending.reject(new Error(response.error.message || 'MCP Server error'));
            }
            else {
                pending.resolve(response.result);
            }
        }
    }
    async callTool(name, args) {
        if (!this.isConnected || !this.serverProcess) {
            throw new Error('MCP Server not connected');
        }
        const id = ++this.requestId;
        const request = {
            jsonrpc: '2.0',
            id,
            method: 'tools/call',
            params: {
                name,
                arguments: args || {}
            }
        };
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 10000);
        });
    }
    async listTools() {
        if (!this.isConnected || !this.serverProcess) {
            throw new Error('MCP Server not connected');
        }
        const id = ++this.requestId;
        const request = {
            jsonrpc: '2.0',
            id,
            method: 'tools/list'
        };
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 5000);
        });
    }
    dispose() {
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }
        this.isConnected = false;
        this.pendingRequests.clear();
    }
}
exports.MCPClient = MCPClient;
//# sourceMappingURL=mcp-client.js.map