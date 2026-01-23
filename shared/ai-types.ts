// AI-specific type definitions for moicad
// Extends MCP types with AI-specific interfaces

import type { Suggestion, SuggestionMetadata, SuggestionFeedback, AIProvider } from './mcp-types';

// Re-export for convenience
export type { Suggestion, SuggestionMetadata, SuggestionFeedback, AIProvider } from './mcp-types';

// =============================================================================
// CORE AI INTERFACES
// =============================================================================

/**
 * Base AI provider interface that all providers must implement
 */
export interface IAIProvider {
  /**
   * Provider identifier and metadata
   */
  readonly id: string;
  readonly name: string;
  readonly type: 'openai' | 'claude' | 'local' | 'stub' | 'custom';
  readonly model: string;
  readonly capabilities?: AICapability[];
  readonly isAvailable: boolean;
  
  /**
   * Initialize the provider with configuration
   */
  initialize(config: AIProviderConfig): Promise<void>;
  
  /**
   * Generate suggestions for OpenSCAD code
   */
  generateSuggestions(request: SuggestionRequest): Promise<SuggestionResponse>;
  
  /**
   * Validate a suggestion before applying
   */
  validateSuggestion(suggestion: Suggestion, context: ValidationContext): Promise<ValidationResult>;
  
  /**
   * Get provider health and status
   */
  healthCheck(): Promise<ProviderHealth>;
  
  /**
   * Clean shutdown of provider resources
   */
  dispose(): Promise<void>;
}

/**
 * AI capabilities for different providers
 */
export interface AICapability {
  name: string;
  description: string;
  supported: boolean;
  maxTokens?: number;
  costPerToken?: number;
}

/**
 * Configuration for AI providers
 */
export interface AIProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  temperature?: number; // 0-1, default 0.3
  maxTokens?: number; // default 1000
  timeout?: number; // default 30000ms
  retryAttempts?: number; // default 3
  customSettings?: Record<string, any>;
}

/**
 * Request for generating suggestions
 */
export interface SuggestionRequest {
  code: string;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  context: CodeContext;
  preferences: SuggestionPreferences;
  sessionId?: string;
  userId?: string;
}

/**
 * Response from suggestion generation
 */
export interface SuggestionResponse {
  suggestions: GeneratedSuggestion[];
  metadata: ResponseMetadata;
  provider: string;
  model: string;
  requestId: string;
  processingTime: number;
  tokensUsed?: TokenUsage;
}

/**
 * Generated suggestion before final processing
 */
export interface GeneratedSuggestion {
  type: SuggestionType;
  title: string;
  description: string;
  code: string;
  explanation: string;
  confidence: number; // 0-1
  priority: SuggestionPriority;
  category: string;
  tags: string[];
  estimatedImpact: ImpactLevel;
  requiresReview: boolean;
  position?: {
    line: number;
    column: number;
    length?: number;
  };
  reasoning?: string;
}

/**
 * Code context for suggestion generation
 */
export interface CodeContext {
  file: {
    name: string;
    path: string;
    language: string;
  };
  project?: {
    name: string;
    description?: string;
    tags: string[];
  };
  session?: {
    id: string;
    participants: number;
    activeUsers: string[];
  };
  history: {
    recentSuggestions: Suggestion[];
    recentChanges: string[];
    evaluationErrors: string[];
  };
  ast?: any; // Parsed AST of current code
}

/**
 * User preferences for suggestions
 */
export interface SuggestionPreferences {
  types: SuggestionType[];
  minConfidence: number;
  maxSuggestions: number;
  categories: string[];
  autoApply: boolean;
  requireReview: boolean;
  excludeExperimental: boolean;
  customRules: string[];
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  timestamp: Date;
  requestId: string;
  processingTime: number;
  cacheHit: boolean;
  providerVersion: string;
  warnings?: string[];
}

/**
 * Token usage information
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  cost?: number;
}

/**
 * Validation context for suggestions
 */
export interface ValidationContext {
  originalCode: string;
  suggestionCode: string;
  position?: {
    line: number;
    column: number;
  };
  permissions: {
    canModify: boolean;
    canCreateFiles: boolean;
    canExecute: boolean;
  };
  safetyLevel: SafetyLevel;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Validation result for suggestions
 */
export interface ValidationResult {
  valid: boolean;
  confidence: number; // 0-1
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  safeToApply: boolean;
  estimatedRisk: RiskLevel;
  requirements?: string[];
}

/**
 * Validation issue that blocks application
 */
export interface ValidationIssue {
  type: 'syntax' | 'security' | 'permission' | 'dependency' | 'compatibility';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  fix?: string;
}

/**
 * Validation warning that doesn't block application
 */
export interface ValidationWarning {
  type: 'performance' | 'style' | 'deprecation' | 'experimental';
  message: string;
  impact: string;
  suggestion?: string;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  healthy: boolean;
  responseTime: number;
  lastCheck: Date;
  errorRate: number;
  availableModels: string[];
  limits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    dailyQuota: number;
  };
}

// =============================================================================
// SUGGESTION TYPES & PRIORITIES
// =============================================================================

/**
 * Suggestion types supported by the AI system
 */
