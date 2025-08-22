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
    errorHandlingCoverage: number;
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
    overallScore: number;
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
export declare class CodeAnalyzer {
    private apis;
    constructor(apis: Map<string, WebOSAPI>);
    analyzeProject(projectPath: string, targetVersion?: string): Promise<ProjectAnalysis>;
    analyzeFile(filePath: string, targetVersion?: string): Promise<CodeAnalysisResult>;
    private findJavaScriptFiles;
    private isWebOSAPICall;
    private checkDeprecatedAPI;
    private checkErrorHandling;
    private checkCompatibility;
    private generateModernizationSuggestions;
    private checkPerformanceIssues;
    private calculateMetrics;
    private generateProjectSummary;
    private generateRecommendations;
    private getSuggestedReplacement;
}
//# sourceMappingURL=code-analyzer.d.ts.map