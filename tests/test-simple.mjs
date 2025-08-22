#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Testing webOS TV API MCP Server\n');

// Test the server directly
const server = spawn('npx', ['tsx', 'src/index.ts'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

let testCount = 0;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📤 Server Output:', output.trim());
  
  if (output.includes('webOS TV API MCP Server started successfully')) {
    console.log('\n✅ Server is ready! Starting tests...\n');
    runTests();
  }
});

server.stderr.on('data', (data) => {
  const error = data.toString().trim();
  if (error) {
    console.log('⚠️ Server Log:', error);
  }
});

function runTests() {
  // Test 1: List tools
  setTimeout(() => {
    console.log('🔧 Test 1: Listing available tools...');
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: ++testCount,
      method: 'tools/list'
    }) + '\n';
    
    server.stdin.write(request);
  }, 500);

  // Test 2: List APIs with category filter
  setTimeout(() => {
    console.log('📋 Test 2: Listing system APIs...');
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: ++testCount,
      method: 'tools/call',
      params: {
        name: 'webos_list_apis',
        arguments: {
          category: 'system',
          status: 'active'
        }
      }
    }) + '\n';
    
    server.stdin.write(request);
  }, 1500);

  // Test 3: Get specific API info
  setTimeout(() => {
    console.log('ℹ️ Test 3: Getting Activity Manager API info...');
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: ++testCount,
      method: 'tools/call',
      params: {
        name: 'webos_get_api_info',
        arguments: {
          serviceName: 'Activity Manager',
          includeExamples: false,
          includeCompatibility: true
        }
      }
    }) + '\n';
    
    server.stdin.write(request);
  }, 2500);

  // Test 4: Search methods
  setTimeout(() => {
    console.log('🔍 Test 4: Searching for volume methods...');
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: ++testCount,
      method: 'tools/call',
      params: {
        name: 'webos_search_methods',
        arguments: {
          query: 'volume'
        }
      }
    }) + '\n';
    
    server.stdin.write(request);
  }, 3500);

  // Test 5: Generate code
  setTimeout(() => {
    console.log('🛠️ Test 5: Generating async code...');
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: ++testCount,
      method: 'tools/call',
      params: {
        name: 'webos_generate_code',
        arguments: {
          serviceName: 'Audio',
          methodName: 'getVolume',
          codeStyle: 'async',
          includeErrorHandling: true
        }
      }
    }) + '\n';
    
    server.stdin.write(request);
  }, 4500);

  // Stop after all tests
  setTimeout(() => {
    console.log('\n🏁 All tests completed! Stopping server...');
    server.kill('SIGTERM');
    process.exit(0);
  }, 6000);
}

server.on('close', (code) => {
  console.log(`\n🔚 Server process exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('\n⏹️ Interrupted! Stopping server...');
  server.kill('SIGTERM');
  process.exit(1);
});
