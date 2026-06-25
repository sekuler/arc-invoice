import { useState } from "react";
import type { EIP1193Provider } from "viem";

type W = { info: { uuid: string; name: string; icon: string }; provider: EIP1193Provider };

declare global {
  interface WindowEventMap { "eip6963:announceProvider": CustomEvent<W> }
}

async function detect(): Promise<W[]> {
  const map = new Map<string, W>();
  const h = (e: CustomEvent<W>) => map.set(e.detail.info.uuid, e.detail);
  window.addEventListener("eip6963:announceProvider", h);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise(r => setTimeout(r, 300));
  window.removeEventListener("eip6963:announceProvider", h);
  return [...map.values()];
}

interface Props {
  onConnected: (p: EIP1193Provider, addr: string, name: string) => void;
  label?: string;
  chainId?: number;
  chainConfig?: { chainId: string; chainName: string; nativeCurrency: { name: string; symbol: string; decimals: number }; rpcUrls: string[]; blockExplorerUrls: string[] };
}

export default function WalletConnect({ onConnected, label, chainId, chainConfig }: Props) {
  const [status, setStatus] = useState<"idle" | "detecting" | "selecting" | "connecting">("idle");
  const [wallets, setWallets] = useState<W[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null); setStatus("detecting");
    const found = await detect();
    if (!found.length) { setError("No wallet found. Install MetaMask or Rabby."); setStatus("idle"); return; }
    if (found.length === 1) connect(found[0]); else { setWallets(found); setStatus("selecting"); }
  }

  async function connect(w: W) {
    setStatus("connecting"); setError(null);
    try {
      await w.provider.request({ method: "eth_requestAccounts", params: undefined });
      const accounts = await w.provider.request({ method: "eth_accounts", params: undefined }) as string[];
      if (!accounts[0]) throw new Error("No account.");
      if (chainId && chainConfig) {
        try {
          await w.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x" + chainId.toString(16) }] });
        } catch (e: unknown) {
          const err = e as { code?: number };
          if (err.code === 4902) await w.provider.request({ method: "wallet_addEthereumChain", params: [chainConfig] });
          else throw e;
        }
      }
      onConnected(w.provider, accounts[0], w.info.name);
    } catch (e: unknown) {
      setError((e as { message?: string }).message ?? "Error."); setStatus("idle");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.6rem 0.875rem", color: "#fca5a5", fontSize: 13 }}>{error}</div>}
      {status === "selecting" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 12, color: "#94a3b8" }}>Select wallet:</p>
          {wallets.map(w => (
            <button key={w.info.uuid} onClick={() => connect(w)}
              style={{ padding: "0.7rem 1rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#f1f5f9", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              {w.info.icon && <img src={w.info.icon} width={20} height={20} alt="" style={{ borderRadius: 4 }} />}
              {w.info.name}
            </button>
          ))}
        </div>
      ) : (
        <button onClick={start} disabled={status !== "idle"}
          style={{ padding: "0.8rem 1.5rem", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: status !== "idle" ? "not-allowed" : "pointer", opacity: status !== "idle" ? 0.7 : 1, boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}>
          {status === "idle" ? (label ?? "Connect Wallet") : status === "detecting" ? "Detecting..." : "Connecting..."}
        </button>
      )}
    </div>
  );
}
