/**
 * In-memory data store for MCP collaboration features
 * MVP implementation - replaces persistent database for initial development
 */

import type {
  User,
  Project,
  Session,
  Suggestion,
  ChatMessage,
  Invitation,
  ChangeDelta,
  EvaluationHistory,
  SystemEvent,
  VersionEntry,
  ProjectSnapshot,
  SessionParticipant,
} from "../shared/mcp-types";
import {
  OTSessionManager,
  OTDocumentState,
  generateOperationId,
} from "./mcp-operational-transform";

// =============================================================================
// STORES
// =============================================================================

class InMemoryStore {
  protected data: Map<string, any> = new Map();

  get(id: string): any | undefined {
    return this.data.get(id);
  }

  set(id: string, value: any): void {
    this.data.set(id, value);
  }

  delete(id: string): boolean {
    return this.data.delete(id);
  }

  has(id: string): boolean {
    return this.data.has(id);
  }

  getAll(): any[] {
    return Array.from(this.data.values());
  }

  clear(): void {
    this.data.clear();
  }

  size(): number {
    return this.data.size;
  }

  find(predicate: (value: any) => boolean): any | undefined {
    return this.getAll().find(predicate);
  }

  filter(predicate: (value: any) => boolean): any[] {
    return this.getAll().filter(predicate);
  }
}

// User Store
export class UserStore extends InMemoryStore {
  findByEmail(email: string): User | undefined {
    return this.find((user) => user.email === email);
  }

  findByUsername(username: string): User | undefined {
    return this.find((user) => user.username === username);
  }

  getOnlineUsers(): User[] {
    return this.filter((user) => user.isOnline);
  }

  updateLastSeen(userId: string): void {
    const user = this.get(userId);
    if (user) {
      user.lastSeen = new Date();
      this.set(userId, user);
    }
  }

  setOnlineStatus(userId: string, isOnline: boolean): void {
    const user = this.get(userId);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.set(userId, user);
    }
  }
}

// Project Store
export class ProjectStore extends InMemoryStore {
  findByOwner(ownerId: string): Project[] {
    return this.filter((project) => project.ownerId === ownerId);
  }

  findPublicProjects(): Project[] {
    return this.filter((project) => project.isPublic);
  }

  findByTag(tag: string): Project[] {
    return this.filter((project: Project) => project.tags.includes(tag));
  }

  searchProjects(query: string): Project[] {
    const lowerQuery = query.toLowerCase();
    return this.filter(
      (project) =>
        project.name.toLowerCase().includes(lowerQuery) ||
        (project.description &&
          project.description.toLowerCase().includes(lowerQuery)) ||
        project.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    );
  }

  updateTimestamp(projectId: string): void {
    const project = this.get(projectId);
    if (project) {
      project.updatedAt = new Date();
      this.set(projectId, project);
    }
  }
}

// Session Store
export class SessionStore extends InMemoryStore {
  findByProject(projectId: string): Session[] {
    return this.filter((session) => session.projectId === projectId);
  }

  findActiveSessions(): Session[] {
    return this.filter((session) => session.isActive);
  }

  findExpiredSessions(): Session[] {
    const now = new Date();
    return this.filter(
      (session) => session.expiresAt && session.expiresAt < now,
    );
  }

  getParticipants(sessionId: string): any[] {
    const session = this.get(sessionId) as Session;
    return session ? session.participants : [];
  }

  addParticipant(sessionId: string, participant: any): void {
    const session = this.get(sessionId) as Session;
    if (session) {
      session.participants.push(participant);
      this.set(sessionId, session);
    }
  }

  removeParticipant(sessionId: string, userId: string): void {
    const session = this.get(sessionId) as Session;
    if (session) {
      session.participants = session.participants.filter(
        (p) => p.userId !== userId,
      );
      this.set(sessionId, session);
    }
  }

