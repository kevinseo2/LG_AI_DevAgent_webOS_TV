import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

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
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectInterval = 30000; // 30초
    private reconnectTimer: NodeJS.Timeout | null = null;
    private connectionStatusBarItem: vscode.StatusBarItem | null = null;
    private lastServerPath: string | null = null;
    private isReconnecting = false;

    async initialize(): Promise<void> {
        try {
            // Initialize status bar item
            this.initializeStatusBar();
            
            const config = vscode.workspace.getConfiguration('webos-api');
            let serverPath = config.get<string>('mcpServerPath');

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
                            } catch {
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
            this.lastServerPath = serverPath;
            await this.connectToServer(serverPath);
        } catch (error) {
            console.error('Failed to initialize MCP client:', error);
            this.updateStatusBar('disconnected', 'MCP Server unavailable');
            // Show warning instead of error - extension can still work with fallbacks
            vscode.window.showWarningMessage(`webOS TV API server unavailable - using fallback completions. Error: ${error}`);
        }
    }

    private async connectToServer(serverPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.serverProcess = spawn('node', [serverPath], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                this.serverProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    console.log('Server stdout:', output);
                    
                    // Check for success message in stdout
                    if (output.includes('webOS TV API MCP Server started successfully')) {
                        console.log('✅ MCP Server started successfully!');
                        this.isConnected = true;
                        this.reconnectAttempts = 0;
                        this.isReconnecting = false;
                        this.updateStatusBar('connected', 'MCP Server connected');
                        this.clearReconnectTimer();
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
                        this.reconnectAttempts = 0;
                        this.isReconnecting = false;
                        this.updateStatusBar('connected', 'MCP Server connected');
                        this.clearReconnectTimer();
                        resolve();
                    } else if (!output.includes('Warning') && !output.includes('MODULE_TYPELESS_PACKAGE_JSON')) {
                        // Only log actual errors, not warnings
                        console.error('Server error:', output);
                    }
                });

                this.serverProcess.on('close', (code) => {
                    console.log(`MCP Server process exited with code ${code}`);
                    this.isConnected = false;
                    this.serverProcess = null;
                    this.updateStatusBar('disconnected', 'MCP Server disconnected');
                    
                    // Start reconnection process if not already reconnecting
                    if (!this.isReconnecting && this.lastServerPath) {
                        this.scheduleReconnection();
                    }
                });

                this.serverProcess.on('error', (error) => {
                    console.error('Server process error:', error);
                    this.isConnected = false;
                    this.updateStatusBar('error', 'MCP Server error');
                    
                    // Start reconnection process if not already reconnecting
                    if (!this.isReconnecting && this.lastServerPath) {
                        this.scheduleReconnection();
                    }
                    
                    reject(error);
                });

                // Wait for server startup message with longer timeout
                setTimeout(() => {
                    if (!this.isConnected) {
                        console.error('❌ MCP Server startup timeout after 10 seconds');
                        this.serverProcess?.kill();
                        this.updateStatusBar('timeout', 'MCP Server startup timeout');
                        
                        // Start reconnection process if not already reconnecting
                        if (!this.isReconnecting && this.lastServerPath) {
                            this.scheduleReconnection();
                        }
                        
                        reject(new Error('Server startup timeout'));
                    }
                }, 10000); // Increased to 10 seconds
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

    private initializeStatusBar(): void {
        this.connectionStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        this.connectionStatusBarItem.command = 'webos-api.reconnectServer';
        this.connectionStatusBarItem.show();
        this.updateStatusBar('disconnected', 'MCP Server disconnected');
    }

    private updateStatusBar(status: 'connected' | 'disconnected' | 'error' | 'timeout' | 'reconnecting', message: string): void {
        if (!this.connectionStatusBarItem) return;

        const icons = {
            connected: '$(check)',
            disconnected: '$(circle-slash)',
            error: '$(error)',
            timeout: '$(clock)',
            reconnecting: '$(sync~spin)'
        };

        this.connectionStatusBarItem.text = `${icons[status]} webOS API`;
        this.connectionStatusBarItem.tooltip = message;
        
        const colors = {
            connected: 'statusBarItem.prominentForeground',
            disconnected: 'statusBarItem.warningForeground',
            error: 'statusBarItem.errorForeground',
            timeout: 'statusBarItem.warningForeground',
            reconnecting: 'statusBarItem.prominentForeground'
        };

        this.connectionStatusBarItem.color = colors[status];
    }

    private scheduleReconnection(): void {
        if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log(`🚫 Reconnection cancelled: attempts=${this.reconnectAttempts}, max=${this.maxReconnectAttempts}, reconnecting=${this.isReconnecting}`);
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        
        console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectInterval/1000} seconds`);
        this.updateStatusBar('reconnecting', `Reconnecting to MCP Server (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = setTimeout(async () => {
            if (this.lastServerPath) {
                try {
                    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                    await this.connectToServer(this.lastServerPath);
                } catch (error) {
                    console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
                    this.isReconnecting = false;
                    
                    // Schedule next attempt
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnection();
                    } else {
                        console.log('🚫 Max reconnection attempts reached');
                        this.updateStatusBar('error', 'MCP Server connection failed');
                        vscode.window.showErrorMessage('Failed to reconnect to MCP Server. Extension will use fallback mode.');
                    }
                }
            }
        }, this.reconnectInterval);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    async reconnect(): Promise<void> {
        console.log('🔄 Manual reconnection requested');
        this.clearReconnectTimer();
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        
        if (this.lastServerPath) {
            try {
                this.updateStatusBar('reconnecting', 'Reconnecting to MCP Server...');
                await this.connectToServer(this.lastServerPath);
                vscode.window.showInformationMessage('Successfully reconnected to MCP Server');
            } catch (error) {
                console.error('❌ Manual reconnection failed:', error);
                this.updateStatusBar('error', 'Reconnection failed');
                vscode.window.showErrorMessage(`Failed to reconnect to MCP Server: ${error}`);
            }
        } else {
            vscode.window.showErrorMessage('No server path available for reconnection');
        }
    }

    getConnectionStatus(): { connected: boolean; reconnecting: boolean; attempts: number } {
        return {
            connected: this.isConnected,
            reconnecting: this.isReconnecting,
            attempts: this.reconnectAttempts
        };
    }

    dispose(): void {
        this.clearReconnectTimer();
        
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }
        
        if (this.connectionStatusBarItem) {
            this.connectionStatusBarItem.dispose();
            this.connectionStatusBarItem = null;
        }
        
        this.isConnected = false;
        this.isReconnecting = false;
        this.pendingRequests.clear();
    }
}
