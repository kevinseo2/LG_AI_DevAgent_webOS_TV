import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { 
  WebOSAPI, 
  APIListOptions, 
  APISearchOptions, 
  CodeGenerationOptions,
  WebOSAPIMethod,
  WebOSSnippet 
} from '../types/webos-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class APIManager {
  private apis: Map<string, WebOSAPI> = new Map();
  private apiIndex: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const apisPath = join(__dirname, '../../apis');
      
      // Load API index
      const indexPath = join(apisPath, 'api-index.json');
      const indexContent = await readFile(indexPath, 'utf-8');
      this.apiIndex = JSON.parse(indexContent);

      // Load all API files
      const files = await readdir(apisPath);
      const apiFiles = files.filter(file => file.endsWith('.json') && file !== 'api-index.json');

      for (const file of apiFiles) {
        try {
          const filePath = join(apisPath, file);
          const content = await readFile(filePath, 'utf-8');
          const api: WebOSAPI = JSON.parse(content);
          this.apis.set(api.apiInfo.serviceName, api);
        } catch (error) {
          console.warn(`Failed to load API file ${file}:`, error);
        }
      }

      this.initialized = true;
      console.log(`Loaded ${this.apis.size} webOS TV APIs`);
    } catch (error) {
      console.error('Failed to initialize API Manager:', error);
      throw error;
    }
  }

  async listAPIs(options: APIListOptions = {}): Promise<any[]> {
    await this.initialize();

    let apiList = this.apiIndex.webOSTV_APIs.apis;

    // Filter by category
    if (options.category) {
      apiList = apiList.filter((api: any) => 
        api.category === options.category
      );
    }

    // Filter by status
    if (options.status) {
      apiList = apiList.filter((api: any) => {
        if (options.status === 'deprecated') {
          return api.status === 'deprecated';
        } else {
          return api.status === 'active';
        }
      });
    }

    // Filter by version (check if API is supported in given version)
    if (options.version) {
      apiList = apiList.filter((api: any) => {
        const fullAPI = this.apis.get(api.serviceName);
        if (!fullAPI) return false;
        
        const compatibility = fullAPI.apiInfo.compatibility.webOSTV;
        return compatibility[options.version] === true;
      });
    }

    return apiList.map((api: any) => ({
      serviceName: api.serviceName,
      serviceUri: api.serviceUri,
      category: api.category,
      description: api.description,
      status: api.status,
      minimumVersion: api.minimumVersion,
      deprecatedSince: api.deprecatedSince
    }));
  }

  async getAPIInfo(serviceName: string, includeExamples = true, includeCompatibility = true): Promise<WebOSAPI | null> {
    await this.initialize();

    const api = this.apis.get(serviceName);
    if (!api) return null;

    // Create a copy to avoid modifying the original
    const result = JSON.parse(JSON.stringify(api));

    // Remove examples if not requested
    if (!includeExamples) {
      result.methods.forEach((method: WebOSAPIMethod) => {
        method.examples = [];
      });
    }

    // Remove compatibility info if not requested
    if (!includeCompatibility) {
      delete result.apiInfo.compatibility;
    }

    return result;
  }

  async searchMethods(options: APISearchOptions): Promise<any[]> {
    await this.initialize();

    const results: any[] = [];
    const query = options.query.toLowerCase();

    for (const [serviceName, api] of this.apis) {
      // Skip if specific API requested and this isn't it
      if (options.apiName && serviceName !== options.apiName) {
        continue;
      }

      for (const method of api.methods) {
        // Skip deprecated methods if not requested
        if (method.deprecated && !options.includeDeprecated) {
          continue;
        }

        // Search in method name and description
        const matchesName = method.name.toLowerCase().includes(query);
        const matchesDescription = method.description.toLowerCase().includes(query);
        
        if (matchesName || matchesDescription) {
          results.push({
            serviceName,
            serviceUri: api.apiInfo.serviceUri,
            methodName: method.name,
            description: method.description,
            deprecated: method.deprecated,
            emulatorSupport: method.emulatorSupport,
            matchType: matchesName ? 'name' : 'description'
          });
        }
      }
    }

    return results.sort((a, b) => {
      // Sort by match type (name matches first), then by service name
      if (a.matchType !== b.matchType) {
        return a.matchType === 'name' ? -1 : 1;
      }
      return a.serviceName.localeCompare(b.serviceName);
    });
  }

  async generateCode(options: CodeGenerationOptions): Promise<string> {
    await this.initialize();

    const api = this.apis.get(options.serviceName);
    if (!api) {
      throw new Error(`API not found: ${options.serviceName}`);
    }

    const method = api.methods.find(m => m.name === options.methodName);
    if (!method) {
      throw new Error(`Method not found: ${options.methodName} in ${options.serviceName}`);
    }

    const serviceUri = api.apiInfo.serviceUri;
    const parameters = options.parameters || {};
    
    // Build parameters object
    const paramObj: Record<string, any> = { ...parameters };
    
    // Add required parameters if not provided
    for (const param of method.parameters) {
      if (param.required && !(param.name in paramObj)) {
        paramObj[param.name] = this.getDefaultValueForType(param.type);
      }
    }

    const codeStyle = options.codeStyle || 'callback';
    const includeErrorHandling = options.includeErrorHandling !== false;

    return this.generateCodeByStyle(serviceUri, options.methodName, paramObj, codeStyle, includeErrorHandling);
  }

  async getSnippets(apiName?: string, methodName?: string, format = 'vscode'): Promise<WebOSSnippet[]> {
    await this.initialize();

    const snippets: WebOSSnippet[] = [];

    for (const [serviceName, api] of this.apis) {
      // Skip if specific API requested and this isn't it
      if (apiName && serviceName !== apiName) {
        continue;
      }

      if (api.vscodeExtension?.snippets) {
        for (const snippet of api.vscodeExtension.snippets) {
          // Skip if specific method requested and this snippet doesn't match
          if (methodName && !snippet.prefix.includes(methodName.toLowerCase())) {
            continue;
          }

          snippets.push({
            prefix: snippet.prefix,
            body: snippet.body,
            description: `${serviceName}: ${snippet.description}`
          });
        }
      }
    }

    return snippets;
  }

  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'string': return 'value';
      case 'number': return 0;
      case 'boolean': return false;
      case 'object': return {};
      case 'array': return [];
      default: return null;
    }
  }

  private generateCodeByStyle(serviceUri: string, methodName: string, parameters: Record<string, any>, style: string, includeErrorHandling: boolean): string {
    const paramStr = JSON.stringify(parameters, null, 8).replace(/^/gm, '        ');
    
    switch (style) {
      case 'async':
        return this.generateAsyncCode(serviceUri, methodName, paramStr, includeErrorHandling);
      case 'promise':
        return this.generatePromiseCode(serviceUri, methodName, paramStr, includeErrorHandling);
      default:
        return this.generateCallbackCode(serviceUri, methodName, paramStr, includeErrorHandling);
    }
  }

  private generateCallbackCode(serviceUri: string, methodName: string, paramStr: string, includeErrorHandling: boolean): string {
    const errorHandler = includeErrorHandling ? `
    onFailure: function (inError) {
        console.log('Failed:', inError.errorText);
        // Handle error
    }` : '';

    return `var request = webOS.service.request('${serviceUri}', {
    method: '${methodName}',
    parameters: ${paramStr},
    onSuccess: function (inResponse) {
        console.log('Success:', inResponse);
        // Handle success
    }${errorHandler ? ',' + errorHandler : ''}
});`;
  }

  private generateAsyncCode(serviceUri: string, methodName: string, paramStr: string, includeErrorHandling: boolean): string {
    if (includeErrorHandling) {
      return `async function call${methodName.charAt(0).toUpperCase() + methodName.slice(1)}() {
    try {
        const response = await new Promise((resolve, reject) => {
            webOS.service.request('${serviceUri}', {
                method: '${methodName}',
                parameters: ${paramStr},
                onSuccess: resolve,
                onFailure: reject
            });
        });
        
        console.log('Success:', response);
        return response;
    } catch (error) {
        console.log('Failed:', error.errorText);
        throw error;
    }
}`;
    } else {
      return `async function call${methodName.charAt(0).toUpperCase() + methodName.slice(1)}() {
    const response = await new Promise((resolve, reject) => {
        webOS.service.request('${serviceUri}', {
            method: '${methodName}',
            parameters: ${paramStr},
            onSuccess: resolve,
            onFailure: reject
        });
    });
    
    console.log('Success:', response);
    return response;
}`;
    }
  }

  private generatePromiseCode(serviceUri: string, methodName: string, paramStr: string, includeErrorHandling: boolean): string {
    const errorHandler = includeErrorHandling ? `
.catch(error => {
    console.log('Failed:', error.errorText);
    // Handle error
})` : '';

    return `const request = new Promise((resolve, reject) => {
    webOS.service.request('${serviceUri}', {
        method: '${methodName}',
        parameters: ${paramStr},
        onSuccess: resolve,
        onFailure: reject
    });
});

request.then(response => {
    console.log('Success:', response);
    // Handle success
})${errorHandler};`;
  }
}