  updateParticipantActivity(sessionId: string, userId: string): void {
    const session = this.get(sessionId) as Session;
    if (session) {
      const participant = session.participants.find((p) => p.userId === userId);
      if (participant) {
        // Update participant activity (SessionParticipant doesn't have lastActiveAt)
        this.set(sessionId, session);
      }
    }
  }
}

// Suggestion Store
export class SuggestionStore extends InMemoryStore {
  findBySession(sessionId: string): Suggestion[] {
    return this.filter((suggestion) =>
      suggestion.timestamp.toString().includes(sessionId),
    ); // Temporary hack
  }

  findByAuthor(author: string): Suggestion[] {
    return this.filter((suggestion) => suggestion.author === author);
  }

  findByType(type: Suggestion["type"]): Suggestion[] {
    return this.filter((suggestion) => suggestion.type === type);
  }

  findPendingSuggestions(): Suggestion[] {
    return this.filter((suggestion) => suggestion.status === "pending");
  }

  findExpiredSuggestions(): Suggestion[] {
    const now = new Date();
    return this.filter(
      (suggestion) => suggestion.expiresAt && suggestion.expiresAt < now,
    );
  }

  updateStatus(suggestionId: string, status: Suggestion["status"]): void {
    const suggestion = this.get(suggestionId) as Suggestion;
    if (suggestion) {
      suggestion.status = status;
      this.set(suggestionId, suggestion);
    }
  }
}

// Chat Store
export class ChatStore extends InMemoryStore {
  findBySession(sessionId: string): ChatMessage[] {
    return this.filter((message) => message.sessionId === sessionId).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  findByAuthor(authorId: string): ChatMessage[] {
    return this.filter((message) => message.authorId === authorId);
  }

  findMessagesInDateRange(
    sessionId: string,
    start: Date,
    end: Date,
  ): ChatMessage[] {
    return this.filter(
      (message) =>
        message.sessionId === sessionId &&
        message.timestamp >= start &&
        message.timestamp <= end,
    );
  }

  findMentions(userId: string): ChatMessage[] {
    return this.filter((message) => message.mentions.includes(userId));
  }
}

// Invitation Store
export class InvitationStore extends InMemoryStore {
  findByInvitee(email: string): Invitation[] {
    return this.filter((invitation) => invitation.inviteeEmail === email);
  }

  findByInviter(inviterId: string): Invitation[] {
    return this.filter((invitation) => invitation.inviterId === inviterId);
  }

  findPendingInvitations(): Invitation[] {
    return this.filter((invitation) => invitation.status === "pending");
  }

