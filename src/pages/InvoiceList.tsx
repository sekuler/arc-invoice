import { useState, useEffect } from "react";
import { getInvoices, saveInvoice, updateOverdue, encodeInvoice, fmt, fmtDate, type Invoice } from "../storage";

const SC: Record<string, { bg: string; color: string; label: string }> = {
  paid:    { bg: "rgba(16,185,129,0.12)",  color: "#6ee7b7", label: "Paid" },
  pending: { bg: "rgba(234,179,8,0.12)",   color: "#fbbf24", label: "Pending" },
  overdue: { bg: "rgba(239,68,68,0.12)",   color: "#f87171", label: "Overdue" },
};

const TOKEN_ADDRESSES: Record<string, string> = {
  USDC: "0x3600000000000000000000000000000000000000",
  EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
};

async function checkPayment(invoice: Invoice): Promise<{ paid: boolean; txHash?: string }> {
  try {
    const url = `https://testnet.arcscan.app/api/v2/addresses/${invoice.recipientAddress}/token-transfers?type=ERC-20&filter=to`;
    const res = await fetch(url);
    if (!res.ok) return { paid: false };
    const data = await res.json() as { items?: { transaction_hash?: string; total?: { value?: string; decimals?: string }; token?: { address?: string } }[] };
    const tokenAddr = TOKEN_ADDRESSES[invoice.token]?.toLowerCase();
    const expected = Math.floor(Number(invoice.amount) * 1_000_000);
    for (const item of data.items ?? []) {
      const addr = (item.token?.address_hash ?? "").toLowerCase();
      const decimals = Number(item.total?.decimals ?? 6);
      const value = Number(item.total?.value ?? 0) / Math.pow(10, decimals);
      const raw = Math.floor(value * 1_000_000);
      if (addr === tokenAddr && raw >= expected) return { paid: true, txHash: item.transaction_hash };
    }
    return { paid: false };
  } catch { return { paid: false }; }
}

interface Props { onSelect: (inv: Invoice) => void; selectedId?: string; onNew: () => void; }

export default function InvoiceList({ onSelect, selectedId, onNew }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<"all"|"paid"|"pending"|"overdue">("all");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string|null>(null);
  const [checking, setChecking] = useState<string|null>(null);

  function load() { updateOverdue(); setInvoices(getInvoices()); }
  useEffect(() => { load(); }, []);

  const filtered = invoices.filter(inv => {
    const mf = filter === "all" || inv.status === filter;
    const ms = !search || inv.title.toLowerCase().includes(search.toLowerCase()) || inv.clientName.toLowerCase().includes(search.toLowerCase()) || inv.number.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  function copyLink(inv: Invoice, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + "/pay/" + encodeInvoice(inv));
    setCopied(inv.id); setTimeout(() => setCopied(null), 2000);
  }

  async function check(inv: Invoice, e: React.MouseEvent) {
    e.stopPropagation();
    setChecking(inv.id);
    try {
      const result = await checkPayment(inv);
      if (result.paid) {
        const updated = { ...inv, status: "paid" as const, paidAt: new Date().toISOString(), paidTxHash: result.txHash };
        saveInvoice(updated);
        load();
      } else {
        alert("No payment detected yet.");
      }
    } finally { setChecking(null); }
  }

  async function checkAll() {
    const pending = invoices.filter(i => i.status === "pending" || i.status === "overdue");
    for (const inv of pending) {
      setChecking(inv.id);
      const result = await checkPayment(inv);
      if (result.paid) {
        const updated = { ...inv, status: "paid" as const, paidAt: new Date().toISOString(), paidTxHash: result.txHash };
        saveInvoice(updated);
      }
    }
    setChecking(null);
    load();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "1.25rem 1.5rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>Invoices</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {invoices.some(i => i.status === "pending" || i.status === "overdue") && (
              <button onClick={checkAll} disabled={!!checking}
                style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: "#818cf8", fontSize: 11, fontWeight: 600, cursor: checking ? "not-allowed" : "pointer", opacity: checking ? 0.6 : 1 }}>
                {checking ? "Checking..." : "Check All"}
              </button>
            )}
            <button onClick={onNew} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ New</button>
          </div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..."
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#f1f5f9", outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 5 }}>
          {(["all","paid","pending","overdue"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "3px 10px", borderRadius: 20, border: "none", background: filter === f ? "#6366f1" : "rgba(255,255,255,0.05)", color: filter === f ? "#fff" : "#64748b", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" && "(" + invoices.filter(i => i.status === f).length + ")"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#475569" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
            <p style={{ fontSize: 13 }}>No invoices found.</p>
          </div>
        ) : filtered.map(inv => {
          const s = SC[inv.status];
          return (
            <div key={inv.id} onClick={() => onSelect(inv)}
              style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", background: inv.id === selectedId ? "rgba(99,102,241,0.08)" : "transparent", borderLeft: inv.id === selectedId ? "3px solid #6366f1" : "3px solid transparent", transition: "all 0.1s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{inv.title}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{inv.number} · {inv.clientName}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9" }}>{fmt(inv.amount)}</div>
                  <div style={{ display: "inline-flex", background: s.bg, borderRadius: 20, padding: "1px 7px", fontSize: 10, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <div style={{ fontSize: 10, color: "#475569" }}>Due {fmtDate(inv.dueDate)}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(inv.status === "pending" || inv.status === "overdue") && (
                    <>
                      <button onClick={e => check(inv, e)} disabled={checking === inv.id}
                        style={{ fontSize: 10, color: checking === inv.id ? "#475569" : "#818cf8", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 4, padding: "2px 7px", cursor: checking === inv.id ? "not-allowed" : "pointer", fontWeight: 600 }}>
                        {checking === inv.id ? "..." : "Check"}
                      </button>
                      <button onClick={e => copyLink(inv, e)}
                        style={{ fontSize: 10, color: copied === inv.id ? "#6ee7b7" : "#6366f1", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                        {copied === inv.id ? "Copied!" : "Copy link"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}