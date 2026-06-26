import { useState } from "react";

interface InvoiceData {
  title?: string;
  clientName?: string;
  amount?: string;
  token?: "USDC" | "EURC";
  dueDate?: string;
  description?: string;
  memo?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  invoiceData?: InvoiceData;
}

export default function AIAgent({ onCreateInvoice }: { onCreateInvoice: (data: InvoiceData) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I can help you create invoices. Example: Create invoice for Arc Studio, 250 USDC, web design, 30 days" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<InvoiceData | null>(null);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_KEY;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: "You are an invoice assistant. Extract invoice details and respond ONLY with JSON: {\"message\":\"reply\",\"invoice\":{\"title\":\"\",\"clientName\":\"\",\"amount\":\"\",\"token\":\"USDC\",\"dueDate\":\"YYYY-MM-DD\",\"description\":\"\",\"memo\":\"\"},\"ready\":true}. Today: " + new Date().toISOString().slice(0, 10) + ". Rules: default USDC, 30 days=today+30days, ready:false if missing fields. CRITICAL: Always respond in English regardless of input language. Never use any other language. ",
          messages: messages.concat({ role: "user", content: userMsg }).map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();
      const text = data.content?.[0]?.text ?? "{}";
      let parsed: { message?: string; invoice?: InvoiceData; ready?: boolean };
      try { parsed = JSON.parse(text.replace(/```json|```/g, "").trim()); }
      catch { parsed = { message: text, ready: false }; }
      const msg: Message = { role: "assistant", content: parsed.message ?? "Anladim!", invoiceData: parsed.ready ? parsed.invoice : undefined };
      setMessages(prev => [...prev, msg]);
      if (parsed.ready && parsed.invoice) setPendingInvoice(parsed.invoice);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setMessages(prev => [...prev, { role: "assistant", content: "Hata: " + (err.message ?? "tekrar dener misin?") }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1.5rem" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>AI Agent</h2>
          <span style={{ fontSize: 10, background: "rgba(99,102,241,0.15)", color: "#818cf8", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>Powered by Claude</span>
        </div>
        <p style={{ fontSize: 12, color: "#64748b" }}>Describe your invoice and AI will create it automatically.</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "78%", padding: "0.75rem 1rem", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.role === "user" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.05)", border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none", fontSize: 13, color: "#f1f5f9", lineHeight: 1.5 }}>
              {msg.content}
              {msg.invoiceData && (
                <div style={{ marginTop: 10, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "0.75rem", fontSize: 12 }}>
                  <div style={{ color: "#6ee7b7", fontWeight: 700, marginBottom: 6 }}>Invoice Summary</div>
                  {[["Title", msg.invoiceData.title], ["Client", msg.invoiceData.clientName], ["Amount", msg.invoiceData.amount + " " + (msg.invoiceData.token ?? "USDC")], ["Due Date", msg.invoiceData.dueDate]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k as string} style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", marginBottom: 2 }}>
                      <span>{k}</span><span style={{ color: "#f1f5f9" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "0.75rem 1rem", borderRadius: "12px 12px 12px 2px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, color: "#64748b" }}>Thinking...</div>
          </div>
        )}
      </div>

      {pendingInvoice && (
        <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 10, padding: "1rem", marginBottom: 10 }}>
          <p style={{ fontSize: 13, color: "#818cf8", marginBottom: 10, fontWeight: 600 }}>Do you want to create this invoice?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { onCreateInvoice(pendingInvoice); setPendingInvoice(null); setMessages(prev => [...prev, { role: "assistant", content: "Invoice created! Please review the form and confirm." }]); }}
              style={{ flex: 1, padding: "0.65rem", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Create
            </button>
            <button onClick={() => setPendingInvoice(null)}
              style={{ padding: "0.65rem 1rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Create invoice for Arc Studio, 250 USDC, web design, 30 days..."
          style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "0.75rem 1rem", fontSize: 13, color: "#f1f5f9", outline: "none", fontFamily: "inherit" }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ padding: "0.75rem 1.25rem", borderRadius: 10, border: "none", background: loading || !input.trim() ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: loading || !input.trim() ? "not-allowed" : "pointer" }}>
          â†’
        </button>
      </div>
      <p style={{ fontSize: 10, color: "#334155", marginTop: 8, textAlign: "center" }}>Powered by Claude AI Â· Arc Invoice</p>
    </div>
  );
}



