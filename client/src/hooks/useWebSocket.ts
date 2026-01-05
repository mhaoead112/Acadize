import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '@/lib/config';

interface WSMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (data: any) => boolean;
  disconnect: () => void;
  reconnect: () => void;
}

export function useWebSocket(onMessage?: (data: any) => void): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldReconnectRef = useRef(true);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) return;

    try {
      // Connect to WebSocket server using configured WS_URL
      const token = localStorage.getItem('auth_token') || localStorage.getItem('eduverse_token');
      const wsUrl = token ? `${WS_URL}/?token=${token}` : WS_URL;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setSocket(ws);

        // Authenticate
        const token = localStorage.getItem('auth_token') || localStorage.getItem('eduverse_token');
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }));
          // Set presence to online after auth
          setTimeout(() => {
            ws.send(JSON.stringify({ type: 'presence', status: 'online' }));
          }, 100);
        }

        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        setSocket(null);

        // Attempt to reconnect
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setIsConnected(false);
  }, [socket]);

  const sendMessage = useCallback((data: any): boolean => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
      return true;
    }
    console.warn('WebSocket is not connected');
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
