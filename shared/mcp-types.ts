// MCP (Model Context Protocol) types for moicad collaboration features
// Extends the base types.ts with collaboration-specific models

// Import base types
import type { Geometry, EvaluationError } from './types';

// =============================================================================
// CORE ENTITIES
// =============================================================================

/**
 * User information for collaboration
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  preferences: UserPreferences;
}

/**
 * User preferences and settings
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  editorFontSize: number;
  editorTabSize: number;
  autoSave: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;
  keyBinding: 'vscode' | 'sublime' | 'vim' | 'emacs';
  notifications: NotificationSettings;
}

/**
 * Notification preferences
 */
export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  mentions: boolean;
  projectUpdates: boolean;
  suggestionUpdates: boolean;
}

/**
 * Project for organizing OpenSCAD files
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  settings: ProjectSettings;
  files: ProjectFile[];
  collaborators: ProjectCollaborator[];
  tags: string[];
  thumbnail?: string;
}

/**
 * Project-level settings
 */
export interface ProjectSettings {
  autoSave: boolean;
  autoEvaluate: boolean;
  evaluationDebounceMs: number;
  enableAI: boolean;
  aiProvider: 'openai' | 'claude' | 'local';
  aiModel: string;
  maxHistorySize: number;
  allowAnonymousAccess: boolean;
  requireApprovalForJoin: boolean;
}

/**
 * File within a project
 */
export interface ProjectFile {
  id: string;
  name: string;
  content: string;
  language: 'openscad' | 'javascript' | 'markdown' | 'text';
  path: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  size: number;
  isBinary: boolean;
}

/**
 * Collaborator with role-based permissions
 */
export interface ProjectCollaborator {
  userId: string;
  user: User;
  role: 'owner' | 'editor' | 'viewer';
  permissions: Permission[];
  joinedAt: Date;
  invitedBy: string;
  lastActiveAt: Date;
}

/**
 * Individual permissions for fine-grained access control
 */
export interface Permission {
  action: 'read' | 'write' | 'delete' | 'share' | 'manage' | 'evaluate' | 'export';
  resource: 'project' | 'file' | 'session' | 'settings';
  granted: boolean;
}

/**
 * Active collaboration session
 */
export interface Session {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  hostId: string;
  participants: SessionParticipant[];
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
  settings: SessionSettings;
  currentFile?: string;
  sharedState: SharedSessionState;
}

/**
 * Session participant with cursor and selection state
 */
export interface SessionParticipant {
  userId: string;
  user: User;
  joinedAt: Date;
  isActive: boolean;
  cursor: CursorPosition;
  selection?: SelectionRange;
  viewport: ViewportState;
  permissionLevel: 'owner' | 'editor' | 'viewer';
  color: string; // User's color for cursors/selections
}

/**
 * Session-specific settings
 */
export interface SessionSettings {
  allowAnonymousViewers: boolean;
  requireHostApproval: boolean;
  maxParticipants: number;
  enableVoiceChat: boolean;
  enableTextChat: boolean;
  recordSession: boolean;
  autoSaveInterval: number;
}

/**
 * Shared session state
 */
export interface SharedSessionState {
  currentVersion: number;
  lastSyncAt: Date;
  pendingChanges: ChangeDelta[];
  evaluations: EvaluationHistory[];
  suggestions: Suggestion[];
  chatMessages: ChatMessage[];
}

/**
 * Cursor position in editor
 */
export interface CursorPosition {
  line: number;
  column: number;
  file: string;
}

/**
 * Selection range in editor
 */
export interface SelectionRange {
  start: CursorPosition;
  end: CursorPosition;
  file: string;
}

/**
 * 3D viewport state
 */
export interface ViewportState {
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraUp: [number, number, number];
  zoom: number;
  renderMode: 'solid' | 'wireframe' | 'transparent';
  showGrid: boolean;
  showAxes: boolean;
}

