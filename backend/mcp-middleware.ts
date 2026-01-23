/**
 * MCP Middleware for Authentication, Validation, and Session Management
 */

import type { 
  User, Session, Project, MCPMessage, 
  APIResponse, APIError, JoinSessionRequest 
} from '../shared/mcp-types';
import { mcpStore } from './mcp-store';

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

export interface AuthContext {
  user?: User;
  sessionId?: string;
  isAuthenticated: boolean;
  isAnonymous: boolean;
}

export interface WebSocketContext extends AuthContext {
  ws: any; // Bun WebSocket
  sessionId: string;
  lastPing: Date;
}

// Simple token-based authentication for MVP
class SimpleAuth {
  private tokens = new Map<string, { userId: string; expiresAt: Date }>();
  
  generateToken(userId: string, expiresInHours = 24): string {
    const token = this.generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    this.tokens.set(token, { userId, expiresAt });
    return token;
  }
  
  validateToken(token: string): { userId: string; valid: boolean } {
    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      return { userId: '', valid: false };
    }
    
    if (tokenData.expiresAt < new Date()) {
      this.tokens.delete(token);
      return { userId: '', valid: false };
    }
    
    return { userId: tokenData.userId, valid: true };
  }
  
  revokeToken(token: string): void {
    this.tokens.delete(token);
  }
  
  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  
  // Cleanup expired tokens
  cleanup(): void {
    const now = new Date();
    for (const [token, data] of this.tokens.entries()) {
      if (data.expiresAt < now) {
        this.tokens.delete(token);
      }
    }
  }
}

export const auth = new SimpleAuth();

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
}

