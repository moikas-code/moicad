/**
 * MCP AI Adapter Manager
 * Main interface for pluggable AI provider system
 */

import type {
  IAIManager,
  IAIProvider,
  SuggestionRequest,
  SuggestionResponse,
  Suggestion,
  SuggestionFilters,
  SuggestionHistoryEntry,
  SuggestionFeedback,
  ValidationResult,
  TimeRange,
  AIAnalytics,
  ProviderRegistryEntry,
  SuggestionCacheEntry,
  ValidationContext as SuggestionValidationContext
} from '../shared/ai-types';

import {
  AISuggestionError,
  AIProviderError,
  AIValidationError
} from '../shared/ai-types';

import type { MCPMessage } from '../shared/mcp-types';
import { mcpStore } from './mcp-store';
import { suggestionEngine } from './mcp-suggestion-engine';

// =============================================================================
// MAIN AI MANAGER CLASS
// =============================================================================

/**
 * Central manager for AI suggestion providers and operations
 */
export class MCPAIManager implements IAIManager {
  private providers = new Map<string, ProviderRegistryEntry>();
  private activeProviderId: string | null = null;
  private cache = new Map<string, SuggestionCacheEntry>();
  private analytics = new Map<string, any>();
  
  constructor() {
    this.initializeDefaultProviders();
  }
  
  // =============================================================================
  // PROVIDER MANAGEMENT
  // =============================================================================
  
  /**
   * Register an AI provider
   */
  async registerProvider(provider: IAIProvider): Promise<void> {
    try {
      // Check if provider already exists
      if (this.providers.has(provider.id)) {
        throw new Error(`Provider ${provider.id} is already registered`);
      }
      
      // Initialize the provider
      await provider.initialize({});
      
      // Add to registry
      const entry: ProviderRegistryEntry = {
        provider,
        registeredAt: new Date(),
        usageCount: 0,
        active: true
      };
      
      this.providers.set(provider.id, entry);
      
      // Set as active if it's the first one
      if (this.activeProviderId === null) {
        this.activeProviderId = provider.id;
      }
      
      console.log(`AI provider registered: ${provider.name} (${provider.id})`);
    } catch (error: any) {
      throw new AIProviderError(
        `Failed to register provider ${provider.id}: ${error.message}`,
        provider.id,
        'register',
        error
      );
    }
  }
  
  /**
   * Unregister an AI provider
   */
  async unregisterProvider(providerId: string): Promise<void> {
    try {
      const entry = this.providers.get(providerId);
      if (!entry) {
        throw new Error(`Provider ${providerId} not found`);
      }
      
      // Clean up provider resources
      await entry.provider.dispose();
      
      // Remove from registry
      this.providers.delete(providerId);
      
      // Update active provider if necessary
      if (this.activeProviderId === providerId) {
        this.activeProviderId = this.providers.size > 0 ? 
          (Array.from(this.providers.keys())[0] ?? null) : null;
      }
      
      console.log(`AI provider unregistered: ${providerId}`);
    } catch (error: any) {
      throw new AIProviderError(
        `Failed to unregister provider ${providerId}: ${error.message}`,
        providerId,
        'unregister',
        error
      );
    }
  }
  
  /**
   * Get available providers
   */
  getProviders(): IAIProvider[] {
    return Array.from(this.providers.values())
      .filter(entry => entry.active)
      .map(entry => entry.provider);
  }
  
  /**
   * Get active/default provider
   */
  getActiveProvider(): IAIProvider | null {
    if (!this.activeProviderId) {
      return null;
    }
    
    const entry = this.providers.get(this.activeProviderId);
    return entry?.provider || null;
  }
  
  /**
   * Set active provider
   */
  async setActiveProvider(providerId: string): Promise<void> {
    const entry = this.providers.get(providerId);
    if (!entry) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    if (!entry.active) {
      throw new Error(`Provider ${providerId} is not active`);
    }
    
    this.activeProviderId = providerId;
    console.log(`Active AI provider set to: ${entry.provider.name} (${providerId})`);
  }
  
  // =============================================================================
  // SUGGESTION GENERATION
  // =============================================================================
  
