import { useState, useEffect, useCallback, useRef } from "react";

interface UseWebSocketProps {
  url: string;
  onMessage: (message: string) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  autoReconnect?: boolean;
}

interface UseWebSocketReturn {
  sendMessage: (message: string) => void;
  connectionStatus: "Connected" | "Connecting" | "Disconnected" | "Error";
  connect: () => void;
  disconnect: () => void;
}

export default function useWebSocket({
  url,
  onMessage,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
  autoReconnect = true,
}: UseWebSocketProps): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] =
    useState<UseWebSocketReturn["connectionStatus"]>("Disconnected");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    try {
      setConnectionStatus("Connecting");
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("Connected");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          onMessage(event.data);
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      ws.onclose = () => {
        setConnectionStatus("Disconnected");
        socketRef.current = null;

        if (autoReconnect && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("Error");
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setConnectionStatus("Error");
    }
  }, [
    url,
    onMessage,
    autoReconnect,
    reconnectAttempts,
    reconnectInterval,
    cleanup,
  ]);

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionStatus("Disconnected");
  }, [cleanup]);

  const sendMessage = useCallback((message: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send message: WebSocket is not connected");
      return;
    }

    try {
      socketRef.current.send(message);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, []);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return {
    sendMessage,
    connectionStatus,
    connect,
    disconnect,
  };
}