  findExpiredInvitations(): Invitation[] {
    const now = new Date();
    return this.filter((invitation) => invitation.expiresAt < now);
  }
}

// Change Delta Store
export class ChangeStore extends InMemoryStore {
  findBySession(sessionId: string): ChangeDelta[] {
    return this.filter(
      (change) => change.position.file.includes(sessionId), // Temporary hack
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  findByAuthor(authorId: string): ChangeDelta[] {
    return this.filter((change) => change.authorId === authorId);
  }

  findConflicts(): ChangeDelta[] {
    return this.filter((change) => change.conflicted);
  }

  findByVersion(version: number): ChangeDelta[] {
    return this.filter((change) => change.version === version);
  }
}

// Evaluation History Store
export class EvaluationStore extends InMemoryStore {
  findByAuthor(authorId: string): EvaluationHistory[] {
    return this.filter((evalution) => evalution.authorId === authorId);
  }

  findBySession(sessionId: string): EvaluationHistory[] {
    return this.filter(
      (evalution) => evalution.code.includes(sessionId), // Temporary hack
    );
  }

  findCached(): EvaluationHistory[] {
    return this.filter((evalution) => evalution.cached);
  }

  findInDateRange(start: Date, end: Date): EvaluationHistory[] {
    return this.filter(
      (evalution) => evalution.timestamp >= start && evalution.timestamp <= end,
    );
  }
}

// System Event Store
export class EventStore extends InMemoryStore {
  findByType(type: SystemEvent["type"]): SystemEvent[] {
    return this.filter((event) => event.type === type);
  }

  findByUser(userId: string): SystemEvent[] {
    return this.filter((event) => event.userId === userId);
  }

  findBySession(sessionId: string): SystemEvent[] {
    return this.filter((event) => event.sessionId === sessionId);
  }

  findByProject(projectId: string): SystemEvent[] {
    return this.filter((event) => event.projectId === projectId);
  }

  findBySeverity(severity: SystemEvent["severity"]): SystemEvent[] {
    return this.filter((event) => event.severity === severity);
  }

  findInDateRange(start: Date, end: Date): SystemEvent[] {
    return this.filter(
      (event) => event.timestamp >= start && event.timestamp <= end,
    );
  }
}

// Version History Store
export class VersionStore extends InMemoryStore {
  findByProject(projectId: string): VersionEntry[] {
    return this.filter(
      (version) => version.snapshot && version.snapshot.files, // Check if projectId can be derived
    ).sort((a, b) => b.version - a.version);
  }

  findByAuthor(authorId: string): VersionEntry[] {
    return this.filter((version) => version.authorId === authorId);
  }

  findLatest(projectId: string): VersionEntry | undefined {
    const versions = this.findByProject(projectId);
    return versions[0]; // First one is latest due to sort
  }

  findInRange(
    projectId: string,
    startVersion: number,
    endVersion: number,
  ): VersionEntry[] {
    return this.filter(
      (version) =>
        version.version >= startVersion &&
        version.version <= endVersion &&
        version.snapshot &&
        version.snapshot.files,
    ).sort((a, b) => a.version - b.version);
  }
}

// =============================================================================
// MAIN STORE MANAGER
// =============================================================================

export class MCPStore {
  readonly users = new UserStore();
  readonly projects = new ProjectStore();
  readonly sessions = new SessionStore();
  readonly suggestions = new SuggestionStore();
  readonly chats = new ChatStore();
  readonly invitations = new InvitationStore();
  readonly changes = new ChangeStore();
  readonly evaluations = new EvaluationStore();
  readonly events = new EventStore();
  readonly versions = new VersionStore();

  // OT Session managers for real-time collaboration
  private otSessionManagers = new Map<string, OTSessionManager>();
  private documentStates = new Map<string, OTDocumentState>();

  // Utility methods
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup expired data
  cleanupExpired(): void {
    const now = new Date();

    // Clean expired sessions
    const expiredSessions = this.sessions.findExpiredSessions();
    expiredSessions.forEach((session) => {
      session.isActive = false;
      this.sessions.set(session.id, session);
    });

    // Clean expired suggestions
    const expiredSuggestions = this.suggestions.findExpiredSuggestions();
    expiredSuggestions.forEach((suggestion) => {
      this.suggestions.delete(suggestion.id);
    });

    // Clean expired invitations
    const expiredInvitations = this.invitations.findExpiredInvitations();
    expiredInvitations.forEach((invitation) => {
      invitation.status = "expired";
      this.invitations.set(invitation.id, invitation);
    });

    console.log(
      `Cleaned ${expiredSessions.length} sessions, ${expiredSuggestions.length} suggestions, ${expiredInvitations.length} invitations`,
    );
  }

  // Get store statistics
  getStats(): Record<string, number> {
    return {
      users: this.users.size(),
      projects: this.projects.size(),
      sessions: this.sessions.size(),
      suggestions: this.suggestions.size(),
      chats: this.chats.size(),
      invitations: this.invitations.size(),
      changes: this.changes.size(),
      evaluations: this.evaluations.size(),
      events: this.events.size(),
    };
  }

  // =============================================================================
  // COLLABORATION METHODS
  // =============================================================================

  /**
   * Get or create OT session manager for a session
   */
  getOTSessionManager(sessionId: string): OTSessionManager {
    if (!this.otSessionManagers.has(sessionId)) {
      this.otSessionManagers.set(sessionId, new OTSessionManager());
    }
    return this.otSessionManagers.get(sessionId)!;
  }

  /**
   * Get document state for file in session
   */
  getDocumentState(sessionId: string, fileId: string): OTDocumentState {
    const key = `${sessionId}:${fileId}`;
    if (!this.documentStates.has(key)) {
      // Load initial content from project file
      const session = this.sessions.get(sessionId);
      let initialContent = "";

      if (session) {
        const project = this.projects.get(session.projectId);
        if (project) {
          const file = project.files.find(
            (f) => f.id === fileId || f.path === fileId,
          );
          if (file) {
            initialContent = file.content;
          }
        }
      }

      this.documentStates.set(key, new OTDocumentState(initialContent));
    }
    return this.documentStates.get(key)!;
  }

  /**
   * Update participant cursor position
   */
  updateParticipantCursor(
    sessionId: string,
    participantId: string,
    cursor: { line: number; column: number; file: string },
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(
      (p: SessionParticipant) => p.userId === participantId,
    );
    if (participant) {
      participant.cursor = cursor;
      participant.user.lastSeen = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Update participant selection
   */
  updateParticipantSelection(
    sessionId: string,
    participantId: string,
    selection: {
      start: { line: number; column: number; file: string };
      end: { line: number; column: number; file: string };
    },
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(
      (p: SessionParticipant) => p.userId === participantId,
    );
    if (participant) {
      participant.selection = selection;
      participant.user.lastSeen = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Update participant viewport state
   */
  updateParticipantViewport(
    sessionId: string,
    participantId: string,
    viewport: any,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(
      (p: SessionParticipant) => p.userId === participantId,
    );
    if (participant) {
      participant.viewport = viewport;
      participant.user.lastSeen = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Create version snapshot
   */
  createVersionSnapshot(
    projectId: string,
    authorId: string,
    description?: string,
  ): VersionEntry {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Get latest version number
    const latestVersion = this.versions.findLatest(projectId);
    const versionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Create file snapshot
    const files: Record<string, string> = {};
    project.files.forEach((file) => {
      files[file.path] = file.content;
    });

    const snapshot: ProjectSnapshot = {
      files,
      metadata: {
        totalFiles: project.files.length,
        totalSize: project.files.reduce((sum, file) => sum + file.size, 0),
        languageCounts: this.calculateLanguageCounts(project.files),
      },
    };

    const version: VersionEntry = {
      id: this.generateId(),
      version: versionNumber,
      authorId,
      timestamp: new Date(),
      description,
      changes: [], // Would be populated from change history
      snapshot,
      tags: [],
      parentId: latestVersion?.id,
    };

    this.versions.set(version.id, version);
    return version;
  }

  /**
   * Restore project from version
   */
  restoreFromVersion(projectId: string, versionId: string): boolean {
    const version = this.versions.get(versionId);
    const project = this.projects.get(projectId);

    if (!version || !project) {
      return false;
    }

    // Restore files
    Object.entries(version.snapshot.files).forEach(([path, content]) => {
      const file = project.files.find((f) => f.path === path);
      if (file) {
        file.content = content;
        file.updatedBy = "system-restore";
        file.updatedAt = new Date();
      }
    });

    this.projects.set(projectId, project);
    return true;
  }

  /**
   * Calculate language counts for files
   */
  private calculateLanguageCounts(files: any[]): Record<string, number> {
    const counts: Record<string, number> = {};

    files.forEach((file) => {
      const lang = file.language || "text";
      counts[lang] = (counts[lang] || 0) + 1;
    });

    return counts;
  }

  /**
   * Get session activity summary
   */
  getSessionActivity(
    sessionId: string,
    timeRange?: { start: Date; end: Date },
  ): {
    participantCount: number;
    operationCount: number;
    messageCount: number;
    evaluationCount: number;
    activeParticipants: string[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        participantCount: 0,
        operationCount: 0,
        messageCount: 0,
        evaluationCount: 0,
        activeParticipants: [],
      };
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const activeParticipants = session.participants
      .filter((p: SessionParticipant) => p.user.lastSeen > fiveMinutesAgo)
      .map((p: SessionParticipant) => p.userId);

    // Count activities in time range
    const start = timeRange?.start || new Date(0);
    const end = timeRange?.end || now;

    const operationCount = this.changes.filter(
      (change) => change.timestamp >= start && change.timestamp <= end,
    ).length;

    const messageCount = this.chats.filter(
      (message) =>
        message.sessionId === sessionId &&
        message.timestamp >= start &&
        message.timestamp <= end,
    ).length;

    const evaluationCount = session.sharedState.evaluations.filter(
      (evalution) => evalution.timestamp >= start && evalution.timestamp <= end,
    ).length;

    return {
      participantCount: session.participants.length,
      operationCount,
      messageCount,
      evaluationCount,
      activeParticipants,
    };
  }

  /**
   * Clean up session data when session ends
   */
  cleanupSession(sessionId: string): void {
    // Remove OT session manager
    this.otSessionManagers.delete(sessionId);

    // Remove document states for this session
    const keysToRemove: string[] = [];
    for (const key of this.documentStates.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => this.documentStates.delete(key));

    // Mark session as inactive
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.set(sessionId, session);
    }
  }

  // Initialize with sample data for testing
  initializeSampleData(): void {
    const sampleUser: User = {
      id: this.generateId(),
      username: "demo_user",
      email: "demo@example.com",
      displayName: "Demo User",
      isOnline: true,
      lastSeen: new Date(),
      preferences: {
        theme: "dark",
        editorFontSize: 14,
        editorTabSize: 2,
        autoSave: true,
        showLineNumbers: true,
        wordWrap: true,
        keyBinding: "vscode",
        notifications: {
          email: true,
          browser: true,
          mentions: true,
          projectUpdates: true,
          suggestionUpdates: false,
        },
      },
    };

    const sampleProject: Project = {
      id: this.generateId(),
      name: "Demo Project",
      description: "A sample project for testing",
      ownerId: sampleUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: true,
      settings: {
        autoSave: true,
        autoEvaluate: false,
        evaluationDebounceMs: 500,
        enableAI: true,
        aiProvider: "openai",
        aiModel: "gpt-3.5-turbo",
        maxHistorySize: 100,
        allowAnonymousAccess: true,
        requireApprovalForJoin: false,
      },
      files: [
        {
          id: this.generateId(),
          name: "main.scad",
          content: "cube(10);",
          language: "openscad",
          path: "/main.scad",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: sampleUser.id,
          updatedBy: sampleUser.id,
          size: 9,
          isBinary: false,
        },
      ],
      collaborators: [
        {
          userId: sampleUser.id,
          user: sampleUser,
          role: "owner",
          permissions: [
            { action: "read", resource: "project", granted: true },
            { action: "write", resource: "project", granted: true },
            { action: "delete", resource: "project", granted: true },
            { action: "share", resource: "project", granted: true },
            { action: "manage", resource: "project", granted: true },
            { action: "evaluate", resource: "project", granted: true },
            { action: "export", resource: "project", granted: true },
          ],
          joinedAt: new Date(),
          invitedBy: sampleUser.id,
          lastActiveAt: new Date(),
        },
      ],
      tags: ["demo", "sample"],
    };

    const sampleSession: Session = {
      id: this.generateId(),
      projectId: sampleProject.id,
      name: "Demo Session",
      description: "A sample collaboration session",
      hostId: sampleUser.id,
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

    this.users.set(sampleUser.id, sampleUser);
    this.projects.set(sampleProject.id, sampleProject);
    this.sessions.set(sampleSession.id, sampleSession);

    console.log("Sample data initialized");
  }
}

// Global store instance
export const mcpStore = new MCPStore();
