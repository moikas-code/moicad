/**
 * MCP Suggestion Engine
 * Core logic for generating, processing, and validating AI suggestions
 */

import type {
  GeneratedSuggestion,
  Suggestion,
  SuggestionRequest,
  SuggestionType,
  SuggestionPriority,
  ImpactLevel,
  ValidationContext,
  ValidationResult,
  ValidationIssue,
  ValidationWarning,
  RiskLevel,
  CodeContext
} from '../../shared/ai-types';

import type { ScadNode } from '../../shared/types';

// =============================================================================
// CORE SUGGESTION ENGINE
// =============================================================================

/**
 * Main suggestion processing engine
 */
export class MCPSuggestionEngine {
  
  /**
   * Normalize suggestion type
   */
  private normalizeType(type: SuggestionType): any {
    const typeMap: Record<string, any> = {
      'refactor': 'enhancement',
      'security': 'bug_fix',
      'completion': 'code',
      'explanation': 'documentation'
    };
    return typeMap[type] || type;
  }
  
  /**
   * Process raw AI suggestions into final format
   */
  async processSuggestions(
    rawSuggestions: GeneratedSuggestion[],
    request: SuggestionRequest
  ): Promise<Suggestion[]> {
    const processedSuggestions: Suggestion[] = [];
    
    for (const raw of rawSuggestions) {
      try {
        const suggestion = await this.processRawSuggestion(raw, request);
        if (suggestion) {
          processedSuggestions.push(suggestion);
        }
      } catch (error: any) {
        console.error('Failed to process suggestion:', error);
      }
    }
    
    // Sort by priority and confidence
    return processedSuggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }
  
  /**
   * Process a single raw suggestion
   */
  private async processRawSuggestion(
    raw: GeneratedSuggestion,
    request: SuggestionRequest
  ): Promise<Suggestion | null> {
    console.log('Processing raw suggestion:', raw.type, raw.title);
    
    // Apply filters
    if (!this.meetsUserPreferences(raw, request.preferences)) {
      console.log('Suggestion filtered out by user preferences');
      return null;
    }
    
    // Validate safety
    const safetyCheck = this.validateSafety(raw, request.context);
    if (!safetyCheck.safe) {
      return null;
    }
    
    // Generate final suggestion
    return {
      id: this.generateId(),
      type: this.normalizeType(raw.type),
      title: raw.title,
      description: raw.description,
      code: raw.code,
      originalCode: this.extractOriginalCode(raw, request),
      position: this.calculatePosition(raw, request),
      confidence: this.calculateConfidence(raw, request),
      priority: raw.priority,
      author: 'mcp-ai-engine',
      timestamp: new Date(),
      status: 'pending',
      metadata: {
        category: raw.category,
        tags: raw.tags,
        references: [],
        estimatedImpact: raw.estimatedImpact,
        requiresReview: raw.requiresReview
      }
    };
  }
  
  /**
   * Validate a suggestion
   */
  async validateSuggestion(
    suggestion: Suggestion,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Syntax validation
    const syntaxResult = await this.validateSyntax(suggestion.code);
    issues.push(...syntaxResult.issues);
    warnings.push(...syntaxResult.warnings);
    
    // Security validation
    const securityResult = this.validateSecurity(suggestion, context);
    issues.push(...securityResult.issues);
    warnings.push(...securityResult.warnings);
    
    // Compatibility validation
    const compatibilityResult = this.validateCompatibility(suggestion, context);
    issues.push(...compatibilityResult.issues);
    warnings.push(...compatibilityResult.warnings);
    
    // Performance validation
    const performanceResult = this.validatePerformance(suggestion, context);
    warnings.push(...performanceResult.warnings);
    
    // Calculate overall validity
    const hasBlockingIssues = issues.some(issue => issue.severity === 'error');
    const safeToApply = !hasBlockingIssues && context.safetyLevel !== 'strict';
    
    return {
      valid: issues.length === 0,
      confidence: this.calculateValidationConfidence(issues, warnings),
      issues,
      warnings,
      safeToApply,
      estimatedRisk: this.calculateRiskLevel(issues, warnings),
      requirements: this.extractRequirements(suggestion)
    };
  }
  
  // =============================================================================
  // VALIDATION METHODS
  // =============================================================================
  
