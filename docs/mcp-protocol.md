# MCP (Model Context Protocol) Specification for moicad

This document defines the Model Context Protocol (MCP) for real-time collaboration in moicad, an OpenSCAD clone with AI-assisted CAD features.

## Overview

MCP enables:
- Real-time collaborative editing of OpenSCAD code
- Live 3D geometry updates
- AI-powered suggestions and assistance
- Session management with role-based access control
- Operational transformation for conflict resolution
- WebSocket-based communication with REST API fallback

## Architecture

```
Client (Web/Mobile/Desktop)     MCP Server     Backend Services     AI Providers
        |                           |                |                  |
        |--- WebSocket Connection ---|                |                  |
        |                           |                |                  |
        |---- Real-time Operations ---->|               |                  |
        |                           |                |                  |
        |--- REST API Calls -------->|               |                  |
        |                           |--- Parse/Eval --->|               |
        |                           |<--- Geometry ----|               |
        |                           |                |--- AI Req ----->|
        |                           |                |<-- Suggestions ---|
```

## Core Concepts

### Entities
- **User**: Participant with authentication and preferences
- **Project**: Container for OpenSCAD files with collaboration settings
- **Session**: Live collaboration instance with participants
- **File**: Individual OpenSCAD or supporting files
- **ChangeDelta**: Operational transformation unit for conflict resolution

### Access Control
- **Roles**: Owner, Editor, Viewer with fine-grained permissions
- **Permissions**: Read, Write, Delete, Share, Manage, Evaluate, Export
- **Resources**: Project, File, Session, Settings

## WebSocket Protocol

### Connection

```typescript
// Connect to MCP WebSocket
const ws = new WebSocket('ws://localhost:42069/mcp');

// Authentication
ws.send(JSON.stringify({
  id: 'auth-123',
  type: 'authenticate',
  timestamp: new Date().toISOString(),
  payload: {
    token: 'jwt-token',
    userId: 'user-123'
  }
}));
```

### Message Structure

All WebSocket messages follow this structure:

```typescript
interface MCPMessage {
  id: string;           // Unique message identifier
  type: MCPMessageType; // Message type (see below)
  timestamp: Date;      // ISO timestamp
  sessionId?: string;   // Optional session context
  userId?: string;      // Optional user context
  payload: any;         // Message-specific payload
}
```

### Message Types

#### Session Management

**Join Session**
```typescript
{
  type: 'session_join',
  payload: {
    sessionId: 'session-123',
    password?: string,
    asAnonymous?: false
  }
}
```

**Session Join Response**
```typescript
{
  type: 'session_join',
  payload: {
    session: Session,
    participants: SessionParticipant[],
    initialState: SharedSessionState
  }
}
```

**Create Session**
```typescript
{
  type: 'session_create',
  payload: {
    projectId: 'project-123',
    name: 'Modeling Session',
    description?: 'Working on gear design',
    settings?: Partial<SessionSettings>
  }
}
```

**Participant Join Notification**
```typescript
{
  type: 'participant_join',
  payload: {
    participant: SessionParticipant,
    sessionParticipants: SessionParticipant[]
  }
}
```

#### Real-time Editing

**Operation (Change)**
```typescript
{
  type: 'operation',
  payload: {
    delta: ChangeDelta,
    version: 42,
    expectedVersion: 41
  }
}
```

**Operation Acknowledgment**
```typescript
{
  type: 'operation_ack',
  payload: {
    operationId: 'op-123',
    applied: true,
    newVersion: 42,
    conflicts?: Conflict[]
  }
}
```

**Conflict Resolution**
```typescript
{
  type: 'operation_conflict',
  payload: {
    operationId: 'op-123',
    conflicts: Conflict[],
    resolution?: ConflictResolution
  }
}
```

**Cursor Update**
```typescript
{
  type: 'cursor_update',
  payload: {
    cursor: CursorPosition,
    selection?: SelectionRange
  }
}
```

#### Geometry & Evaluation

**Evaluation Request**
```typescript
{
  type: 'evaluate_request',
  payload: {
    code: 'cube(10);',
    version: 42,
    requestId: 'eval-123',
    options?: {
      includeNormals?: true,
      detail?: 20,
      format?: 'optimized'
    }
  }
}
```

