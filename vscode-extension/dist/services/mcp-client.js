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
const fs = __importStar(require("fs"));
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
                    const possibleServerPaths = [
                        path.join(extensionPath, 'mcp-server', 'dist', 'index.js'),
                        path.join(extensionPath, 'mcp-server', 'index.js'),
                        path.join(extensionPath, 'dist', 'index.js')
                    ];
                    for (const possiblePath of possibleServerPaths) {
                        if (fs.existsSync(possiblePath)) {
                            serverPath = possiblePath;
                            break;
                        }
                    }
                }
                // Try to find MCP server in the workspace root (more reliable)
                if (!serverPath) {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (workspaceFolder) {
                        // Try multiple possible locations, prioritizing workspace root
                        const possiblePaths = [
                            path.join(workspaceFolder.uri.fsPath, 'dist', 'index.js'), // Workspace root dist
                            path.join(workspaceFolder.uri.fsPath, 'vscode-extension', 'mcp-server', 'dist', 'index.js'),
                            path.join(workspaceFolder.uri.fsPath, 'mcp-server', 'dist', 'index.js'),
                            path.join(workspaceFolder.uri.fsPath, 'src', 'index.ts') // Development mode
                        ];
                        console.log('🔍 Searching for MCP server in workspace:', workspaceFolder.uri.fsPath);
                        for (const testPath of possiblePaths) {
                            console.log(`🔎 Checking: ${testPath}`);
                        }
                        for (const possiblePath of possiblePaths) {
                            try {
                                // Check if file exists
                                if (fs.existsSync(possiblePath)) {
                                    console.log(`✅ Found MCP server at: ${possiblePath}`);
                                    serverPath = possiblePath;
                                    break;
                                }
                            }
                            catch {
                                // Continue to next path
                            }
                        }
                    }
                }
            }
            if (!serverPath) {
                console.warn('MCP Server path not found, extension will work with limited functionality');
                // Don't throw error, just warn - extension should still work with fallback completions
                return;
            }
            console.log(`Using MCP Server at: ${serverPath}`);
            await this.connectToServer(serverPath);
        }
        catch (error) {
            console.error('Failed to initialize MCP client:', error);
            // Show warning instead of error - extension can still work with fallbacks
            vscode.window.showWarningMessage(`webOS TV API server unavailable - using fallback completions. Error: ${error}`);
        }
    }
    async connectToServer(serverPath) {
        return new Promise((resolve, reject) => {
            try {
                this.serverProcess = (0, child_process_1.spawn)('node', [serverPath], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                this.serverProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    console.log('Server stdout:', output);
                    // Check for success message in stdout
                    if (output.includes('webOS TV API MCP Server started successfully')) {
                        console.log('✅ MCP Server started successfully!');
                        this.isConnected = true;
                        resolve();
                    }
                    this.handleServerOutput(output);
                });
                this.serverProcess.stderr.on('data', (data) => {
                    const output = data.toString();
                    console.log('Server stderr:', output);
                    // Also check stderr for success message (fallback)
                    if (output.includes('webOS TV API MCP Server started successfully')) {
                        console.log('✅ MCP Server started successfully (from stderr)!');
                        this.isConnected = true;
                        resolve();
                    }
                    else if (!output.includes('Warning') && !output.includes('MODULE_TYPELESS_PACKAGE_JSON')) {
                        // Only log actual errors, not warnings
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
                // Wait for server startup message with longer timeout
                setTimeout(() => {
                    if (!this.isConnected) {
                        console.error('❌ MCP Server startup timeout after 10 seconds');
                        this.serverProcess?.kill();
                        reject(new Error('Server startup timeout'));
                    }
                }, 10000); // Increased to 10 seconds
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