  /**
   * Validate OpenSCAD syntax
   */
  private async validateSyntax(code: string): Promise<{ issues: ValidationIssue[]; warnings: ValidationWarning[] }> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Basic syntax checks
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';
      if (!line || line.startsWith('//')) continue;
      
      // Check for common syntax errors
      if (line.includes('cube') && !line.match(/cube\s*\(/)) {
        issues.push({
          type: 'syntax',
          severity: 'error',
          message: 'Invalid cube syntax',
          line: i + 1,
          column: line.indexOf('cube') || 0,
          fix: 'Use cube(size) syntax'
        });
      }
      
      // Check for unmatched brackets
      const openBrackets = (line.match(/\(/g) || []).length;
      const closeBrackets = (line.match(/\)/g) || []).length;
      if (openBrackets !== closeBrackets) {
        issues.push({
          type: 'syntax',
          severity: 'error',
          message: 'Unmatched brackets',
          line: i + 1,
          column: 0,
          fix: 'Add missing brackets'
        });
      }
      
      // Check for deprecated functions
      if (line.includes('cylinder(') && line.includes('r1=')) {
        warnings.push({
          type: 'deprecation',
          message: 'Using cylinder with r1/r2 parameters is deprecated',
          impact: 'May cause compatibility issues',
          suggestion: 'Use standard cylinder parameters'
        });
      }
    }
    
