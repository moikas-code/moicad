/**
 * MCP REST API Routes
 * Provides REST endpoints for project/session management
 */

import type { 
  User, Project, Session, CreateProjectRequest, CreateSessionRequest,
  Suggestion, ChatMessage, Invitation
} from '../shared/mcp-types';
import { mcpStore } from './mcp-store';
import {
  createAuthMiddleware,
  createSessionMiddleware,
  createSuccessResponse,
  createErrorResponse,
  handleValidationError,
  handleAuthError,
  handlePermissionError,
  handleNotFoundError,
  validateRequired,
  validateEmail,
  validateProjectName,
  validateSessionName,
  checkProjectPermission,
  checkSessionPermission,
  ValidationError
} from './mcp-middleware';

const authMiddleware = createAuthMiddleware();
const sessionMiddleware = createSessionMiddleware();

// Helper to create JSON response with CORS headers
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
    },
  });
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

export async function handleRegisterUser(req: Request): Promise<Response> {
  try {
    const { username, email, password, displayName } = await req.json() as {
      username: string;
      email: string;
      password: string;
      displayName?: string;
    };

    // Validation
    validateRequired(username, 'username');
    validateRequired(email, 'email');
    validateRequired(password, 'password');
    
    validateEmail(email);
    
    if (username.length < 3 || username.length > 30) {
      throw new ValidationError('Username must be between 3 and 30 characters', 'username');
    }
    
    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters', 'password');
    }

    // Check if user already exists
    const existingUser = mcpStore.users.findByEmail(email) || mcpStore.users.findByUsername(username);
    if (existingUser) {
      const error = createErrorResponse('USER_EXISTS', 'User with this email or username already exists', {}, 409);
      return jsonResponse(error.response, error.status);
    }

    // Create user (MVP - no password hashing)
    const user: User = {
      id: mcpStore.generateId(),
      username,
      email,
      displayName: displayName || username,
      isOnline: false,
      lastSeen: new Date(),
      preferences: {
        theme: 'dark',
        editorFontSize: 14,
        editorTabSize: 2,
        autoSave: true,
        showLineNumbers: true,
        wordWrap: true,
        keyBinding: 'vscode',
        notifications: {
          email: true,
          browser: true,
          mentions: true,
          projectUpdates: true,
          suggestionUpdates: false,
        },
      },
    };

    mcpStore.users.set(user.id, user);

    return jsonResponse(createSuccessResponse({ user }, { message: 'User registered successfully' }));
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = handleValidationError(error);
      return jsonResponse(response.response, response.status);
    }
    return jsonResponse(createErrorResponse('REGISTER_FAILED', 'Failed to register user', {}, 500).response, 500);
  }
}

export async function handleLoginUser(req: Request): Promise<Response> {
  try {
    const { email, password } = await req.json() as { email: string; password: string };

    validateRequired(email, 'email');
    validateRequired(password, 'password');
    validateEmail(email);

    // Find user (MVP - no password verification)
    const user = mcpStore.users.findByEmail(email);
    if (!user) {
      const error = createErrorResponse('INVALID_CREDENTIALS', 'Invalid email or password', {}, 401);
      return jsonResponse(error.response, error.status);
    }

    // Generate token (MVP - simple token)
    const token = `${user.id}-${Date.now()}`;

    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    mcpStore.users.set(user.id, user);

    return jsonResponse(createSuccessResponse({ 
      user, 
      token,
      expiresIn: 86400 // 24 hours
    }));
  } catch (error) {
    return jsonResponse(createErrorResponse('LOGIN_FAILED', 'Failed to login', {}, 500).response, 500);
  }
}

export async function handleGetCurrentUser(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  
  if (!authContext.isAuthenticated || !authContext.user) {
    const error = handleAuthError();
    return jsonResponse(error.response, error.status);
  }

  return jsonResponse(createSuccessResponse({ user: authContext.user }));
}

// =============================================================================
// PROJECT MANAGEMENT
// =============================================================================

