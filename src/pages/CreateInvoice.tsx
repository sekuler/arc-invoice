import { useState, useRef } from "react";
import type { EIP1193Provider } from "viem";
import { nanoid } from "nanoid";
import { saveInvoice, encodeInvoice, getNextNumber, type InvoiceToken, type LineItem } from "../storage";

function addDays(d: number) {
  const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10);
}

interface Props {
  wallet: { provider: EIP1193Provider; address: string; walletName: string };
  onCreated: () => void;
  onCancel: () => void;
}

export default function CreateInvoice({ wallet, onCreated, onCancel }: Props) {
  const [form, setForm] = useState({ title: "", description: "", token: "USDC" as InvoiceToken, clientName: "", clientEmail: "", dueDate: "", memo: "" });
  const [items, setItems] = useState<LineItem[]>([{ id: nanoid(4), description: "", qty: 1, price: 0 }]);
  const [step, setStep] = useState<"idle" | "s1" | "s2" | "s3" | "done">("idle");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const invNum = useRef(getNextNumber()).current;
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  function upd(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }
  function addItem() { setItems(p => [...p, { id: nanoid(4), description: "", qty: 1, price: 0 }]); }
  function removeItem(id: string) { if (items.length > 1) setItems(p => p.filter(i => i.id !== id)); }
  function updItem(id: string, f: keyof LineItem, v: string | number) {
    setItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i));
  }
  function focusNext(e: React.KeyboardEvent<HTMLInputElement>, id: string, f: "description" | "qty" | "price") {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (f === "description") document.getElementById("qty-" + id)?.focus();
    else if (f === "qty") document.getElementById("price-" + id)?.focus();
    else {
      const idx = items.findIndex(i => i.id === id);
      if (idx < items.length - 1) document.getElementById("desc-" + items[idx + 1].id)?.focus();
      else { addItem(); setTimeout(() => { const els = document.querySelectorAll<HTMLInputElement>('[id^="desc-"]'); els[els.length - 1]?.focus(); }, 50); }
    }
  }

  async function submit() {
    if (!form.title || total <= 0 || !form.clientName || !form.dueDate) { alert("Please fill required fields."); return; }
    setStep("s1"); await new Promise(r => setTimeout(r, 500));
    setStep("s2"); await new Promise(r => setTimeout(r, 500));
    setStep("s3"); await new Promise(r => setTimeout(r, 400));
    const inv = { id: nanoid(10), number: invNum, ...form, amount: total.toFixed(2), recipientAddress: wallet.address, createdAt: new Date().toISOString(), status: "pending" as const, lineItems: items };
    saveInvoice(inv);
    setLink(window.location.origin + "/pay/" + encodeInvoice(inv));
    setStep("done");
  }

  if (step !== "idle" && step !== "done") {
    const steps = [{ id: "s1", label: "Creating invoice..." }, { id: "s2", label: "Generating payment link..." }, { id: "s3", label: "Almost ready..." }];
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "2.5rem", maxWidth: 340, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 20 }}>⚙️</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {steps.map((s, idx) => {
              const cur = ["s1","s2","s3"].indexOf(step);
              const done = idx < cur; const active = idx === cur;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: active ? "rgba(99,102,241,0.1)" : done ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)", border: "1px solid " + (active ? "rgba(99,102,241,0.3)" : done ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)") }}>
                  <span style={{ fontSize: 15 }}>{done ? "✅" : active ? "⏳" : "○"}</span>
                  <span style={{ fontSize: 13, color: active ? "#818cf8" : done ? "#6ee7b7" : "#475569", fontWeight: active ? 700 : 400 }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "2rem", maxWidth: 400, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#6ee7b7", marginBottom: 8 }}>Invoice Created!</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>Share the payment link with your client.</p>
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "1rem", marginBottom: 16, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Invoice</span>
              <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>{form.title}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Amount</span>
              <span style={{ fontSize: 16, color: "#6ee7b7", fontWeight: 800 }}>{total.toFixed(2)} {form.token}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ padding: "0.75rem", borderRadius: 8, border: "none", background: copied ? "#059669" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer"
              style={{ padding: "0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              Open Invoice
            </a>
          </div>
          <button onClick={onCreated} style={{ width: "100%", padding: "0.7rem", borderRadius: 8, border: "none", background: "transparent", color: "#475569", fontSize: 13, cursor: "pointer" }}>
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  const S = { label: { fontSize: 12, color: "#94a3b8", fontWeight: 500 } as React.CSSProperties, input: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0.65rem 0.875rem", fontSize: 13, color: "#f1f5f9", outline: "none", fontFamily: "inherit", boxSizing: "border-box" } as React.CSSProperties };

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>New Invoice</h2>
            <div style={{ fontSize: 12, color: "#6366f1", marginTop: 2 }}>{invNum} · auto-generated</div>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 13 }}>✕ Cancel</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
          {/* Form */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "1.5rem", display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "8px 12px" }}>
              <div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Receiving wallet</div>
                <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "monospace" }}>{wallet.walletName} · {wallet.address.slice(0,6)}...{wallet.address.slice(-4)}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={S.label}>Invoice Title *</label>
              <input value={form.title} onChange={e => upd("title", e.target.value)} placeholder="e.g. Website Design - Phase 1" style={S.input} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={S.label}>Description</label>
              <textarea value={form.description} onChange={e => upd("description", e.target.value)} rows={2} placeholder="Describe the work..." style={{ ...S.input, resize: "none" } as React.CSSProperties} />
            </div>

            {/* Line items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={S.label}>Line Items *</label>
                <span style={{ fontSize: 11, color: "#475569" }}>Total: <strong style={{ color: "#f1f5f9" }}>{total.toFixed(2)} {form.token}</strong></span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 76px 72px 28px", padding: "5px 10px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["DESCRIPTION", "QTY", "PRICE", "TOTAL", ""].map(h => <span key={h} style={{ fontSize: 9, color: "#475569", fontWeight: 600, textAlign: h === "TOTAL" || h === "PRICE" ? "right" : "left" }}>{h}</span>)}
                </div>
                {items.map(item => (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 52px 76px 72px 28px", padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                    <input id={"desc-" + item.id} value={item.description} onChange={e => updItem(item.id, "description", e.target.value)} onKeyDown={e => focusNext(e, item.id, "description")} placeholder="Item..." style={{ background: "transparent", border: "none", outline: "none", color: "#f1f5f9", fontSize: 13 }} />
                    <input id={"qty-" + item.id} type="number" min="1" value={item.qty} onChange={e => updItem(item.id, "qty", Number(e.target.value))} onKeyDown={e => focusNext(e, item.id, "qty")} style={{ background: "transparent", border: "none", outline: "none", color: "#94a3b8", fontSize: 13, textAlign: "center", width: "100%" }} />
                    <input id={"price-" + item.id} type="number" min="0" step="0.01" value={item.price || ""} onChange={e => updItem(item.id, "price", Number(e.target.value))} onKeyDown={e => focusNext(e, item.id, "price")} placeholder="0.00" style={{ background: "transparent", border: "none", outline: "none", color: "#f1f5f9", fontSize: 13, textAlign: "right", width: "100%" }} />
                    <div style={{ fontSize: 13, color: "#6ee7b7", fontWeight: 600, textAlign: "right" }}>{(item.qty * item.price).toFixed(2)}</div>
                    <button onClick={() => removeItem(item.id)} disabled={items.length === 1} style={{ background: "none", border: "none", color: items.length === 1 ? "#1e293b" : "#475569", fontSize: 16, cursor: items.length === 1 ? "default" : "pointer" }}>×</button>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 76px 72px 28px", padding: "6px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button onClick={addItem} style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 5, color: "#818cf8", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "3px 8px", textAlign: "left" }}>+ Add Item</button>
                  <span /><span />
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9", textAlign: "right" }}>{total.toFixed(2)}</div>
                  <span />
                </div>
              </div>
            </div>

            {/* Token */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={S.label}>Token</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["USDC", "EURC"] as InvoiceToken[]).map(t => (
                  <button key={t} onClick={() => upd("token", t)} style={{ flex: 1, padding: "0.55rem", borderRadius: 7, border: form.token === t ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.08)", background: form.token === t ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", color: form.token === t ? "#818cf8" : "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Client */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={S.label}>Client Name *</label>
                <input value={form.clientName} onChange={e => upd("clientName", e.target.value)} placeholder="Acme Corp" style={S.input} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={S.label}>Client Email</label>
                <input type="email" value={form.clientEmail} onChange={e => upd("clientEmail", e.target.value)} placeholder="client@example.com" style={S.input} />
              </div>
            </div>

            {/* Due date */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={S.label}>Due Date *</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                {[{ l: "Today", d: 0 }, { l: "7 days", d: 7 }, { l: "14 days", d: 14 }, { l: "30 days", d: 30 }].map(({ l, d }) => (
                  <button key={l} onClick={() => upd("dueDate", addDays(d))} style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: form.dueDate === addDays(d) ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", color: form.dueDate === addDays(d) ? "#818cf8" : "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{l}</button>
                ))}
              </div>
              <input type="date" value={form.dueDate} onChange={e => upd("dueDate", e.target.value)} style={S.input} />
            </div>

            {/* Memo */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={S.label}>Payment Memo <span style={{ fontSize: 10, color: "#475569" }}>Arc memo field · optional</span></label>
              <input value={form.memo} onChange={e => upd("memo", e.target.value)} placeholder="e.g. Order #204, Project Alpha" style={S.input} />
              <span style={{ fontSize: 10, color: "#475569" }}>This memo will be attached to the on-chain payment.</span>
            </div>

            <button onClick={submit} style={{ width: "100%", padding: "0.85rem", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4, boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}>
              Create Invoice
            </button>
          </div>

          {/* Live Preview */}
          <div style={{ background: "rgba(8,11,20,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.25rem", position: "sticky", top: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: "#6366f1", fontWeight: 700, letterSpacing: "1.5px" }}>LIVE PREVIEW</div>
              <div style={{ fontSize: 9, color: "#475569", background: "rgba(255,255,255,0.04)", padding: "2px 7px", borderRadius: 20 }}>{invNum}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: form.title ? "#f1f5f9" : "#334155", marginBottom: 3 }}>{form.title || "Invoice Title"}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
              {form.clientName || "Client Name"}
              {form.dueDate && " · Due " + new Date(form.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8, marginBottom: 8 }}>
              {items.filter(i => i.description).map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#e2e8f0" }}>{item.description}{item.qty > 1 ? " ×" + item.qty : ""}</span>
                  <span style={{ fontSize: 11, color: "#f1f5f9", fontWeight: 600 }}>{(item.qty * item.price).toFixed(2)}</span>
                </div>
              ))}
              {items.filter(i => i.description).length === 0 && <div style={{ fontSize: 11, color: "#334155", textAlign: "center", padding: "4px 0" }}>Add items above</div>}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>{total.toFixed(2)} <span style={{ fontSize: 12, color: "#6366f1" }}>{form.token}</span></span>
            </div>
            {form.memo && <div style={{ background: "rgba(99,102,241,0.08)", borderRadius: 6, padding: "4px 8px", marginBottom: 8 }}><span style={{ fontSize: 10, color: "#818cf8" }}>Memo: {form.memo}</span></div>}
            <div style={{ padding: "0.6rem", borderRadius: 8, background: total > 0 ? "linear-gradient(135deg, #059669, #10b981)" : "rgba(255,255,255,0.06)", color: "#fff", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
              {total > 0 ? "Pay " + total.toFixed(2) + " " + form.token + " with Arc" : "Pay with Arc"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
