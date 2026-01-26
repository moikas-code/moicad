# MCP REST API Documentation

This document defines the REST API endpoints for the Model Context Protocol (MCP) in moicad.

## Base URL

```
Production: https://api.moicad.com/mcp
Development: http://localhost:42069/api/mcp
```

## Authentication

All API requests require authentication using JWT tokens:

```http
Authorization: Bearer <jwt-token>
```

### Authentication Endpoints

#### POST /auth
Authenticate with the MCP server.

**Request:**
```json
{
  "token": "jwt-token",
  "userId": "user-123",
  "refreshToken": "refresh-token-optional"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "username": "john_doe",
      "email": "john@example.com",
      "displayName": "John Doe",
      "isOnline": true,
      "preferences": { /* UserPreferences */ }
    },
    "sessionToken": "mcp-session-token",
    "expiresAt": "2024-01-24T10:30:00Z"
  },
  "meta": {
    "requestId": "req-123",
    "timestamp": "2024-01-23T10:30:00Z",
    "version": "1.0.0"
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid authentication token",
    "details": { "reason": "expired" }
  }
}
```

#### POST /auth/refresh
Refresh authentication tokens.

**Request:**
```json
{
  "refreshToken": "refresh-token"
}
```

---

## Users

### GET /users/:id
Get user profile information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "username": "john_doe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "isOnline": true,
    "lastSeen": "2024-01-23T10:25:00Z",
    "preferences": { /* UserPreferences */ },
    "stats": {
      "projectsCount": 15,
      "sessionsJoined": 42,
      "contributions": 128
    }
  }
}
```

### PUT /users/:id
Update user profile.

**Request:**
```json
{
  "displayName": "John Smith",
  "avatar": "https://example.com/new-avatar.jpg",
  "preferences": {
    "theme": "dark",
    "editorFontSize": 16,
    "autoSave": true,
    "notifications": {
      "email": true,
      "browser": false
    }
  }
}
```

---

## Projects

### GET /projects
List projects with filtering and pagination.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `search` (string) - Search in name/description
- `owner` (string) - Filter by owner ID
- `public` (boolean) - Filter public projects
- `tags` (string[]) - Filter by tags
- `sortBy` (string) - createdAt, updatedAt, name
- `sortOrder` (string) - asc, desc

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "project-123",
      "name": "Gear Design System",
      "description": "Parametric gear library",
      "ownerId": "user-123",
      "createdAt": "2024-01-20T10:30:00Z",
      "updatedAt": "2024-01-23T09:15:00Z",
      "isPublic": true,
      "settings": { /* ProjectSettings */ },
      "files": [
        {
          "id": "file-123",
          "name": "gear.scad",
          "path": "/gear.scad",
          "language": "openscad",
          "size": 2048,
          "updatedAt": "2024-01-23T09:15:00Z"
        }
      ],
      "collaborators": [
        {
          "userId": "user-456",
          "role": "editor",
          "joinedAt": "2024-01-21T14:30:00Z"
        }
      ],
      "tags": ["gears", "mechanical", "parametric"],
      "stats": {
        "filesCount": 5,
        "collaboratorsCount": 3,
        "sessionsCount": 12,
        "lastActivity": "2024-01-23T09:15:00Z"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /projects
Create a new project.

**Request:**
```json
{
  "name": "Robot Arm Design",
  "description": "6-DOF robotic arm project",
  "isPublic": false,
  "settings": {
    "autoSave": true,
    "autoEvaluate": false,
    "enableAI": true,
    "aiProvider": "openai",
    "aiModel": "gpt-4"
  },
  "tags": ["robotics", "mechanical", "arm"],
  "template": "basic" // optional: basic, gear, mechanism
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "project-456",
    "name": "Robot Arm Design",
    "createdAt": "2024-01-23T10:30:00Z",
    "ownerId": "user-123",
    // ... full project object
  }
}
```

### GET /projects/:id
Get project details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "project-123",
    "name": "Gear Design System",
    "description": "Parametric gear library",
    "owner": { /* User object */ },
    "settings": { /* ProjectSettings */ },
    "files": [ /* ProjectFile array */ ],
    "collaborators": [ /* ProjectCollaborator array */ ],
    "versions": [
      {
        "id": "version-123",
        "version": 42,
        "description": "Added parametric tooth profile",
        "author": { /* User object */ },
        "createdAt": "2024-01-23T09:15:00Z"
      }
    ],
    "activity": [
      {
        "type": "file_updated",
        "user": { /* User object */ },
        "timestamp": "2024-01-23T09:15:00Z",
        "details": {
          "fileId": "file-123",
          "fileName": "gear.scad"
        }
      }
    ]
  }
}
```

