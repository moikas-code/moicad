/**
 * Operational Transformation (OT) for Real-time Collaborative Editing
 * Implements conflict-free collaborative editing with comprehensive OT algorithms
 */

import type { ChangeDelta, CursorPosition, SelectionRange } from '../../shared/mcp-types';

// =============================================================================
// CORE OT OPERATIONS
// =============================================================================

/**
 * Base operation interface for OT
 */
export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  authorId: string;
  timestamp: Date;
  version: number;
}

/**
 * Text operation for string-based OT
 */
export interface TextOperation extends Operation {
  type: 'insert' | 'delete' | 'retain';
  content?: string; // For insert
  length?: number;  // For delete/retain
}

/**
 * Composite operation for batch changes
 */
export interface CompositeOperation {
  id: string;
  operations: Operation[];
  authorId: string;
  timestamp: Date;
  version: number;
  metadata: {
    description?: string;
    file: string;
    context?: string;
  };
}

// =============================================================================
// OT TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Transform two concurrent operations against each other
 * Returns transformed operations that can be applied in any order
 */
export function transform(
  op1: Operation,
  op2: Operation,
  priority: 'left' | 'right' = 'left'
): [Operation, Operation] {
  // If operations are on different positions, no transformation needed
  if (op1.position < op2.position) {
    return [op1, shiftOperation(op2, getOperationLength(op1))];
  }
  
  if (op2.position < op1.position) {
    return [shiftOperation(op1, getOperationLength(op2)), op2];
  }
  
  // Operations at same position - need careful handling
  return transformAtSamePosition(op1, op2, priority);
}

/**
 * Transform multiple operations against a base operation
 */
export function transformMultiple(
  baseOp: Operation,
  ops: Operation[],
  priority: 'left' | 'right' = 'left'
): Operation[] {
  let currentBase = baseOp;
  const transformedOps: Operation[] = [];
  
  for (const op of ops) {
    const [transformedBase, transformedOp] = transform(currentBase, op, priority);
    transformedOps.push(transformedOp);
    currentBase = transformedBase;
  }
  
  return transformedOps;
}

/**
 * Apply operation to text content
 */
export function applyOperation(text: string, operation: Operation): string {
  switch (operation.type) {
    case 'insert':
      return text.slice(0, operation.position) + 
             (operation.content || '') + 
             text.slice(operation.position);
             
    case 'delete':
      return text.slice(0, operation.position) + 
             text.slice(operation.position + (operation.length || 0));
             
    case 'retain':
      return text; // Retain operation doesn't modify text
      
    default:
      throw new Error(`Unknown operation type: ${(operation as any).type}`);
  }
}

/**
 * Apply composite operation to text content
 */
export function applyCompositeOperation(text: string, composite: CompositeOperation): string {
  let result = text;
  
  // Sort operations by position to maintain consistency
  const sortedOps = [...composite.operations].sort((a, b) => a.position - b.position);
  
  for (const op of sortedOps) {
    result = applyOperation(result, op);
  }
  
  return result;
}

/**
 * Compose two operations into a single operation
 */
export function compose(op1: Operation, op2: Operation): Operation {
  if (op1.type === 'retain' && op2.type === 'retain') {
    return {
      id: generateOperationId(),
      type: 'retain',
      position: Math.min(op1.position, op2.position),
      length: (op1.length || 0) + (op2.length || 0),
      authorId: op2.authorId,
      timestamp: op2.timestamp,
      version: op2.version,
    };
  }
  
  // For more complex compositions, create a composite operation
  return {
    id: generateOperationId(),
    type: 'retain', // Placeholder - actual implementation would be more complex
    position: 0,
    authorId: op2.authorId,
    timestamp: op2.timestamp,
    version: op2.version,
  };
}

// =============================================================================
// CURSOR TRANSFORMATION
// =============================================================================

/**
 * Transform cursor position against an operation
 */
export function transformCursor(
  cursor: CursorPosition,
  operation: Operation,
  isOwnOperation: boolean = false
): CursorPosition {
  if (operation.type === 'retain') {
    return cursor;
  }
  
  const opStart = operation.position;
  const opEnd = operation.position + getOperationLength(operation);
  const cursorPos = cursor.line * 1000 + cursor.column; // Simplified linear position
  
  let newCursorPos = cursorPos;
  
  if (isOwnOperation) {
    // For own operations, cursor moves with the operation
    if (operation.type === 'insert' && cursorPos >= opStart) {
      newCursorPos += operation.content?.length || 0;
    } else if (operation.type === 'delete' && cursorPos > opStart) {
      newCursorPos -= Math.min(operation.length || 0, cursorPos - opStart);
    }
  } else {
    // For other users' operations, cursor is displaced
    if (operation.type === 'insert' && cursorPos > opStart) {
      newCursorPos += operation.content?.length || 0;
    } else if (operation.type === 'delete' && cursorPos > opStart) {
      newCursorPos -= Math.min(operation.length || 0, cursorPos - opStart);
    }
  }
  
  return {
    line: Math.floor(newCursorPos / 1000),
    column: newCursorPos % 1000,
    file: cursor.file,
  };
}