export async function handleCreateProject(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  
  if (!authContext.isAuthenticated || !authContext.user) {
    const error = handleAuthError();
    return jsonResponse(error.response, error.status);
  }

  try {
    const projectData = await req.json() as CreateProjectRequest;

    // Validation
    validateProjectName(projectData.name);
    
    if (projectData.description && projectData.description.length > 500) {
      throw new ValidationError('Description must be less than 500 characters', 'description');
    }

    if (projectData.tags && projectData.tags.length > 10) {
      throw new ValidationError('Maximum 10 tags allowed', 'tags');
    }

    // Create project
    const project: Project = {
      id: mcpStore.generateId(),
      name: projectData.name,
      description: projectData.description,
      ownerId: authContext.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: projectData.isPublic ?? false,
      settings: {
        autoSave: true,
        autoEvaluate: false,
        evaluationDebounceMs: 500,
        enableAI: true,
        aiProvider: 'openai',
        aiModel: 'gpt-3.5-turbo',
        maxHistorySize: 100,
        allowAnonymousAccess: true,
        requireApprovalForJoin: false,
        ...projectData.settings,
      },
      files: [], // Start with no files
      collaborators: [
        {
          userId: authContext.user.id,
          user: authContext.user,
          role: 'owner',
          permissions: [
            { action: 'read', resource: 'project', granted: true },
            { action: 'write', resource: 'project', granted: true },
            { action: 'delete', resource: 'project', granted: true },
            { action: 'share', resource: 'project', granted: true },
            { action: 'manage', resource: 'project', granted: true },
            { action: 'evaluate', resource: 'project', granted: true },
            { action: 'export', resource: 'project', granted: true },
          ],
          joinedAt: new Date(),
          invitedBy: authContext.user.id,
          lastActiveAt: new Date(),
        },
      ],
      tags: projectData.tags || [],
    };

    mcpStore.projects.set(project.id, project);

    return jsonResponse(createSuccessResponse({ project }, { message: 'Project created successfully' }));
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = handleValidationError(error);
      return jsonResponse(response.response, response.status);
    }
    return jsonResponse(createErrorResponse('CREATE_PROJECT_FAILED', 'Failed to create project', {}, 500).response, 500);
  }
}

export async function handleGetProjects(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  const url = new URL(req.url);
  
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const search = url.searchParams.get('search') || '';
  const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];

  let projects = mcpStore.projects.getAll();

  // Apply filters
  if (search) {
    projects = mcpStore.projects.searchProjects(search);
  }

  if (tags.length > 0) {
    projects = projects.filter((project: Project) => 
      tags.some(tag => project.tags.includes(tag))
    );
  }

  // Filter by permissions
  if (authContext.isAuthenticated && authContext.user) {
    projects = projects.filter((project: Project) => 
      project.isPublic || 
      project.ownerId === authContext.user!.id ||
      project.collaborators.some((c: any) => c.userId === authContext.user!.id)
    );
  } else {
    // Anonymous users can only see public projects
    projects = projects.filter((project: Project) => project.isPublic);
  }

  // Pagination
  const total = projects.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginatedProjects = projects.slice(start, start + limit);

  return jsonResponse(createSuccessResponse({
    projects: paginatedProjects,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }));
}

export async function handleGetProject(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  const url = new URL(req.url);
  const projectId = url.pathname.split('/').pop();

  if (!projectId) {
    const error = handleNotFoundError('Project');
    return jsonResponse(error.response, error.status);
  }

  const project = mcpStore.projects.get(projectId);
  if (!project) {
    const error = handleNotFoundError('Project');
    return jsonResponse(error.response, error.status);
  }

  // Check permissions
  if (authContext.isAuthenticated && authContext.user) {
    if (!checkProjectPermission(authContext.user, project, 'read')) {
      const error = handlePermissionError();
      return jsonResponse(error.response, error.status);
    }
  } else if (!project.isPublic) {
    const error = handleAuthError();
    return jsonResponse(error.response, error.status);
  }

  return jsonResponse(createSuccessResponse({ project }));
}

export async function handleGetSessions(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  const url = new URL(req.url);
  
  const projectId = url.searchParams.get('projectId');
  const active = url.searchParams.get('active') === 'true';

  let sessions = mcpStore.sessions.getAll();

  // Apply filters
  if (projectId) {
    sessions = mcpStore.sessions.findByProject(projectId);
  }

  if (active) {
    sessions = sessions.filter((session: Session) => session.isActive);
  }

  // Filter by permissions
  if (authContext.isAuthenticated && authContext.user) {
    sessions = sessions.filter((session: Session) => 
      session.hostId === authContext.user!.id ||
      session.participants.some((p: any) => p.userId === authContext.user!.id)
    );
  } else {
    // Anonymous users can't see sessions
    sessions = [];
  }

  return jsonResponse(createSuccessResponse({ sessions }));
}

