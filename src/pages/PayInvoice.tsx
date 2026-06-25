import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { EIP1193Provider } from "viem";
import { createWalletClient, createPublicClient, custom, http, erc20Abi, formatUnits, parseUnits } from "viem";
import WalletConnect from "../components/WalletConnect";
import { decodeInvoice, markPaid, fmt, fmtDate, type Invoice } from "../storage";

const ARC = { id: 5042002, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } }, blockExplorers: { default: { name: "Arcscan", url: "https://testnet.arcscan.app" } } };
const TOKENS: Record<string, `0x${string}`> = { USDC: "0x3600000000000000000000000000000000000000", EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" };
const ARC_HEX = "0x4CEF52";

async function switchToArc(p: EIP1193Provider) {
  try { await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_HEX }] }); }
  catch (e: unknown) {
    if ((e as { code?: number }).code === 4902) await p.request({ method: "wallet_addEthereumChain", params: [{ chainId: ARC_HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] });
    else throw e;
  }
}

export default function PayInvoice() {
  const { encoded } = useParams<{ encoded: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [wallet, setWallet] = useState<{ provider: EIP1193Provider; address: string } | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "paying" | "done" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (encoded) setInvoice(decodeInvoice(encoded)); }, [encoded]);

  useEffect(() => {
    if (!wallet || !invoice) return;
    const client = createPublicClient({ chain: ARC, transport: http() });
    client.readContract({ address: TOKENS[invoice.token], abi: erc20Abi, functionName: "balanceOf", args: [wallet.address as `0x${string}`] })
      .then(r => setBalance(Number(formatUnits(r, 6)).toFixed(2))).catch(() => setBalance("0.00"));
  }, [wallet, invoice]);

  async function pay() {
    if (!wallet || !invoice) return;
    setError(null); setState("paying");
    try {
      await switchToArc(wallet.provider);
      const wc = createWalletClient({ chain: ARC, transport: custom(wallet.provider) });
      const hash = await wc.writeContract({ address: TOKENS[invoice.token], abi: erc20Abi, functionName: "transfer", args: [invoice.recipientAddress as `0x${string}`, parseUnits(invoice.amount, 6)], account: wallet.address as `0x${string}` });
      markPaid(invoice.id, hash, wallet.address);
      setTxHash(hash); setState("done");
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? "Payment failed."); setState("error");
    }
  }

  if (!invoice) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#080e1c", gap: 12 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <h2 style={{ color: "#f1f5f9", fontSize: 18 }}>Invoice Not Found</h2>
      <button onClick={() => navigate("/")} style={{ padding: "0.7rem 1.5rem", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Go Home</button>
    </div>
  );

  if (state === "done") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080e1c" }}>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "2rem", maxWidth: 420, width: "100%", margin: "1rem", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#6ee7b7", marginBottom: 8 }}>Payment Successful!</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>{invoice.title} — {fmt(invoice.amount, invoice.token)} has been paid.</p>
        {txHash && <a href={"https://testnet.arcscan.app/tx/" + txHash} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", color: "#60a5fa", fontSize: 13, marginBottom: 16 }}>View on Arc Explorer</a>}
        <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "1rem", textAlign: "left" }}>
          {[["Invoice", invoice.title], ["Amount", fmt(invoice.amount, invoice.token)], ["Paid to", invoice.recipientAddress.slice(0,8) + "..." + invoice.recipientAddress.slice(-6)]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: "#64748b" }}>{k}</span><span style={{ color: "#f1f5f9", fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080e1c", padding: "1rem" }}>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "2rem", maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "inline-flex", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 20, padding: "3px 12px", fontSize: 10, color: "#fbbf24", fontWeight: 700, marginBottom: 12 }}>PENDING PAYMENT</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>{invoice.title}</h2>
          {invoice.description && <p style={{ color: "#64748b", fontSize: 13 }}>{invoice.description}</p>}
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "1.25rem", marginBottom: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", textAlign: "center", marginBottom: 4 }}>{fmt(invoice.amount, invoice.token)}</div>
          <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 14 }}>Due {fmtDate(invoice.dueDate)}</div>
          {[["Client", invoice.clientName], ["Pay to", invoice.recipientAddress.slice(0,8) + "..." + invoice.recipientAddress.slice(-6)], ["Network", "Arc Testnet"]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "#64748b" }}>{k}</span>
              <span style={{ color: k === "Network" ? "#a78bfa" : "#e2e8f0", fontWeight: 500, fontFamily: k === "Pay to" ? "monospace" : "inherit" }}>{v}</span>
            </div>
          ))}
        </div>
        {!wallet ? (
          <WalletConnect onConnected={(p, a) => setWallet({ provider: p, address: a })} label="Connect Wallet to Pay" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
              <span style={{ color: "#64748b" }}>Your wallet</span>
              <span style={{ color: "#818cf8", fontFamily: "monospace" }}>{wallet.address.slice(0,6)}...{wallet.address.slice(-4)}</span>
            </div>
            {balance !== null && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "0 2px" }}>
                <span style={{ color: "#64748b" }}>Your {invoice.token} on Arc</span>
                <span style={{ color: Number(balance) >= Number(invoice.amount) ? "#6ee7b7" : "#f87171", fontWeight: 600 }}>{balance} {invoice.token}</span>
              </div>
            )}
            {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.65rem", color: "#fca5a5", fontSize: 13 }}>{error}</div>}
            <button onClick={state === "error" ? () => { setState("idle"); setError(null); } : pay} disabled={state === "paying"}
              style={{ width: "100%", padding: "0.875rem", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: state === "paying" ? "not-allowed" : "pointer", opacity: state === "paying" ? 0.6 : 1 }}>
              {state === "idle" ? "Pay " + fmt(invoice.amount, invoice.token) : state === "paying" ? "Processing..." : "Try Again"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
