import { useState, useEffect, useRef } from "react";
import { get } from "@/lib/api";

// ── Types ──────────────────────────────────────────────
export interface LiveQuote {
  price: number;
  change: number;
}

export type LiveQuoteMap = Record<string, LiveQuote>;

/**
 * Subscribes to the server WebSocket for real-time price updates.
 * This avoids hammering the HTTP rate limit with polling.
 *
 * The server broadcasts { type: "price_update", data: { SYMBOL: { price, change } } } every 2s.
 * Falls back gracefully to a single HTTP fetch of /api/trading/quotes for initial values.
 */
export function useLiveQuotes() {
  const [quotes, setQuotes] = useState<LiveQuoteMap>({});
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    const wsUrl =
      (import.meta.env.VITE_WS_URL as string | undefined) ||
      `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

    // Graceful reconnect with backoff
    let retries = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (cancelled) return;
      try {
        socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          retries = 0;
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string);
            if (msg?.type === "price_update" && msg?.data) {
              if (!cancelled) setQuotes(msg.data as LiveQuoteMap);
            }
          } catch {
            // ignore malformed frames
          }
        };

        socket.onclose = () => {
          socketRef.current = null;
          if (cancelled) return;
          const delay = Math.min(5000, 500 * 2 ** retries);
          retries += 1;
          reconnectTimer = setTimeout(connect, delay);
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        // WebSocket unavailable — fall back to one-time HTTP fetch below
      }
    }

    connect();

    // One-time HTTP fallback for initial values (no polling)
    get<unknown[]>("/trading/quotes")
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          const initial: LiveQuoteMap = {};
          for (const q of data as { instrument?: { symbol?: string }; bid?: string; change?: string }[]) {
            const sym = q?.instrument?.symbol;
            if (sym) initial[sym] = { price: Number(q.bid), change: Number(q.change) };
          }
          setQuotes((prev) => ({ ...prev, ...initial }));
        }
      })
      .catch(() => {
        /* offline — WS will carry updates when connected */
      });

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      socketRef.current = null;
    };
  }, []);

  return quotes;
}