### PUT /projects/:id
Update project details.

**Request:**
```json
{
  "name": "Updated Project Name",
  "description": "New description",
  "isPublic": true,
  "settings": {
    "autoEvaluate": true
  },
  "tags": ["updated", "tags"]
}
```

### DELETE /projects/:id
Delete a project.

**Response (204):** No content

---

## Project Files

### GET /projects/:projectId/files
List files in a project.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "file-123",
      "name": "main.scad",
      "path": "/main.scad",
      "language": "openscad",
      "size": 4096,
      "createdAt": "2024-01-20T10:30:00Z",
      "updatedAt": "2024-01-23T09:15:00Z",
      "createdBy": "user-123",
      "updatedBy": "user-456",
      "isBinary": false
    }
  ]
}
```

### POST /projects/:projectId/files
Create or upload a file.

**Request (JSON):**
```json
{
  "name": "new_part.scad",
  "path": "/parts/new_part.scad",
  "language": "openscad",
  "content": "cube([10, 10, 10]);"
}
```

**Request (File Upload):**
```http
Content-Type: multipart/form-data

file: <binary-data>
name: uploaded_model.stl
path: /models/uploaded_model.stl
```

### GET /projects/:projectId/files/:fileId
Get file content.

**Query Parameters:**
- `version` (number) - Get specific version
- `format` (string) - For binary files: raw, base64

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "file-123",
    "name": "main.scad",
    "content": "cube([10, 10, 10]);\ntranslate([15, 0, 0]) sphere(5);",
    "version": 42,
    "history": [
      {
        "version": 42,
        "author": { /* User */ },
        "timestamp": "2024-01-23T09:15:00Z",
        "changes": [/* ChangeDelta array */]
      }
    ]
  }
}
```

### PUT /projects/:projectId/files/:fileId
Update file content.

**Request:**
```json
{
  "content": "cube([20, 20, 20]);\ntranslate([25, 0, 0]) sphere(8);",
  "message": "Increased dimensions for better visibility"
}
```

### DELETE /projects/:projectId/files/:fileId
Delete a file.

**Response (204):** No content

---

## Sessions

### GET /sessions
List active sessions.

**Query Parameters:**
- `projectId` (string) - Filter by project
- `active` (boolean) - Filter by active status
- `participantId` (string) - Filter by participant

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "session-123",
      "name": "Gear Optimization",
      "projectId": "project-123",
      "project": {
        "id": "project-123",
        "name": "Gear Design System"
      },
      "hostId": "user-123",
      "host": { /* User object */ },
      "isActive": true,
      "createdAt": "2024-01-23T08:00:00Z",
      "expiresAt": "2024-01-23T18:00:00Z",
      "participantsCount": 3,
      "settings": { /* SessionSettings */ }
    }
  ]
}
```

### POST /sessions
Create a new collaboration session.

**Request:**
```json
{
  "projectId": "project-123",
  "name": "Live Design Session",
  "description": "Working on gear optimization",
  "settings": {
    "allowAnonymousViewers": false,
    "requireHostApproval": true,
    "maxParticipants": 10,
    "enableTextChat": true,
    "recordSession": false
  }
}
```

### GET /sessions/:id
Get session details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "session-123",
    "name": "Gear Optimization",
    "description": "Working on gear optimization",
    "projectId": "project-123",
    "project": { /* Project object */ },
    "hostId": "user-123",
    "host": { /* User object */ },
    "isActive": true,
    "createdAt": "2024-01-23T08:00:00Z",
    "participants": [
      {
        "userId": "user-123",
        "user": { /* User object */ },
        "joinedAt": "2024-01-23T08:00:00Z",
        "isActive": true,
        "permissionLevel": "owner",
        "color": "#FF5722"
      }
    ],
    "settings": { /* SessionSettings */ },
    "currentFile": "/main.scad",
    "sharedState": { /* SharedSessionState */ },
    "recording": {
      "isRecording": false,
      "duration": 0,
      "size": 0
    }
  }
}
```