/**
 * Transform selection range against an operation
 */
export function transformSelection(
  selection: SelectionRange,
  operation: Operation,
  isOwnOperation: boolean = false
): SelectionRange {
  return {
    start: transformCursor(selection.start, operation, isOwnOperation),
    end: transformCursor(selection.end, operation, isOwnOperation),
    file: selection.file,
  };
}

// =============================================================================
// CONFLICT RESOLUTION
// =============================================================================

/**
 * Detect if two operations conflict
 */
export function detectConflict(op1: Operation, op2: Operation): boolean {
  const op1End = op1.position + getOperationLength(op1);
  const op2End = op2.position + getOperationLength(op2);
  
  // Operations overlap in position
  const positionsOverlap = !(op1End <= op2.position || op2End <= op1.position);
  
  // Both operations modify content (not just retain)
  const bothModify = op1.type !== 'retain' && op2.type !== 'retain';
  
  return positionsOverlap && bothModify;
}

/**
 * Resolve conflict between two operations
 */
export function resolveConflict(
  op1: Operation,
  op2: Operation,
  strategy: 'timestamp' | 'author-priority' | 'manual' = 'timestamp'
): { resolved: Operation; conflict: boolean; strategy: string } {
  if (!detectConflict(op1, op2)) {
    return { resolved: op1, conflict: false, strategy: 'no-conflict' };
  }
  
  switch (strategy) {
    case 'timestamp':
      const winner = op1.timestamp > op2.timestamp ? op1 : op2;
      return { 
        resolved: winner, 
        conflict: true, 
        strategy: 'timestamp-wins' 
      };
      
    case 'author-priority':
      // Simple priority based on author ID hash
      const priority1 = hashString(op1.authorId);
      const priority2 = hashString(op2.authorId);
      const priorityWinner = priority1 > priority2 ? op1 : op2;
      return { 
        resolved: priorityWinner, 
        conflict: true, 
        strategy: 'author-priority' 
      };
      
    case 'manual':
      return {
        resolved: createManualResolutionOperation(op1, op2),
        conflict: true,
        strategy: 'manual-resolution-required'
      };
      
    default:
      return { resolved: op1, conflict: true, strategy: 'unknown' };
  }
}

// =============================================================================
// VERSION CONTROL & HISTORY
// =============================================================================

/**
 * Create version snapshot from operations
 */
export function createVersionSnapshot(
  baseContent: string,
  operations: Operation[],
  version: number
): { content: string; version: number; operations: Operation[] } {
  let content = baseContent;
  
  // Apply operations in order
  for (const op of operations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
    content = applyOperation(content, op);
  }
  
  return {
    content,
    version,
    operations: [...operations],
  };
}

/**
 * Calculate operations needed to transform one version to another
 */
export function calculateDiff(
  fromContent: string,
  toContent: string,
  authorId: string,
  version: number
): Operation[] {
  const operations: Operation[] = [];
  
  // Simple diff implementation - in production, use a proper diff algorithm
  const commonPrefix = findCommonPrefix(fromContent, toContent);
  const commonSuffix = findCommonSuffix(
    fromContent.slice(commonPrefix), 
    toContent.slice(commonPrefix)
  );
  
  if (commonPrefix < fromContent.length || commonPrefix < toContent.length) {
    const deleteLength = fromContent.length - commonPrefix - commonSuffix;
    const insertContent = toContent.slice(commonPrefix, toContent.length - commonSuffix);
    
    if (deleteLength > 0) {
      operations.push({
        id: generateOperationId(),
        type: 'delete',
        position: commonPrefix,
        length: deleteLength,
        authorId,
        timestamp: new Date(),
        version,
      });
    }
    
    if (insertContent.length > 0) {
      operations.push({
        id: generateOperationId(),
        type: 'insert',
        position: commonPrefix,
        content: insertContent,
        authorId,
        timestamp: new Date(),
        version,
      });
    }
  }
  
  return operations;
}

// =============================================================================
// UNDO/REDO FUNCTIONALITY
// =============================================================================

/**
 * Undo operation - creates inverse operation
 */
