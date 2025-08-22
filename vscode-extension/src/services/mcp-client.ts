import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';

export interface MCPRequest {
    jsonrpc: string;
    id: number;
    method: string;
    params?: any;
}

export interface MCPResponse {
    jsonrpc: string;
    id: number;
    result?: any;
    error?: any;
}

export class MCPClient {
    private serverProcess: ChildProcessWithoutNullStreams | null = null;
    private requestId = 0;
    private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
    private isConnected = false;

    async initialize(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('webos-api');
            let serverPath = config.get<string>('mcpServerPath');

            if (!serverPath) {
                // Try to find the embedded server in the extension
                const extensionPath = vscode.extensions.getExtension('webos-tv-developer.webos-tv-api-assistant')?.extensionPath;
                if (extensionPath) {
                    serverPath = path.join(extensionPath, 'mcp-server', 'dist', 'index.js');
                } else {
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
        } catch (error) {
            console.error('Failed to initialize MCP client:', error);
            vscode.window.showErrorMessage(`Failed to connect to webOS TV API server: ${error}`);
        }
    }

    private async connectToServer(serverPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.serverProcess = spawn('node', [serverPath], {
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
                    } else {
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
            } catch (error) {
                reject(error);
            }
        });
    }

    private handleServerOutput(data: string): void {
        const lines = data.trim().split('\n');
        
        for (const line of lines) {
            if (line.startsWith('{')) {
                try {
                    const response: MCPResponse = JSON.parse(line);
                    this.handleResponse(response);
                } catch (error) {
                    // Ignore non-JSON lines (they might be log messages)
                }
            }
        }
    }

    private handleResponse(response: MCPResponse): void {
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
            this.pendingRequests.delete(response.id);
            
            if (response.error) {
                pending.reject(new Error(response.error.message || 'MCP Server error'));
            } else {
                pending.resolve(response.result);
            }
        }
    }

    async callTool(name: string, args?: any): Promise<any> {
        if (!this.isConnected || !this.serverProcess) {
            throw new Error('MCP Server not connected');
        }

        const id = ++this.requestId;
        const request: MCPRequest = {
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
            
            this.serverProcess!.stdin.write(JSON.stringify(request) + '\n');

            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 10000);
        });
    }

    async listTools(): Promise<any> {
        if (!this.isConnected || !this.serverProcess) {
            throw new Error('MCP Server not connected');
        }

        const id = ++this.requestId;
        const request: MCPRequest = {
            jsonrpc: '2.0',
            id,
            method: 'tools/list'
        };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            
            this.serverProcess!.stdin.write(JSON.stringify(request) + '\n');

            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 5000);
        });
    }

    dispose(): void {
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }
        this.isConnected = false;
        this.pendingRequests.clear();
    }
}