### POST /sessions/:id/join
Join a collaboration session.

**Request:**
```json
{
  "password": "optional-password",
  "asAnonymous": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "participant": {
      "userId": "user-456",
      "color": "#2196F3",
      "permissionLevel": "editor"
    },
    "websocketUrl": "ws://localhost:42069/mcp",
    "initialState": { /* SharedSessionState */ },
    "sessionInfo": { /* Session object */ }
  }
}
```

### POST /sessions/:id/leave
Leave a collaboration session.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully left session",
    "participantRemoved": true
  }
}
```

### PUT /sessions/:id
Update session settings.

**Request:**
```json
{
  "name": "Updated Session Name",
  "settings": {
    "maxParticipants": 15,
    "enableVoiceChat": true
  }
}
```

---

## Collaboration

### POST /sessions/:id/operations
Apply an operation to the session.

**Request:**
```json
{
  "delta": {
    "type": "insert",
    "position": {
      "line": 10,
      "column": 5,
      "file": "/main.scad"
    },
    "content": "// Added comment\n"
  },
  "expectedVersion": 42,
  "requestId": "op-123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "applied": true,
    "newVersion": 43,
    "conflicts": [],
    "operationId": "op-123"
  }
}
```

**Response (409):**
```json
{
  "success": false,
  "error": {
    "code": "OP_001",
    "message": "Operation conflict",
    "details": {
      "conflicts": [
        {
          "type": "concurrent_edit",
          "line": 10,
          "theirOperation": "op-456",
          "myOperation": "op-123",
          "suggestedResolution": "theirs"
        }
      ],
      "baseState": "current file content here"
    }
  }
}
```

### GET /sessions/:id/history
Get operation history.

**Query Parameters:**
- `since` (number) - Get operations since version
- `limit` (number) - Limit number of operations
- `userId` (string) - Filter by user

### GET /sessions/:id/chat
Get chat messages.

**Query Parameters:**
- `since` (string) - Get messages since timestamp
- `limit` (number) - Limit number of messages
- `type` (string) - Filter by message type

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-123",
      "authorId": "user-123",
      "author": { /* User object */ },
      "content": "Check out this gear design!",
      "type": "text",
      "timestamp": "2024-01-23T09:15:00Z",
      "replyTo": "msg-122",
      "mentions": ["user-456"],
      "reactions": [
        {
          "emoji": "👍",
          "userIds": ["user-456"]
        }
      ]
    }
  ]
}
```

---

## AI & Suggestions

### GET /ai/providers
List available AI providers.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "openai",
      "name": "OpenAI",
      "type": "openai",
      "model": "gpt-4",
      "enabled": true,
      "capabilities": ["code_suggestion", "optimization", "bug_fix"],
      "rateLimit": {
        "requestsPerMinute": 60,
        "tokensPerMinute": 90000
      }
    }
  ]
}
```

### POST /ai/suggestions
Generate AI suggestions.

**Request:**
```json
{
  "code": "cube(10);",
  "context": {
    "selection": {
      "start": { "line": 1, "column": 0 },
      "end": { "line": 1, "column": 9 }
    },
    "cursor": { "line": 1, "column": 10 },
    "version": 42,
    "file": "/main.scad"
  },
  "type": "optimization",
  "provider": "openai",
  "limit": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "sug-123",
        "type": "optimization",
        "title": "Use more efficient cube creation",
        "description": "Consider using a cube with center=true for better positioning",
        "code": "cube([10, 10, 10], center=true);",
        "originalCode": "cube(10);",
        "position": {
          "line": 1,
          "column": 0,
          "file": "/main.scad"
        },
        "confidence": 0.85,
        "priority": "medium",
        "author": "OpenAI GPT-4",
        "metadata": {
          "category": "performance",
          "estimatedImpact": "low",
          "requiresReview": false
        }
      }
    ],
    "requestId": "req-123",
    "processingTime": 1.23
  }
}
```

### POST /ai/suggestions/:id/apply
Apply a suggestion.

**Request:**
```json
{
  "createOperation": true,
  "message": "Applied AI suggestion for optimization"
}
```

### POST /ai/suggestions/:id/feedback
Provide feedback on a suggestion.

**Request:**
```json
{
  "rating": 5,
  "helpful": true,
  "comment": "Great suggestion, improved performance!"
}
```

---

## Geometry & Evaluation

### POST /evaluate
Evaluate OpenSCAD code.

**Request:**
```json
{
  "code": "cube(10);\ntranslate([15, 0, 0]) sphere(5);",
  "options": {
    "includeNormals": true,
    "detail": 20,
    "format": "optimized"
  },
  "version": 42
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "geometry": {
      "vertices": [/* Float32Array or number array */],
      "indices": [/* Uint32Array or number array */],
      "normals": [/* Float32Array or number array */],
      "bounds": {
        "min": [0, 0, 0],
        "max": [20, 10, 10]
      },
      "stats": {
        "vertexCount": 24,
        "faceCount": 12,
        "volume": 1000
      }
    },
    "executionTime": 45.2,
    "version": 42,
    "cached": false
  }
}
```

### POST /export
Export geometry to file formats.

**Request:**
```json
{
  "geometry": { /* Geometry object */ },
  "format": "stl",
  "binary": true,
  "precision": 6,
  "filename": "model.stl"
}
```

**Response (200):**
Binary file with appropriate MIME type

---

## Invitations

### GET /invitations
List pending invitations.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv-123",
      "projectId": "project-456",
      "project": {
        "name": "Robot Arm Design"
      },
      "inviterId": "user-123",
      "inviter": { /* User object */ },
      "role": "editor",
      "message": "Would you like to collaborate on this?",
      "status": "pending",
      "createdAt": "2024-01-23T08:00:00Z",
      "expiresAt": "2024-01-30T08:00:00Z"
    }
  ]
}
```