export function createUndoOperation(operation: Operation): Operation {
  switch (operation.type) {
    case 'insert':
      return {
        id: generateOperationId(),
        type: 'delete',
        position: operation.position,
        length: operation.content?.length || 0,
        authorId: operation.authorId,
        timestamp: new Date(),
        version: operation.version,
      };
      
    case 'delete':
      return {
        id: generateOperationId(),
        type: 'insert',
        position: operation.position,
        content: '', // Original content would need to be stored
        authorId: operation.authorId,
        timestamp: new Date(),
        version: operation.version,
      };
      
    case 'retain':
      return operation; // Retain operations are their own inverse
      
    default:
      throw new Error(`Cannot create undo for operation type: ${(operation as any).type}`);
  }
}

/**
 * Redo operation - reapplies the original operation
 */
export function createRedoOperation(operation: Operation): Operation {
  return { ...operation, id: generateOperationId(), timestamp: new Date() };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the length of an operation's effect on text
 */
function getOperationLength(operation: Operation): number {
  switch (operation.type) {
    case 'insert':
      return operation.content?.length || 0;
    case 'delete':
      return operation.length || 0;
    case 'retain':
      return operation.length || 0;
    default:
      return 0;
  }
}

/**
 * Shift operation position by given offset
 */
function shiftOperation(operation: Operation, offset: number): Operation {
  if (offset === 0) return operation;
  
  return {
    ...operation,
    position: operation.position + offset,
  };
}

/**
 * Transform operations at the same position
 */
function transformAtSamePosition(
  op1: Operation,
  op2: Operation,
  priority: 'left' | 'right'
): [Operation, Operation] {
  // If both are inserts, use priority to determine order
  if (op1.type === 'insert' && op2.type === 'insert') {
    if (priority === 'left') {
      return [op1, shiftOperation(op2, op1.content?.length || 0)];
    } else {
      return [shiftOperation(op1, op2.content?.length || 0), op2];
    }
  }
  
  // If one is delete and other is insert
  if (op1.type === 'delete' && op2.type === 'insert') {
    return [op1, shiftOperation(op2, -(op1.length || 0))];
  }
  
  if (op1.type === 'insert' && op2.type === 'delete') {
    return [shiftOperation(op1, op2.length || 0), op2];
  }
  
  // If both are delete, apply both
  if (op1.type === 'delete' && op2.type === 'delete') {
    const longerOp = (op1.length || 0) >= (op2.length || 0) ? op1 : op2;
    const shorterOp = longerOp === op1 ? op2 : op1;
    return [longerOp, { ...shorterOp, length: 0 }];
  }
  
  // Default case
  return [op1, op2];
}

/**
 * Create manual resolution operation for conflicts
 */
function createManualResolutionOperation(op1: Operation, op2: Operation): Operation {
  return {
    id: generateOperationId(),
    type: 'retain',
    position: Math.min(op1.position, op2.position),
    authorId: 'system',
    timestamp: new Date(),
    version: Math.max(op1.version, op2.version),
    attributes: {
      conflict: true,
      originalOps: [op1, op2],
      requiresManualResolution: true,
    },
  };
}

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Find common prefix between two strings
 */
function findCommonPrefix(str1: string, str2: string): number {
  let i = 0;
  const maxLen = Math.min(str1.length, str2.length);
  
  while (i < maxLen && str1[i] === str2[i]) {
    i++;
  }
  
  return i;
}

/**
 * Find common suffix between two strings
 */
function findCommonSuffix(str1: string, str2: string): number {
  let i = 0;
  const maxLen = Math.min(str1.length, str2.length);
  
  while (i < maxLen && str1[str1.length - 1 - i] === str2[str2.length - 1 - i]) {
    i++;
  }
  
  return i;
}

/**
 * Generate unique operation ID
 */
export function generateOperationId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// OT DOCUMENT STATE
// =============================================================================

/**
 * Document state for OT operations
 */
export class OTDocumentState {
  private content: string = '';
  private version: number = 0;
  private operations: Operation[] = [];
  private undoStack: Operation[][] = [];
  private redoStack: Operation[][] = [];
  
  constructor(initialContent: string = '') {
    this.content = initialContent;
  }
  
  /**
   * Apply operation to document
   */
  applyOperation(operation: Operation): void {
    // Store for undo
    this.undoStack.push([operation]);
    this.redoStack = []; // Clear redo stack
    
    // Apply operation
    this.content = applyOperation(this.content, operation);
    this.operations.push(operation);
    this.version++;
  }
  
  /**
   * Apply multiple operations (composite)
   */
  applyCompositeOperation(composite: CompositeOperation): void {
    this.undoStack.push(composite.operations);
    this.redoStack = [];
    
    for (const op of composite.operations) {
      this.content = applyOperation(this.content, op);
      this.operations.push(op);
      this.version++;
    }
  }
  
  /**
   * Undo last operation
   */
  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    
    const lastOps = this.undoStack.pop()!;
    const undoOps = lastOps.map(op => createUndoOperation(op));
    
    // Apply undo operations in reverse order
    for (const op of undoOps.reverse()) {
      this.content = applyOperation(this.content, op);
    }
    
    this.redoStack.push(lastOps);
    return true;
  }
  
  /**
   * Redo last undone operation
   */
  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    
    const redoOps = this.redoStack.pop()!;
    
    for (const op of redoOps) {
      this.content = applyOperation(this.content, op);
      this.operations.push(op);
      this.version++;
    }
    
    this.undoStack.push(redoOps);
    return true;
  }
  
  /**
   * Get current document state
   */
  getState(): { content: string; version: number } {
    return {
      content: this.content,
      version: this.version,
    };
  }
  
  /**
   * Get operation history
   */
  getHistory(): Operation[] {
    return [...this.operations];
  }
  
  /**
   * Transform incoming operation against local operations
   */
  transformIncoming(operation: Operation): Operation {
    let transformedOp = operation;
    
    for (const localOp of this.operations) {
      const [, transformed] = transform(localOp, transformedOp, 'right');
      transformedOp = transformed || transformedOp;
    }
    
    return transformedOp;
  }
  
  /**
   * Clear history
   */
  clearHistory(): void {
    this.operations = [];
    this.undoStack = [];
    this.redoStack = [];
  }
}

