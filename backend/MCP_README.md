# MCP Backend Implementation

The Model Context Protocol (MCP) backend service has been successfully scaffolded for the moicad application. This provides real-time collaboration features, user management, and AI-assisted CAD operations.

## Architecture Overview

### Core Components

1. **`mcp-store.ts`** - In-memory data store for MVP
2. **`mcp-middleware.ts`** - Authentication, validation, and WebSocket management
3. **`mcp-api.ts`** - REST API endpoints for MCP operations
4. **`mcp-server.ts`** - WebSocket server for real-time collaboration

### Integration Points

The MCP backend is seamlessly integrated into the existing Bun server in `backend/index.ts`:
- **WebSocket endpoint**: `ws://localhost:3000/ws/mcp`
- **REST API base**: `/api/mcp/*`
- **Compatibility**: Preserves existing `/ws` and `/api/*` endpoints

## Features Implemented

### User Management
- **Registration**: `POST /api/mcp/auth/register`
- **Login**: `POST /api/mcp/auth/login`  
- **Current User**: `GET /api/mcp/auth/me`
- Token-based authentication (MVP implementation)

### Project Management
- **List Projects**: `GET /api/mcp/projects` (with pagination, search, tags)
- **Create Project**: `POST /api/mcp/projects`
- **Get Project**: `GET /api/mcp/projects/:id`
- Permission-based access control

### Session Management
- **List Sessions**: `GET /api/mcp/sessions`
- **Create Session**: `POST /api/mcp/sessions`
- Real-time participant tracking

### Real-time Collaboration (WebSocket)

#### Session Operations
- `session_join` - Join a collaboration session
- `session_leave` - Leave a session
- `session_create` - Create new session
- `participant_update` - Update participant state

#### Real-time Editing
- `operation` - Code changes (operational transforms)
- `cursor_update` - Live cursor position
- `viewport_update` - 3D viewport synchronization

#### Communication
- `chat_message` - Session chat
- `typing_indicator` - User typing status
- `presence_update` - User presence

#### Geometry & Evaluation
- `evaluate_request` - Real-time OpenSCAD evaluation
- `geometry_update` - Geometry synchronization
- `export_request` - Export operations

#### AI Assistance (Interface Ready)
- `suggestion_request` - Request AI suggestions
- `suggestion_apply` - Apply suggestions
- `suggestion_reject` - Reject suggestions

### Data Models

The implementation uses the comprehensive type system from `shared/mcp-types.ts`:

- **Users** with preferences and online status
- **Projects** with files, collaborators, and settings
- **Sessions** with participants, shared state, and versioning
- **Real-time operations** with conflict resolution
- **Chat messages** with reactions and attachments
- **AI suggestions** with metadata and feedback

## Storage

### In-Memory Store (MVP)

For initial development, all data is stored in memory using typed store classes:

```typescript
export const mcpStore = new MCPStore({
  users: new UserStore(),
  projects: new ProjectStore(),
  sessions: new SessionStore(),
  suggestions: new SuggestionStore(),
  // ... other stores
});
```

### Store Features

- **CRUD operations** with type safety
- **Query methods** (findByEmail, findByProject, search, etc.)
- **Automatic cleanup** of expired data
- **Sample data initialization** for testing

## Authentication & Security

### Simple Token Authentication (MVP)

```typescript
// User registration
POST /api/mcp/auth/register
{
  "username": "testuser",
  "email": "test@example.com", 
  "password": "password123"
}

// Returns token
{
  "success": true,
  "data": {
    "user": {...},
    "token": "userId-timestamp",
    "expiresIn": 86400
  }
}
```

### Permission System

- **Project permissions**: read, write, delete, share, manage, evaluate, export
- **Session permissions**: owner, editor, viewer
- **Role-based access** for collaborators

### Validation

- **Input validation** for all API endpoints
- **Type safety** throughout the stack
- **Error handling** with structured responses

## WebSocket Management

### Connection Lifecycle

1. **Connection**: WebSocket upgrade with connection ID
2. **Authentication**: Token validation via `authenticate` message
3. **Session Join**: Join collaboration session
4. **Real-time sync**: Operations, cursors, chat
5. **Cleanup**: Automatic removal on disconnect

### Message Protocol

```typescript
interface MCPMessage {
  id: string;
  type: MCPMessageType;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  payload: any;
}
```

### Features

- **Automatic cleanup** of inactive connections
- **Broadcast** to session participants
- **Error handling** and reconnection support
- **Rate limiting** (configurable)

## Testing the Implementation

### 1. Start the Server

```bash
cd /home/moika/Documents/code/moicad
bun --hot ./backend/index.ts
```

The server will display the available endpoints and WebSocket URLs.

### 2. Test REST API

```bash
# Get system stats
curl http://localhost:3000/api/mcp/stats

# Register a user
curl -X POST http://localhost:3000/api/mcp/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/mcp/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Test WebSocket

```javascript
// Connect to MCP WebSocket
const ws = new WebSocket('ws://localhost:3000/ws/mcp');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    id: 'auth-1',
    type: 'authenticate',
    timestamp: new Date(),
    payload: {
      token: 'userId-timestamp'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## AI Integration Interface

The backend includes hooks for AI providers:

```typescript
interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'local' | 'custom';
  model: string;
  apiKey?: string;
  endpoint?: string;
  enabled: boolean;
  capabilities: string[];
}
```

### Suggestion System

- **Request** suggestions with context
- **Apply** suggestions with confirmation
- **Feedback** system for improvement
- **Caching** for performance

## Performance & Scaling

### Current Limitations (MVP)

- **In-memory storage** (no persistence)
- **Single process** (no clustering)
- **Basic rate limiting**
- **No file uploads** yet

### Scalability Considerations

- **Modular design** for database migration
- **Connection pooling** ready
- **Horizontal scaling** via session affinity
- **Caching layer** implementable

## Development Notes

### Adding New Features

1. **Types**: Define in `shared/mcp-types.ts`
2. **Storage**: Add store methods in `mcp-store.ts`
3. **API**: Add endpoints in `mcp-api.ts`
4. **WebSocket**: Add handlers in `mcp-server.ts`

### Error Handling

- **Structured errors** with codes and messages
- **Validation errors** with field information
- **Authentication errors** with appropriate status codes
- **WebSocket errors** with connection cleanup

### Logging & Monitoring

- **System events** tracked in store
- **Connection metrics** available
- **Performance stats** via `/api/mcp/stats`
- **Error tracking** throughout

## Next Steps

### Production Features

1. **Database persistence** (PostgreSQL/MongoDB)
2. **Redis caching** for sessions
3. **File storage** for project files
4. **Advanced rate limiting**
5. **Monitoring & metrics**

### AI Integration

1. **OpenAI integration** for code suggestions
2. **Local model support** for privacy
3. **Fine-tuning** on OpenSCAD patterns
4. **Custom prompts** for CAD assistance

### Security Enhancements

1. **JWT authentication** with refresh tokens
2. **Password hashing** (bcrypt)
3. **CORS configuration**
4. **SQL injection protection**

The MCP backend is now ready for frontend integration and further development!