# MCP (Model Context Protocol) for moicad

**MCP** is a comprehensive collaboration framework for OpenSCAD development in moicad, enabling real-time multi-user editing, AI-assisted CAD design, and seamless project management.

## 🚀 Quick Start

### For Users

1. **Open moicad**: Navigate to [https://moicad.com](https://moicad.com)
2. **Create Project**: Click "New Project" → Give it a name and description
3. **Start Collaboration**: Click "Start Session" → Share the session link with teammates
4. **Begin Designing**: Start writing OpenSCAD code and see real-time 3D updates

### For Developers

```bash
# Clone and setup
git clone https://github.com/moicad/moicad.git
cd moicad

# Install dependencies
bun install

# Start MCP server with collaboration
bun --hot ./backend/index.ts

# Server runs on http://localhost:42069
# WebSocket available at ws://localhost:42069/mcp
```

## ✨ Key Features

### 🔄 Real-time Collaboration
- **Live Editing**: Multiple users edit the same OpenSCAD code simultaneously
- **Conflict Resolution**: Operational Transformation ensures conflict-free collaboration
- **Cursors & Selections**: See other users' cursor positions and selections
- **Presence Indicators**: Know who's online and what they're working on

### 🤖 AI-Powered Assistance
- **Smart Suggestions**: Get code improvements and optimizations from AI
- **Multi-Provider Support**: OpenAI, Claude, Local models, and custom providers
- **Context-Aware**: AI understands your current code and project context
- **Learning System**: Improves suggestions based on your feedback

### 📁 Project Management
- **Version Control**: Create snapshots and restore previous versions
- **File Management**: Organize OpenSCAD files with full project structure
- **Access Control**: Fine-grained permissions for collaborators
- **Session Recording**: Record collaboration sessions for later review

### 💬 Communication
- **Real-time Chat**: Built-in messaging for team coordination
- **Code Sharing**: Share code snippets and file attachments
- **Mentions & Reactions**: @mention teammates and react to messages
- **Typing Indicators**: See when others are typing

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   MCP Server    │    │   Backend       │
│                 │    │                 │    │                 │
│ • React UI      │◄──►│ • WebSocket     │◄──►│ • Parser       │
│ • Monaco Editor │    │ • REST API      │    │ • Evaluator    │
│ • Three.js      │    │ • OT Engine     │    │ • WASM CSG     │
│ • MCP Client    │    │ • AI Manager    │    │ • File Store   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────────┐
                    │   AI Providers     │
                    │                    │
                    │ • OpenAI           │
                    │ • Claude           │
                    │ • Local Models     │
                    │ • Custom APIs      │
                    └──────────────────────┘
```

## 📚 Core Concepts

### Entities

**User**: A participant with authentication, preferences, and permissions
- Authentication via JWT tokens
- Customizable editor settings
- Online/offline status tracking

**Project**: Container for OpenSCAD files and collaboration settings
- Owner-based access control
- Version history and snapshots
- AI configuration and settings

**Session**: Live collaboration instance with real-time editing
- Temporary workspace with participants
- Real-time operation synchronization
- Session recording and playback

**File**: Individual OpenSCAD or supporting files
- Content versioning
- Real-time collaborative editing
- Binary and text file support

### Operational Transformation (OT)

MCP uses Operational Transformation to enable conflict-free collaborative editing:

```typescript
// Operations are automatically transformed against each other
const operation1 = {
  type: 'insert',
  position: { line: 5, column: 10 },
  content: 'sphere(5);',
  authorId: 'user-123'
};

const operation2 = {
  type: 'insert', 
  position: { line: 5, column: 10 },
  content: 'cube(10);',
  authorId: 'user-456'
};

// OT ensures both operations are applied correctly regardless of order
```

## 🛠️ API Reference

### WebSocket Connection

```javascript
// Connect to MCP WebSocket
const ws = new WebSocket('ws://localhost:42069/mcp');

// Authenticate
ws.send(JSON.stringify({
  id: 'auth-123',
  type: 'authenticate',
  timestamp: new Date().toISOString(),
  payload: {
    token: 'your-jwt-token',
    userId: 'user-123'
  }
}));

// Join collaboration session
ws.send(JSON.stringify({
  id: 'join-123',
  type: 'session_join',
  payload: {
    sessionId: 'session-456'
  }
}));
```

### REST API

```javascript
// Create new project
const response = await fetch('/api/mcp/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    name: 'Robot Arm Design',
    description: '6-DOF robotic arm project',
    isPublic: false,
    tags: ['robotics', 'mechanical']
  })
});

// Create collaboration session
const session = await fetch('/api/mcp/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    projectId: 'project-123',
    name: 'Live Design Session',
    settings: {
      maxParticipants: 10,
      enableTextChat: true,
      recordSession: false
    }
  })
});
```

## 🤖 AI Integration

### Getting Suggestions

```javascript
// Request AI suggestions for current code
ws.send(JSON.stringify({
  id: 'suggest-123',
  type: 'suggestion_request',
  payload: {
    code: 'cube(10);',
    context: {
      cursor: { line: 1, column: 10 },
      version: 42,
      file: '/main.scad'
    },
    type: 'optimization',
    limit: 5
  }
}));