export type SuggestionType = 
  | 'code' // General code improvements
  | 'optimization' // Performance optimizations
  | 'bug_fix' // Bug detection and fixes
  | 'enhancement' // Feature additions
  | 'style' // Code style improvements
  | 'documentation' // Documentation generation
  | 'refactor' // Code refactoring
  | 'security' // Security improvements
  | 'completion' // Code completion
  | 'explanation'; // Code explanation

/**
 * Suggestion priority levels
 */
export type SuggestionPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

/**
 * Impact levels for suggestions
 */
export type ImpactLevel = 
  | 'low'
  | 'medium'
  | 'high';

/**
 * Safety levels for validation
 */
export type SafetyLevel = 
  | 'strict'
  | 'moderate'
  | 'permissive';

/**
 * Risk levels for suggestions
 */
export type RiskLevel = 
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

// =============================================================================
// AI MANAGER INTERFACES
// =============================================================================

/**
 * Main AI adapter manager interface
 */
export interface IAIManager {
  /**
   * Register an AI provider
   */
  registerProvider(provider: IAIProvider): Promise<void>;
  
  /**
   * Unregister an AI provider
   */
  unregisterProvider(providerId: string): Promise<void>;
  
  /**
   * Get available providers
   */
  getProviders(): IAIProvider[];
  
  /**
   * Get active/default provider
   */
  getActiveProvider(): IAIProvider | null;
  
  /**
   * Set active provider
   */
  setActiveProvider(providerId: string): Promise<void>;
  
  /**
   * Generate suggestions using active provider
   */
  generateSuggestions(request: SuggestionRequest): Promise<SuggestionResponse>;
  
  /**
   * Validate suggestion
   */
  validateSuggestion(suggestion: Suggestion, context: ValidationContext): Promise<ValidationResult>;
  
  /**
   * Get suggestion history
   */
  getSuggestionHistory(filters?: SuggestionFilters): Promise<SuggestionHistoryEntry[]>;
  
  /**
   * Track suggestion feedback
   */
  trackFeedback(suggestionId: string, feedback: SuggestionFeedback): Promise<void>;
  
  /**
   * Get analytics and metrics
   */
  getAnalytics(timeRange?: TimeRange): Promise<AIAnalytics>;
}

/**
 * Filters for suggestion history
 */
export interface SuggestionFilters {
  userId?: string;
  sessionId?: string;
  type?: SuggestionType;
  status?: string;
  provider?: string;
  minConfidence?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Entry in suggestion history
 */
export interface SuggestionHistoryEntry {
  suggestion: Suggestion;
  feedback?: SuggestionFeedback;
  outcome: 'applied' | 'rejected' | 'expired' | 'pending';
  appliedAt?: Date;
  processingTime: number;
  provider: string;
  context: CodeContext;
}

/**
 * Time range for analytics
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * AI system analytics
 */
export interface AIAnalytics {
  totalSuggestions: number;
  appliedSuggestions: number;
  rejectedSuggestions: number;
  averageConfidence: number;
  processingTime: {
    avg: number;
    min: number;
    max: number;
  };
  typeDistribution: Record<SuggestionType, number>;
  providerPerformance: Record<string, ProviderPerformance>;
  userSatisfaction: {
    averageRating: number;
    totalRatings: number;
    helpfulness: number;
  };
}

/**
 * Provider performance metrics
 */
export interface ProviderPerformance {
  suggestions: number;
  avgConfidence: number;
  avgProcessingTime: number;
  errorRate: number;
  userRating: number;
}

// =============================================================================
// STUB PROVIDER INTERFACES
// =============================================================================

/**
 * Configuration for the deterministic stub provider
 */
export interface StubProviderConfig extends AIProviderConfig {
  /**
   * Deterministic seed for reproducible suggestions
   */
  seed?: number;
  
  /**
   * Pre-defined response templates
   */
  templates?: Record<string, StubTemplate>;
  
  /**
   * Response delay in milliseconds (for testing)
   */
  responseDelay?: number;
  
  /**
   * Error rate simulation (0-1)
   */
  errorRate?: number;
  
  /**
   * Whether to always succeed
   */
  alwaysSucceed?: boolean;
}

/**
 * Template for stub responses
 */
export interface StubTemplate {
  title: string;
  description: string;
  code: string;
  explanation: string;
  confidence: number;
  priority: SuggestionPriority;
  category: string;
  tags: string[];
  estimatedImpact: ImpactLevel;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Provider registry entry
 */
export interface ProviderRegistryEntry {
  provider: IAIProvider;
  registeredAt: Date;
  lastUsed?: Date;
  usageCount: number;
  active: boolean;
}

/**
 * Suggestion cache entry
 */
export interface SuggestionCacheEntry {
  suggestion: Suggestion;
  request: SuggestionRequest;
  response: SuggestionResponse;
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
}

/**
 * Error types for AI operations
 */
export class AISuggestionError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AISuggestionError';
  }
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public operation: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AIValidationError extends Error {
  constructor(
    message: string,
    public validationIssues: ValidationIssue[],
    public suggestionId?: string
  ) {
    super(message);
    this.name = 'AIValidationError';
  }
}