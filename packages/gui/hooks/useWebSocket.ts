/**
 * useWebSocket Hook - Manages WebSocket connection for real-time updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { WebSocketClient } from '@/lib/websocket';

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  onError?: (error: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { url = 'ws://localhost:42069/ws', autoConnect = true, onError } = options;

  const clientRef = useRef<WebSocketClient | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, (data: any) => void>>(new Map());

  // Initialize WebSocket client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new WebSocketClient(url);
    }

    if (autoConnect) {
      clientRef.current.connect().then(() => {
        setConnected(true);
      }).catch((error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        onError?.(errorMsg);
      });
    }

    return () => {
      // Optionally disconnect on unmount
      // clientRef.current?.disconnect();
    };
  }, [url, autoConnect, onError]);

  const evaluateCode = useCallback((code: string, requestId: string) => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.evaluateCode(code, requestId);
    }
  }, []);

  const onResponse = useCallback((requestId: string, handler: (data: any) => void) => {
    handlersRef.current.set(requestId, handler);
    if (clientRef.current) {
      clientRef.current.onResponse(requestId, handler);
    }
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    setConnected(false);
  }, []);

  const reconnect = useCallback(async () => {
    try {
      await clientRef.current?.connect();
      setConnected(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      onError?.(errorMsg);
    }
  }, [onError]);

  return {
    connected,
    evaluateCode,
    onResponse,
    disconnect,
    reconnect,
  };
}
