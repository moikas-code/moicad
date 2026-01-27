/**
 * Session Recording and Playback System
 * Records collaboration sessions for later playback and analysis
 */

import type {
  MCPMessage,
  Session,
  ChangeDelta,
  ChatMessage,
  SessionParticipant,
  EvaluationHistory,
} from "../../shared/mcp-types";

// =============================================================================
// RECORDING TYPES
// =============================================================================

/**
 * Recording entry for any event in a session
 */
export interface RecordingEntry {
  id: string;
  timestamp: Date;
  type:
    | "message"
    | "operation"
    | "cursor"
    | "selection"
    | "participant"
    | "system";
  data: any;
  metadata: {
    sessionId: string;
    authorId?: string;
    version?: number;
    sequence: number;
  };
}

/**
 * Complete session recording
 */
export interface SessionRecording {
  id: string;
  sessionId: string;
  sessionName: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in milliseconds
  participants: {
    userId: string;
    username: string;
    joinTime: Date;
    leaveTime?: Date;
    color: string;
  }[];
  entries: RecordingEntry[];
  metadata: {
    totalOperations: number;
    totalMessages: number;
    totalParticipants: number;
    maxConcurrentParticipants: number;
    fileSize: number; // in bytes
    version: string;
  };
  settings: {
    includeCursors: boolean;
    includeSystemEvents: boolean;
    compressRecording: boolean;
    sampleRate: number; // for cursor movement sampling
  };
}

/**
 * Playback state for session recordings
 */
export interface PlaybackState {
  recordingId: string;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: Date;
  playbackSpeed: number; // 1.0 = normal speed
  currentEntryIndex: number;
  totalEntries: number;
  filters: {
    users: string[];
    eventTypes: string[];
    timeRange?: { start: Date; end: Date };
  };
}

/**
 * Recording analysis results
 */
export interface RecordingAnalysis {
  recordingId: string;
  summary: {
    totalDuration: number;
    activeTime: number; // time with actual activity
    idleTime: number; // time with no activity
    peakActivityPeriod?: { start: Date; end: Date; eventCount: number };
  };
  participants: {
    userId: string;
    username: string;
    contributionMetrics: {
      operationsCount: number;
      messageCount: number;
      activeTimePercentage: number;
      mostActiveHour?: number; // 0-23
      collaborationScore: number; // 0-100
    };
    interactionMetrics: {
      directMentions: number;
      responses: number;
      conflictsResolved: number;
      conflictsInitiated: number;
    };
  };
  timeline: {
    timestamp: Date;
    eventType: string;
    participantCount: number;
    activityLevel: "low" | "medium" | "high";
  }[];
  patterns: {
    peakHours: number[];
    collaborationStyle: "sequential" | "parallel" | "mixed";
    conflictFrequency: "low" | "medium" | "high";
    communicationPattern: "active" | "moderate" | "minimal";
  };
}

// =============================================================================
// SESSION RECORDER
// =============================================================================

export class SessionRecorder {
  private recordings = new Map<string, SessionRecording>();
  private activeRecordings = new Map<string, SessionRecording>();
  private entrySequence = new Map<string, number>();

  /**
   * Start recording a session
   */
  startRecording(
    sessionId: string,
    sessionName: string,
    settings: Partial<SessionRecording["settings"]> = {},
  ): string {
    const recordingId = this.generateRecordingId();

    const recording: SessionRecording = {
      id: recordingId,
      sessionId,
      sessionName,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      participants: [],
      entries: [],
      metadata: {
        totalOperations: 0,
        totalMessages: 0,
        totalParticipants: 0,
        maxConcurrentParticipants: 0,
        fileSize: 0,
        version: "1.0.0",
      },
      settings: {
        includeCursors: true,
        includeSystemEvents: true,
        compressRecording: false,
        sampleRate: 100, // Record every 100ms for cursor movements
        ...settings,
      },
    };

    this.activeRecordings.set(sessionId, recording);
    this.recordings.set(recordingId, recording);
    this.entrySequence.set(sessionId, 0);

    return recordingId;
  }

  /**
   * Stop recording a session
   */
  stopRecording(sessionId: string): SessionRecording | null {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      return null;
    }

