#!/usr/bin/env node

// Simple test script for the MCP server
import { spawn } from 'child_process';

console.log('Testing webOS TV API MCP Server...\n');

// Start the MCP server process
const server = spawn('npm', ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Server:', output);
  
  if (output.includes('webOS TV API MCP Server started successfully')) {
    serverReady = true;
    console.log('\n✅ Server is ready! Testing tools...\n');
    testTools();
  }
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

// Test the tools by sending JSON-RPC messages
async function testTools() {
  // Test 1: List tools
  console.log('🔧 Testing list_tools...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Test 2: List APIs
  setTimeout(() => {
    console.log('📋 Testing webos_list_apis...');
    const listAPIsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'webos_list_apis',
        arguments: {
          category: 'system'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(listAPIsRequest) + '\n');
  }, 1000);

  // Test 3: Get API info
  setTimeout(() => {
    console.log('ℹ️ Testing webos_get_api_info...');
    const getAPIInfoRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'webos_get_api_info',
        arguments: {
          serviceName: 'Activity Manager',
          includeExamples: false
        }
      }
    };
    
    server.stdin.write(JSON.stringify(getAPIInfoRequest) + '\n');
  }, 2000);

  // Test 4: Generate code
  setTimeout(() => {
    console.log('🛠️ Testing webos_generate_code...');
    const generateCodeRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'webos_generate_code',
        arguments: {
          serviceName: 'Activity Manager',
          methodName: 'adopt',
          parameters: {
            activityId: 90,
            wait: true,
            subscribe: true
          },
          codeStyle: 'async'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(generateCodeRequest) + '\n');
  }, 3000);

  // Stop after tests
  setTimeout(() => {
    console.log('\n🏁 Tests completed! Stopping server...');
    server.kill('SIGTERM');
    process.exit(0);
  }, 5000);
}

server.on('close', (code) => {
  console.log(`\n🔚 Server process exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⏹️ Stopping test...');
  server.kill('SIGTERM');
  process.exit(0);
});