// =============================================================================
// CHANGES & VERSIONING
// =============================================================================

/**
 * Change delta for operational transformation
 */
export interface ChangeDelta {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: {
    line: number;
    column: number;
    file: string;
  };
  content?: string;
  length?: number;
  authorId: string;
  timestamp: Date;
  version: number;
  applied: boolean;
  conflicted: boolean;
  resolvedBy?: string;
}

/**
 * Version history entry
 */
export interface VersionEntry {
  id: string;
  version: number;
  authorId: string;
  timestamp: Date;
  description?: string;
  changes: ChangeDelta[];
  snapshot: ProjectSnapshot;
  tags: string[];
  parentId?: string;
}

/**
 * Project snapshot at a point in time
 */
export interface ProjectSnapshot {
  files: Record<string, string>; // filename -> content
  metadata: {
    totalFiles: number;
    totalSize: number;
    languageCounts: Record<string, number>;
  };
}

/**
 * Evaluation history for geometry generation
 */
export interface EvaluationHistory {
  id: string;
  code: string;
  timestamp: Date;
  authorId: string;
  result?: Geometry; // From base types.ts
  errors: EvaluationError[]; // From base types.ts
  executionTime: number;
  version: number;
  cached: boolean;
}

// =============================================================================
// AI SUGGESTIONS & ASSISTANCE
// =============================================================================

/**
 * AI-powered suggestion for code improvement
 */
export interface Suggestion {
  id: string;
  type: 'code' | 'optimization' | 'bug_fix' | 'enhancement' | 'style' | 'documentation';
  title: string;
  description: string;
  code: string;
  originalCode?: string;
  position: {
    line: number;
    column: number;
    file: string;
  };
  confidence: number; // 0-1
  priority: 'low' | 'medium' | 'high' | 'critical';
  author: string; // AI provider/model
  timestamp: Date;
  expiresAt?: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'applied' | 'expired';
  metadata: SuggestionMetadata;
  feedback?: SuggestionFeedback;
}

/**
 * Additional metadata for suggestions
 */
export interface SuggestionMetadata {
  category: string;
  tags: string[];
  references: string[];
  estimatedImpact: 'low' | 'medium' | 'high';
  requiresReview: boolean;
  compatibleVersion?: string;
  dependencies?: string[];
}

/**
 * User feedback on suggestions
 */
export interface SuggestionFeedback {
  userId: string;
  rating: number; // 1-5
  comment?: string;
  helpful: boolean;
  timestamp: Date;
}

/**
 * AI provider configuration
 */
export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'local' | 'custom';
  model: string;
  apiKey?: string;
  endpoint?: string;
  enabled: boolean;
  capabilities: string[];
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  config: Record<string, any>;
}

// =============================================================================
// COLLABORATION & COMMUNICATION
// =============================================================================

/**
 * Chat message in session
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  authorId: string;
  content: string;
  type: 'text' | 'code' | 'file' | 'system';
  timestamp: Date;
  editedAt?: Date;
  replyTo?: string;
  reactions: MessageReaction[];
  mentions: string[];
  attachments: MessageAttachment[];
}

/**
 * Reaction to message
 */
export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

/**
 * File attachment to message
 */
export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

/**
 * Invitation for collaboration
 */
export interface Invitation {
  id: string;
  projectId?: string;
  sessionId?: string;
  inviterId: string;
  inviteeEmail: string;
  inviteeId?: string;
  role: 'editor' | 'viewer';
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
}

// =============================================================================
// WEBSOCKET PROTOCOL MESSAGES
// =============================================================================

/**
 * Base WebSocket message structure
 */
export interface MCPMessage {
  id: string;
  type: MCPMessageType;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  payload: any;
}

/**
 * MCP WebSocket message types
 */
