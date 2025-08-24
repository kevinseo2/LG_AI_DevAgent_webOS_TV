import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import type { WebOSAPI } from '../types/webos-api.js';

export interface CodeAnalysisResult {
  fileName: string;
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
  metrics: CodeMetrics;
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  code: string;
  fixable: boolean;
  suggestedFix?: string;
}

export interface CodeSuggestion {
  type: 'optimization' | 'modernization' | 'best-practice';
  line: number;
  message: string;
  before: string;
  after: string;
  reasoning: string;
}

export interface CodeMetrics {
  totalLines: number;
  webOSAPICalls: number;
  uniqueAPIs: string[];
  deprecatedUsage: number;
  errorHandlingCoverage: number; // percentage
  asyncPatterns: {
    callback: number;
    promise: number;
    async: number;
  };
}

export interface ProjectAnalysis {
  files: CodeAnalysisResult[];
  summary: ProjectSummary;
  recommendations: ProjectRecommendation[];
}

export interface ProjectSummary {
  totalFiles: number;
  totalIssues: number;
  totalSuggestions: number;
  overallScore: number; // 0-100
  apiUsageDistribution: Record<string, number>;
  compatibilityIssues: CompatibilityIssue[];
}

export interface ProjectRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'compatibility' | 'maintainability' | 'security';
  title: string;
  description: string;
  affectedFiles: string[];
  estimatedImpact: string;
}

export interface CompatibilityIssue {
  api: string;
  method: string;
  targetVersion: string;
  currentSupport: boolean;
  alternative?: string;
  migrationGuide?: string;
}

export class CodeAnalyzer {
  private apis: Map<string, WebOSAPI> = new Map();

  constructor(apis: Map<string, WebOSAPI>) {
    this.apis = apis;
  }

  async analyzeProject(projectPath: string, targetVersion = '6.x'): Promise<ProjectAnalysis> {
    console.log(`Starting project analysis for: ${projectPath}`);
    
    const jsFiles = await this.findJavaScriptFiles(projectPath);
    const analysisResults: CodeAnalysisResult[] = [];

    for (const file of jsFiles) {
      try {
        const result = await this.analyzeFile(file, targetVersion);
        analysisResults.push(result);
      } catch (error) {
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }

    const summary = this.generateProjectSummary(analysisResults, targetVersion);
    const recommendations = this.generateRecommendations(analysisResults, summary);

    return {
      files: analysisResults,
      summary,
      recommendations
    };
  }

  async analyzeFile(filePath: string, targetVersion = '6.x'): Promise<CodeAnalysisResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const issues: CodeIssue[] = [];
    const suggestions: CodeSuggestion[] = [];
    const metrics = this.calculateMetrics(content);

    // Analyze each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for webOS API calls
      if (this.isWebOSAPICall(line)) {
        // Check for deprecated APIs
        const deprecatedIssue = this.checkDeprecatedAPI(line, lineNumber);
        if (deprecatedIssue) issues.push(deprecatedIssue);

        // Check for missing error handling
        const errorHandlingIssue = this.checkErrorHandling(lines, i);
        if (errorHandlingIssue) issues.push(errorHandlingIssue);

        // Check for compatibility issues
        const compatibilityIssues = this.checkCompatibility(line, lineNumber, targetVersion);
        issues.push(...compatibilityIssues);

        // Generate modernization suggestions
        const modernizationSuggestions = this.generateModernizationSuggestions(line, lineNumber);
        suggestions.push(...modernizationSuggestions);

        // Check for performance issues
        const performanceIssues = this.checkPerformanceIssues(line, lineNumber);
        issues.push(...performanceIssues);
      }
    }

