import { useState, useEffect } from "react";
import { getInvoices, updateOverdue, timeAgo, fmt, type Invoice } from "../storage";

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const w = 100; const h = 36;
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${h - (v / max) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function RevenueChart({ invoices }: { invoices: Invoice[] }) {
  const days = 7;
  const data = Array.from({ length: days }, (_, k) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - k));
    const s = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const collected = invoices.filter(i => i.status === "paid" && i.paidAt?.slice(0, 10) === s).reduce((a, i) => a + Number(i.amount), 0);
    const issued = invoices.filter(i => i.createdAt.slice(0, 10) === s).reduce((a, i) => a + Number(i.amount), 0);
    return { label, collected, issued };
  });

  const max = Math.max(...data.map(d => Math.max(d.collected, d.issued)), 1);
  const w = 560; const h = 90;
  const pad = { top: 10, right: 12, bottom: 24, left: 44 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const n = data.length;
  const x = (i: number) => pad.left + (i / (n - 1)) * cw;
  const y = (v: number) => pad.top + ch - (v / max) * ch;

  const issuedPath = data.map((d, i) => (i === 0 ? "M" : "L") + x(i) + "," + y(d.issued)).join(" ");
  const collectedPath = data.map((d, i) => (i === 0 ? "M" : "L") + x(i) + "," + y(d.collected)).join(" ");
  const fillPath = collectedPath + " L" + x(n-1) + "," + (pad.top + ch) + " L" + pad.left + "," + (pad.top + ch) + " Z";

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "1.25rem", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Revenue Trend <span style={{ fontSize: 11, color: "#475569", fontWeight: 400 }}>7D</span></div>
        <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 2, background: "#10b981", borderRadius: 1 }} /><span style={{ color: "#6ee7b7" }}>Collected</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 2, background: "#6366f1", borderRadius: 1, opacity: 0.5 }} /><span style={{ color: "#818cf8", opacity: 0.7 }}>Issued</span></div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(t => {
          const yy = pad.top + ch - t * ch;
          return <g key={t}>
            <line x1={pad.left} y1={yy} x2={pad.left + cw} y2={yy} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={pad.left - 6} y={yy + 4} textAnchor="end" fill="#475569" fontSize="10">${(max * t).toFixed(0)}</text>
          </g>;
        })}
        <path d={fillPath} fill="url(#cGrad)" />
        <path d={issuedPath} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
        <path d={collectedPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={h - 2} textAnchor="middle" fill="#475569" fontSize="10">{d.label}</text>
        ))}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => { updateOverdue(); setInvoices(getInvoices()); }, []);

  const paid = invoices.filter(i => i.status === "paid");
  const pending = invoices.filter(i => i.status === "pending");
  const overdue = invoices.filter(i => i.status === "overdue");

  function daily(fn: (i: Invoice) => boolean) {
    return Array.from({ length: 7 }, (_, k) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - k));
      return invoices.filter(fn).filter(i => i.createdAt.slice(0, 10) === d.toISOString().slice(0, 10)).reduce((a, i) => a + Number(i.amount), 0);
    });
  }

  const cards = [
    { label: "Total Revenue", value: fmt(invoices.reduce((s, i) => s + Number(i.amount), 0)), sub: invoices.length + " total", color: "#818cf8", values: daily(() => true) },
    { label: "Paid", value: fmt(paid.reduce((s, i) => s + Number(i.amount), 0)), sub: paid.length + " paid", color: "#6ee7b7", values: daily(i => i.status === "paid") },
    { label: "Pending", value: fmt(pending.reduce((s, i) => s + Number(i.amount), 0)), sub: pending.length + " pending", color: "#fbbf24", values: daily(i => i.status === "pending") },
    { label: "Overdue", value: fmt(overdue.reduce((s, i) => s + Number(i.amount), 0)), sub: overdue.length + " overdue", color: "#f87171", values: daily(i => i.status === "overdue") },
  ];

  const recent = [...invoices]
    .flatMap(inv => {
      const r: { type: string; inv: Invoice; time: string }[] = [{ type: "created", inv, time: inv.createdAt }];
      if (inv.status === "paid" && inv.paidAt) r.push({ type: "paid", inv, time: inv.paidAt });
      return r;
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  const usdcTotal = paid.filter(i => i.token === "USDC").reduce((s, i) => s + Number(i.amount), 0);
  const eurcTotal = paid.filter(i => i.token === "EURC").reduce((s, i) => s + Number(i.amount), 0);
  const maxSettled = Math.max(usdcTotal, eurcTotal, 1);

  return (
    <div style={{ padding: "1.5rem", overflowY: "auto", height: "100%" }}>

      {/* Header with badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9" }}>Welcome back 👋</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Here's what's happening with your business.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: "5px 12px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
          <div>
            <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 700 }}>Arc Testnet</div>
            <div style={{ fontSize: 9, color: "#475569" }}>Connected</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {cards.map(({ label, value, sub, color, values }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>{sub}</div>
            <Sparkline values={values} color={color} />
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <RevenueChart invoices={invoices} />

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Recent Activity */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "1.25rem" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>Recent Activity</div>
          {recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem", color: "#475569", fontSize: 13 }}>No activity yet.</div>
          ) : recent.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: item.type === "paid" ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
                {item.type === "paid" ? "✓" : "📄"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#f1f5f9", fontWeight: 500 }}>{item.type === "paid" ? "Paid" : "Created"} — {item.inv.title}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{item.inv.clientName} · <span style={{ color: item.type === "paid" ? "#6ee7b7" : "#818cf8", fontWeight: 600 }}>{fmt(item.inv.amount, item.inv.token)}</span></div>
              </div>
              <div style={{ fontSize: 10, color: "#475569", flexShrink: 0 }}>{timeAgo(item.time)}</div>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Settled by Token with bars */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>USDC / EURC Settled</div>
            {[{ token: "USDC", amount: usdcTotal, color: "#3b82f6" }, { token: "EURC", amount: eurcTotal, color: "#6366f1" }].map(({ token, amount, color }) => (
              <div key={token} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}>{token}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>
                    {amount > 0 ? amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
                  </span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (amount / maxSettled * 100) + "%", background: color, borderRadius: 4, transition: "width 0.5s ease", opacity: amount > 0 ? 1 : 0.2 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Settlement Rail */}
          <div style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", marginBottom: 10 }}>Settlement Rail</div>
            {[
              { label: "Protocol", value: "Circle CCTP v2" },
              { label: "Network", value: "Arc Testnet" },
              { label: "Gas token", value: "USDC (not ETH)" },
              { label: "Finality", value: "Sub-second" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "#64748b" }}>{label}</span>
                <span style={{ color: "#f1f5f9", fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}