export type MCPMessageType = 
  // Session management
  | 'session_join'
  | 'session_leave'
  | 'session_create'
  | 'session_update'
  | 'session_list'
  | 'participant_join'
  | 'participant_leave'
  | 'participant_update'
  
  // Real-time editing
  | 'operation'
  | 'operation_ack'
  | 'operation_conflict'
  | 'cursor_update'
  | 'selection_update'
  | 'viewport_update'
  
  // Geometry & evaluation
  | 'evaluate_request'
  | 'evaluate_response'
  | 'evaluate_cancel'
  | 'geometry_update'
  | 'export_request'
  | 'export_response'
  
  // AI assistance
  | 'suggestion_request'
  | 'suggestion_response'
  | 'suggestion_apply'
  | 'suggestion_reject'
  
  // Communication
  | 'chat_message'
  | 'typing_indicator'
  | 'presence_update'
  
  // Project management
  | 'project_create'
  | 'project_update'
  | 'project_delete'
  | 'file_create'
  | 'file_update'
  | 'file_delete'
  | 'invitation_send'
  | 'invitation_accept'
  | 'invitation_reject'
  
  // Version control
  | 'version_create'
  | 'version_restore'
  | 'version_list'
  | 'version_response'
  
  // Presence and activity
  | 'presence_update'
  | 'typing_indicator'
  | 'activity_summary'
  
  // Conflict resolution
  | 'conflict_resolve'
  | 'conflict_request'
  | 'conflict_response'
  
  // Collaborative undo/redo
  | 'undo'
  | 'redo'
  | 'undo_redo_response'
  
  // Session recording
  | 'recording_start'
  | 'recording_stop'
  | 'recording_playback'
  | 'recording_data'
  | 'recording_state'
  
  // System
  | 'error'
  | 'ping'
  | 'pong'
  | 'authenticate';

// =============================================================================
// REST API REQUESTS & RESPONSES
// =============================================================================

/**
 * API response wrapper
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: {
    pagination?: PaginationMeta;
    requestId: string;
    timestamp: Date;
    version: string;
  };
}

/**
 * API error structure
 */
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Project creation request
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  isPublic: boolean;
  settings?: Partial<ProjectSettings>;
  tags?: string[];
}

/**
 * Session creation request
 */
export interface CreateSessionRequest {
  projectId: string;
  name: string;
  description?: string;
  settings?: Partial<SessionSettings>;
}

/**
 * Join session request
 */
export interface JoinSessionRequest {
  sessionId: string;
  password?: string;
  asAnonymous?: boolean;
}

// =============================================================================
// CONFIGURATION & SETTINGS
// =============================================================================

/**
 * Global MCP configuration
 */
export interface MCPConfig {
  server: {
    port: number;
    host: string;
    maxConnections: number;
    heartbeatInterval: number;
    sessionTimeout: number;
  };
  ai: {
    defaultProvider: string;
    maxSuggestionsPerSession: number;
    suggestionCacheTTL: number;
    enabledProviders: string[];
  };
  collaboration: {
    maxSessionParticipants: number;
    defaultSessionExpiry: number;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  performance: {
    operationBufferSize: number;
    conflictResolutionTimeout: number;
    geometryCacheSize: number;
    maxHistoryEntries: number;
  };
}

// =============================================================================
// EVENTS & NOTIFICATIONS
// =============================================================================

/**
 * System event for logging and monitoring
 */
export interface SystemEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  data: Record<string, any>;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
}

/**
 * Event types for system monitoring
 */
export type EventType = 
  | 'user_connected'
  | 'user_disconnected'
  | 'session_created'
  | 'session_ended'
  | 'operation_applied'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'suggestion_generated'
  | 'suggestion_applied'
  | 'evaluation_completed'
  | 'error_occurred'
  | 'invitation_sent'
  | 'permission_changed';

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Deep partial utility for nested updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * ID generator types
 */
export type ID = string;

/**
 * Timestamp utility
 */
export type Timestamp = Date | string | number;

/**
 * Optional fields utility
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;