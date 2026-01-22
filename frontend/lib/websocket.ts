/**
 * WebSocket Client for Real-time Code Evaluation
 * Maintains connection to backend and sends/receives geometry updates
 */

import { GeometryResponse, EvaluateResult } from './api-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws';

export type WebSocketMessageType = 'evaluate' | 'parse' | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  code?: string;
  requestId?: string;
  geometry?: GeometryResponse;
  errors?: { message: string }[];
  executionTime?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (msg: any) => void> = new Map();
  private onOpenCallbacks: (() => void)[] = [];
  private onCloseCallbacks: (() => void)[] = [];
  private pendingMessages: any[] = [];

  constructor(url: string = WS_URL) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.url.replace(/^http/, 'ws');
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;

          // Send any pending messages
          while (this.pendingMessages.length > 0) {
            const msg = this.pendingMessages.shift();
            this.send(msg);
          }

          this.onOpenCallbacks.forEach((cb) => cb());
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error: Event) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.ws = null;
          this.onCloseCallbacks.forEach((cb) => cb());
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  public send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queuing message');
      this.pendingMessages.push(message);
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Evaluate code through WebSocket
   */
  public evaluateCode(code: string, requestId: string): void {
    this.send({
      type: 'evaluate',
      code,
      requestId,
    });
  }

  /**
   * Register handler for a specific request ID
   */
  public onResponse(requestId: string, handler: (msg: any) => void): void {
    this.messageHandlers.set(requestId, handler);
  }

  /**
   * Register callback for connection open
   */
  public onOpen(callback: () => void): void {
    this.onOpenCallbacks.push(callback);
  }

  /**
   * Register callback for connection close
   */
  public onClose(callback: () => void): void {
    this.onCloseCallbacks.push(callback);
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    if (message.requestId && this.messageHandlers.has(message.requestId)) {
      const handler = this.messageHandlers.get(message.requestId);
      if (handler) {
        handler(message);
        this.messageHandlers.delete(message.requestId);
      }
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms...`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient();
