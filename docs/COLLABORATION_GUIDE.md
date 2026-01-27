# Real-Time Collaboration System for moicad

This document describes the comprehensive real-time collaboration system built for moicad, featuring operational transformation, session management, and recording capabilities.

## Overview

The collaboration system provides:
- **Operational Transformation (OT)**: Conflict-free real-time collaborative editing
- **Session Management**: Multi-user sessions with role-based permissions
- **Presence & Activity**: Real-time cursors, selections, and typing indicators
- **Conflict Resolution**: Automatic and manual conflict handling
- **Version Control**: Snapshot creation and restoration
- **Session Recording**: Complete session capture and playback
- **Undo/Redo**: Collaborative undo/redo with proper transformation

## Architecture

### Core Components

1. **MCPWebSocketServer** (`backend/mcp-server.ts`)
   - Handles WebSocket connections and message routing
   - Manages session lifecycle and participant state
   - Applies operational transformation to incoming operations

2. **OTSessionManager** (`backend/mcp-operational-transform.ts`)
   - Implements operational transformation algorithms
   - Handles conflict detection and resolution
   - Manages document state and operation history

3. **MCPStore** (`backend/mcp-store.ts`)
   - In-memory data storage for sessions, users, projects
   - Maintains OT session managers and document states
   - Provides version control and activity tracking

4. **SessionRecorder** (`backend/mcp-session-recorder.ts`)
   - Records all session events for later playback
   - Analyzes collaboration patterns and metrics
   - Provides playback functionality with filters

## Usage Examples

### 1. Setting Up a Collaborative Session

```javascript
// Client-side WebSocket connection
const ws = new WebSocket('ws://localhost:42069/ws');

// Join a session
ws.send(JSON.stringify({
  id: 'join-1',
  type: 'session_join',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    asAnonymous: false
  }
}));

// Listen for session state
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'session_join':
      console.log('Joined session:', message.payload.session);
      break;
    case 'participant_join':
      console.log('New participant:', message.payload.participant);
      break;
  }
};
```

### 2. Real-Time Editing with OT

```javascript
// Apply an operation (text insertion)
ws.send(JSON.stringify({
  id: 'op-1',
  type: 'operation',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    fileId: 'main.scad',
    operation: {
      type: 'insert',
      position: { line: 5, column: 10 },
      content: 'cube(10);'
    }
  }
}));

// Handle incoming operations from other users
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'operation') {
    const { operation, conflicts, transformedCursors } = message.payload;
    
    // Apply the transformed operation to local document
    applyToEditor(operation);
    
    // Update other users' cursors
    transformedCursors?.forEach(cursor => {
      updateRemoteCursor(cursor.userId, cursor.cursor, cursor.color);
    });
    
    // Handle conflicts if any
    if (conflicts.length > 0) {
      showConflictDialog(conflicts);
    }
  }
};
```

### 3. Cursor and Selection Sharing

```javascript
// Send cursor position
ws.send(JSON.stringify({
  id: 'cursor-1',
  type: 'cursor_update',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    cursor: {
      line: 7,
      column: 15,
      file: 'main.scad'
    }
  }
}));

// Send selection range
ws.send(JSON.stringify({
  id: 'selection-1',
  type: 'selection_update',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    selection: {
      start: { line: 3, column: 5, file: 'main.scad' },
      end: { line: 3, column: 20, file: 'main.scad' }
    }
  }
}));

// Handle remote cursors and selections
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'cursor_update') {
    updateRemoteCursor(message.payload.userId, message.payload.cursor, message.payload.color);
  } else if (message.type === 'selection_update') {
    updateRemoteSelection(message.payload.userId, message.payload.selection, message.payload.color);
  }
};
```

### 4. Version Control

```javascript
// Create a version snapshot
ws.send(JSON.stringify({
  id: 'version-1',
  type: 'version_create',
  timestamp: new Date(),
  payload: {
    sessionId: 'session-123',
    projectId: 'project-456',
    description: 'Initial geometry implementation'
  }
}));

// Restore from a previous version
ws.send(JSON.stringify({
  id: 'restore-1',
  type: 'version_restore',
  timestamp: new Date(),
  payload: {
    sessionId: 'session-123',
    projectId: 'project-456',
    versionId: 'version-789'
  }
}));
```

### 5. Conflict Resolution

```javascript
// Request current conflicts
ws.send(JSON.stringify({
  id: 'conflicts-1',
  type: 'conflict_request',
  timestamp: new Date(),
  sessionId: 'session-123'
}));

// Resolve a conflict
ws.send(JSON.stringify({
  id: 'resolve-1',
  type: 'conflict_resolve',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    conflictId: 'conflict-123',
    resolution: 'accept-mine',
    strategy: 'timestamp'
  }
}));
```