    recording.endTime = new Date();
    recording.duration =
      recording.endTime.getTime() - recording.startTime.getTime();

    // Update final metadata
    recording.metadata.fileSize = this.calculateRecordingSize(recording);

    this.activeRecordings.delete(sessionId);
    this.entrySequence.delete(sessionId);

    return recording;
  }

  /**
   * Record an event in the session
   */
  recordEvent(
    sessionId: string,
    eventType: RecordingEntry["type"],
    data: any,
    authorId?: string,
    version?: number,
  ): void {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) {
      return;
    }

    const sequence = (this.entrySequence.get(sessionId) || 0) + 1;
    this.entrySequence.set(sessionId, sequence);

    const entry: RecordingEntry = {
      id: this.generateEntryId(),
      timestamp: new Date(),
      type: eventType,
      data,
      metadata: {
        sessionId,
        authorId,
        version,
        sequence,
      },
    };

    recording.entries.push(entry);

    // Update metadata based on event type
    switch (eventType) {
      case "message":
        recording.metadata.totalMessages++;
        break;
      case "operation":
        recording.metadata.totalOperations++;
        break;
      case "participant":
        this.updateParticipantMetadata(recording, data);
        break;
    }
  }

  /**
   * Record MCP message
   */
  recordMessage(sessionId: string, message: MCPMessage): void {
    if (!this.activeRecordings.has(sessionId)) {
      return;
    }

    // Determine event type based on message type
    let eventType: RecordingEntry["type"] = "message";
    if (
      ["operation", "cursor_update", "selection_update"].includes(message.type)
    ) {
      eventType = "operation";
    } else if (
      ["participant_join", "participant_leave"].includes(message.type)
    ) {
      eventType = "participant";
    } else if (
      ["session_create", "session_update", "ping", "pong"].includes(
        message.type,
      )
    ) {
      eventType = "system";
    }

    this.recordEvent(
      sessionId,
      eventType,
      {
        type: message.type,
        payload: message.payload,
        timestamp: message.timestamp,
      },
      message.userId,
      message.sessionId ? this.extractVersionFromMessage(message) : undefined,
    );
  }

  /**
   * Get recording by ID
   */
  getRecording(recordingId: string): SessionRecording | null {
    return this.recordings.get(recordingId) || null;
  }

  /**
   * Get all recordings for a session
   */
  getRecordingsForSession(sessionId: string): SessionRecording[] {
    return Array.from(this.recordings.values())
      .filter((recording) => recording.sessionId === sessionId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Delete a recording
   */
  deleteRecording(recordingId: string): boolean {
    return this.recordings.delete(recordingId);
  }

  /**
   * Export recording to JSON
   */
  exportRecording(recordingId: string): string | null {
    const recording = this.getRecording(recordingId);
    if (!recording) {
      return null;
    }

    return JSON.stringify(recording, this.jsonReplacer, 2);
  }

  /**
   * Import recording from JSON
   */
  importRecording(jsonData: string): SessionRecording | null {
    try {
      const recording = JSON.parse(
        jsonData,
        this.jsonReviver,
      ) as SessionRecording;

      // Validate recording structure
      if (!this.validateRecording(recording)) {
        return null;
      }

      this.recordings.set(recording.id, recording);
      return recording;
    } catch (error) {
      console.error("Failed to import recording:", error);
      return null;
    }
  }

  /**
   * Analyze recording for insights
   */
  analyzeRecording(recordingId: string): RecordingAnalysis | null {
    const recording = this.getRecording(recordingId);
    if (!recording) {
      return null;
    }

    const analysis: RecordingAnalysis = {
      recordingId,
      summary: this.calculateSummary(recording),
      participants: this.analyzeParticipants(recording),
      timeline: this.createTimeline(recording),
      patterns: this.identifyPatterns(recording),
    };

    return analysis;
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private generateRecordingId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEntryId(): string {
    return `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateParticipantMetadata(
    recording: SessionRecording,
    data: any,
  ): void {
    if (data.type === "participant_join") {
      const existing = recording.participants.find(
        (p) => p.userId === data.userId,
      );
      if (!existing) {
        recording.participants.push({
          userId: data.userId,
          username: data.user?.username || "Unknown",
          joinTime: new Date(),
          color: data.color || "#000000",
        });
        recording.metadata.totalParticipants = recording.participants.length;
        recording.metadata.maxConcurrentParticipants = Math.max(
          recording.metadata.maxConcurrentParticipants,
          recording.participants.length,
        );
      }
    } else if (data.type === "participant_leave") {
      const participant = recording.participants.find(
        (p) => p.userId === data.userId,
      );
      if (participant) {
        participant.leaveTime = new Date();
      }
    }
  }

  private extractVersionFromMessage(message: MCPMessage): number | undefined {
    if (message.type === "operation" && message.payload.operation?.version) {
      return message.payload.operation.version;
    }
    return undefined;
  }

  private calculateRecordingSize(recording: SessionRecording): number {
    return JSON.stringify(recording).length;
  }

  private jsonReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    return value;
  }

  private jsonReviver(key: string, value: any): any {
    if (value && typeof value === "object" && value.__type === "Date") {
      return new Date(value.value);
    }
    return value;
  }

  private validateRecording(recording: any): boolean {
    return (
      recording &&
      typeof recording.id === "string" &&
      typeof recording.sessionId === "string" &&
      Array.isArray(recording.entries) &&
      recording.startTime instanceof Date &&
      recording.endTime instanceof Date
    );
  }

  private calculateSummary(
    recording: SessionRecording,
  ): RecordingAnalysis["summary"] {
    const idleThreshold = 30000; // 30 seconds of no activity
    const activeEntries = recording.entries.filter((e) =>
      ["message", "operation", "participant"].includes(e.type),
    );

    let idleTime = 0;
    let lastActiveTime = recording.startTime.getTime();

    for (const entry of activeEntries) {
      const timeDiff = entry.timestamp.getTime() - lastActiveTime;
      if (timeDiff > idleThreshold) {
        idleTime += timeDiff;
      }
      lastActiveTime = entry.timestamp.getTime();
    }

    const totalDuration = recording.duration;
    const activeTime = totalDuration - idleTime;

    return {
      totalDuration,
      activeTime,
      idleTime,
    };
  }

  private analyzeParticipants(
    recording: SessionRecording,
  ): RecordingAnalysis["participants"] {
    const result = recording.participants.map((participant) => {
      const participantEntries = recording.entries.filter(
        (e) => e.metadata.authorId === participant.userId,
      );

      const operationsCount = participantEntries.filter(
        (e) => e.type === "operation",
      ).length;
      const messageCount = participantEntries.filter(
        (e) => e.type === "message",
      ).length;

      const participantDuration =
        (participant.leaveTime?.getTime() || recording.endTime.getTime()) -
        participant.joinTime.getTime();
      const activeTime =
        participantEntries.length > 0
          ? Math.max(...participantEntries.map((e) => e.timestamp.getTime())) -
            Math.min(...participantEntries.map((e) => e.timestamp.getTime()))
          : 0;

      const activeTimePercentage =
        participantDuration > 0 ? (activeTime / participantDuration) * 100 : 0;

      // Calculate most active hour (simplified)
      const hourCounts = new Map<number, number>();
      participantEntries.forEach((entry) => {
        const hour = entry.timestamp.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });
      const mostActiveHour = Array.from(hourCounts.entries()).sort(
        ([, a], [, b]) => b - a,
      )[0]?.[0];

      // Simple collaboration score based on activity and interaction
      const collaborationScore = Math.min(
        100,
        (operationsCount * 2 + messageCount * 3) /
          Math.max(1, participantDuration / 60000), // per minute
      );

      return {
        userId: participant.userId,
        username: participant.username,
        contributionMetrics: {
          operationsCount,
          messageCount,
          activeTimePercentage,
          mostActiveHour,
          collaborationScore,
        },
        interactionMetrics: {
          directMentions: 0, // Would need to parse message content
          responses: 0, // Would need to track message threading
          conflictsResolved: 0, // Would need to track conflict resolution
          conflictsInitiated: 0, // Would need to track conflict detection
        },
      };
    });

    return result as unknown as RecordingAnalysis["participants"];
  }

  private createTimeline(
    recording: SessionRecording,
  ): RecordingAnalysis["timeline"] {
    const timelineInterval = 60000; // 1 minute intervals
    const timeline: RecordingAnalysis["timeline"] = [];

    for (
      let time = recording.startTime.getTime();
      time < recording.endTime.getTime();
      time += timelineInterval
    ) {
      const intervalStart = new Date(time);
      const intervalEnd = new Date(time + timelineInterval);

      const intervalEntries = recording.entries.filter(
        (e) => e.timestamp >= intervalStart && e.timestamp < intervalEnd,
      );

      const eventTypeCount = intervalEntries.reduce(
        (counts, entry) => {
          counts[entry.type] = (counts[entry.type] || 0) + 1;
          return counts;
        },
        {} as Record<string, number>,
      );

      const mostCommonEventType =
        Object.entries(eventTypeCount).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "system";

      const activityLevel =
        intervalEntries.length < 5
          ? "low"
          : intervalEntries.length < 15
            ? "medium"
            : "high";

      timeline.push({
        timestamp: intervalStart,
        eventType: mostCommonEventType,
        participantCount: recording.participants.filter(
          (p) =>
            p.joinTime <= intervalStart &&
            (!p.leaveTime || p.leaveTime > intervalStart),
        ).length,
        activityLevel,
      });
    }

    return timeline;
  }

  private identifyPatterns(
    recording: SessionRecording,
  ): RecordingAnalysis["patterns"] {
    const entriesByHour = new Map<number, number>();

    recording.entries.forEach((entry) => {
      const hour = entry.timestamp.getHours();
      entriesByHour.set(hour, (entriesByHour.get(hour) || 0) + 1);
    });

    const peakHours = Array.from(entriesByHour.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);

    // Simple pattern detection
    const totalOperations = recording.metadata.totalOperations;
    const conflictEntries = recording.entries.filter(
      (e) => e.type === "system" && e.data.type === "conflict_detected",
    ).length;

    const conflictFrequency =
      totalOperations > 0
        ? conflictEntries / totalOperations > 0.1
          ? "high"
          : conflictEntries / totalOperations > 0.05
            ? "medium"
            : "low"
        : "low";

    const communicationPattern =
      recording.metadata.totalMessages > 20
        ? "active"
        : recording.metadata.totalMessages > 5
          ? "moderate"
          : "minimal";

    return {
      peakHours,
      collaborationStyle: "mixed", // Would need more sophisticated analysis
      conflictFrequency,
      communicationPattern,
    };
  }
}

// =============================================================================
// SESSION PLAYBACK CONTROLLER
// =============================================================================

export class SessionPlaybackController {
  private playbackStates = new Map<string, PlaybackState>();
  private playbackIntervals = new Map<string, NodeJS.Timeout>();
  private eventCallbacks = new Map<string, (entry: RecordingEntry) => void>();

  /**
   * Start playback of a recording
   */
  startPlayback(
    recordingId: string,
    recording: SessionRecording,
    callback: (entry: RecordingEntry) => void,
    options: {
      startTime?: Date;
      speed?: number;
      filters?: PlaybackState["filters"];
    } = {},
  ): string {
    const playbackId = this.generatePlaybackId();

    const state: PlaybackState = {
      recordingId,
      isPlaying: true,
      isPaused: false,
      currentTime: options.startTime || recording.startTime,
      playbackSpeed: options.speed || 1.0,
      currentEntryIndex: 0,
      totalEntries: recording.entries.length,
      filters: options.filters || {
        users: [],
        eventTypes: [],
      },
    };

    // Find starting index based on start time
    state.currentEntryIndex = recording.entries.findIndex(
      (entry) => entry.timestamp >= state.currentTime,
    );

    this.playbackStates.set(playbackId, state);
    this.eventCallbacks.set(playbackId, callback);

    this.scheduleNextEntry(playbackId, recording);

    return playbackId;
  }

  /**
   * Pause playback
   */
  pausePlayback(playbackId: string): boolean {
    const state = this.playbackStates.get(playbackId);
    if (!state || !state.isPlaying) {
      return false;
    }

    state.isPaused = true;
    state.isPlaying = false;

    const interval = this.playbackIntervals.get(playbackId);
    if (interval) {
      clearInterval(interval);
      this.playbackIntervals.delete(playbackId);
    }

    return true;
  }

  /**
   * Resume playback
   */
  resumePlayback(playbackId: string, recording: SessionRecording): boolean {
    const state = this.playbackStates.get(playbackId);
    if (!state || state.isPlaying) {
      return false;
    }

    state.isPaused = false;
    state.isPlaying = true;

    this.scheduleNextEntry(playbackId, recording);

    return true;
  }

  /**
   * Stop playback
   */
  stopPlayback(playbackId: string): boolean {
    const state = this.playbackStates.get(playbackId);
    if (!state) {
      return false;
    }

    const interval = this.playbackIntervals.get(playbackId);
    if (interval) {
      clearInterval(interval);
      this.playbackIntervals.delete(playbackId);
    }

    this.playbackStates.delete(playbackId);
    this.eventCallbacks.delete(playbackId);

    return true;
  }

  /**
   * Set playback speed
   */
  setPlaybackSpeed(playbackId: string, speed: number): boolean {
    const state = this.playbackStates.get(playbackId);
    if (!state) {
      return false;
    }

    state.playbackSpeed = Math.max(0.1, Math.min(10.0, speed));
    return true;
  }

  /**
   * Seek to specific time
   */
  seekToTime(
    playbackId: string,
    recording: SessionRecording,
    targetTime: Date,
  ): boolean {
    const state = this.playbackStates.get(playbackId);
    if (!state) {
      return false;
    }

    state.currentTime = targetTime;
    state.currentEntryIndex = recording.entries.findIndex(
      (entry) => entry.timestamp >= targetTime,
    );

    if (state.currentEntryIndex === -1) {
      state.currentEntryIndex = recording.entries.length;
    }

    return true;
  }

  /**
   * Get playback state
   */
  getPlaybackState(playbackId: string): PlaybackState | null {
    return this.playbackStates.get(playbackId) || null;
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private generatePlaybackId(): string {
    return `playback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private scheduleNextEntry(
    playbackId: string,
    recording: SessionRecording,
  ): void {
    const state = this.playbackStates.get(playbackId);
    const callback = this.eventCallbacks.get(playbackId);

    if (
      !state ||
      !callback ||
      !state.isPlaying ||
      state.currentEntryIndex >= recording.entries.length
    ) {
      // Playback finished
      if (state && state.currentEntryIndex >= recording.entries.length) {
        state.isPlaying = false;
      }
      return;
    }

    const entry = recording.entries[state.currentEntryIndex];
    if (!entry) {
      state.isPlaying = false;
      return;
    }

    const delay =
      (entry.timestamp.getTime() - state.currentTime.getTime()) /
      state.playbackSpeed;

    const interval = setTimeout(
      () => {
        if (!this.applyFilters(entry, state.filters)) {
          // Skip filtered entry and schedule next
          state.currentEntryIndex++;
          this.scheduleNextEntry(playbackId, recording);
          return;
        }

        callback(entry);
        state.currentTime = entry.timestamp;
        state.currentEntryIndex++;

        this.scheduleNextEntry(playbackId, recording);
      },
      Math.max(0, delay),
    );

    // Store interval ID for cleanup
    this.playbackIntervals.set(playbackId, interval);
  }

  private applyFilters(
    entry: RecordingEntry,
    filters: PlaybackState["filters"],
  ): boolean {
    // User filter
    if (filters.users.length > 0 && entry.metadata.authorId) {
      if (!filters.users.includes(entry.metadata.authorId)) {
        return false;
      }
    }

    // Event type filter
    if (filters.eventTypes.length > 0) {
      if (!filters.eventTypes.includes(entry.type)) {
        return false;
      }
    }

    // Time range filter
    if (filters.timeRange) {
      if (
        entry.timestamp < filters.timeRange.start ||
        entry.timestamp > filters.timeRange.end
      ) {
        return false;
      }
    }

    return true;
  }
}

// Export singleton instances
export const sessionRecorder = new SessionRecorder();
export const playbackController = new SessionPlaybackController();
