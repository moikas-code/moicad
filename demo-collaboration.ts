#!/usr/bin/env bun
/**
 * Demo script for moicad Real-Time Collaboration System
 * Demonstrates the key features of the collaborative editing system
 */

import { MCPWebSocketServer } from './backend/mcp-server';
import { mcpStore } from './backend/mcp-store';
import { sessionRecorder } from './backend/mcp-session-recorder';

console.log('🚀 Starting moicad Collaboration System Demo...\n');

// Initialize sample data
console.log('📝 Initializing sample data...');
mcpStore.initializeSampleData();

// Create sample users
const users = [
  {
    id: 'user-alice',
    username: 'alice',
    email: 'alice@example.com',
    displayName: 'Alice Chen',
    isOnline: true,
    lastSeen: new Date(),
    preferences: {
      theme: 'dark' as const,
      editorFontSize: 14,
      editorTabSize: 2,
      autoSave: true,
      showLineNumbers: true,
      wordWrap: true,
      keyBinding: 'vscode' as const,
      notifications: {
        email: true,
        browser: true,
        mentions: true,
        projectUpdates: true,
        suggestionUpdates: false,
      },
    },
  },
  {
    id: 'user-bob',
    username: 'bob',
    email: 'bob@example.com',
    displayName: 'Bob Smith',
    isOnline: true,
    lastSeen: new Date(),
    preferences: {
      theme: 'light' as const,
      editorFontSize: 12,
      editorTabSize: 4,
      autoSave: true,
      showLineNumbers: true,
      wordWrap: false,
      keyBinding: 'sublime' as const,
      notifications: {
        email: true,
        browser: false,
        mentions: true,
        projectUpdates: false,
        suggestionUpdates: true,
      },
    },
  },
];

users.forEach(user => mcpStore.users.set(user.id, user));

// Create a project first
const project = {
  id: 'demo-project-001',
  name: 'OpenSCAD Demo Project',
  description: 'Demo project for collaboration',
  ownerId: users[0].id,
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublic: true,
  settings: {
    autoSave: true,
    autoEvaluate: false,
    evaluationDebounceMs: 500,
    enableAI: true,
    aiProvider: 'openai' as const,
    aiModel: 'gpt-3.5-turbo',
    maxHistorySize: 100,
    allowAnonymousAccess: true,
    requireApprovalForJoin: false,
  },
  files: [
    {
      id: 'file-main',
      name: 'main.scad',
      content: '// OpenSCAD file\n',
      language: 'openscad' as const,
      path: '/main.scad',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: users[0].id,
      updatedBy: users[0].id,
      size: 18,
      isBinary: false,
    },
  ],
  collaborators: users.map((user, index) => ({
    userId: user.id,
    user,
    role: index === 0 ? 'owner' as const : 'editor' as const,
    permissions: [
      { action: 'read' as const, resource: 'project' as const, granted: true },
      { action: 'write' as const, resource: 'project' as const, granted: true },
      { action: 'evaluate' as const, resource: 'project' as const, granted: true },
    ],
    joinedAt: new Date(),
    invitedBy: users[0].id,
    lastActiveAt: new Date(),
  })),
  tags: ['demo', 'collaboration'],
};

mcpStore.projects.set(project.id, project);