export async function handleCreateSession(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  
  if (!authContext.isAuthenticated || !authContext.user) {
    const error = handleAuthError();
    return jsonResponse(error.response, error.status);
  }

  try {
    const sessionData = await req.json() as CreateSessionRequest;

    // Validation
    validateRequired(sessionData.projectId, 'projectId');
    validateSessionName(sessionData.name);

    const project = mcpStore.projects.get(sessionData.projectId);
    if (!project) {
      const error = handleNotFoundError('Project');
      return jsonResponse(error.response, error.status);
    }

    if (!checkProjectPermission(authContext.user, project, 'read')) {
      const error = handlePermissionError();
      return jsonResponse(error.response, error.status);
    }

    // Create session
    const session: Session = {
      id: mcpStore.generateId(),
      projectId: sessionData.projectId,
      name: sessionData.name,
      description: sessionData.description,
      hostId: authContext.user.id,
      participants: [
        {
          userId: authContext.user.id,
          user: authContext.user,
          joinedAt: new Date(),
          isActive: true,
          cursor: { line: 0, column: 0, file: '' },
          viewport: {
            cameraPosition: [0, 0, 100],
            cameraTarget: [0, 0, 0],
            cameraUp: [0, 1, 0],
            zoom: 1,
            renderMode: 'solid',
            showGrid: true,
            showAxes: true,
          },
          permissionLevel: 'owner',
          color: '#FF6B6B',
        },
      ],
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
        ...sessionData.settings,
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

    return jsonResponse(createSuccessResponse({ session }, { message: 'Session created successfully' }));
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = handleValidationError(error);
      return jsonResponse(response.response, response.status);
    }
    return jsonResponse(createErrorResponse('CREATE_SESSION_FAILED', 'Failed to create session', {}, 500).response, 500);
  }
}

// =============================================================================
// SYSTEM ENDPOINTS
// =============================================================================

export async function handleGetStats(req: Request): Promise<Response> {
  const stats = mcpStore.getStats();
  
  return jsonResponse(createSuccessResponse({ 
    stats,
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
    },
  }));
}

// =============================================================================
// COLLABORATION ENDPOINTS
// =============================================================================

export async function handleGetSessionActivity(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    const error = createErrorResponse('MISSING_SESSION_ID', 'Session ID is required', {}, 400);
    return jsonResponse(error.response, error.status);
  }
  
  const session = mcpStore.sessions.get(sessionId);
  if (!session) {
    const error = handleNotFoundError('Session');
    return jsonResponse(error.response, error.status);
  }
  
  // Check permissions
  if (!authContext.isAuthenticated || !authContext.user) {
    const error = handleAuthError();
    return jsonResponse(error.response, error.status);
  }
  
  const participant = session.participants.find((p: any) => p.userId === authContext.user!.id);
  if (!participant) {
    const error = handlePermissionError();
    return jsonResponse(error.response, error.status);
  }
  
  const timeRange = url.searchParams.get('start') && url.searchParams.get('end') ? {
    start: new Date(url.searchParams.get('start')!),
    end: new Date(url.searchParams.get('end')!),
  } : undefined;
  
  const activity = mcpStore.getSessionActivity(sessionId, timeRange);
  
  return jsonResponse(createSuccessResponse({ 
    sessionId,
    activity,
    participants: session.participants.map((p: any) => ({
      userId: p.userId,
      username: p.user.username,
      displayName: p.user.displayName,
      color: p.color,
      cursor: p.cursor,
      viewport: p.viewport,
      isActive: p.isActive,
      lastSeen: p.user.lastSeen,
    })),
  }));
}

