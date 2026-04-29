import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '@/lib/config';
import { getStoredToken } from '@/lib/auth-storage';
import { logger } from '@/lib/logger';

export interface WSMessage {
  type?: string;
  [key: string]: unknown;
}

interface UseWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (data: WSMessage) => boolean;
  disconnect: () => void;
  reconnect: () => void;
}

function buildWebSocketUrl(baseUrl: string, token: string | null): string {
  if (!token) return baseUrl;

  const url = new URL(baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export function useWebSocket(onMessage?: (data: WSMessage) => void): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) return;

    try {
      const token = getStoredToken();
      const wsUrl = buildWebSocketUrl(WS_URL, token);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('WebSocket connected');
        setIsConnected(true);
        setSocket(ws);

        const authToken = getStoredToken();
        if (authToken) {
          ws.send(JSON.stringify({ type: 'auth', token: authToken }));
          setTimeout(() => {
            ws.send(JSON.stringify({ type: 'presence', status: 'online' }));
          }, 100);
        }

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WSMessage;
          onMessageRef.current?.(data);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        logger.info('WebSocket disconnected');
        setIsConnected(false);
        setSocket(null);

        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            logger.info('Attempting to reconnect WebSocket...');
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
      };
    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setIsConnected(false);
  }, [socket]);

  const sendMessage = useCallback((data: WSMessage): boolean => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
      return true;
    }
    logger.warn('WebSocket is not connected');
    return false;
  }, [socket]);

  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    socket,
    isConnected,
    sendMessage,
    disconnect,
    reconnect,
  };
}
