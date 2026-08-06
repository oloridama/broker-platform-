import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Headphones, Shield, Wallet, HelpCircle, Bot } from "lucide-react";

interface ChatMessage {
  id: number;
  from: "user" | "agent";
  text: string;
}

// Quick reply topics users can tap
const QUICK_TOPICS = [
  { icon: Wallet, label: "Deposit help", reply: "To deposit, go to Wallet → Deposit, choose a method (e.g. BTC or USDT custodian pool), and send funds to the address shown. Your deposit is credited once our team confirms the transaction." },
  { icon: Shield, label: "Withdrawal", reply: "Withdrawals are submitted from the Wallet page with your crypto address, then approved by our admin team (usually within 24 hours)." },
  { icon: Bot, label: "Trading bots", reply: "Our trading bots (including the MA+RSI 5-min strategy) run automatically once initialized. You can view performance in the Trading Bots section." },
  { icon: HelpCircle, label: "Account help", reply: "For login issues, use 'Forgot Password'. For KYC, submit documents in your Profile. Our team is available 24/7 via this chat." },
];

// Simulated agent responses (keywords → reply)
function agentReply(input: string): string {
  const t = input.toLowerCase();
  if (t.includes("deposit") || t.includes("fund")) {
    return "To fund your account, open Wallet → Deposit, pick a method, and send to the custodian address shown. I can help with any step!";
  }
  if (t.includes("withdraw")) {
    return "Withdrawals need admin approval. Submit from Wallet → Withdraw with your crypto address, and our team will process it typically within 24h.";
  }
  if (t.includes("bot") || t.includes("trad")) {
    return "Our automated bots trade 24/7. Initialize one from the Trading Bots page — the MA+RSI bot runs on 5-minute candles with a 68% win rate.";
  }
  if (t.includes("kyc") || t.includes("verify")) {
    return "You can complete KYC from your Profile page — submit a passport/ID and address. Verification usually takes under 24 hours.";
  }
  if (t.includes("hello") || t.includes("hi")) {
    return "Hello! 👋 I'm the FXA Trade support assistant. How can I help you today?";
  }
  return "Thanks for your message! A support specialist will get back to you shortly. For urgent issues, try the quick topics below.";
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, from: "agent", text: "Hi! 👋 Welcome to FXA Trade support. How can we help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(2);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, open]);

  const sendMessage = (text: string) => {
    if (!text.trim() || typing) return;
    setMessages((m) => [...m, { id: idRef.current++, from: "user", text: text.trim() }]);
    setInput("");
    setTyping(true);
    // Simulate agent typing + reply
    setTimeout(() => {
      setMessages((m) => [...m, { id: idRef.current++, from: "agent", text: agentReply(text) }]);
      setTyping(false);
    }, 900);
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-accent text-white shadow-xl shadow-accent-glow hover:bg-accent-dark transition-all flex items-center justify-center"
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm glass animate-slide-up flex flex-col shadow-2xl" style={{ height: "min(480px, 70vh)" }}>
          {/* Header */}
          <div className="p-4 border-b border-broker-700/50 bg-accent/10 rounded-t-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">FXA Trade Support</p>
              <p className="text-[10px] text-accent flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Online • typically replies instantly
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.from === "user"
                      ? "bg-accent text-white rounded-br-sm"
                      : "bg-broker-700/60 text-broker-100 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-2xl bg-broker-700/60 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-broker-300 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-broker-300 animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-broker-300 animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick topics */}
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {QUICK_TOPICS.map((q) => (
              <button
                key={q.label}
                onClick={() => sendMessage(q.label)}
                disabled={typing}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-broker-800/60 border border-broker-700/40 text-[11px] text-broker-200 hover:border-accent/40 hover:text-accent transition-colors"
              >
                <q.icon className="w-3 h-3" /> {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="p-3 border-t border-broker-700/50 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="input text-sm flex-1"
              aria-label="Chat message"
            />
            <button
              type="submit"
              disabled={typing || !input.trim()}
              className="btn-primary w-11 h-11 !min-w-0 !min-h-0 p-0 flex items-center justify-center"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