export async function handleGetVersionHistory(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  
  if (!projectId) {
    const error = createErrorResponse('MISSING_PROJECT_ID', 'Project ID is required', {}, 400);
    return jsonResponse(error.response, error.status);
  }
  
  const project = mcpStore.projects.get(projectId);
  if (!project) {
    const error = handleNotFoundError('Project');
    return jsonResponse(error.response, error.status);
  }
  
  // Check permissions
  if (!authContext.isAuthenticated || !authContext.user) {
    const error = handleAuthError();
    return jsonResponse(error.response, error.status);
  }
  
  if (!checkProjectPermission(authContext.user!, project, 'read')) {
    const error = handlePermissionError();
    return jsonResponse(error.response, error.status);
  }
  
  const versions = mcpStore.versions.findByProject(projectId);
  
  return jsonResponse(createSuccessResponse({ 
    projectId,
    versions: versions.map((v: any) => ({
      id: v.id,
      version: v.version,
      authorId: v.authorId,
      timestamp: v.timestamp,
      description: v.description,
      tags: v.tags,
      parentId: v.parentId,
      metadata: v.snapshot?.metadata,
    })),
  }));
}

export async function handleCreateVersion(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  
  if (!authContext.isAuthenticated || !authContext.user) {
    const error = handleAuthError();
    return jsonResponse(error.response, error.status);
  }
  
  try {
    const { projectId, description } = await req.json() as {
      projectId: string;
      description?: string;
    };
    
    validateRequired(projectId, 'projectId');
    
    const project = mcpStore.projects.get(projectId);
    if (!project) {
      const error = handleNotFoundError('Project');
      return jsonResponse(error.response, error.status);
    }
    
    // Check permissions (owner or editor)
    const collaborator = project.collaborators.find((c: any) => c.userId === authContext.user!.id);
    if (!collaborator || !['owner', 'editor'].includes(collaborator.role)) {
      const error = handlePermissionError();
      return jsonResponse(error.response, error.status);
    }
    
    const version = mcpStore.createVersionSnapshot(projectId, authContext.user.id, description);
    
    return jsonResponse(createSuccessResponse({ version }, { message: 'Version created successfully' }));
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = handleValidationError(error);
      return jsonResponse(response.response, response.status);
    }
    return jsonResponse(createErrorResponse('CREATE_VERSION_FAILED', 'Failed to create version', {}, 500).response, 500);
  }
}

export async function handleRestoreVersion(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  const url = new URL(req.url);
  const projectId = url.pathname.split('/').pop();
  const versionId = url.searchParams.get('versionId');
  
  if (!projectId || !versionId) {
    const error = createErrorResponse('MISSING_IDS', 'Project ID and version ID are required', {}, 400);
    return jsonResponse(error.response, error.status);
  }
  
  const project = mcpStore.projects.get(projectId);
  if (!project) {
    const error = handleNotFoundError('Project');
    return jsonResponse(error.response, error.status);
  }
  
  // Check permissions (only owner can restore)
  if (!authContext.isAuthenticated || !authContext.user || project.ownerId !== authContext.user!.id) {
    const error = handlePermissionError();
    return jsonResponse(error.response, error.status);
  }
  
  const success = mcpStore.restoreFromVersion(projectId, versionId);
  if (!success) {
    const error = createErrorResponse('RESTORE_FAILED', 'Failed to restore version', {}, 500);
    return jsonResponse(error.response, error.status);
  }
  
  return jsonResponse(createSuccessResponse({ success: true }, { message: 'Version restored successfully' }));
}

export async function handleGetConflictResolution(req: Request): Promise<Response> {
  const authContext = await authMiddleware(req);
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    const error = createErrorResponse('MISSING_SESSION_ID', 'Session ID is required', {}, 400);
    return jsonResponse(error.response, error.status);
  }
  
  const session = mcpStore.sessions.get(sessionId);
  if (!session) {
    const error = handleNotFoundError('Session');
    return jsonResponse(error.response, error.status);
  }
  
  // Check permissions
  if (!authContext.isAuthenticated || !authContext.user) {
    const error = handleAuthError();
    return jsonResponse(error.response, error.status);
  }
  
  const participant = session.participants.find((p: any) => p.userId === authContext.user!.id);
  if (!participant) {
    const error = handlePermissionError();
    return jsonResponse(error.response, error.status);
  }
  
  const conflicts = session.sharedState.pendingChanges.filter((c: any) => c.conflicted);
  const resolutionStrategies = ['timestamp', 'author-priority', 'manual'];
  
  return jsonResponse(createSuccessResponse({ 
    sessionId,
    conflicts,
    availableStrategies: resolutionStrategies,
    currentStrategy: 'timestamp', // Default strategy
  }));
}