/**
 * Smart Completion 유틸리티
 * 
 * 기존의 복잡한 문자열 교체 로직을 단순화하고 버그를 방지합니다.
 */

import * as vscode from 'vscode';

export interface SmartCompletionResult {
    insertText: string;
    additionalTextEdits?: vscode.TextEdit[];
}

export interface CompletionContext {
    document: vscode.TextDocument;
    position: vscode.Position;
    linePrefix: string;
    fullLine: string;
    cursorPos: number;
}

export class SmartCompletionEngine {
    
    /**
     * 메서드 자동완성을 위한 스마트 교체
     */
    static getMethodCompletion(methodName: string, context: CompletionContext): SmartCompletionResult {
        console.log('🔍 Smart method completion:', { methodName, cursorPos: context.cursorPos });
        
        // 1. method 속성에서 따옴표 안의 내용 찾기
        const methodPropertyMatch = this.findMethodPropertyAtCursor(context);
        if (methodPropertyMatch) {
            console.log('✅ Found method property match:', methodPropertyMatch);
            return this.createReplacementEdit(methodName, methodPropertyMatch, context);
        }
        
        // 2. 줄 끝의 따옴표 안 내용 찾기 (fallback)
        const lineEndMatch = this.findQuotedContentAtLineEnd(context);
        if (lineEndMatch && this.isMethodRelatedContent(lineEndMatch.content)) {
            console.log('✅ Found line end method content:', lineEndMatch);
            return this.createSimpleReplacementEdit(methodName, lineEndMatch, context);
        }
        
        // 3. 기본 삽입
        console.log('📝 Using simple insertion for method:', methodName);
        return { insertText: methodName };
    }
    
    /**
     * Service URI 자동완성을 위한 스마트 교체
     */
    static getServiceURICompletion(serviceURI: string, context: CompletionContext): SmartCompletionResult {
        console.log('🔍 Smart service URI completion:', { serviceURI, cursorPos: context.cursorPos });
        
        // 1. webOS.service.request 첫 번째 파라미터의 따옴표 안 찾기
        const serviceParameterMatch = this.findServiceParameterAtCursor(context);
        if (serviceParameterMatch) {
            console.log('✅ Found service parameter match:', serviceParameterMatch);
            return this.createReplacementEdit(serviceURI, serviceParameterMatch, context);
        }
        
        // 2. 줄 끝의 따옴표 안 내용 찾기 (fallback)
        const lineEndMatch = this.findQuotedContentAtLineEnd(context);
        if (lineEndMatch && this.isServiceURIRelatedContent(lineEndMatch.content)) {
            console.log('✅ Found line end URI content:', lineEndMatch);
            return this.createSimpleReplacementEdit(serviceURI, lineEndMatch, context);
        }
        
        // 3. 기본 삽입
        console.log('📝 Using simple insertion for URI:', serviceURI);
        return { insertText: serviceURI };
    }
    