**Evaluation Response**
```typescript
{
  type: 'evaluate_response',
  payload: {
    requestId: 'eval-123',
    geometry?: Geometry,
    errors: EvaluationError[],
    executionTime: 45.2,
    version: 42,
    cached: false
  }
}
```

**Geometry Update (Broadcast)**
```typescript
{
  type: 'geometry_update',
  payload: {
    geometry: Geometry,
    version: 42,
    authorId: 'user-123',
    timestamp: '2024-01-23T10:30:00Z'
  }
}
```

#### AI Assistance

**Suggestion Request**
```typescript
{
  type: 'suggestion_request',
  payload: {
    code: 'cube(10);',
    context: {
      selection?: SelectionRange,
      cursor?: CursorPosition,
      version: 42
    },
    type?: 'optimization' | 'enhancement' | 'bug_fix',
    limit?: 5
  }
}
```

**Suggestion Response**
```typescript
{
  type: 'suggestion_response',
  payload: {
    suggestions: Suggestion[],
    requestId: 'req-123'
  }
}
```

**Apply Suggestion**
```typescript
{
  type: 'suggestion_apply',
  payload: {
    suggestionId: 'sug-123',
    code: 'optimized_code_here',
    createOperation: true
  }
}
```

#### Communication

**Chat Message**
```typescript
{
  type: 'chat_message',
  payload: {
    content: 'Check out this gear design!',
    type: 'text' | 'code' | 'file',
    replyTo?: 'msg-456',
    mentions?: ['user-789'],
    attachments?: MessageAttachment[]
  }
}
```

**Typing Indicator**
```typescript
{
  type: 'typing_indicator',
  payload: {
    isTyping: true,
    userId: 'user-123'
  }
}
```

**Presence Update**
```typescript
{
  type: 'presence_update',
  payload: {
    status: 'online' | 'away' | 'busy',
    viewport?: ViewportState,
    currentFile?: string
  }
}
```

## Operational Transformation

### Change Delta Structure

```typescript
interface ChangeDelta {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: {
    line: number;
    column: number;
    file: string;
  };
  content?: string;        // For insert/replace
  length?: number;         // For delete/replace
  authorId: string;
  timestamp: Date;
  version: number;
  applied: boolean;
  conflicted: boolean;
  resolvedBy?: string;
}
```

### Conflict Resolution Process

1. **Client sends operation** with expected version
2. **Server validates** against current state
3. **If conflict detected**, server returns:
   ```typescript
   {
     type: 'operation_conflict',
     payload: {
       operationId: 'op-123',
       conflicts: [
         {
           type: 'concurrent_edit',
           line: 15,
           theirOperation: 'op-456',
           myOperation: 'op-123',
           suggestedResolution: 'theirs' | 'mine' | 'merge'
         }
       ],
       baseState: string
     }
   }
   ```
4. **Client resolves** and resubmits with resolution

### Version Control

- Each document has a monotonically increasing version number
- Operations are applied in sequence
- Rollback is supported to any previous version
- Branching allows parallel development paths

## REST API Integration

While WebSocket handles real-time updates, REST API provides:

### Authentication
```http
POST /api/mcp/auth
Content-Type: application/json

{
  "token": "jwt-token",
  "userId": "user-123"
}
```

### Project Management
```http
GET /api/mcp/projects
POST /api/mcp/projects
GET /api/mcp/projects/:id
PUT /api/mcp/projects/:id
DELETE /api/mcp/projects/:id
```

### Session Management
```http
GET /api/mcp/sessions
POST /api/mcp/sessions
GET /api/mcp/sessions/:id
PUT /api/mcp/sessions/:id
DELETE /api/mcp/sessions/:id
```

### File Operations
```http
GET /api/mcp/projects/:projectId/files
POST /api/mcp/projects/:projectId/files
GET /api/mcp/projects/:projectId/files/:fileId
PUT /api/mcp/projects/:projectId/files/:fileId
DELETE /api/mcp/projects/:projectId/files/:fileId
```

## AI Integration

### Provider Support

MCP supports multiple AI providers:

```typescript
interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'local' | 'custom';
  model: string;
  capabilities: string[];
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}
```

