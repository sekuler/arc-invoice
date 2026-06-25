import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { EIP1193Provider } from "viem";
import WalletConnect from "./components/WalletConnect";
import Dashboard from "./pages/Dashboard";
import CreateInvoice from "./pages/CreateInvoice";
import InvoiceList from "./pages/InvoiceList";
import InvoiceDetail from "./pages/InvoiceDetail";
import PayInvoice from "./pages/PayInvoice";
import { type Invoice } from "./storage";

interface Wallet { provider: EIP1193Provider; address: string; walletName: string; }
type Page = "dashboard" | "invoices" | "new";

function Sidebar({ page, onPage, wallet }: { page: Page; onPage: (p: Page) => void; wallet: Wallet | null }) {
  const NAV = [
    { id: "dashboard" as Page, icon: "▦", label: "Dashboard" },
    { id: "invoices"  as Page, icon: "📄", label: "Invoices" },
  ];
  return (
    <div style={{ width: 210, background: "#060c1a", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", height: "100vh", flexShrink: 0 }}>
      <div style={{ padding: "1.1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⬡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9" }}>ArcInvoice</div>
            <div style={{ fontSize: 8, color: "#6366f1", fontWeight: 700, letterSpacing: "1px" }}>TESTNET</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "0.875rem 0.875rem 0.5rem" }}>
        <button onClick={() => onPage("new")} style={{ width: "100%", padding: "0.6rem", borderRadius: 7, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 14px rgba(99,102,241,0.3)" }}>
          + New Invoice
        </button>
      </div>
      <nav style={{ flex: 1, padding: "0.25rem 0.625rem" }}>
        {NAV.map(({ id, icon, label }) => (
          <button key={id} onClick={() => onPage(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "0.6rem 0.75rem", borderRadius: 7, border: "none", background: page === id || (page === "new" && id === "invoices") ? "rgba(99,102,241,0.12)" : "transparent", color: page === id || (page === "new" && id === "invoices") ? "#818cf8" : "#64748b", fontSize: 13, fontWeight: page === id ? 700 : 400, cursor: "pointer", marginBottom: 2, textAlign: "left", borderLeft: page === id ? "2px solid #6366f1" : "2px solid transparent" }}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "0.875rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {wallet ? (
          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 7, padding: "0.625rem" }}>
            <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>Connected</div>
            <div style={{ fontSize: 10, color: "#818cf8", fontFamily: "monospace" }}>{wallet.address.slice(0,8)}...{wallet.address.slice(-6)}</div>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: "#475569", textAlign: "center" }}>No wallet connected</div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "center" }}>
          {[{ l: "Faucet", h: "https://faucet.circle.com" }, { l: "Explorer", h: "https://testnet.arcscan.app" }].map(({ l, h }) => (
            <a key={l} href={h} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#334155", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [selected, setSelected] = useState<Invoice | null>(null);

  function handlePage(p: Page) { setPage(p); if (p !== "invoices") setSelected(null); }

  if (!wallet) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #06080f 0%, #0d1128 50%, #0a0d1f 100%)" }}>
      <div style={{ textAlign: "center", maxWidth: 460, padding: "0 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>⬡</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>ArcInvoice</div>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f1f5f9", marginBottom: 10, letterSpacing: "-0.5px" }}>
          Get paid in <span style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>stablecoins</span>
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28, lineHeight: 1.7 }}>Create professional invoices and get paid in USDC or EURC on Arc Testnet. No banks, no borders.</p>
        <WalletConnect onConnected={(p, a, n) => setWallet({ provider: p, address: a, walletName: n })} label="Connect Wallet to Get Started" />
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 18 }}>
          {[{ l: "arc.io", h: "https://www.arc.io" }, { l: "Community", h: "https://community.arc.io" }, { l: "Faucet", h: "https://faucet.circle.com" }].map(({ l, h }) => (
            <a key={l} href={h} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#334155", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0a0d1f" }}>
      <Sidebar page={page} onPage={handlePage} wallet={wallet} />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          {page === "dashboard" && <Dashboard />}
          {(page === "invoices") && (
            <InvoiceList onSelect={inv => { setSelected(inv); }} selectedId={selected?.id} onNew={() => handlePage("new")} />
          )}
          {page === "new" && (
            <CreateInvoice wallet={wallet} onCreated={() => handlePage("invoices")} onCancel={() => handlePage("invoices")} />
          )}
        </div>
        {selected && page === "invoices" && (
          <div style={{ width: 400, borderLeft: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", flexShrink: 0 }}>
            <InvoiceDetail invoice={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/pay/:encoded" element={<PayInvoice />} />
      </Routes>
    </BrowserRouter>
  );
}