    return { issues, warnings };
  }
  
  /**
   * Validate security concerns
   */
  private validateSecurity(
    suggestion: Suggestion,
    context: ValidationContext
  ): { issues: ValidationIssue[]; warnings: ValidationWarning[] } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check for potentially dangerous operations
    const dangerousPatterns = [
      /multmatrix\s*\(\s*\[/, // Complex matrix operations
      /import\s*\(/, // File imports
      /include\s+</, // File includes
      /use\s+</ // File use
    ];
    
    dangerousPatterns.forEach((pattern, index) => {
      if (pattern.test(suggestion.code)) {
        issues.push({
          type: 'security',
          severity: context.safetyLevel === 'strict' ? 'error' : 'warning',
          message: `Potentially dangerous operation detected: ${pattern.source}`,
          fix: 'Review operation for safety implications'
        });
      }
    });
    
    // Check for excessive computation
    const forLoops = (suggestion.code.match(/for\s*\(/g) || []).length;
    if (forLoops > 3) {
      warnings.push({
        type: 'performance',
        message: `Multiple for loops (${forLoops}) may cause performance issues`,
        impact: 'Slow evaluation',
        suggestion: 'Consider reducing loop iterations'
      });
    }
    
    return { issues, warnings };
  }
  
  /**
   * Validate compatibility
   */
  private validateCompatibility(
    suggestion: Suggestion,
    context: ValidationContext
  ): { issues: ValidationIssue[]; warnings: ValidationWarning[] } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check for OpenSCAD version compatibility
    const modernFeatures = [
      'let(', 'assign(', 'function(', 'assert('
    ];
    
    modernFeatures.forEach(feature => {
      if (suggestion.code.includes(feature)) {
        warnings.push({
          type: 'deprecation',
          message: `Using modern feature: ${feature}`,
          impact: 'May not work with older OpenSCAD versions',
          suggestion: 'Verify OpenSCAD version compatibility'
        });
      }
    });
    
    return { issues, warnings };
  }
  
  /**
   * Validate performance
   */
  private validatePerformance(
    suggestion: Suggestion,
    context: ValidationContext
  ): { warnings: ValidationWarning[] } {
    const warnings: ValidationWarning[] = [];
    
    // Check for performance red flags
    const performanceIssues = [
      { pattern: /fn\s*=\s*[0-9]{3,}/, message: 'Very high $fn value may cause performance issues' },
      { pattern: /cube\s*\(\s*\[/, message: 'Cube with array notation may be less efficient' },
      { pattern: /sphere\s*\([^)]*\).*sphere\s*\(/, message: 'Multiple spheres may be expensive to render' }
    ];
    
    performanceIssues.forEach(({ pattern, message }) => {
      if (pattern.test(suggestion.code)) {
        warnings.push({
          type: 'performance',
          message,
          impact: 'Increased rendering time',
          suggestion: 'Consider optimizing geometry'
        });
      }
    });
    
    return { warnings };
  }
  
  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  
  /**
   * Check if suggestion meets user preferences
   */
  private meetsUserPreferences(
    suggestion: GeneratedSuggestion,
    preferences: any
  ): boolean {
    // Check type filters
    if (preferences.types && !preferences.types.includes(suggestion.type)) {
      return false;
    }
    
    // Check confidence threshold
    if (suggestion.confidence < preferences.minConfidence) {
      return false;
    }
    
    // Check category filters
    if (preferences.categories && !preferences.categories.includes(suggestion.category)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate suggestion safety
   */
  private validateSafety(
    suggestion: GeneratedSuggestion,
    context: CodeContext
  ): { safe: boolean; reason?: string } {
    // Check for obviously unsafe patterns
    const unsafePatterns = [
      /import\s*\(/,
      /include\s+</,
      /use\s+</,
      /shell_exec\s*\(/,
      /system\s*\(/
    ];
    
    for (const pattern of unsafePatterns) {
      if (pattern.test(suggestion.code)) {
        return { safe: false, reason: `Unsafe pattern detected: ${pattern.source}` };
      }
    }
    
    return { safe: true };
  }
  
  /**
   * Extract original code from context
   */
  private extractOriginalCode(
    suggestion: GeneratedSuggestion,
    request: SuggestionRequest
  ): string {
    if (!suggestion.position) {
      return request.code;
    }
    
    const lines = request.code.split('\n');
    const startLine = Math.max(0, suggestion.position.line);
    const endLine = suggestion.position.length ? 
      Math.min(lines.length - 1, startLine + suggestion.position.length - 1) : 
      startLine;
    
    return lines.slice(startLine, endLine + 1).join('\n');
  }
  
  /**
   * Calculate suggestion position
   */
  private calculatePosition(
    suggestion: GeneratedSuggestion,
    request: SuggestionRequest
  ): { line: number; column: number; file: string } {
    if (suggestion.position) {
      return {
        line: suggestion.position.line,
        column: suggestion.position.column,
        file: request.context.file.name
      };
    }
    
    // Default to cursor position or start of file
    const cursor = request.cursor;
    return {
      line: cursor?.line ?? 0,
      column: cursor?.column ?? 0,
      file: request.context.file.name
    };
  }
  
  /**
   * Calculate final confidence score
   */
  private calculateConfidence(
    suggestion: GeneratedSuggestion,
    request: SuggestionRequest
  ): number {
    let confidence = suggestion.confidence;
    
    // Boost confidence for certain categories
    const categoryBoosts: Record<string, number> = {
      'syntax': 0.1,
      'optimization': 0.05,
      'bug_fix': 0.15
    };
    
    const boost = categoryBoosts[suggestion.category] || 0;
    return Math.min(1.0, confidence + boost);
  }
  
  /**
   * Calculate validation confidence
   */
  private calculateValidationConfidence(
    issues: ValidationIssue[],
    warnings: ValidationWarning[]
  ): number {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = warnings.length;
    
    // Start with 1.0 and deduct for issues
    let confidence = 1.0;
    confidence -= errorCount * 0.3;
    confidence -= warningCount * 0.1;
    
    return Math.max(0.0, confidence);
  }
  
  /**
   * Calculate risk level
   */
  private calculateRiskLevel(
    issues: ValidationIssue[],
    warnings: ValidationWarning[]
  ): RiskLevel {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = warnings.length;
    
    if (errorCount > 0) return 'high';
    if (warningCount > 3) return 'medium';
    if (warningCount > 0) return 'low';
    return 'minimal';
  }
  
  /**
   * Extract requirements from suggestion
   */
  private extractRequirements(suggestion: Suggestion): string[] {
    const requirements: string[] = [];
    
    // Check for specific OpenSCAD features
    if (suggestion.code.includes('import(')) {
      requirements.push('File system access');
    }
    if (suggestion.code.includes('function(')) {
      requirements.push('OpenSCAD 2015.03 or later');
    }
    if (suggestion.code.includes('assert(')) {
      requirements.push('OpenSCAD 2019.05 or later');
    }
    
    return requirements;
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const suggestionEngine = new MCPSuggestionEngine();