/**
 * MCP WebSocket Server
 * Handles real-time collaboration features via WebSocket
 */

import type {
  MCPMessage,
  MCPMessageType,
  User,
  Session,
  Project,
  SessionParticipant,
  ChangeDelta,
  ChatMessage,
  Suggestion,
  CursorPosition,
  ViewportState,
  SelectionRange,
  VersionEntry,
} from "../../shared/mcp-types";
import { mcpStore } from "./store";
import { wsManager, auth } from "./middleware";
import { parseOpenSCAD } from "../scad/parser";
import { evaluateAST } from "../scad/evaluator";
import { handleAIWebSocketMessage, aiManager } from "./ai-adapter";
import {
  OTSessionManager,
  transformCursor,
  transformSelection,
  generateOperationId,
  type Operation,
} from "./operational-transform";
import { sessionRecorder, playbackController } from "./session-recorder";

// =============================================================================
// WEBSOCKET MESSAGE HANDLERS
// =============================================================================

export class MCPWebSocketServer {
  private messageHandlers = new Map<
    MCPMessageType,
    (message: MCPMessage, context: any) => Promise<MCPMessage | void>
  >();
  private otManagers = new Map<string, OTSessionManager>();

  constructor() {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    // Session management
    this.messageHandlers.set("session_join", this.handleSessionJoin.bind(this));
    this.messageHandlers.set(
      "session_leave",
      this.handleSessionLeave.bind(this),
    );
    this.messageHandlers.set(
      "session_create",
      this.handleSessionCreate.bind(this),
    );
    this.messageHandlers.set(
      "session_update",
      this.handleSessionUpdate.bind(this),
    );
    this.messageHandlers.set("session_list", this.handleSessionList.bind(this));

    // Participant management
    this.messageHandlers.set(
      "participant_join",
      this.handleParticipantJoin.bind(this),
    );
    this.messageHandlers.set(
      "participant_leave",
      this.handleParticipantLeave.bind(this),
    );
    this.messageHandlers.set(
      "participant_update",
      this.handleParticipantUpdate.bind(this),
    );

    // Real-time editing
    this.messageHandlers.set("operation", this.handleOperation.bind(this));
    this.messageHandlers.set(
      "operation_ack",
      this.handleOperationAck.bind(this),
    );
    this.messageHandlers.set(
      "operation_conflict",
      this.handleOperationConflict.bind(this),
    );
    this.messageHandlers.set(
      "cursor_update",
      this.handleCursorUpdate.bind(this),
    );
    this.messageHandlers.set(
      "selection_update",
      this.handleSelectionUpdate.bind(this),
    );
    this.messageHandlers.set(
      "viewport_update",
      this.handleViewportUpdate.bind(this),
    );

    // Version control
    this.messageHandlers.set(
      "version_create",
      this.handleVersionCreate.bind(this),
    );
    this.messageHandlers.set(
      "version_restore",
      this.handleVersionRestore.bind(this),
    );
    this.messageHandlers.set("version_list", this.handleVersionList.bind(this));

    // Presence and activity
    this.messageHandlers.set(
      "presence_update",
      this.handlePresenceUpdate.bind(this),
    );
    this.messageHandlers.set(
      "typing_indicator",
      this.handleTypingIndicator.bind(this),
    );

    // Conflict resolution
    this.messageHandlers.set(
      "conflict_resolve",
      this.handleConflictResolve.bind(this),
    );
    this.messageHandlers.set(
      "conflict_request",
      this.handleConflictRequest.bind(this),
    );

    // Collaborative undo/redo
    this.messageHandlers.set("undo", this.handleUndo.bind(this));
    this.messageHandlers.set("redo", this.handleRedo.bind(this));

    // Session recording
    this.messageHandlers.set(
      "recording_start",
      this.handleRecordingStart.bind(this),
    );
    this.messageHandlers.set(
      "recording_stop",
      this.handleRecordingStop.bind(this),
    );
    this.messageHandlers.set(
      "recording_playback",
      this.handleRecordingPlayback.bind(this),
    );

    // Geometry & evaluation
    this.messageHandlers.set(
      "evaluate_request",
      this.handleEvaluateRequest.bind(this),
    );
    this.messageHandlers.set(
      "evaluate_cancel",
      this.handleEvaluateCancel.bind(this),
    );
    this.messageHandlers.set(
      "geometry_update",
      this.handleGeometryUpdate.bind(this),
    );
    this.messageHandlers.set(
      "export_request",
      this.handleExportRequest.bind(this),
    );

    // AI assistance
    this.messageHandlers.set(
      "suggestion_request",
      this.handleSuggestionRequest.bind(this),
    );
    this.messageHandlers.set(
      "suggestion_apply",
      this.handleSuggestionApply.bind(this),
    );
    this.messageHandlers.set(
      "suggestion_reject",
      this.handleSuggestionReject.bind(this),
    );

    // Communication
    this.messageHandlers.set("chat_message", this.handleChatMessage.bind(this));
    this.messageHandlers.set(
      "typing_indicator",
      this.handleTypingIndicator.bind(this),
    );
    this.messageHandlers.set(
      "presence_update",
      this.handlePresenceUpdate.bind(this),
    );

    // System
    this.messageHandlers.set("ping", this.handlePing.bind(this));
    this.messageHandlers.set(
      "authenticate",
      this.handleAuthenticate.bind(this),
    );
  }