  /**
   * Generate suggestions using active provider
   */
  async generateSuggestions(request: SuggestionRequest): Promise<SuggestionResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > new Date()) {
        cached.hitCount++;
        console.log(`Cache hit for request ${requestId}`);
        return {
          ...cached.response,
          requestId,
          metadata: {
            ...cached.response.metadata,
            cacheHit: true,
            timestamp: new Date()
          }
        };
      }
      
      // Get active provider
      const provider = this.getActiveProvider();
      if (!provider) {
        throw new Error('No active AI provider available');
      }
      
      // Generate suggestions
      const response = await provider.generateSuggestions(request);
      
      // Convert to final suggestions
      console.log('Raw suggestions from provider:', response.suggestions.length);
      console.log('Raw suggestions:', response.suggestions);
      
      const suggestions = await suggestionEngine.processSuggestions(
        response.suggestions,
        request
      );
      
      console.log('Processed suggestions:', suggestions.length);
      
      // Update usage statistics
      const entry = this.providers.get(provider.id);
      if (entry) {
        entry.usageCount++;
        entry.lastUsed = new Date();
      }
      
      // Cache the response
      const cacheEntry: SuggestionCacheEntry = {
        suggestion: suggestions[0], // Store first suggestion as primary
        request,
        response: {
          ...response,
          suggestions,
          requestId,
          processingTime: Date.now() - startTime
        },
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 300000), // 5 minutes
        hitCount: 0
      };
      
      this.cache.set(cacheKey, cacheEntry);
      
      console.log(`Generated ${suggestions.length} suggestions in ${Date.now() - startTime}ms`);
      
      return {
        ...response,
        suggestions,
        requestId,
        processingTime: Date.now() - startTime
      };
    } catch (error: any) {
      throw new AISuggestionError(
        `Failed to generate suggestions: ${error.message}`,
        this.activeProviderId || 'unknown',
        'generation_failed',
        error
      );
    }
  }
  
  /**
   * Validate suggestion
   */
  async validateSuggestion(
    suggestion: Suggestion, 
    context: SuggestionValidationContext
  ): Promise<ValidationResult> {
    try {
      const provider = this.getActiveProvider();
      if (!provider) {
        throw new Error('No active AI provider available');
      }
      
      // Use provider validation first
      const providerResult = await provider.validateSuggestion(suggestion, context);
      
      // Add engine-level validation
      const engineResult = await suggestionEngine.validateSuggestion(suggestion, context);
      
      // Combine results
      return {
        valid: providerResult.valid && engineResult.valid,
        confidence: (providerResult.confidence + engineResult.confidence) / 2,
        issues: [...providerResult.issues, ...engineResult.issues],
        warnings: [...providerResult.warnings, ...engineResult.warnings],
        safeToApply: providerResult.safeToApply && engineResult.safeToApply,
        estimatedRisk: this.calculateRiskLevel(
          providerResult.estimatedRisk,
          engineResult.estimatedRisk
        ),
        requirements: [
          ...(providerResult.requirements || []),
          ...(engineResult.requirements || [])
        ]
      };
    } catch (error: any) {
      throw new AIValidationError(
        `Failed to validate suggestion: ${error.message}`,
        [],
        suggestion.id
      );
    }
  }
  
  // =============================================================================
  // HISTORY & ANALYTICS
  // =============================================================================
  
  /**
   * Get suggestion history
   */
  async getSuggestionHistory(filters?: SuggestionFilters): Promise<SuggestionHistoryEntry[]> {
    try {
      // Get history from store with filters
      const history = mcpStore.suggestions.getAll();
      
      let filtered = history;
      
      if (filters) {
        if (filters.userId) {
          filtered = filtered.filter(s => s.author === filters.userId);
        }
        if (filters.sessionId) {
          filtered = filtered.filter(s => s.sessionId === filters.sessionId);
        }
        if (filters.type) {
          filtered = filtered.filter(s => s.type === filters.type);
        }
        if (filters.status) {
          filtered = filtered.filter(s => s.status === filters.status);
        }
        if (filters.provider) {
          filtered = filtered.filter(s => s.author === filters.provider);
        }
        if (filters.minConfidence !== undefined) {
          filtered = filtered.filter(s => s.confidence >= filters.minConfidence!);
        }
        if (filters.dateRange) {
          filtered = filtered.filter(s => {
            const date = new Date(s.timestamp);
            return date >= filters.dateRange!.start && date <= filters.dateRange!.end;
          });
        }
      }
      
      // Convert to history entries
      return filtered.map(suggestion => ({
        suggestion,
        feedback: suggestion.feedback,
        outcome: suggestion.status as any,
        appliedAt: suggestion.status === 'applied' ? new Date(suggestion.timestamp) : undefined,
        processingTime: 0, // Not tracked in current store
        provider: suggestion.author,
        context: {} as any // Not tracked in current store
      }));
    } catch (error: any) {
      throw new Error(`Failed to get suggestion history: ${error.message}`);
    }
  }
  
  /**
   * Track suggestion feedback
   */
  async trackFeedback(suggestionId: string, feedback: SuggestionFeedback): Promise<void> {
    try {
      const suggestion = mcpStore.suggestions.get(suggestionId);
      if (!suggestion) {
        throw new Error(`Suggestion ${suggestionId} not found`);
      }
      
      // Update suggestion with feedback
      suggestion.feedback = feedback;
      mcpStore.suggestions.set(suggestionId, suggestion);
      
      // Update provider analytics
      const entry = this.providers.get(suggestion.author);
      if (entry) {
        // Update performance metrics
        const performance = this.analytics.get(`perf_${suggestion.author}`) || {
          totalRatings: 0,
          totalScore: 0,
          helpfulCount: 0
        };
        
        performance.totalRatings++;
        performance.totalScore += feedback.rating;
        if (feedback.helpful) {
          performance.helpfulCount++;
        }
        
        this.analytics.set(`perf_${suggestion.author}`, performance);
      }
      
      console.log(`Tracked feedback for suggestion ${suggestionId}: ${feedback.rating}/5`);
    } catch (error: any) {
      throw new Error(`Failed to track feedback: ${error.message}`);
    }
  }
  
  /**
   * Get analytics and metrics
   */
  async getAnalytics(timeRange?: TimeRange): Promise<AIAnalytics> {
    try {
      const allSuggestions = mcpStore.suggestions.getAll();
      let filtered = allSuggestions;
      
      if (timeRange) {
        filtered = allSuggestions.filter(s => {
          const date = new Date(s.timestamp);
          return date >= timeRange.start && date <= timeRange.end;
        });
      }
      
      const totalSuggestions = filtered.length;
      const appliedSuggestions = filtered.filter(s => s.status === 'applied').length;
      const rejectedSuggestions = filtered.filter(s => s.status === 'rejected').length;
      
      const confidenceSum = filtered.reduce((sum, s) => sum + s.confidence, 0);
      const averageConfidence = totalSuggestions > 0 ? confidenceSum / totalSuggestions : 0;
      
      // Type distribution
      const typeDistribution: Record<string, number> = {};
      filtered.forEach(s => {
        typeDistribution[s.type] = (typeDistribution[s.type] || 0) + 1;
      });
      
      // Provider performance
      const providerPerformance: Record<string, any> = {};
      this.providers.forEach((entry, id) => {
        const perf = this.analytics.get(`perf_${id}`) || {
          totalRatings: 0,
          totalScore: 0,
          helpfulCount: 0
        };
        
        providerPerformance[id] = {
          suggestions: entry.usageCount,
          avgConfidence: 0, // Not calculated
          avgProcessingTime: 0, // Not tracked
          errorRate: 0, // Not tracked
          userRating: perf.totalRatings > 0 ? perf.totalScore / perf.totalRatings : 0
        };
      });
      
      // User satisfaction
      const allFeedback = filtered
        .filter(s => s.feedback)
        .map(s => s.feedback!);
      
      const totalRatings = allFeedback.length;
      const satisfactionSum = allFeedback.reduce((sum, f) => sum + f.rating, 0);
      const helpfulCount = allFeedback.filter(f => f.helpful).length;
      
      return {
        totalSuggestions,
        appliedSuggestions,
        rejectedSuggestions,
        averageConfidence,
        processingTime: {
          avg: 0,
          min: 0,
          max: 0
        },
        typeDistribution: typeDistribution as any,
        providerPerformance,
        userSatisfaction: {
          averageRating: totalRatings > 0 ? satisfactionSum / totalRatings : 0,
          totalRatings,
          helpfulness: totalRatings > 0 ? helpfulCount / totalRatings : 0
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }
  
  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  
  /**
   * Initialize default providers
   */
  private async initializeDefaultProviders(): Promise<void> {
    try {
      // Import and register stub provider
      const { stubProvider } = await import('./mcp-stub-ai');
      await this.registerProvider(stubProvider);
      
      console.log('Default AI providers initialized');
    } catch (error: any) {
      console.error('Failed to initialize default providers:', error);
    }
  }
  
  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: SuggestionRequest): string {
    const key = `${request.code}_${request.cursor?.line}_${request.cursor?.column}_${request.preferences.types.join(',')}`;
    return btoa(key).substr(0, 32);
  }
  
  /**
   * Calculate combined risk level
   */
  private calculateRiskLevel(risk1: string, risk2: string): any {
    const levels = ['minimal', 'low', 'medium', 'high', 'critical'];
    const index1 = levels.indexOf(risk1);
    const index2 = levels.indexOf(risk2);
    return levels[Math.max(index1, index2)] as any;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const aiManager = new MCPAIManager();

// =============================================================================
// INTEGRATION HELPERS
// =============================================================================

/**
 * Handle AI-related WebSocket messages
 */
export async function handleAIWebSocketMessage(
  message: MCPMessage,
  connectionId: string
): Promise<MCPMessage | void> {
  switch (message.type) {
    case 'suggestion_request':
      return await handleSuggestionRequest(message, connectionId);
    
    case 'suggestion_apply':
      return await handleSuggestionApply(message, connectionId);
    
    case 'suggestion_reject':
      return await handleSuggestionReject(message, connectionId);
    
    default:
      return undefined;
  }
}

/**
 * Handle suggestion request
 */
async function handleSuggestionRequest(
  message: MCPMessage,
  connectionId: string
): Promise<MCPMessage> {
  try {
    const { request } = message.payload;
    
    // Generate suggestions
    const response = await aiManager.generateSuggestions(request);
    
    // Store suggestions in session
    if (message.sessionId) {
      const session = mcpStore.sessions.get(message.sessionId);
      if (session) {
        session.sharedState.suggestions.push(...response.suggestions as any);
        mcpStore.sessions.set(message.sessionId, session);
      }
    }
    
    return {
      id: message.id,
      type: 'suggestion_response',
      timestamp: new Date(),
      sessionId: message.sessionId,
      payload: {
        suggestions: response.suggestions,
        metadata: response.metadata,
        provider: response.provider,
        requestId: response.requestId,
        processingTime: response.processingTime
      }
    };
  } catch (error: any) {
    return {
      id: message.id,
      type: 'error',
      timestamp: new Date(),
      sessionId: message.sessionId,
      payload: {
        error: error.message,
        code: error.code || 'suggestion_failed'
      }
    };
  }
}

/**
 * Handle suggestion apply
 */
async function handleSuggestionApply(
  message: MCPMessage,
  connectionId: string
): Promise<MCPMessage> {
  try {
    const { suggestionId } = message.payload;
    
    const suggestion = mcpStore.suggestions.get(suggestionId);
    if (!suggestion) {
      throw new Error(`Suggestion ${suggestionId} not found`);
    }
    
    // Update status
    suggestion.status = 'applied';
    mcpStore.suggestions.set(suggestionId, suggestion);
    
    return {
      id: message.id,
      type: 'suggestion_apply',
      timestamp: new Date(),
      sessionId: message.sessionId,
      payload: {
        success: true,
        suggestionId
      }
    };
  } catch (error: any) {
    return {
      id: message.id,
      type: 'error',
      timestamp: new Date(),
      sessionId: message.sessionId,
      payload: {
        error: error.message,
        code: 'apply_failed'
      }
    };
  }
}

/**
 * Handle suggestion reject
 */
async function handleSuggestionReject(
  message: MCPMessage,
  connectionId: string
): Promise<MCPMessage> {
  try {
    const { suggestionId, feedback } = message.payload;
    
    const suggestion = mcpStore.suggestions.get(suggestionId);
    if (!suggestion) {
      throw new Error(`Suggestion ${suggestionId} not found`);
    }
    
    // Update status and feedback
    suggestion.status = 'rejected';
    if (feedback) {
      suggestion.feedback = feedback;
      await aiManager.trackFeedback(suggestionId, feedback);
    }
    
    mcpStore.suggestions.set(suggestionId, suggestion);
    
    return {
      id: message.id,
      type: 'suggestion_reject',
      timestamp: new Date(),
      sessionId: message.sessionId,
      payload: {
        success: true,
        suggestionId
      }
    };
  } catch (error: any) {
    return {
      id: message.id,
      type: 'error',
      timestamp: new Date(),
      sessionId: message.sessionId,
      payload: {
        error: error.message,
        code: 'reject_failed'
      }
    };
  }
}