### POST /invitations
Send an invitation.

**Request:**
```json
{
  "projectId": "project-123",
  "inviteeEmail": "collaborator@example.com",
  "role": "editor",
  "message": "Please join me in working on this gear design"
}
```

### POST /invitations/:id/accept
Accept an invitation.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "project": { /* Project object */ },
    "collaborator": { /* ProjectCollaborator object */ }
  }
}
```

### POST /invitations/:id/reject
Reject an invitation.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Invitation rejected"
  }
}
```

---

## Analytics & Monitoring

### GET /analytics/usage
Get usage statistics.

**Query Parameters:**
- `period` (string) - day, week, month, year
- `projectId` (string) - Filter by project

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "week",
    "stats": {
      "activeUsers": 150,
      "sessionsCreated": 42,
      "evaluationsCompleted": 1250,
      "suggestionsGenerated": 89,
      "totalEdits": 3420
    },
    "trends": [
      {
        "date": "2024-01-23",
        "activeUsers": 145,
        "sessionsCreated": 8
      }
    ]
  }
}
```

### GET /analytics/performance
Get performance metrics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "averages": {
      "evaluationTime": 45.2,
      "operationLatency": 12.3,
      "suggestionTime": 1.8
    },
    "p95": {
      "evaluationTime": 120.5,
      "operationLatency": 28.7,
      "suggestionTime": 3.2
    },
    "cacheHitRate": 0.73
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error context"
    },
    "requestId": "req-123"
  },
  "meta": {
    "timestamp": "2024-01-23T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_001 | 401 | Authentication failed |
| AUTH_002 | 403 | Unauthorized access |
| VALIDATION_001 | 400 | Invalid input data |
| NOT_FOUND_001 | 404 | Resource not found |
| CONFLICT_001 | 409 | Resource conflict |
| RATE_LIMIT_001 | 429 | Rate limit exceeded |
| INTERNAL_ERROR | 500 | Internal server error |

---

## Rate Limiting

API endpoints have the following rate limits:

| Endpoint | Limit | Period |
|----------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Project operations | 100 requests | 1 minute |
| File operations | 200 requests | 1 minute |
| AI suggestions | 20 requests | 1 minute |
| Evaluation | 50 requests | 1 minute |

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642950000
```

---

## Pagination

List endpoints support pagination with these query parameters:
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)

Pagination information is included in the response meta:
```json
{
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 20,
      "total": 47,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": true
    }
  }
}
```

---

## WebSocket Integration

When working with real-time collaboration:
1. Authenticate via REST API first
2. Use the returned session token for WebSocket connection
3. WebSocket URL format: `ws://host/mcp?token={sessionToken}`
4. WebSocket messages follow the MCP protocol specification

The REST API provides fallback and initialization functionality, while WebSocket handles real-time updates.