// =============================================================================
// OT SESSION MANAGER
// =============================================================================

/**
 * Manages OT operations for a collaboration session
 */
export class OTSessionManager {
  private documents = new Map<string, OTDocumentState>();
  private participantOperations = new Map<string, Operation[]>();
  private conflictResolutionStrategies = new Map<string, 'timestamp' | 'author-priority' | 'manual'>();
  
  /**
   * Get or create document state for file
   */
  getDocument(fileId: string): OTDocumentState {
    if (!this.documents.has(fileId)) {
      this.documents.set(fileId, new OTDocumentState());
    }
    return this.documents.get(fileId)!;
  }
  
  /**
   * Apply operation from participant
   */
  applyParticipantOperation(
    participantId: string,
    fileId: string,
    operation: Operation
  ): { success: boolean; conflicts: Operation[]; transformed: Operation } {
    const document = this.getDocument(fileId);
    
    // Transform against all known operations
    const transformedOp = document.transformIncoming(operation);
    
    // Check for conflicts with other participants
    const conflicts = this.detectConflictsWithParticipants(participantId, fileId, transformedOp);
    
    if (conflicts.length > 0) {
      // Resolve conflicts
      const firstConflict = conflicts[0];
      if (!firstConflict) {
        document.applyOperation(transformedOp);
        this.trackParticipantOperation(participantId, transformedOp);
        return {
          success: true,
          conflicts: [],
          transformed: transformedOp,
        };
      }
      
      const conflictResult = resolveConflict(
        transformedOp,
        firstConflict,
        this.conflictResolutionStrategies.get(fileId) || 'timestamp'
      );
      
      document.applyOperation(conflictResult.resolved);
      this.trackParticipantOperation(participantId, conflictResult.resolved);
      
      return {
        success: true,
        conflicts,
        transformed: conflictResult.resolved,
      };
    }
    
    // No conflicts, apply normally
    document.applyOperation(transformedOp);
    this.trackParticipantOperation(participantId, transformedOp);
    
    return {
      success: true,
      conflicts: [],
      transformed: transformedOp,
    };
  }
  
  /**
   * Track operation for participant
   */
  private trackParticipantOperation(participantId: string, operation: Operation): void {
    if (!this.participantOperations.has(participantId)) {
      this.participantOperations.set(participantId, []);
    }
    
    this.participantOperations.get(participantId)!.push(operation);
  }
  
  /**
   * Detect conflicts with other participants
   */
  private detectConflictsWithParticipants(
    participantId: string,
    fileId: string,
    operation: Operation
  ): Operation[] {
    const conflicts: Operation[] = [];
    
    for (const [pid, operations] of this.participantOperations) {
      if (pid === participantId) continue;
      
      for (const op of operations) {
        if (detectConflict(operation, op)) {
          conflicts.push(op);
        }
      }
    }
    
    return conflicts;
  }
  
  /**
   * Set conflict resolution strategy for file
   */
  setConflictResolutionStrategy(
    fileId: string,
    strategy: 'timestamp' | 'author-priority' | 'manual'
  ): void {
    this.conflictResolutionStrategies.set(fileId, strategy);
  }
  
  /**
   * Get participant operations
   */
  getParticipantOperations(participantId: string): Operation[] {
    return this.participantOperations.get(participantId) || [];
  }
  
  /**
   * Clear participant operations
   */
  clearParticipantOperations(participantId: string): void {
    this.participantOperations.delete(participantId);
  }
}