'use client';

/**
 * useMqtt — subscribes to a single MQTT topic via the EMQX WebSocket endpoint.
 *
 * Environment variable:
 *   NEXT_PUBLIC_MQTT_URL  (default: ws://localhost:8083/mqtt)
 *
 * The hook cleans up the subscription and disconnects on unmount.
 */
import { useEffect, useState, useRef } from 'react';
import mqtt, { type MqttClient } from 'mqtt';

interface UseMqttResult {
  /** The last parsed message received on the topic. */
  lastMessage: Record<string, unknown> | null;
  /** Whether the client is currently connected to the broker. */
  isConnected: boolean;
}

export function useMqtt(topic: string): UseMqttResult {
  const [lastMessage,  setLastMessage]  = useState<Record<string, unknown> | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard

    const brokerUrl =
      process.env.NEXT_PUBLIC_MQTT_URL ?? 'ws://localhost:8083/mqtt';

    const client = mqtt.connect(brokerUrl, {
      clientId: `anagu-web-${Math.random().toString(36).slice(2, 9)}`,
      clean:    true,
      reconnectPeriod: 3_000,
      connectTimeout:  10_000,
    });
    clientRef.current = client;

    client.on('connect', () => {
      setIsConnected(true);
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) console.error(`[useMqtt] subscribe error on "${topic}":`, err);
      });
    });

    client.on('message', (receivedTopic, messageBuffer) => {
      if (receivedTopic !== topic) return;
      try {
        const parsed = JSON.parse(messageBuffer.toString()) as Record<string, unknown>;
        setLastMessage(parsed);
      } catch {
        // non-JSON payload — store as raw string
        setLastMessage({ raw: messageBuffer.toString() });
      }
    });

    client.on('disconnect', () => setIsConnected(false));
    client.on('offline',    () => setIsConnected(false));
    client.on('error',      (err) => console.error('[useMqtt] error:', err));

    return () => {
      if (client.connected) {
        client.unsubscribe(topic);
      }
      client.end(true);
      setIsConnected(false);
    };
  }, [topic]);

  return { lastMessage, isConnected };
}