### Suggestion Generation

1. **Context Collection**: Gather current code, cursor position, selection
2. **Provider Selection**: Choose best AI provider for the task
3. **Prompt Engineering**: Format context for optimal results
4. **Response Processing**: Parse and validate suggestions
5. **Caching**: Store suggestions with TTL

### Suggestion Types

- **Code Optimization**: Performance improvements, better algorithms
- **Bug Fixes**: Identify and resolve common OpenSCAD issues
- **Enhancements**: Add features, improve readability
- **Documentation**: Generate comments, explanations
- **Style**: Apply best practices, formatting

## State Management

### Client State

```typescript
interface ClientState {
  user: User;
  currentSession?: Session;
  documents: Map<string, DocumentState>;
  participants: Map<string, SessionParticipant>;
  pendingOperations: Map<string, Operation>;
  geometry?: Geometry;
  suggestions: Suggestion[];
  chatMessages: ChatMessage[];
}
```

### Server State

```typescript
interface ServerState {
  sessions: Map<string, Session>;
  connections: Map<string, Connection>;
  projects: Map<string, Project>;
  users: Map<string, User>;
  operationLog: Operation[];
  geometryCache: Map<string, CachedGeometry>;
}
```

### Persistence

- **Projects**: Stored in database (PostgreSQL/MongoDB)
- **Sessions**: In-memory with periodic snapshots
- **Operations**: Logged for audit and replay
- **Geometry**: Cached with TTL for performance

## Security & Permissions

### Authentication

- JWT tokens for API access
- WebSocket authentication on connection
- Session tokens for reconnection
- Anonymous access with limited permissions

### Authorization

- Role-based access control (RBAC)
- Resource-level permissions
- Project ownership inheritance
- Session-specific permission overrides

### Data Protection

- End-to-end encryption for sensitive projects
- Rate limiting per user/IP
- Input validation and sanitization
- Audit logging for all operations

## Performance Considerations

### Scalability

- Connection pooling and load balancing
- Horizontal scaling with stateless servers
- Redis for session state distribution
- CDN for static assets

### Optimization

- Operational transformation O(1) complexity
- Geometry evaluation caching
- Incremental parsing for large files
- Batch processing for operations

### Monitoring

- Real-time metrics collection
- Performance dashboards
- Error tracking and alerting
- Usage analytics

## Error Handling

### Error Types

```typescript
enum ErrorCode {
  AUTHENTICATION_FAILED = 'AUTH_001',
  UNAUTHORIZED = 'AUTH_002',
  SESSION_NOT_FOUND = 'SESSION_001',
  PROJECT_NOT_FOUND = 'PROJECT_001',
  OPERATION_CONFLICT = 'OP_001',
  INVALID_OPERATION = 'OP_002',
  GEOMETRY_EVALUATION_ERROR = 'GEO_001',
  AI_SERVICE_ERROR = 'AI_001',
  RATE_LIMIT_EXCEEDED = 'RATE_001',
  VALIDATION_ERROR = 'VALIDATION_001'
}
```

### Error Response Format

```typescript
{
  type: 'error',
  payload: {
    code: string,
    message: string,
    details?: Record<string, any>,
    requestId?: string,
    retryable: boolean
  }
}
```

## Examples

### Simple Collaborative Edit

1. **User A joins session**
2. **User A types "cube(10);"**
3. **Server broadcasts operation**
4. **User B receives update**
5. **Both users see geometry update**

### Conflict Resolution

1. **Users A and B edit same line simultaneously**
2. **Server detects version conflict**
3. **Both users receive conflict notification**
4. **Users choose resolution strategy**
5. **Server applies resolution and broadcasts**

### AI-Assisted Development

1. **User selects problematic code**
2. **Client requests suggestions**
3. **Server calls AI provider**
4. **User applies suggestion**
5. **Operation applied with attribution**

## Future Extensions

- **Voice Collaboration**: Real-time audio communication
- **Version Branching**: Git-like branching for CAD models
- **Plugin System**: Extensible architecture for custom features
- **Mobile Support**: Touch-optimized interface
- **AR/VR Integration**: Immersive 3D editing
- **Cloud Sync**: Multi-device synchronization
