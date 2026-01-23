/**
 * MCP Stub AI Provider
 * Deterministic stub provider for MVP development and testing
 */

import type {
  IAIProvider,
  AIProviderConfig,
  StubProviderConfig,
  SuggestionRequest,
  SuggestionResponse,
  GeneratedSuggestion,
  SuggestionType,
  SuggestionPriority,
  ImpactLevel,
  ProviderHealth,
  ValidationResult,
  ValidationContext,
  StubTemplate
} from '../shared/ai-types';

import { AIProviderError } from '../shared/ai-types';

// =============================================================================
// STUB AI PROVIDER
// =============================================================================

/**
 * Deterministic stub AI provider that returns predictable suggestions
 */
export class StubAIProvider implements IAIProvider {
  readonly id = 'stub-provider';
  readonly name = 'Stub AI Provider';
  readonly type = 'stub' as const;
  readonly model = 'stub-model-1.0';
  readonly isAvailable = true;
  readonly capabilities = [];
  
  private config: StubProviderConfig = {};
  private templates: Map<string, StubTemplate> = new Map();
  private seed = 42;
  
  constructor() {
    this.initializeTemplates();
  }
  
  /**
   * Initialize the provider
   */
  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config as StubProviderConfig;
    
    if (this.config.seed) {
      this.seed = this.config.seed;
    }
    
    if (this.config.templates) {
      Object.entries(this.config.templates).forEach(([key, template]) => {
        this.templates.set(key, template);
      });
    }
    