// Receive suggestions
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'suggestion_response') {
    message.payload.suggestions.forEach(suggestion => {
      console.log('Suggestion:', suggestion.title);
      console.log('Code:', suggestion.code);
      console.log('Confidence:', suggestion.confidence);
    });
  }
};
```

### Applying Suggestions

```javascript
// Apply a suggestion
ws.send(JSON.stringify({
  id: 'apply-123',
  type: 'suggestion_apply',
  payload: {
    suggestionId: 'sug-456',
    createOperation: true
  }
}));
```

## 🔒 Security & Permissions

### Role-Based Access Control

- **Owner**: Full control over project and sessions
- **Editor**: Can edit files and manage sessions
- **Viewer**: Read-only access to project files

### Permission Types

```typescript
type Permission = {
  action: 'read' | 'write' | 'delete' | 'share' | 'manage' | 'evaluate' | 'export';
  resource: 'project' | 'file' | 'session' | 'settings';
  granted: boolean;
};
```

### Authentication

- JWT-based authentication for API access
- WebSocket authentication on connection
- Anonymous access with limited permissions
- Session tokens for reconnection

## 🚀 Deployment

### Development Setup

```bash
# Local development
git clone https://github.com/moicad/moicad.git
cd moicad
bun install
bun --hot ./backend/index.ts
```

### Production Deployment

```bash
# Using Docker
docker build -t moicad-mcp .
docker run -p 42069:42069 moicad-mcp

# Using Docker Compose
docker-compose up -d
```

### Environment Variables

```bash
# Server Configuration
PORT=42069
HOST=0.0.0.0

# Database (when using persistent storage)
DATABASE_URL=postgresql://user:pass@localhost/moicad

# AI Provider Settings
OPENAI_API_KEY=your-openai-key
CLAUDE_API_KEY=your-claude-key

# Redis (for session clustering)
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://yourdomain.com
```

## 🧪 Integration Examples

### Custom AI Provider

```typescript
import type { IAIProvider, SuggestionRequest, SuggestionResponse } from './ai-types';

export class CustomAIProvider implements IAIProvider {
  id = 'custom-ai';
  name = 'Custom AI Provider';
  type = 'custom';
  
  async initialize(config: any): Promise<void> {
    // Initialize your AI service
  }
  
  async generateSuggestions(request: SuggestionRequest): Promise<SuggestionResponse> {
    // Generate suggestions using your AI service
    const suggestions = await this.callCustomAI(request);
    
    return {
      suggestions,
      provider: this.id,
      processingTime: Date.now() - startTime,
      metadata: { custom: true }
    };
  }
  
  async validateSuggestion(suggestion: any, context: any): Promise<any> {
    // Validate suggestions before applying
  }
  
  async dispose(): Promise<void> {
    // Clean up resources
  }
}

// Register the provider
import { aiManager } from './mcp-ai-adapter';
await aiManager.registerProvider(new CustomAIProvider());
```

### Custom Message Handler

```typescript
import type { MCPMessage } from './mcp-types';
import { mcpWebSocketServer } from './mcp-server';

// Add custom message handler
mcpWebSocketServer.addHandler('custom_action', async (message: MCPMessage, context: any) => {
  const { action, data } = message.payload;
  
  switch (action) {
    case 'export_snapshot':
      // Handle custom export logic
      return {
        id: message.id,
        type: 'custom_action_response',
        payload: { success: true, url: snapshotUrl }
      };
      
    case 'generate_report':
      // Handle report generation
      return {
        id: message.id,
        type: 'custom_action_response', 
        payload: { reportData }
      };
  }
});
```

## 📊 Performance & Monitoring

### Metrics

```javascript
// Get system statistics
const stats = await fetch('/api/mcp/stats');
const { activeUsers, sessionsCreated, evaluationsCompleted } = stats.data;

// Get AI performance
const analytics = await aiManager.getAnalytics({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  end: new Date()
});

console.log('AI Performance:', analytics);
```

### Caching

- Geometry evaluation results cached for performance
- AI suggestions cached with configurable TTL
- Session state synchronized across cluster nodes

## 🤝 Contributing

We welcome contributions to MCP! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests**: Ensure all new features have tests
5. **Submit a pull request**

### Development Guidelines

- Follow TypeScript best practices
- Use the existing code style and patterns
- Add comprehensive documentation
- Test both WebSocket and REST functionality
- Consider security implications of all changes

## 📄 Documentation

- [Developer Guide](./docs/mcp-developer-guide.md) - Comprehensive development documentation
- [Integration Examples](./docs/mcp-integration-examples.md) - Code examples and tutorials
- [Deployment Guide](./docs/mcp-deployment.md) - Production deployment instructions
- [Troubleshooting](./docs/mcp-troubleshooting.md) - Common issues and solutions
- [API Reference](./docs/mcp-api.md) - Complete REST API documentation
- [Protocol Specification](./docs/mcp-protocol.md) - WebSocket protocol details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/moicad/moicad/issues)
- **Discussions**: [GitHub Discussions](https://github.com/moicad/moicad/discussions)
- **Community**: [Discord Server](https://discord.gg/moicad)

## 📄 License

MCP is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

**Built with ❤️ by the moicad team**

Transforming CAD development through collaborative AI-powered design tools.
