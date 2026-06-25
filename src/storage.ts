export type InvoiceStatus = "pending" | "paid" | "overdue";
export type InvoiceToken = "USDC" | "EURC";

export interface LineItem {
  id: string;
  description: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  number: string;
  title: string;
  description: string;
  amount: string;
  token: InvoiceToken;
  recipientAddress: string;
  clientName: string;
  clientEmail: string;
  dueDate: string;
  memo: string;
  createdAt: string;
  status: InvoiceStatus;
  lineItems: LineItem[];
  paidAt?: string;
  paidTxHash?: string;
  paidByAddress?: string;
}

export function encodeInvoice(invoice: Invoice): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(invoice))));
}

export function decodeInvoice(encoded: string): Invoice | null {
  try { return JSON.parse(decodeURIComponent(escape(atob(encoded)))); }
  catch { return null; }
}

const KEY = "arc_invoices_v2";
const CTR = "arc_invoice_ctr";

export function getNextNumber(): string {
  const n = parseInt(localStorage.getItem(CTR) ?? "0") + 1;
  localStorage.setItem(CTR, n.toString());
  return "INV-" + n.toString().padStart(4, "0");
}

export function getInvoices(): Invoice[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

export function saveInvoice(inv: Invoice): void {
  const list = getInvoices();
  const idx = list.findIndex(i => i.id === inv.id);
  if (idx >= 0) list[idx] = inv; else list.unshift(inv);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function updateOverdue(): void {
  const list = getInvoices();
  const now = new Date();
  const updated = list.map(inv =>
    inv.status === "pending" && new Date(inv.dueDate) < now
      ? { ...inv, status: "overdue" as InvoiceStatus } : inv
  );
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function markPaid(id: string, txHash: string, from: string): Invoice | null {
  const list = getInvoices();
  const idx = list.findIndex(i => i.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], status: "paid", paidAt: new Date().toISOString(), paidTxHash: txHash, paidByAddress: from };
  localStorage.setItem(KEY, JSON.stringify(list));
  return list[idx];
}

export function fmt(amount: string | number, token?: InvoiceToken): string {
  const n = Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return token ? n + " " + token : "$" + n;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "just now";
  if (d < 60) return d + "m ago";
  if (d < 1440) return Math.floor(d / 60) + "h ago";
  return Math.floor(d / 1440) + "d ago";
}