    /**
     * 커서 위치에서 method 속성의 따옴표 내용 찾기
     */
    private static findMethodPropertyAtCursor(context: CompletionContext): QuotedMatch | null {
        // 정확한 method 속성 패턴 매칭 (더 유연하게)
        const methodRegex = /\bmethod\s*:\s*(['"])([^'"]*?)(?:\1|$)/g;
        
        let match: RegExpExecArray | null;
        while ((match = methodRegex.exec(context.fullLine)) !== null) {
            const quote = match[1];
            const content = match[2];
            const quoteIndex = match[0].indexOf(quote);
            const contentStart = match.index + quoteIndex + 1; // 시작 따옴표 다음
            const contentEnd = match[0].endsWith(quote) ? 
                match.index + match[0].length - 1 : // 끝 따옴표 전까지
                match.index + match[0].length;     // 문자열 끝까지
            
            // 커서가 이 범위 안에 있는지 확인
            if (context.cursorPos >= contentStart && context.cursorPos <= contentEnd) {
                return {
                    content,
                    startPos: contentStart,
                    endPos: contentEnd,
                    quote
                };
            }
        }
        
        return null;
    }
    
    /**
     * 커서 위치에서 webOS service 파라미터의 따옴표 내용 찾기
     */
    private static findServiceParameterAtCursor(context: CompletionContext): QuotedMatch | null {
        // webOS.service.request의 첫 번째 파라미터 찾기 (더 정확한 패턴)
        const serviceCallRegex = /webOS\.service\.request\s*\(\s*(['"])([^'"]*?)(?:\1|,|$)/g;
        
        // service.uri 패턴을 우선적으로 감지
        if (context.fullLine.includes("'service.uri'") || context.fullLine.includes('"service.uri"')) {
            const serviceUriMatch = context.fullLine.match(/webOS\.service\.request\s*\(\s*(['"])(service\.uri)(\1)/);
            if (serviceUriMatch) {
                const quote = serviceUriMatch[1];
                const content = serviceUriMatch[2];
                const matchIndex = serviceUriMatch.index || 0;
                const contentStart = matchIndex + serviceUriMatch[0].indexOf(quote) + 1;
                const contentEnd = contentStart + content.length;
                
                console.log('🔍 Found service.uri in webOS call:', {
                    content,
                    quote,
                    matchIndex,
                    contentStart,
                    contentEnd,
                    fullLine: context.fullLine
                });
                
                return {
                    content,
                    startPos: contentStart,
                    endPos: contentEnd,
                    quote
                };
            }
        }
        
        let match: RegExpExecArray | null;
        while ((match = serviceCallRegex.exec(context.fullLine)) !== null) {
            const quote = match[1];
            const content = match[2];
            const quoteIndex = match[0].indexOf(quote);
            const contentStart = match.index + quoteIndex + 1; // 시작 따옴표 다음
            // 더 정확한 끝 위치 계산
            let contentEnd;
            if (match[0].includes(',')) {
                // 쉼표가 있으면 끝 따옴표 위치 찾기
                const closingQuoteIndex = match[0].lastIndexOf(quote);
                contentEnd = match.index + closingQuoteIndex;
            } else {
                // 쉼표가 없으면 현재 내용의 끝
                contentEnd = contentStart + content.length;
            }
            
            // 커서가 이 범위 안에 있는지 확인
            if (context.cursorPos >= contentStart && context.cursorPos <= contentEnd) {
                return {
                    content,
                    startPos: contentStart,
                    endPos: contentEnd,
                    quote
                };
            }
        }
        
        return null;
    }
    
    /**
     * 줄 끝의 따옴표 안 내용 찾기
     */
    private static findQuotedContentAtLineEnd(context: CompletionContext): QuotedMatch | null {
        // 더 정확한 패턴 매칭: service.uri 같은 특별한 패턴도 감지
        const quotedMatch = context.linePrefix.match(/(['"])([^'"]*?)$/);
        if (!quotedMatch) return null;
        
        // 전체 라인에서 service.uri 패턴이 있는지 확인
        if (context.fullLine && context.fullLine.includes("'service.uri'")) {
            const serviceUriMatch = context.fullLine.match(/(['"])(service\.uri)(\1)/);
            if (serviceUriMatch) {
                const quote = serviceUriMatch[1];
                const content = serviceUriMatch[2];
                const matchIndex = serviceUriMatch.index || 0;
                const contentStartPos = matchIndex + 1; // 따옴표 다음
                const contentEndPos = matchIndex + content.length + 1; // 따옴표 전
                
                console.log('🔍 Found service.uri pattern in full line:', {
                    content,
                    quote,
                    matchIndex,
                    contentStartPos,
                    contentEndPos,
                    fullLine: context.fullLine
                });
                
                return {
                    content,
                    startPos: contentStartPos,
                    endPos: contentEndPos,
                    quote
                };
            }
        }
        
        const quote = quotedMatch[1];
        const content = quotedMatch[2];
        
        // 정확한 위치 계산: linePrefix에서 매치된 위치 기반
        const matchIndex = quotedMatch.index || 0;
        const quoteStartPos = matchIndex; // 따옴표 시작 위치 (linePrefix 기준)
        const contentStartPos = quoteStartPos + 1; // 따옴표 다음 위치
        
        // 전체 라인에서의 절대 위치로 변환
        const absoluteStartPos = context.position.character - context.linePrefix.length + contentStartPos;
        const absoluteEndPos = context.cursorPos; // 현재 커서 위치
        
        console.log('🔍 findQuotedContentAtLineEnd:', {
            content,
            quote,
            linePrefix: context.linePrefix,
            cursorPos: context.cursorPos,
            matchIndex,
            absoluteStartPos,
            absoluteEndPos
        });
        
        return {
            content,
            startPos: absoluteStartPos,
            endPos: absoluteEndPos,
            quote
        };
    }
    
    /**
     * 메서드 관련 내용인지 확인
     */
    private static isMethodRelatedContent(content: string): boolean {
        if (!content) return true; // 빈 내용도 교체 대상
        
        return (
            content === 'methodName' ||
            content.endsWith('methodName') ||
            content.includes('methodName') ||  // 추가: methodName이 포함된 경우도 교체
            content.includes('method') ||
            content.startsWith('get') ||
            content.startsWith('set') ||
            content.startsWith('create') ||
            content.startsWith('delete') ||
            // 이상한 조합 패턴도 감지 (예: setMutedmethodName)
            /^(get|set|create|delete|add|remove)\w*methodName$/.test(content) ||
            content.length < 25 // 더 긴 내용도 고려
        );
    }
    
    /**
     * Service URI 관련 내용인지 확인
     */
    private static isServiceURIRelatedContent(content: string): boolean {
        if (!content) return true; // 빈 내용도 교체 대상
        
        return (
            content.includes('luna://') ||
            content.includes('service.uri') ||
            content.includes('service.name') ||
            content.includes('service.') ||
            content.includes('com.webos') ||
            content.startsWith('l') || // luna 타이핑 중
            content.length < 30 // 비교적 짧은 내용은 교체 대상
        );
    }
    
    /**
     * 정확한 범위 교체 편집 생성
     */
    private static createReplacementEdit(
        newText: string, 
        match: QuotedMatch, 
        context: CompletionContext
    ): SmartCompletionResult {
        const range = new vscode.Range(
            new vscode.Position(context.position.line, match.startPos),
            new vscode.Position(context.position.line, match.endPos)
        );
        
        console.log('📝 Creating replacement edit:', { 
            newText, 
            oldContent: match.content, 
            startPos: match.startPos,
            endPos: match.endPos,
            cursorPos: context.cursorPos,
            range: `${match.startPos}-${match.endPos}`,
            linePrefix: context.linePrefix
        });
        
        return {
            insertText: '',
            additionalTextEdits: [vscode.TextEdit.replace(range, newText)]
        };
    }
    
    /**
     * 간단한 교체 편집 생성 (줄 끝 교체용)
     */
    private static createSimpleReplacementEdit(
        newText: string,
        match: QuotedMatch,
        context: CompletionContext
    ): SmartCompletionResult {
        const range = new vscode.Range(
            new vscode.Position(context.position.line, match.startPos),
            new vscode.Position(context.position.line, match.endPos)
        );
        
        return {
            insertText: '',
            additionalTextEdits: [vscode.TextEdit.replace(range, newText)]
        };
    }
}

interface QuotedMatch {
    content: string;
    startPos: number;
    endPos: number;
    quote: string;
}