  // Main message handler
  async handleMessage(
    message: MCPMessage,
    connectionId: string,
  ): Promise<void> {
    const context = wsManager.getConnection(connectionId);
    if (!context) {
      console.error("No context found for connection:", connectionId);
      return;
    }

    try {
      const handler = this.messageHandlers.get(message.type);
      if (!handler) {
        this.sendError(connectionId, `Unknown message type: ${message.type}`);
        return;
      }

      // Update last activity
      wsManager.updateLastPing(connectionId);

      // Record message if session is being recorded
      if (message.sessionId) {
        const session = mcpStore.sessions.get(message.sessionId);
        if (session && session.settings.recordSession) {
          sessionRecorder.recordMessage(message.sessionId, message);
        }
      }

      // Call the handler
      const response = await handler(message, context);

      if (response) {
        wsManager.sendToConnection(connectionId, response);
      }
    } catch (error: any) {
      console.error(`Error handling message ${message.type}:`, error);
      this.sendError(connectionId, error.message || "Internal server error");
    }
  }

  // =============================================================================
  // SESSION MANAGEMENT HANDLERS
  // =============================================================================

  private async handleSessionJoin(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, asAnonymous } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error("Session not found or inactive");
    }

    // Check permissions
    if (!asAnonymous && (!context.isAuthenticated || !context.user)) {
      throw new Error("Authentication required");
    }

    if (!asAnonymous && context.user) {
      const user = context.user;

      // Check if user is the host or a participant
      if (
        session.hostId !== user.id &&
        !session.participants.some((p: any) => p.userId === user.id)
      ) {
        throw new Error("Not authorized to join this session");
      }

      // Add as participant if not already
      if (!session.participants.some((p: any) => p.userId === user.id)) {
        const participant: SessionParticipant = {
          userId: user.id,
          user,
          joinedAt: new Date(),
          isActive: true,
          cursor: { line: 0, column: 0, file: "" },
          viewport: {
            cameraPosition: [0, 0, 100],
            cameraTarget: [0, 0, 0],
            cameraUp: [0, 1, 0],
            zoom: 1,
            renderMode: "solid",
            showGrid: true,
            showAxes: true,
          },
          permissionLevel: session.hostId === user.id ? "owner" : "editor",
          color: this.generateUserColor(user.id),
        };

        session.participants.push(participant);
        mcpStore.sessions.set(sessionId, session);
      }

      // Update user status
      user.isOnline = true;
      user.lastSeen = new Date();
      mcpStore.users.set(user.id, user);

      // Update connection context
      if (context.sessionId !== undefined) {
        context.sessionId = sessionId;
      }
      context.user = user;
    }

    // Notify other participants
    const joinMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "participant_join",
      timestamp: new Date(),
      sessionId,
      payload: {
        participant: context.user
          ? session.participants.find((p: any) => p.userId === context.user.id)
          : null,
      },
    };

    wsManager.broadcastToSession(sessionId, joinMessage);

    return {
      id: mcpStore.generateId(),
      type: "session_join",
      timestamp: new Date(),
      sessionId,
      payload: {
        session,
        success: true,
      },
    };
  }

  private async handleSessionLeave(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Remove participant
    if (context.user) {
      session.participants = session.participants.filter(
        (p: any) => p.userId !== context.user.id,
      );
      mcpStore.sessions.set(sessionId, session);

      // Update user status
      context.user.isOnline = false;
      context.user.lastSeen = new Date();
      mcpStore.users.set(context.user.id, context.user);
    }

    // Notify other participants
    const leaveMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "participant_leave",
      timestamp: new Date(),
      sessionId,
      payload: {
        userId: context.user?.id,
      },
    };

    wsManager.broadcastToSession(sessionId, leaveMessage);

    return {
      id: mcpStore.generateId(),
      type: "session_leave",
      timestamp: new Date(),
      sessionId,
      payload: { success: true },
    };
  }

  private async handleSessionCreate(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    if (!context.isAuthenticated || !context.user) {
      throw new Error("Authentication required");
    }

    const { projectId, name, description, settings } = message.payload;

    if (!projectId || !name) {
      throw new Error("Project ID and name are required");
    }

    const project = mcpStore.projects.get(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const session: Session = {
      id: mcpStore.generateId(),
      projectId,
      name,
      description,
      hostId: context.user.id,
      participants: [],
      isActive: true,
      createdAt: new Date(),
      settings: {
        allowAnonymousViewers: true,
        requireHostApproval: false,
        maxParticipants: 10,
        enableVoiceChat: false,
        enableTextChat: true,
        recordSession: false,
        autoSaveInterval: 30000,
        ...settings,
      },
      sharedState: {
        currentVersion: 1,
        lastSyncAt: new Date(),
        pendingChanges: [],
        evaluations: [],
        suggestions: [],
        chatMessages: [],
      },
    };

    mcpStore.sessions.set(session.id, session);

    return {
      id: mcpStore.generateId(),
      type: "session_create",
      timestamp: new Date(),
      payload: { session },
    };
  }

  private async handleSessionUpdate(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, updates } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Check permissions (only host can update session)
    if (session.hostId !== context.user?.id) {
      throw new Error("Only host can update session");
    }

    // Apply updates
    Object.assign(session, updates);
    mcpStore.sessions.set(sessionId, session);

    // Broadcast to all participants
    const updateMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "session_update",
      timestamp: new Date(),
      sessionId,
      payload: { session },
    };

    wsManager.broadcastToSession(sessionId, updateMessage);

    return {
      id: mcpStore.generateId(),
      type: "session_update",
      timestamp: new Date(),
      sessionId,
      payload: { success: true },
    };
  }

  private async handleSessionList(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { projectId } = message.payload;

    let sessions = mcpStore.sessions.getAll();

    if (projectId) {
      sessions = mcpStore.sessions.findByProject(projectId);
    }

    // Filter by active status and permissions
    sessions = sessions.filter(
      (session: Session) =>
        session.isActive &&
        (!context.user ||
          session.hostId === context.user.id ||
          session.participants.some((p: any) => p.userId === context.user.id)),
    );

    return {
      id: mcpStore.generateId(),
      type: "session_list",
      timestamp: new Date(),
      payload: { sessions },
    };
  }

  // =============================================================================
  // PARTICIPANT MANAGEMENT HANDLERS
  // =============================================================================

  private async handleParticipantJoin(
    message: MCPMessage,
    context: any,
  ): Promise<void> {
    // Handled in handleSessionJoin
  }

  private async handleParticipantLeave(
    message: MCPMessage,
    context: any,
  ): Promise<void> {
    // Handled in handleSessionLeave
  }

  private async handleParticipantUpdate(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, updates } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const participant = session.participants.find(
      (p: any) => p.userId === context.user?.id,
    );
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Apply updates
    Object.assign(participant, updates);
    mcpStore.sessions.set(sessionId, session);

    // Broadcast to other participants
    const updateMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "participant_update",
      timestamp: new Date(),
      sessionId,
      payload: { participant },
    };

    // Broadcast to other participants (exclude current connection - need connectionId)
    wsManager.broadcastToSession(sessionId, updateMessage);

    return {
      id: mcpStore.generateId(),
      type: "participant_update",
      timestamp: new Date(),
      sessionId,
      payload: { success: true },
    };
  }

  // =============================================================================
  // REAL-TIME EDITING HANDLERS
  // =============================================================================

  private async handleOperation(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, operation, fileId } = message.payload;

    if (!sessionId || !operation) {
      throw new Error("Session ID and operation are required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Check permissions
    const participant = session.participants.find(
      (p: SessionParticipant) => p.userId === context.user?.id,
    );
    if (!participant || participant.permissionLevel === "viewer") {
      throw new Error("No write permission");
    }

    // Get or create OT session manager
    const otManager = this.getOTManager(sessionId);
    const documentState = mcpStore.getDocumentState(
      sessionId,
      fileId || "default",
    );

    // Convert to OT operation format
    let otType: "insert" | "delete" | "retain";
    switch (operation.type) {
      case "insert":
        otType = "insert";
        break;
      case "delete":
        otType = "delete";
        break;
      case "replace":
        otType = "delete"; // Simplified: handle replace as delete
        break;
      default:
        otType = "retain";
    }

    const otOperation: Operation = {
      id: operation.id || generateOperationId(),
      type: otType,
      position:
        operation.position?.line * 1000 + operation.position?.column || 0,
      content: operation.content,
      length: operation.length,
      authorId: context.user.id,
      timestamp: new Date(),
      version: session.sharedState.currentVersion + 1,
    };

    // Apply operation through OT system
    const result = otManager.applyParticipantOperation(
      context.user.id,
      fileId || "default",
      otOperation,
    );

    if (!result.success) {
      throw new Error("Failed to apply operation");
    }

    // Create change delta
    const change: ChangeDelta = {
      id: result.transformed.id,
      type:
        result.transformed.type === "retain"
          ? "insert"
          : (result.transformed.type as "insert" | "delete" | "replace"),
      position: operation.position,
      content: operation.content,
      length: operation.length,
      authorId: context.user.id,
      timestamp: new Date(),
      version: session.sharedState.currentVersion + 1,
      applied: true,
      conflicted: result.conflicts.length > 0,
      resolvedBy: result.conflicts.length > 0 ? "system" : undefined,
    };

    // Update session state
    session.sharedState.pendingChanges =
      session.sharedState.pendingChanges.filter(
        (c: ChangeDelta) => c.id !== change.id,
      );
    session.sharedState.currentVersion++;
    session.sharedState.lastSyncAt = new Date();
    mcpStore.sessions.set(sessionId, session);
    mcpStore.changes.set(change.id, change);

    // Transform other participants' cursors
    const transformedParticipants: any[] = [];
    for (const p of session.participants) {
      if (
        p.userId !== context.user.id &&
        p.cursor &&
        p.cursor.file === (fileId || "")
      ) {
        const transformedCursor = transformCursor(p.cursor, result.transformed);
        p.cursor = transformedCursor;
        transformedParticipants.push({
          userId: p.userId,
          cursor: transformedCursor,
          color: p.color,
        });
      }
    }

    mcpStore.sessions.set(sessionId, session);

    // Broadcast to other participants
    const operationMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "operation",
      timestamp: new Date(),
      sessionId,
      payload: {
        operation: change,
        conflicts: result.conflicts,
        transformedCursors: transformedParticipants,
      },
    };

    wsManager.broadcastToSession(
      sessionId,
      operationMessage,
      context.connectionId,
    );

    // Send acknowledgment
    return {
      id: mcpStore.generateId(),
      type: "operation_ack",
      timestamp: new Date(),
      sessionId,
      payload: {
        operationId: change.id,
        version: change.version,
        conflicts: result.conflicts,
        success: true,
      },
    };
  }

  private async handleCursorUpdate(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, cursor } = message.payload;

    if (!sessionId || !cursor) {
      throw new Error("Session ID and cursor are required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const participant = session.participants.find(
      (p: any) => p.userId === context.user?.id,
    );
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Update cursor
    participant.cursor = cursor;
    mcpStore.sessions.set(sessionId, session);

    // Broadcast to other participants
    const cursorMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "cursor_update",
      timestamp: new Date(),
      sessionId,
      payload: {
        userId: context.user.id,
        cursor,
        color: participant.color,
      },
    };

    wsManager.broadcastToSession(
      sessionId,
      cursorMessage,
      context.connectionId,
    );

    return {
      id: mcpStore.generateId(),
      type: "cursor_update",
      timestamp: new Date(),
      sessionId,
      payload: { success: true },
    };
  }

  private async handleViewportUpdate(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, viewport } = message.payload;

    if (!sessionId || !viewport) {
      throw new Error("Session ID and viewport are required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const participant = session.participants.find(
      (p: any) => p.userId === context.user?.id,
    );
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Update viewport
    participant.viewport = viewport;
    mcpStore.sessions.set(sessionId, session);

    return {
      id: mcpStore.generateId(),
      type: "viewport_update",
      timestamp: new Date(),
      sessionId,
      payload: { success: true },
    };
  }

  // =============================================================================
  // GEOMETRY & EVALUATION HANDLERS
  // =============================================================================

  private async handleEvaluateRequest(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, code } = message.payload;

    if (!code) {
      throw new Error("Code is required");
    }

    try {
      const startTime = Date.now();

      // Parse OpenSCAD code
      const parseResult = parseOpenSCAD(code);
      if (!parseResult.success || !parseResult.ast) {
        return {
          id: mcpStore.generateId(),
          type: "evaluate_response",
          timestamp: new Date(),
          sessionId,
          payload: {
            success: false,
            errors: parseResult.errors,
            executionTime: Date.now() - startTime,
          },
        };
      }

      // Evaluate AST
      const evalResult = await evaluateAST(parseResult.ast);
      const executionTime = Date.now() - startTime;

      // Store evaluation history
      const evaluation = {
        id: mcpStore.generateId(),
        code,
        timestamp: new Date(),
        authorId: context.user?.id || "anonymous",
        result: evalResult.geometry,
        errors: evalResult.errors,
        executionTime,
        version: 1,
        cached: false,
      };

      mcpStore.evaluations.set(evaluation.id, evaluation);

      // Update session if provided
      if (sessionId) {
        const session = mcpStore.sessions.get(sessionId);
        if (session) {
          session.sharedState.evaluations.push(evaluation);
          mcpStore.sessions.set(sessionId, session);
        }
      }

      return {
        id: mcpStore.generateId(),
        type: "evaluate_response",
        timestamp: new Date(),
        sessionId,
        payload: {
          success: true,
          geometry: evalResult.geometry,
          errors: evalResult.errors,
          executionTime,
          evaluationId: evaluation.id,
        },
      };
    } catch (error: any) {
      return {
        id: mcpStore.generateId(),
        type: "evaluate_response",
        timestamp: new Date(),
        sessionId,
        payload: {
          success: false,
          errors: [{ message: error.message }],
          executionTime: 0,
        },
      };
    }
  }

  // =============================================================================
  // COMMUNICATION HANDLERS
  // =============================================================================

  private async handleChatMessage(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, content, type = "text" } = message.payload;

    if (!sessionId || !content) {
      throw new Error("Session ID and content are required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!session.settings.enableTextChat) {
      throw new Error("Chat is disabled for this session");
    }

    // Create chat message
    const chatMessage: ChatMessage = {
      id: mcpStore.generateId(),
      sessionId,
      authorId: context.user?.id || "anonymous",
      content,
      type,
      timestamp: new Date(),
      reactions: [],
      mentions: [],
      attachments: [],
    };

    mcpStore.chats.set(chatMessage.id, chatMessage);

    // Add to session history
    session.sharedState.chatMessages.push(chatMessage);
    mcpStore.sessions.set(sessionId, session);

    // Broadcast to all participants
    const chatBroadcast: MCPMessage = {
      id: mcpStore.generateId(),
      type: "chat_message",
      timestamp: new Date(),
      sessionId,
      payload: {
        message: chatMessage,
        author: context.user || { id: "anonymous", username: "Anonymous" },
      },
    };

    wsManager.broadcastToSession(sessionId, chatBroadcast);

    return {
      id: mcpStore.generateId(),
      type: "chat_message",
      timestamp: new Date(),
      sessionId,
      payload: {
        success: true,
        messageId: chatMessage.id,
      },
    };
  }

  // =============================================================================
  // SYSTEM HANDLERS
  // =============================================================================

  private async handlePing(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    return {
      id: mcpStore.generateId(),
      type: "pong",
      timestamp: new Date(),
      sessionId: context.sessionId,
      payload: { timestamp: new Date() },
    };
  }

  private async handleAuthenticate(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { token } = message.payload;

    if (!token) {
      throw new Error("Token is required");
    }

    const validation = auth.validateToken(token);
    if (!validation.valid) {
      throw new Error("Invalid or expired token");
    }

    const user = mcpStore.users.get(validation.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update connection context
    context.isAuthenticated = true;
    context.isAnonymous = false;
    context.user = user;

    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    mcpStore.users.set(user.id, user);

    return {
      id: mcpStore.generateId(),
      type: "authenticate",
      timestamp: new Date(),
      payload: {
        success: true,
        user,
      },
    };
  }

  // =============================================================================
  // VERSION CONTROL HANDLERS
  // =============================================================================

  private async handleVersionCreate(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, projectId, description } = message.payload;

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const project = mcpStore.projects.get(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check permissions
    if (
      !context.user ||
      (project.ownerId !== context.user.id &&
        !project.collaborators.some(
          (c: any) => c.userId === context.user.id && c.role === "owner",
        ))
    ) {
      throw new Error("No permission to create version");
    }

    const version = mcpStore.createVersionSnapshot(
      projectId,
      context.user.id,
      description,
    );

    // Update session if provided
    if (sessionId) {
      const session = mcpStore.sessions.get(sessionId);
      if (session) {
        const versionMessage: MCPMessage = {
          id: mcpStore.generateId(),
          type: "version_create",
          timestamp: new Date(),
          sessionId,
          payload: { version, author: context.user },
        };
        wsManager.broadcastToSession(sessionId, versionMessage);
      }
    }

    return {
      id: mcpStore.generateId(),
      type: "version_response",
      timestamp: new Date(),
      payload: { version, success: true },
    };
  }

  private async handleVersionRestore(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, projectId, versionId } = message.payload;

    if (!projectId || !versionId) {
      throw new Error("Project ID and version ID are required");
    }

    const project = mcpStore.projects.get(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check permissions
    if (
      !context.user ||
      (project.ownerId !== context.user.id &&
        !project.collaborators.some(
          (c: any) => c.userId === context.user.id && c.role === "owner",
        ))
    ) {
      throw new Error("No permission to restore version");
    }

    const success = mcpStore.restoreFromVersion(projectId, versionId);
    if (!success) {
      throw new Error("Failed to restore version");
    }

    // Notify session participants
    if (sessionId) {
      const session = mcpStore.sessions.get(sessionId);
      if (session) {
        const restoreMessage: MCPMessage = {
          id: mcpStore.generateId(),
          type: "version_restore",
          timestamp: new Date(),
          sessionId,
          payload: { versionId, author: context.user },
        };
        wsManager.broadcastToSession(sessionId, restoreMessage);
      }
    }

    return {
      id: mcpStore.generateId(),
      type: "version_response",
      timestamp: new Date(),
      payload: { versionId, success: true },
    };
  }

  private async handleVersionList(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { projectId } = message.payload;

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const project = mcpStore.projects.get(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Check permissions
    if (
      !context.user ||
      (project.ownerId !== context.user.id &&
        !project.collaborators.some((c: any) => c.userId === context.user.id))
    ) {
      throw new Error("No permission to view versions");
    }

    const versions = mcpStore.versions.findByProject(projectId);

    return {
      id: mcpStore.generateId(),
      type: "version_response",
      timestamp: new Date(),
      payload: { versions },
    };
  }

  // =============================================================================
  // PRESENCE & ACTIVITY HANDLERS
  // =============================================================================

  private async handlePresenceUpdate(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, presence } = message.payload;

    if (!sessionId || !presence) {
      throw new Error("Session ID and presence data are required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const participant = session.participants.find(
      (p: SessionParticipant) => p.userId === context.user?.id,
    );
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Update participant presence
    participant.user.lastSeen = new Date();
    participant.user.isOnline = presence.isOnline ?? true;
    mcpStore.sessions.set(sessionId, session);
    mcpStore.users.set(context.user.id, participant.user);

    // Broadcast to other participants
    const presenceMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "presence_update",
      timestamp: new Date(),
      sessionId,
      payload: {
        userId: context.user.id,
        presence,
        color: participant.color,
      },
    };

    wsManager.broadcastToSession(
      sessionId,
      presenceMessage,
      context.connectionId,
    );

    return {
      id: mcpStore.generateId(),
      type: "presence_update",
      timestamp: new Date(),
      sessionId,
      payload: { success: true },
    };
  }

  private async handleTypingIndicator(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, isTyping, file } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const participant = session.participants.find(
      (p: SessionParticipant) => p.userId === context.user?.id,
    );
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Broadcast typing indicator
    const typingMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "typing_indicator",
      timestamp: new Date(),
      sessionId,
      payload: {
        userId: context.user.id,
        username: context.user.username,
        isTyping,
        file,
        color: participant.color,
      },
    };

    wsManager.broadcastToSession(
      sessionId,
      typingMessage,
      context.connectionId,
    );

    return {
      id: mcpStore.generateId(),
      type: "typing_indicator",
      timestamp: new Date(),
      sessionId,
      payload: { success: true },
    };
  }

  // =============================================================================
  // CONFLICT RESOLUTION HANDLERS
  // =============================================================================

  private async handleConflictResolve(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, conflictId, resolution, strategy } = message.payload;

    if (!sessionId || !conflictId) {
      throw new Error("Session ID and conflict ID are required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Find and resolve conflict
    const conflict = session.sharedState.pendingChanges.find(
      (c: ChangeDelta) => c.id === conflictId,
    );
    if (!conflict) {
      throw new Error("Conflict not found");
    }

    conflict.conflicted = false;
    conflict.resolvedBy = context.user.id;
    mcpStore.sessions.set(sessionId, session);

    // Broadcast resolution
    const resolveMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "conflict_resolve",
      timestamp: new Date(),
      sessionId,
      payload: {
        conflictId,
        resolution,
        strategy,
        resolvedBy: context.user,
      },
    };

    wsManager.broadcastToSession(sessionId, resolveMessage);

    return {
      id: mcpStore.generateId(),
      type: "conflict_response",
      timestamp: new Date(),
      sessionId,
      payload: { success: true },
    };
  }

  private async handleConflictRequest(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const conflicts = session.sharedState.pendingChanges.filter(
      (c: ChangeDelta) => c.conflicted,
    );

    return {
      id: mcpStore.generateId(),
      type: "conflict_response",
      timestamp: new Date(),
      sessionId,
      payload: { conflicts },
    };
  }

  // =============================================================================
  // COLLABORATIVE UNDO/REDO HANDLERS
  // =============================================================================

  private async handleUndo(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, fileId } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const otManager = this.getOTManager(sessionId);
    const documentState = mcpStore.getDocumentState(
      sessionId,
      fileId || "default",
    );

    const success = documentState.undo();
    if (!success) {
      return {
        id: mcpStore.generateId(),
        type: "undo_redo_response",
        timestamp: new Date(),
        sessionId,
        payload: { success: false, message: "Nothing to undo" },
      };
    }

    // Broadcast state change
    const undoMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "undo_redo_response",
      timestamp: new Date(),
      sessionId,
      payload: {
        action: "undo",
        success: true,
        documentState: documentState.getState(),
        author: context.user,
      },
    };

    wsManager.broadcastToSession(sessionId, undoMessage);

    return undoMessage;
  }

  private async handleRedo(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, fileId } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const documentState = mcpStore.getDocumentState(
      sessionId,
      fileId || "default",
    );

    const success = documentState.redo();
    if (!success) {
      return {
        id: mcpStore.generateId(),
        type: "undo_redo_response",
        timestamp: new Date(),
        sessionId,
        payload: { success: false, message: "Nothing to redo" },
      };
    }

    // Broadcast state change
    const redoMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "undo_redo_response",
      timestamp: new Date(),
      sessionId,
      payload: {
        action: "redo",
        success: true,
        documentState: documentState.getState(),
        author: context.user,
      },
    };

    wsManager.broadcastToSession(sessionId, redoMessage);

    return redoMessage;
  }

  // =============================================================================
  // SESSION RECORDING HANDLERS
  // =============================================================================

  private async handleRecordingStart(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, settings } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Check permissions (only host can start recording)
    if (session.hostId !== context.user?.id) {
      throw new Error("Only session host can start recording");
    }

    // Start actual recording
    const recordingId = sessionRecorder.startRecording(
      sessionId,
      session.name,
      settings,
    );

    session.settings.recordSession = true;
    session.sharedState.lastSyncAt = new Date(); // Start recording timestamp
    mcpStore.sessions.set(sessionId, session);

    // Notify participants
    const startMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "recording_state",
      timestamp: new Date(),
      sessionId,
      payload: {
        isRecording: true,
        recordingId,
        startedBy: context.user,
        settings,
      },
    };

    wsManager.broadcastToSession(sessionId, startMessage);

    return {
      id: mcpStore.generateId(),
      type: "recording_state",
      timestamp: new Date(),
      sessionId,
      payload: { success: true, isRecording: true, recordingId },
    };
  }

  private async handleRecordingStop(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, save } = message.payload;

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const session = mcpStore.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Check permissions (only host can stop recording)
    if (session.hostId !== context.user?.id) {
      throw new Error("Only session host can stop recording");
    }

    // Stop actual recording
    const recording = sessionRecorder.stopRecording(sessionId);

    session.settings.recordSession = false;
    mcpStore.sessions.set(sessionId, session);

    let recordingData: any = null;
    if (save && recording) {
      recordingData = {
        id: recording.id,
        sessionId: recording.sessionId,
        duration: recording.duration,
        metadata: recording.metadata,
        // Export as JSON if needed
        exportData: sessionRecorder.exportRecording(recording.id),
      };
    }

    const stopMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "recording_state",
      timestamp: new Date(),
      sessionId,
      payload: {
        isRecording: false,
        stoppedBy: context.user,
        recordingData,
      },
    };

    wsManager.broadcastToSession(sessionId, stopMessage);

    return {
      id: mcpStore.generateId(),
      type: "recording_state",
      timestamp: new Date(),
      sessionId,
      payload: {
        success: true,
        isRecording: false,
        recordingId: recording?.id,
      },
    };
  }

  private async handleRecordingPlayback(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    const { sessionId, recordingId, options } = message.payload;

    if (!sessionId || !recordingId) {
      throw new Error("Session ID and recording ID are required");
    }

    const recording = sessionRecorder.getRecording(recordingId);
    if (!recording) {
      throw new Error("Recording not found");
    }

    // Start playback
    const playbackCallback = (entry: any) => {
      // Broadcast entry to session participants
      const playbackMessage: MCPMessage = {
        id: mcpStore.generateId(),
        type: "recording_data",
        timestamp: new Date(),
        sessionId,
        payload: {
          recordingId,
          entry,
          isPlayback: true,
        },
      };

      wsManager.broadcastToSession(sessionId, playbackMessage);
    };

    const playbackId = playbackController.startPlayback(
      recordingId,
      recording,
      playbackCallback,
      options,
    );

    return {
      id: mcpStore.generateId(),
      type: "recording_data",
      timestamp: new Date(),
      sessionId,
      payload: {
        recordingId,
        playbackId,
        status: "started",
        totalEntries: recording.entries.length,
      },
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private sendError(connectionId: string, error: string): void {
    const errorMessage: MCPMessage = {
      id: mcpStore.generateId(),
      type: "error",
      timestamp: new Date(),
      payload: { error },
    };

    wsManager.sendToConnection(connectionId, errorMessage);
  }

  private generateUserColor(userId: string): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
      "#F8B739",
      "#52B788",
      "#E56B6F",
      "#A8DADC",
      "#457B9D",
    ];

    // Simple hash-based color selection
    const hash = userId
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length] as string;
  }

  // Placeholder handlers for unimplemented features
  private async handleOperationAck(
    message: MCPMessage,
    context: any,
  ): Promise<void> {}
  private async handleOperationConflict(
    message: MCPMessage,
    context: any,
  ): Promise<void> {}
  private async handleSelectionUpdate(
    message: MCPMessage,
    context: any,
  ): Promise<void> {}
  private async handleGeometryUpdate(
    message: MCPMessage,
    context: any,
  ): Promise<void> {}
  private async handleExportRequest(
    message: MCPMessage,
    context: any,
  ): Promise<void> {}
  private async handleSuggestionRequest(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    return (
      (await handleAIWebSocketMessage(message, context.connectionId)) || {
        id: mcpStore.generateId(),
        type: "error",
        timestamp: new Date(),
        sessionId: message.sessionId,
        payload: { error: "Failed to handle suggestion request" },
      }
    );
  }

  private async handleSuggestionApply(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    return (
      (await handleAIWebSocketMessage(message, context.connectionId)) || {
        id: mcpStore.generateId(),
        type: "error",
        timestamp: new Date(),
        sessionId: message.sessionId,
        payload: { error: "Failed to handle suggestion apply" },
      }
    );
  }

  private async handleSuggestionReject(
    message: MCPMessage,
    context: any,
  ): Promise<MCPMessage> {
    return (
      (await handleAIWebSocketMessage(message, context.connectionId)) || {
        id: mcpStore.generateId(),
        type: "error",
        timestamp: new Date(),
        sessionId: message.sessionId,
        payload: { error: "Failed to handle suggestion reject" },
      }
    );
  }
  private async handleEvaluateCancel(
    message: MCPMessage,
    context: any,
  ): Promise<void> {}

  // Helper to get or create OT manager for session
  private getOTManager(sessionId: string): OTSessionManager {
    if (!this.otManagers.has(sessionId)) {
      this.otManagers.set(sessionId, mcpStore.getOTSessionManager(sessionId));
    }
    return this.otManagers.get(sessionId)!;
  }
}

// Export singleton instance
export const mcpWebSocketServer = new MCPWebSocketServer();