    return {
      fileName: path.basename(filePath),
      issues,
      suggestions,
      metrics
    };
  }

  private async findJavaScriptFiles(projectPath: string): Promise<string[]> {
    const patterns = [
      '**/*.js',
      '**/*.ts',
      '**/*.jsx',
      '**/*.tsx'
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectPath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
      });
      files.push(...matches);
    }

    return files;
  }

  private isWebOSAPICall(line: string): boolean {
    return line.includes('webOS.service.request') || 
           line.includes('webOS.service.call') ||
           line.includes('luna://');
  }

  private checkDeprecatedAPI(line: string, lineNumber: number): CodeIssue | null {
    const deprecatedAPIs = [
      'luna://com.webos.service.camera'
    ];

    for (const deprecatedAPI of deprecatedAPIs) {
      if (line.includes(deprecatedAPI)) {
        return {
          type: 'warning',
          line: lineNumber,
          column: line.indexOf(deprecatedAPI),
          message: `Deprecated API usage: ${deprecatedAPI}`,
          code: 'DEPRECATED_API',
          fixable: true,
          suggestedFix: this.getSuggestedReplacement(deprecatedAPI)
        };
      }
    }

    return null;
  }

  private checkErrorHandling(lines: string[], currentIndex: number): CodeIssue | null {
    const currentLine = lines[currentIndex];
    
    if (!currentLine.includes('webOS.service.request')) return null;

    // Look for onFailure in the next few lines
    let foundOnFailure = false;
    let braceCount = 0;
    let inServiceCall = false;

    for (let i = currentIndex; i < Math.min(lines.length, currentIndex + 20); i++) {
      const line = lines[i];
      
      if (line.includes('webOS.service.request')) {
        inServiceCall = true;
      }
      
      if (inServiceCall) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (line.includes('onFailure')) {
          foundOnFailure = true;
          break;
        }
        
        if (braceCount <= 0 && i > currentIndex) {
          break;
        }
      }
    }

    if (!foundOnFailure) {
      return {
        type: 'warning',
        line: currentIndex + 1,
        column: 0,
        message: 'Missing error handling (onFailure callback)',
        code: 'MISSING_ERROR_HANDLING',
        fixable: true,
        suggestedFix: 'Add onFailure callback to handle errors gracefully'
      };
    }

    return null;
  }

  private checkCompatibility(line: string, lineNumber: number, targetVersion: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    // Extract service URI and method
    const serviceMatch = line.match(/luna:\/\/([^'"]+)/);
    const methodMatch = line.match(/method:\s*['"]([^'"]+)['"]/);
    
    if (serviceMatch && methodMatch) {
      const serviceUri = `luna://${serviceMatch[1]}`;
      const methodName = methodMatch[1];
      
      // Find API and check compatibility
      for (const [, api] of this.apis) {
        if (api.apiInfo.serviceUri === serviceUri) {
          const compatibility = api.apiInfo.compatibility.webOSTV;
          if (compatibility[targetVersion] === false) {
            issues.push({
              type: 'error',
              line: lineNumber,
              column: line.indexOf(serviceUri),
              message: `API not supported in webOS TV ${targetVersion}`,
              code: 'COMPATIBILITY_ERROR',
              fixable: false
            });
          }
          break;
        }
      }
    }

    return issues;
  }

  private generateModernizationSuggestions(line: string, lineNumber: number): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];

    // Suggest async/await conversion
    if (line.includes('webOS.service.request') && line.includes('onSuccess')) {
      suggestions.push({
        type: 'modernization',
        line: lineNumber,
        message: 'Consider using async/await pattern for better readability',
        before: 'webOS.service.request(..., { onSuccess: ... })',
        after: 'await webOSServiceCall(...)',
        reasoning: 'Async/await provides cleaner error handling and better code readability'
      });
    }

    // Suggest parameter validation
    if (line.includes('parameters:') && line.includes('{}')) {
      suggestions.push({
        type: 'best-practice',
        line: lineNumber,
        message: 'Add parameter validation',
        before: 'parameters: {}',
        after: 'parameters: { /* add required parameters */ }',
        reasoning: 'Adding proper parameters improves API call reliability'
      });
    }

    return suggestions;
  }

  private checkPerformanceIssues(line: string, lineNumber: number): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Check for unnecessary subscriptions
    if (line.includes('subscribe: true') && !line.includes('onSuccess')) {
      issues.push({
        type: 'warning',
        line: lineNumber,
        column: line.indexOf('subscribe'),
        message: 'Subscription without proper handling may cause memory leaks',
        code: 'SUBSCRIPTION_LEAK',
        fixable: true,
        suggestedFix: 'Ensure proper subscription cleanup or set subscribe to false'
      });
    }

    return issues;
  }

  private calculateMetrics(content: string): CodeMetrics {
    const lines = content.split('\n');
    const webOSCalls = content.match(/webOS\.service\.request/g) || [];
    const uniqueAPIs = new Set<string>();
    let deprecatedUsage = 0;
    let errorHandling = 0;
    let totalAPICalls = 0;

    const asyncPatterns = {
      callback: 0,
      promise: 0,
      async: 0
    };

    // Extract unique APIs
    const serviceMatches = content.match(/luna:\/\/[^'"]+/g) || [];
    serviceMatches.forEach(match => {
      uniqueAPIs.add(match);
      if (match.includes('camera')) deprecatedUsage++;
    });

    // Count error handling
    const onFailureMatches = content.match(/onFailure/g) || [];
    errorHandling = onFailureMatches.length;
    totalAPICalls = webOSCalls.length;

    // Count async patterns
    asyncPatterns.callback = (content.match(/onSuccess/g) || []).length;
    asyncPatterns.promise = (content.match(/\.then\(/g) || []).length;
    asyncPatterns.async = (content.match(/await.*webOS/g) || []).length;

    return {
      totalLines: lines.length,
      webOSAPICalls: totalAPICalls,
      uniqueAPIs: Array.from(uniqueAPIs),
      deprecatedUsage,
      errorHandlingCoverage: totalAPICalls > 0 ? (errorHandling / totalAPICalls) * 100 : 100,
      asyncPatterns
    };
  }

  private generateProjectSummary(results: CodeAnalysisResult[], targetVersion: string): ProjectSummary {
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const totalSuggestions = results.reduce((sum, r) => sum + r.suggestions.length, 0);
    
    // Calculate overall score (100 - penalty for issues)
    const errorPenalty = results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.type === 'error').length * 10, 0
    );
    const warningPenalty = results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.type === 'warning').length * 5, 0
    );
    
    const overallScore = Math.max(0, 100 - errorPenalty - warningPenalty);

    // API usage distribution
    const apiUsageDistribution: Record<string, number> = {};
    results.forEach(result => {
      result.metrics.uniqueAPIs.forEach(api => {
        apiUsageDistribution[api] = (apiUsageDistribution[api] || 0) + 1;
      });
    });

    // Compatibility issues
    const compatibilityIssues: CompatibilityIssue[] = [];
    results.forEach(result => {
      result.issues.forEach(issue => {
        if (issue.code === 'COMPATIBILITY_ERROR') {
          // Extract API info from issue
          compatibilityIssues.push({
            api: 'Unknown API',
            method: 'Unknown Method',
            targetVersion,
            currentSupport: false,
            alternative: 'Check webOS TV documentation for alternatives'
          });
        }
      });
    });

    return {
      totalFiles: results.length,
      totalIssues,
      totalSuggestions,
      overallScore,
      apiUsageDistribution,
      compatibilityIssues
    };
  }

  private generateRecommendations(results: CodeAnalysisResult[], summary: ProjectSummary): ProjectRecommendation[] {
    const recommendations: ProjectRecommendation[] = [];

    // High priority: Fix compatibility issues
    if (summary.compatibilityIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'compatibility',
        title: 'Fix API Compatibility Issues',
        description: `Found ${summary.compatibilityIssues.length} compatibility issues that may prevent the app from working on target webOS TV version.`,
        affectedFiles: results.filter(r => r.issues.some(i => i.code === 'COMPATIBILITY_ERROR')).map(r => r.fileName),
        estimatedImpact: 'Critical - App may not function correctly'
      });
    }

    // Medium priority: Add error handling
    const missingErrorHandling = results.filter(r => 
      r.issues.some(i => i.code === 'MISSING_ERROR_HANDLING')
    );
    if (missingErrorHandling.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'maintainability',
        title: 'Improve Error Handling',
        description: 'Add error handling to webOS API calls to improve app reliability.',
        affectedFiles: missingErrorHandling.map(r => r.fileName),
        estimatedImpact: 'Moderate - Better user experience and debugging'
      });
    }

    // Low priority: Modernize code patterns
    const modernizationCandidates = results.filter(r => 
      r.suggestions.some(s => s.type === 'modernization')
    );
    if (modernizationCandidates.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'maintainability',
        title: 'Modernize Code Patterns',
        description: 'Consider using modern async/await patterns for better code readability.',
        affectedFiles: modernizationCandidates.map(r => r.fileName),
        estimatedImpact: 'Low - Improved code maintainability'
      });
    }

    return recommendations;
  }

  private getSuggestedReplacement(deprecatedAPI: string): string {
    const replacements: Record<string, string> = {
      'luna://com.webos.service.camera': 'Use Media APIs or remove camera functionality (deprecated since webOS TV 4.x)'
    };

    return replacements[deprecatedAPI] || 'Check webOS TV documentation for alternatives';
  }
}