export function validateLength(value: string, min: number, max: number, fieldName: string): void {
  if (value.length < min || value.length > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max} characters`,
      fieldName
    );
  }
}

export function validateProjectName(name: string): void {
  validateRequired(name, 'name');
  validateLength(name, 1, 100, 'name');
  
  // No special characters except spaces, hyphens, and underscores
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!nameRegex.test(name)) {
    throw new ValidationError('Project name can only contain letters, numbers, spaces, hyphens, and underscores', 'name');
  }
}

export function validateSessionName(name: string): void {
  validateRequired(name, 'name');
  validateLength(name, 1, 100, 'name');
}

export function validateOpenSCADCode(code: string): void {
  validateRequired(code, 'code');
  validateLength(code, 1, 100000, 'code'); // Max 100KB
  
  // Basic OpenSCAD syntax validation
  const disallowedChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  if (disallowedChars.test(code)) {
    throw new ValidationError('Code contains invalid characters', 'code');
  }
}

export function validateCursor(position: any): void {
  if (!position || typeof position.line !== 'number' || typeof position.column !== 'number') {
    throw new ValidationError('Invalid cursor position', 'cursor');
  }
  
  if (position.line < 0 || position.column < 0) {
    throw new ValidationError('Cursor position cannot be negative', 'cursor');
  }
}

export function validateViewport(viewport: any): void {
  if (!viewport || !Array.isArray(viewport.cameraPosition) || !Array.isArray(viewport.cameraTarget)) {
    throw new ValidationError('Invalid viewport state', 'viewport');
  }
  
  if (viewport.cameraPosition.length !== 3 || viewport.cameraTarget.length !== 3) {
    throw new ValidationError('Camera vectors must have 3 elements', 'viewport');
  }
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

export function createAuthMiddleware() {
  return async (req: Request): Promise<AuthContext> => {
    const authHeader = req.headers.get('authorization');
    const sessionId = req.headers.get('x-session-id');
    
    if (!authHeader) {
      return {
        isAuthenticated: false,
        isAnonymous: true,
        sessionId: sessionId || undefined,
      };
    }
    
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      return {
        isAuthenticated: false,
        isAnonymous: true,
        sessionId: sessionId || undefined,
      };
    }
    
    const token = tokenMatch[1];
    const tokenValidation = auth.validateToken(token);
    
    if (!tokenValidation.valid) {
      return {
        isAuthenticated: false,
        isAnonymous: true,
        sessionId: sessionId || undefined,
      };
    }
    
    const user = mcpStore.users.get(tokenValidation.userId);
    if (!user) {
      return {
        isAuthenticated: false,
        isAnonymous: true,
        sessionId: sessionId || undefined,
      };
    }
    
    return {
      user,
      isAuthenticated: true,
      isAnonymous: false,
      sessionId: sessionId || undefined,
    };
  };
}

// =============================================================================
// PERMISSION CHECKS
// =============================================================================

export function checkProjectPermission(
  user: User,
  project: Project,
  requiredAction: 'read' | 'write' | 'delete' | 'share' | 'manage'
): boolean {
  // Owner has all permissions
  if (project.ownerId === user.id) {
    return true;
  }
  
  // Check collaborator permissions
  const collaborator = project.collaborators.find(c => c.userId === user.id);
  if (!collaborator) {
    // Check if project is public and only read access is required
    return project.isPublic && requiredAction === 'read';
  }
  
  const permission = collaborator.permissions.find(p => p.action === requiredAction && p.resource === 'project');
  return permission?.granted || false;
}

export function checkSessionPermission(
  user: User,
  session: Session,
  requiredLevel: 'owner' | 'editor' | 'viewer'
): boolean {
  // Host has owner permissions
  if (session.hostId === user.id) {
    return true;
  }
  
  const participant = session.participants.find(p => p.userId === user.id);
  if (!participant) {
    return false;
  }
  
  const levels = { viewer: 0, editor: 1, owner: 2 };
  const userLevel = levels[participant.permissionLevel];
  const requiredLevelNum = levels[requiredLevel];
  
  return userLevel >= requiredLevelNum;
}

// =============================================================================
// API RESPONSE HELPERS
// =============================================================================

export function createSuccessResponse<T>(data: T, meta?: any): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: mcpStore.generateId(),
      timestamp: new Date(),
      version: '1.0.0',
      ...meta,
    },
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, any>,
  status = 400
): { response: APIResponse; status: number } {
  return {
    response: {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        requestId: mcpStore.generateId(),
        timestamp: new Date(),
        version: '1.0.0',
      },
    },
    status,
  };
}

export function handleValidationError(error: ValidationError): { response: APIResponse; status: number } {
  return createErrorResponse(error.code, error.message, { field: error.field }, 400);
}

export function handleAuthError(): { response: APIResponse; status: number } {
  return createErrorResponse('AUTH_REQUIRED', 'Authentication required', {}, 401);
}

export function handlePermissionError(): { response: APIResponse; status: number } {
  return createErrorResponse('PERMISSION_DENIED', 'Insufficient permissions', {}, 403);
}

export function handleNotFoundError(resource: string): { response: APIResponse; status: number } {
  return createErrorResponse('NOT_FOUND', `${resource} not found`, {}, 404);
}

// =============================================================================
// WEBSOCKET MIDDLEWARE
// =============================================================================

export class WebSocketManager {
  private connections = new Map<string, WebSocketContext>();
  private sessionConnections = new Map<string, Set<string>>(); // sessionId -> connectionIds
  
  addConnection(connectionId: string, ws: any, authContext: AuthContext): void {
    this.connections.set(connectionId, {
      ...authContext,
      ws,
      sessionId: authContext.sessionId || mcpStore.generateId(),
      lastPing: new Date(),
    });
    
    if (authContext.sessionId) {
      if (!this.sessionConnections.has(authContext.sessionId)) {
        this.sessionConnections.set(authContext.sessionId, new Set());
      }
      this.sessionConnections.get(authContext.sessionId)!.add(connectionId);
    }
  }
  
  removeConnection(connectionId: string): void {
    const context = this.connections.get(connectionId);
    if (context && context.sessionId) {
      const sessionConns = this.sessionConnections.get(context.sessionId);
      if (sessionConns) {
        sessionConns.delete(connectionId);
        if (sessionConns.size === 0) {
          this.sessionConnections.delete(context.sessionId);
        }
      }
    }
    
    this.connections.delete(connectionId);
  }
  
  getConnection(connectionId: string): WebSocketContext | undefined {
    return this.connections.get(connectionId);
  }
  
  getConnectionsBySession(sessionId: string): WebSocketContext[] {
    const connectionIds = this.sessionConnections.get(sessionId);
    if (!connectionIds) return [];
    
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter(conn => conn !== undefined) as WebSocketContext[];
  }
  
  broadcastToSession(sessionId: string, message: MCPMessage, excludeConnectionId?: string): void {
    const connections = this.getConnectionsBySession(sessionId);
    
    connections.forEach(context => {
      if (context.sessionId !== excludeConnectionId) {
        try {
          context.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send message to connection:', error);
        }
      }
    });
  }
  
  sendToConnection(connectionId: string, message: MCPMessage): void {
    const context = this.connections.get(connectionId);
    if (context) {
      try {
        context.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message to connection:', error);
      }
    }
  }
  
  updateLastPing(connectionId: string): void {
    const context = this.connections.get(connectionId);
    if (context) {
      context.lastPing = new Date();
    }
  }
  
  // Cleanup inactive connections
  cleanupInactive(timeoutMs = 5 * 60 * 1000): void { // 5 minutes
    const now = new Date();
    const toRemove: string[] = [];
    
    for (const [id, context] of this.connections.entries()) {
      if (now.getTime() - context.lastPing.getTime() > timeoutMs) {
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(id => this.removeConnection(id));
    
    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} inactive WebSocket connections`);
    }
  }
  
  getStats(): { totalConnections: number; totalSessions: number } {
    return {
      totalConnections: this.connections.size,
      totalSessions: this.sessionConnections.size,
    };
  }
}

export const wsManager = new WebSocketManager();

// =============================================================================
// RATE LIMITING
// =============================================================================

export class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  
  isAllowed(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = identifier;
    
    let rateData = this.requests.get(key);
    
    if (!rateData || now > rateData.resetTime) {
      rateData = { count: 0, resetTime: now + windowMs };
      this.requests.set(key, rateData);
    }
    
    rateData.count++;
    
    return {
      allowed: rateData.count <= maxRequests,
      remaining: Math.max(0, maxRequests - rateData.count),
      resetTime: rateData.resetTime,
    };
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

export function createSessionMiddleware() {
  return async (req: Request, authContext: AuthContext): Promise<AuthContext & { activeSession?: Session }> => {
    const sessionId = req.headers.get('x-session-id');
    
    if (!sessionId || !authContext.isAuthenticated) {
      return authContext;
    }
    
    const session = mcpStore.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return authContext;
    }
    
    // Check if user has permission to access this session
    if (!checkSessionPermission(authContext.user!, session, 'viewer')) {
      return authContext;
    }
    
    return {
      ...authContext,
      activeSession: session,
    };
  };
}