// Create a collaborative session
console.log('🎯 Creating collaborative session...');
const session = {
  id: 'demo-session-001',
  projectId: 'demo-project-001',
  name: 'OpenSCAD Collaboration Demo',
  description: 'Real-time collaborative editing demo',
  hostId: users[0].id,
  participants: [
    {
      userId: users[0].id,
      user: users[0],
      joinedAt: new Date(),
      isActive: true,
      cursor: { line: 1, column: 0, file: 'main.scad' },
      viewport: {
        cameraPosition: [0, 0, 100],
        cameraTarget: [0, 0, 0],
        cameraUp: [0, 1, 0],
        zoom: 1,
        renderMode: 'solid' as const,
        showGrid: true,
        showAxes: true,
      },
      permissionLevel: 'owner' as const,
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
    recordSession: true,
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

mcpStore.sessions.set(session.id, session);

console.log(`✅ Created session: ${session.name}`);
console.log(`   Session ID: ${session.id}`);
console.log(`   Host: ${users[0].displayName}`);
console.log(`   Participants: ${session.participants.length}\n`);

// Demo Operational Transformation
console.log('🔄 Demonstrating Operational Transformation...\n');

import { OTSessionManager, generateOperationId } from './backend/mcp-operational-transform';

const otManager = mcpStore.getOTSessionManager(session.id);

// Simulate concurrent operations from multiple users
const operations = [
  {
    id: generateOperationId(),
    type: 'insert' as const,
    position: 10, // Linear position
    content: 'cube(10);',
    authorId: users[0].id,
    timestamp: new Date(),
    version: 1,
  },
  {
    id: generateOperationId(),
    type: 'insert' as const,
    position: 5, // Overlapping position - creates conflict
    content: 'sphere(5);',
    authorId: users[1].id,
    timestamp: new Date(Date.now() + 1),
    version: 2,
  },
  {
    id: generateOperationId(),
    type: 'delete' as const,
    position: 15,
    length: 3,
    authorId: users[0].id,
    timestamp: new Date(Date.now() + 2),
    version: 3,
  },
];

console.log('Applying concurrent operations:');
operations.forEach((op, index) => {
  console.log(`   ${index + 1}. User ${op.authorId}: ${op.type} "${op.content || `${op.length} chars`}" at position ${op.position}`);
});

// Apply operations through OT system
operations.forEach(operation => {
  const result = otManager.applyParticipantOperation(operation.authorId, 'main.scad', operation);
  console.log(`   → ${result.success ? '✅ Applied' : '❌ Failed'}${result.conflicts.length > 0 ? ` with ${result.conflicts.length} conflicts` : ''}`);
});

console.log('\n📊 Session Activity Summary:');
const activity = mcpStore.getSessionActivity(session.id);
console.log(`   Total Participants: ${activity.participantCount}`);
console.log(`   Operations: ${activity.operationCount}`);
console.log(`   Messages: ${activity.messageCount}`);
console.log(`   Evaluations: ${activity.evaluationCount}`);
console.log(`   Active Participants: ${activity.activeParticipants.length}\n`);

// Demo Session Recording
console.log('📹 Demonstrating Session Recording...\n');

const recordingId = sessionRecorder.startRecording(session.id, session.name, {
  includeCursors: true,
  includeSystemEvents: true,
  sampleRate: 100,
});

console.log(`✅ Started recording: ${recordingId}`);

// Simulate some activity during recording
sessionRecorder.recordEvent(session.id, 'message', {
  type: 'chat_message',
  payload: { content: 'Hello everyone! Ready to collaborate?' },
}, users[0].id);

sessionRecorder.recordEvent(session.id, 'operation', {
  type: 'operation',
  payload: { type: 'insert', content: '// Main geometry\n', position: 0 },
}, users[0].id);

sessionRecorder.recordEvent(session.id, 'cursor', {
  type: 'cursor_update',
  payload: { line: 2, column: 5, file: 'main.scad' },
}, users[1].id);

// Stop recording
const recording = sessionRecorder.stopRecording(session.id);
if (recording) {
  console.log(`✅ Stopped recording: ${recording.id}`);
  console.log(`   Duration: ${(recording.duration / 1000).toFixed(2)} seconds`);
  console.log(`   Total entries: ${recording.entries.length}`);
  console.log(`   Total operations: ${recording.metadata.totalOperations}`);
  console.log(`   Total messages: ${recording.metadata.totalMessages}`);
  console.log(`   Max concurrent participants: ${recording.metadata.maxConcurrentParticipants}\n`);
}

// Demo Recording Analysis
console.log('📈 Analyzing recording...\n');
const analysis = sessionRecorder.analyzeRecording(recording.id);
if (analysis) {
  console.log('Collaboration Analysis:');
  console.log(`   Total Duration: ${(analysis.summary.totalDuration / 1000).toFixed(2)}s`);
  console.log(`   Active Time: ${(analysis.summary.activeTime / 1000).toFixed(2)}s`);
  console.log(`   Idle Time: ${(analysis.summary.idleTime / 1000).toFixed(2)}s`);
  
  console.log('\nParticipant Contributions:');
  analysis.participants.forEach(participant => {
    console.log(`   ${participant.username}:`);
    console.log(`     Operations: ${participant.contributionMetrics.operationsCount}`);
    console.log(`     Messages: ${participant.contributionMetrics.messageCount}`);
    console.log(`     Active Time: ${participant.contributionMetrics.activeTimePercentage.toFixed(1)}%`);
    console.log(`     Collaboration Score: ${participant.contributionMetrics.collaborationScore.toFixed(1)}/100`);
  });
  
  console.log('\nCollaboration Patterns:');
  console.log(`   Peak Hours: ${analysis.patterns.peakHours.join(', ')}`);
  console.log(`   Collaboration Style: ${analysis.patterns.collaborationStyle}`);
  console.log(`   Conflict Frequency: ${analysis.patterns.conflictFrequency}`);
  console.log(`   Communication Pattern: ${analysis.patterns.communicationPattern}\n`);
}

// Demo Version Control
console.log('🔖 Demonstrating Version Control...\n');

const version = mcpStore.createVersionSnapshot('demo-project-001', users[0].id, 'Initial collaborative version');
console.log(`✅ Created version ${version.version}`);
console.log(`   Version ID: ${version.id}`);
console.log(`   Author: ${users[0].displayName}`);
console.log(`   Files: ${version.snapshot.metadata.totalFiles}`);
console.log(`   Total Size: ${version.snapshot.metadata.totalSize} bytes`);
console.log(`   Languages: ${Object.entries(version.snapshot.metadata.languageCounts).map(([lang, count]) => `${lang} (${count})`).join(', ')}\n`);

// Demo Conflict Resolution
console.log('⚔️ Demonstrating Conflict Resolution...\n');

import { resolveConflict, detectConflict } from './backend/mcp-operational-transform';

const conflictingOp1 = {
  id: generateOperationId(),
  type: 'insert' as const,
  position: 10,
  content: 'text from user 1',
  authorId: users[0].id,
  timestamp: new Date(),
  version: 1,
};

const conflictingOp2 = {
  id: generateOperationId(),
  type: 'insert' as const,
  position: 10, // Same position = conflict
  content: 'text from user 2',
  authorId: users[1].id,
  timestamp: new Date(),
  version: 2,
};

console.log('Simulating conflicting operations:');
console.log(`   User 1: Insert "${conflictingOp1.content}" at position ${conflictingOp1.position}`);
console.log(`   User 2: Insert "${conflictingOp2.content}" at position ${conflictingOp2.position}`);

const hasConflict = detectConflict(conflictingOp1, conflictingOp2);
console.log(`   Conflict detected: ${hasConflict ? '✅ Yes' : '❌ No'}`);

if (hasConflict) {
  const strategies = ['timestamp', 'author-priority'] as const;
  
  strategies.forEach(strategy => {
    const resolution = resolveConflict(conflictingOp1, conflictingOp2, strategy);
    console.log(`   ${strategy} resolution: ${resolution.strategy}`);
    console.log(`     Winner: ${resolution.resolved.authorId === users[0].id ? users[0].displayName : users[1].displayName}`);
    console.log(`     Resolved content: "${resolution.resolved.content || 'N/A'}"`);
  });
}

console.log('\n🎉 Collaboration System Demo Complete!\n');
console.log('Features demonstrated:');
console.log('   ✅ Real-time session management');
console.log('   ✅ Operational transformation with conflict resolution');
console.log('   ✅ Session recording and analysis');
console.log('   ✅ Version control and snapshots');
console.log('   ✅ Participant activity tracking');
console.log('   ✅ Multi-user collaboration patterns');
console.log('\nTo start the full server:');
console.log('   bun --hot backend/index.ts');
console.log('\nThen connect WebSocket clients to: ws://localhost:3000/ws');
console.log('\n📚 See COLLABORATION_GUIDE.md for detailed usage instructions.');