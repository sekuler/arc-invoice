import { encodeInvoice, fmtDate, fmt, type Invoice } from "../storage";

interface Props { invoice: Invoice; onClose: () => void; }

const SC: Record<string, { bg: string; color: string; border: string; label: string }> = {
  paid:    { bg: "rgba(16,185,129,0.1)",  color: "#6ee7b7", border: "rgba(16,185,129,0.3)",  label: "Paid" },
  pending: { bg: "rgba(234,179,8,0.1)",   color: "#fbbf24", border: "rgba(234,179,8,0.3)",   label: "Pending" },
  overdue: { bg: "rgba(239,68,68,0.1)",   color: "#f87171", border: "rgba(239,68,68,0.3)",   label: "Overdue" },
};

export default function InvoiceDetail({ invoice, onClose }: Props) {
  const s = SC[invoice.status];
  const link = window.location.origin + "/pay/" + encodeInvoice(invoice);

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#0d1224" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#0d1224", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }}>←</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{invoice.number}</span>
          <div style={{ background: s.bg, border: "1px solid " + s.border, borderRadius: 20, padding: "2px 9px", fontSize: 10, color: s.color, fontWeight: 600 }}>{s.label}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => navigator.clipboard.writeText(link)} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Copy Link</button>
          {invoice.status !== "paid" && (
            <a href={link} target="_blank" rel="noopener noreferrer" style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>Send</a>
          )}
        </div>
      </div>

      <div style={{ margin: "1.25rem", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ background: "#0f172a", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>ArcInvoice</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>Invoice</div>
            <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{invoice.number}</div>
          </div>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, marginBottom: 3, letterSpacing: "0.5px" }}>FROM</div>
              <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600 }}>Arc Invoice</div>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{invoice.recipientAddress.slice(0,8)}...{invoice.recipientAddress.slice(-6)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, marginBottom: 3, letterSpacing: "0.5px" }}>BILL TO</div>
              <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600 }}>{invoice.clientName}</div>
              {invoice.clientEmail && <div style={{ fontSize: 10, color: "#64748b" }}>{invoice.clientEmail}</div>}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, marginBottom: 3 }}>DATE ISSUED</div>
              <div style={{ fontSize: 12, color: "#1e293b" }}>{fmtDate(invoice.createdAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, marginBottom: 3 }}>DUE DATE</div>
              <div style={{ fontSize: 12, color: invoice.status === "overdue" ? "#ef4444" : "#1e293b", fontWeight: invoice.status === "overdue" ? 700 : 400 }}>{fmtDate(invoice.dueDate)}</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 68px 68px", gap: 6, padding: "4px 0", borderBottom: "1px solid #e2e8f0", marginBottom: 6 }}>
              {["ITEM","QTY","PRICE","AMOUNT"].map(h => <span key={h} style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textAlign: h === "PRICE" || h === "AMOUNT" ? "right" : "left" }}>{h}</span>)}
            </div>
            {(invoice.lineItems?.length > 0 ? invoice.lineItems : [{ id: "1", description: invoice.title, qty: 1, price: Number(invoice.amount) }]).map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 48px 68px 68px", gap: 6, padding: "5px 0", borderBottom: "1px solid #f8fafc" }}>
                <span style={{ fontSize: 12, color: "#1e293b" }}>{item.description}</span>
                <span style={{ fontSize: 12, color: "#64748b", textAlign: "center" }}>{item.qty}</span>
                <span style={{ fontSize: 12, color: "#64748b", textAlign: "right" }}>${Number(item.price).toFixed(2)}</span>
                <span style={{ fontSize: 12, color: "#1e293b", fontWeight: 600, textAlign: "right" }}>${(item.qty * item.price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <div style={{ minWidth: 180 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", padding: "3px 0" }}>
                <span>Subtotal</span><span>{fmt(invoice.amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "2px solid #1e293b", marginTop: 4, fontSize: 15, fontWeight: 800, color: "#1e293b" }}>
                <span>Total</span><span>{fmt(invoice.amount, invoice.token)}</span>
              </div>
            </div>
          </div>

          {invoice.status === "paid" && (
            <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "0.875rem", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: invoice.paidTxHash ? 8 : 0 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#2775ca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700 }}>$</div>
                <span style={{ fontSize: 12, color: "#1e293b", fontWeight: 600 }}>Paid in {invoice.token}</span>
                <span style={{ fontSize: 13, color: "#059669", fontWeight: 700, marginLeft: "auto" }}>{fmt(invoice.amount, invoice.token)}</span>
              </div>
              {invoice.paidTxHash && (
                <a href={"https://testnet.arcscan.app/tx/" + invoice.paidTxHash} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#6366f1", fontFamily: "monospace", textDecoration: "none" }}>
                  Tx: {invoice.paidTxHash.slice(0,20)}...
                </a>
              )}
            </div>
          )}

          {invoice.memo && (
            <div style={{ background: "#f8fafc", borderRadius: 6, padding: "0.6rem 0.875rem", marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, marginBottom: 2 }}>MEMO</div>
              <div style={{ fontSize: 12, color: "#475569" }}>{invoice.memo}</div>
            </div>
          )}

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Arc Testnet</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Powered by Circle CCTP</div>
          </div>
        </div>
      </div>
    </div>
  );
}