### 6. Session Recording

```javascript
// Start recording a session
ws.send(JSON.stringify({
  id: 'record-1',
  type: 'recording_start',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    settings: {
      includeCursors: true,
      includeSystemEvents: true,
      sampleRate: 100
    }
  }
}));

// Stop recording
ws.send(JSON.stringify({
  id: 'record-stop-1',
  type: 'recording_stop',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    save: true
  }
}));

// Playback a recording
ws.send(JSON.stringify({
  id: 'playback-1',
  type: 'recording_playback',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    recordingId: 'recording-456',
    options: {
      speed: 1.0,
      filters: {
        users: [],
        eventTypes: ['operation', 'message']
      }
    }
  }
}));
```

### 7. Collaborative Undo/Redo

```javascript
// Undo last operation
ws.send(JSON.stringify({
  id: 'undo-1',
  type: 'undo',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    fileId: 'main.scad'
  }
}));

// Redo operation
ws.send(JSON.stringify({
  id: 'redo-1',
  type: 'redo',
  timestamp: new Date(),
  sessionId: 'session-123',
  payload: {
    sessionId: 'session-123',
    fileId: 'main.scad'
  }
}));
```

## API Endpoints

### REST Endpoints

- `POST /api/mcp/users/register` - Register new user
- `POST /api/mcp/users/login` - User login
- `GET /api/mcp/projects` - List projects
- `POST /api/mcp/projects` - Create project
- `GET /api/mcp/sessions` - List sessions
- `POST /api/mcp/sessions` - Create session
- `GET /api/mcp/sessions/activity` - Get session activity
- `GET /api/mcp/versions` - Get version history
- `POST /api/mcp/versions` - Create version
- `GET /api/mcp/conflicts` - Get conflict resolution options

### WebSocket Protocol

Connect to: `ws://localhost:42069/ws`

Message format:
```typescript
{
  id: string;
  type: MCPMessageType;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  payload: any;
}
```

## Features

### Operational Transformation

The OT system ensures:
- **Commutativity**: Operations can be applied in any order
- **Associativity**: Grouping of operations doesn't affect result
- **Idempotence**: Multiple applications of same operation have same effect
- **Convergence**: All clients reach same document state

Supported operations:
- `insert` - Insert text at position
- `delete` - Delete text range
- `retain` - Keep text unchanged (for formatting)

### Conflict Resolution Strategies

1. **Timestamp-based** - Most recent operation wins
2. **Author-priority** - Based on user role/permissions
3. **Manual** - Requires user intervention

### Presence Indicators

- **Online status** - Shows who's currently active
- **Cursors** - Real-time cursor positions
- **Selections** - Shared text selections
- **Typing indicators** - Shows when someone is typing

### Session Analysis

The recording system provides insights:
- **Activity patterns** - Peak hours and collaboration style
- **Participant metrics** - Contributions and interactions
- **Timeline view** - Session progression over time
- **Conflict frequency** - How often conflicts occur

## Configuration

### Session Settings

```typescript
{
  allowAnonymousViewers: boolean;
  requireHostApproval: boolean;
  maxParticipants: number;
  enableVoiceChat: boolean;
  enableTextChat: boolean;
  recordSession: boolean;
  autoSaveInterval: number;
}
```

### Recording Settings

```typescript
{
  includeCursors: boolean;
  includeSystemEvents: boolean;
  compressRecording: boolean;
  sampleRate: number; // Cursor sampling frequency in ms
}
```

### Conflict Resolution

```typescript
{
  defaultStrategy: 'timestamp' | 'author-priority' | 'manual';
  timeoutMs: number; // Time to wait for manual resolution
  autoResolveThreshold: number; // Auto-resolve if conflicts below threshold
}
```

## Security Considerations

1. **Authentication** - Token-based auth for session access
2. **Authorization** - Role-based permissions (owner/editor/viewer)
3. **Input validation** - All operations validated before processing
4. **Rate limiting** - Prevents operation spam
5. **Session isolation** - Each session isolated from others

## Performance Optimizations

1. **Operation batching** - Groups multiple operations together
2. **Delta compression** - Only sends changes, not full document
3. **Conflict prevention** - Predicts and avoids conflicts
4. **Cursor sampling** - Reduces cursor update frequency
5. **Memory management** - Cleans up old session data

## Monitoring & Analytics

The system tracks:
- **Session metrics** - Duration, participants, operations
- **Performance** - Operation processing time, memory usage
- **Errors** - Conflict rates, failed operations
- **Usage patterns** - Peak times, collaboration styles

This comprehensive collaboration system enables seamless real-time editing of OpenSCAD files with conflict resolution, version control, and session recording capabilities.