    console.log('Stub AI provider initialized with config:', this.config);
  }
  
  /**
   * Generate deterministic suggestions
   */
  async generateSuggestions(request: SuggestionRequest): Promise<SuggestionResponse> {
    const startTime = Date.now();
    
    try {
      // Simulate response delay
      if (this.config.responseDelay) {
        await new Promise(resolve => setTimeout(resolve, this.config.responseDelay));
      }
      
      // Simulate occasional errors
      if (this.config.errorRate && Math.random() < this.config.errorRate) {
        throw new Error('Simulated AI provider error');
      }
      
      // Generate deterministic suggestions based on code
      const suggestions = this.generateStubSuggestions(request);
      
      return {
        suggestions,
        metadata: {
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          processingTime: Date.now() - startTime,
          cacheHit: false,
          providerVersion: '1.0.0-stub'
        },
        provider: this.id,
        model: this.model,
        requestId: this.generateRequestId(),
        processingTime: Date.now() - startTime,
        tokensUsed: {
          input: this.estimateTokens(request.code),
          output: this.estimateTokens(JSON.stringify(suggestions)),
          total: 0,
          cost: 0
        }
      };
    } catch (error: any) {
      throw new AIProviderError(
        `Failed to generate suggestions: ${error.message}`,
        this.id,
        'generate',
        error
      );
    }
  }
  
  /**
   * Validate suggestion (always passes in stub)
   */
  async validateSuggestion(suggestion: any, context: ValidationContext): Promise<ValidationResult> {
    return {
      valid: true,
      confidence: 0.8,
      issues: [],
      warnings: [],
      safeToApply: context.safetyLevel !== 'strict',
      estimatedRisk: context.safetyLevel === 'strict' ? 'medium' : 'low'
    };
  }
  
  /**
   * Health check (always healthy in stub)
   */
  async healthCheck(): Promise<ProviderHealth> {
    return {
      healthy: true,
      responseTime: this.config.responseDelay || 10,
      lastCheck: new Date(),
      errorRate: this.config.errorRate || 0,
      availableModels: [this.model],
      limits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 100000,
        dailyQuota: 1000000
      }
    };
  }
  
  /**
   * Dispose (no-op in stub)
   */
  async dispose(): Promise<void> {
    console.log('Stub AI provider disposed');
  }
  
  // =============================================================================
  // SUGGESTION GENERATION
  // =============================================================================
  
  /**
   * Generate deterministic suggestions based on code
   */
  private generateStubSuggestions(request: SuggestionRequest): GeneratedSuggestion[] {
    const suggestions: GeneratedSuggestion[] = [];
    const code = request.code.toLowerCase();
    
    // Analyze code patterns
    const patterns = this.analyzeCodePatterns(code);
    
    // Generate suggestions based on patterns
    patterns.forEach(pattern => {
      const suggestion = this.generateSuggestionForPattern(pattern, request);
      if (suggestion) {
        console.log(`Generated suggestion for pattern ${pattern}:`, suggestion.title);
        suggestions.push(suggestion);
      }
    });
    
    // Add general suggestions if no specific patterns found
    if (suggestions.length === 0) {
      console.log('Adding general suggestion');
      suggestions.push(this.generateGeneralSuggestion(request));
    } else {
      console.log(`Generated ${suggestions.length} pattern-specific suggestions`);
    }
    
    // Limit based on user preferences
    const limited = suggestions.slice(0, request.preferences.maxSuggestions || 3);
    console.log(`Returning ${limited.length} suggestions after filtering`);
    return limited;
  }
  
  /**
   * Analyze code for patterns
   */
  private analyzeCodePatterns(code: string): string[] {
    const patterns: string[] = [];
    
    console.log('Stub AI analyzing code:', code);
    
    // Check for missing semicolons
    if (code.includes('cube') && !code.includes(';')) {
      console.log('Detected missing semicolon pattern');
      patterns.push('missing-semicolon');
    }
    
    // Check for hardcoded numbers
    if (code.match(/\b(10|20|30)\b/) && !code.includes('variable')) {
      patterns.push('hardcoded-values');
    }
    
    // Check for missing $fn for circles
    if (code.includes('circle') && !code.includes('$fn')) {
      patterns.push('missing-fn');
    }
    
    // Check for inefficient geometry
    if (code.includes('cube') && code.includes('sphere')) {
      patterns.push('optimization-opportunity');
    }
    
    // Check for common syntax errors
    if (code.match(/cube\s+[^(]/)) {
      patterns.push('syntax-error');
    }
    
    // Check for missing comments
    if (code.length > 100 && !code.includes('//')) {
      patterns.push('missing-documentation');
    }
    
    return patterns;
  }
  
  /**
   * Generate suggestion for a specific pattern
   */
  private generateSuggestionForPattern(
    pattern: string,
    request: SuggestionRequest
  ): GeneratedSuggestion | null {
    const template = this.templates.get(pattern);
    if (template) {
      return {
        type: this.determineSuggestionType(pattern),
        title: template.title,
        description: template.description,
        code: template.code,
        explanation: template.explanation,
        confidence: template.confidence,
        priority: template.priority,
        category: template.category,
        tags: template.tags,
        estimatedImpact: template.estimatedImpact,
        requiresReview: template.estimatedImpact === 'high',
        reasoning: `Detected pattern: ${pattern}`
      };
    }
    
    // Fallback suggestions
    switch (pattern) {
      case 'missing-semicolon':
        return {
          type: 'bug_fix',
          title: 'Add missing semicolon',
          description: 'OpenSCAD statements should end with semicolons',
          code: request.code.trim() + ';',
          explanation: 'Semicolons are required to separate statements in OpenSCAD',
          confidence: 0.9,
          priority: 'high',
          category: 'syntax',
          tags: ['syntax', 'semicolon'],
          estimatedImpact: 'medium',
          requiresReview: false,
          reasoning: 'Missing semicolon detected'
        };
        
      case 'hardcoded-values':
        return {
          type: 'refactor',
          title: 'Extract hardcoded values to variables',
          description: 'Use variables for better maintainability',
          code: 'size = 10;\ncube(size);',
          explanation: 'Variables make code more readable and easier to modify',
          confidence: 0.7,
          priority: 'medium',
          category: 'style',
          tags: ['variables', 'refactoring'],
          estimatedImpact: 'low',
          requiresReview: false,
          reasoning: 'Hardcoded values detected'
        };
        
      case 'missing-fn':
        return {
          type: 'enhancement',
          title: 'Add $fn parameter for smoother circles',
          description: 'Control circle resolution with $fn',
          code: request.code.replace(/circle\s*\([^)]+\)/, '$& // $fn=32 for smoother circles'),
          explanation: '$fn controls the number of fragments for circles',
          confidence: 0.6,
          priority: 'low',
          category: 'optimization',
          tags: ['$fn', 'circles', 'quality'],
          estimatedImpact: 'low',
          requiresReview: false,
          reasoning: 'Missing $fn parameter for circles'
        };
        
      default:
        return null;
    }
  }
  
  /**
   * Generate general suggestion
   */
  private generateGeneralSuggestion(request: SuggestionRequest): GeneratedSuggestion {
    return {
      type: 'optimization',
      title: 'Optimize geometry performance',
      description: 'Consider using more efficient geometry operations',
      code: '// Consider using hull() or minkowski() for complex shapes\n// Example: hull() { translate([-5,0,0]) circle(5); translate([5,0,0]) circle(5); }',
      explanation: 'General optimization suggestion for better performance',
      confidence: 0.5,
      priority: 'low',
      category: 'optimization',
      tags: ['performance', 'optimization'],
      estimatedImpact: 'low',
      requiresReview: true,
      reasoning: 'General optimization advice'
    };
  }
  
  /**
   * Determine suggestion type from pattern
   */
  private determineSuggestionType(pattern: string): SuggestionType {
    const typeMap: Record<string, SuggestionType> = {
      'missing-semicolon': 'bug_fix',
      'syntax-error': 'bug_fix',
      'hardcoded-values': 'refactor',
      'missing-fn': 'enhancement',
      'optimization-opportunity': 'optimization',
      'missing-documentation': 'documentation'
    };
    
    return typeMap[pattern] || 'enhancement';
  }
  
  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  
  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
    const defaultTemplates: Record<string, StubTemplate> = {
      'missing-semicolon': {
        title: 'Add missing semicolon',
        description: 'OpenSCAD statements require semicolons',
        code: 'cube(10);',
        explanation: 'Semicolons separate statements in OpenSCAD',
        confidence: 0.9,
        priority: 'high',
        category: 'syntax',
        tags: ['syntax', 'semicolon'],
        estimatedImpact: 'medium'
      },
      'hardcoded-values': {
        title: 'Use variables for dimensions',
        description: 'Extract hardcoded numbers to variables',
        code: 'width = 10;\ncube([width, 20, 30]);',
        explanation: 'Variables improve code readability and maintainability',
        confidence: 0.8,
        priority: 'medium',
        category: 'style',
        tags: ['variables', 'refactoring'],
        estimatedImpact: 'low'
      },
      'missing-fn': {
        title: 'Add $fn for circle resolution',
        description: 'Control circle smoothness with $fn parameter',
        code: 'circle(r=5, $fn=32);',
        explanation: '$fn controls the number of fragments in circles',
        confidence: 0.7,
        priority: 'low',
        category: 'quality',
        tags: ['$fn', 'circles', 'resolution'],
        estimatedImpact: 'low'
      }
    };
    
    Object.entries(defaultTemplates).forEach(([key, template]) => {
      this.templates.set(key, template);
    });
  }
  
  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `stub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
  
  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Simple approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const stubProvider = new StubAIProvider();