"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, type InvoiceDetail, type BusinessProfile } from "@/lib/api";
import {
  FiPrinter, FiShare2, FiArrowLeft, FiCheck,
  FiMessageSquare, FiClock, FiCalendar,
} from "react-icons/fi";

const fmtINR = (n: number) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

function toWords(n: number): string {
  if (!n || n === 0) return "Zero Rupees Only";
  const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const convert = (num: number): string => {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num/10)] + (num%10 ? " " + a[num%10] : "");
    if (num < 1000) return a[Math.floor(num/100)] + " Hundred" + (num%100 ? " " + convert(num%100) : "");
    if (num < 100000) return convert(Math.floor(num/1000)) + " Thousand" + (num%1000 ? " " + convert(num%1000) : "");
    if (num < 10000000) return convert(Math.floor(num/100000)) + " Lakh" + (num%100000 ? " " + convert(num%100000) : "");
    return convert(Math.floor(num/10000000)) + " Crore" + (num%10000000 ? " " + convert(num%10000000) : "");
  };
  const int = Math.floor(n);
  const dec = Math.round((n - int) * 100);
  return convert(int) + " Rupees" + (dec > 0 ? " and " + convert(dec) + " Paise" : "") + " Only";
}

export default function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [biz, setBiz] = useState<BusinessProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.invoices.get(id as string)
      .then(d => { setInvoice(d.invoice); setBiz(d.business); })
      .catch(e => setError(e.message || "Invoice not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `Invoice ${invoice?.invoice_number}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
    }
  };

  const handleWhatsApp = () => {
    if (!invoice) return;
    const phone = invoice.customer_phone;
    const biz_name = biz.business_name || "Vantro";
    const msg = `${invoice.customer_name.split(" ")[0]} ji 🙏\n\nYour invoice *${invoice.invoice_number || id}* of ${fmtINR(invoice.invoice_amount)} from ${biz_name} is ready.\n\nView it here:\n${window.location.href}\n\n${invoice.payment_link ? `Pay online: ${invoice.payment_link}` : `Please pay at your earliest convenience.`}\n\n— ${biz_name}`;
    const url = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading invoice…</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-2">Invoice not found</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={() => router.push("/collections")} className="text-blue-600 text-sm underline">← Back to Collections</button>
        </div>
      </div>
    );
  }

  const isPaid = invoice.payment_status === "Paid";
  const items = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
          body { font-size: 11pt; background: white !important; }
          .print-shadow { box-shadow: none !important; }
        }
        body { background: #f1f5f9; margin: 0; font-family: -apple-system, Arial, sans-serif; }
      `}</style>

      {/* Action bar — hidden when printing */}
      <div className="no-print bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <FiArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold hover:opacity-90 transition-all">
            <FiMessageSquare size={12} /> Send via WhatsApp
          </button>
          <button onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-all">
            <FiShare2 size={12} /> Share Link
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-black transition-all">
            <FiPrinter size={12} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="max-w-3xl mx-auto my-8 print-shadow" style={{ filter: "drop-shadow(0 4px 32px rgba(0,0,0,0.10))" }}>
        <div className="bg-white overflow-hidden rounded-xl">

          {/* Header band */}
          <div className="bg-[#0A0F1E] px-8 py-7">
            <div className="flex items-start justify-between">
              {/* Business details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                    {(biz.business_name || "V").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-bold text-base tracking-tight">
                    {biz.business_name || "Your Business"}
                  </span>
                </div>
                {biz.business_address && (
                  <p className="text-gray-400 text-xs leading-relaxed max-w-[200px]">{biz.business_address}{biz.city ? `, ${biz.city}` : ""}</p>
                )}
                {biz.gstin && (
                  <p className="text-gray-400 text-xs font-mono mt-1">GSTIN: {biz.gstin}</p>
                )}
              </div>

              {/* Invoice meta */}
              <div className="text-right">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">Invoice</p>
                <p className="text-white font-black text-xl font-mono">{invoice.invoice_number || `INV-${id?.slice(0,8)}`}</p>

                {/* Status pill */}
                <div className="mt-2 flex justify-end">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold">
                      <FiCheck size={10} /> PAID
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold">
                      <FiClock size={10} /> PENDING
                    </span>
                  )}
                </div>

                {/* Dates */}
                <div className="mt-3 space-y-1 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5 justify-end">
                    <FiCalendar size={10} />
                    <span>Date: {fmtDate(invoice.invoice_date)}</span>
                  </div>
                  {invoice.due_date && (
                    <div className="flex items-center gap-1.5 justify-end text-amber-400">
                      <FiClock size={10} />
                      <span>Due: {fmtDate(invoice.due_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="px-8 pt-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex-1 max-w-xs">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Bill To</p>
                <p className="font-bold text-gray-800 text-base">{invoice.customer_name}</p>
                {invoice.customer_phone && (
                  <p className="text-gray-500 text-xs mt-1">📞 {invoice.customer_phone}</p>
                )}
                {invoice.customer_email && (
                  <p className="text-gray-500 text-xs">✉ {invoice.customer_email}</p>
                )}
              </div>

              {/* Quick stats */}
              <div className="text-right ml-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Amount Due</p>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{fmtINR(invoice.invoice_amount)}</p>
                {invoice.payment_link && !isPaid && (
                  <a href={invoice.payment_link} target="_blank" rel="noopener noreferrer"
                    className="no-print inline-block mt-2 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all">
                    Pay Online →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="px-8">
            <div className="h-px bg-gray-100" />
          </div>

          {/* Line items */}
          <div className="px-8 py-6">
            {items ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left pb-3 font-semibold w-8">#</th>
                    <th className="text-left pb-3 font-semibold">Item / Service</th>
                    <th className="text-right pb-3 font-semibold w-16">Qty</th>
                    <th className="text-left pb-3 font-semibold w-16 pl-3">Unit</th>
                    <th className="text-right pb-3 font-semibold w-28">Rate</th>
                    <th className="text-right pb-3 font-semibold w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 text-gray-800 font-medium">{item.name}</td>
                      <td className="py-3 text-right text-gray-600">{item.qty}</td>
                      <td className="py-3 text-gray-400 text-xs pl-3">{item.unit}</td>
                      <td className="py-3 text-right text-gray-600">{fmtINR(item.rate)}</td>
                      <td className="py-3 text-right text-gray-900 font-semibold">{fmtINR(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // No line items — show single row summary
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left pb-3 font-semibold">Description</th>
                    <th className="text-right pb-3 font-semibold w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-gray-800 font-medium">
                      {invoice.notes || `Invoice ${invoice.invoice_number || ""}`}
                    </td>
                    <td className="py-3 text-right text-gray-900 font-semibold">
                      {fmtINR(invoice.invoice_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Total */}
            <div className="flex justify-end mt-4">
              <div className="w-64">
                <div className="flex justify-between items-center py-3 border-t-2 border-gray-900">
                  <span className="font-black text-gray-900 text-base">Total</span>
                  <span className="font-black text-gray-900 text-xl">{fmtINR(invoice.invoice_amount)}</span>
                </div>
              </div>
            </div>

            {/* Amount in words */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs text-blue-500 font-semibold mb-0.5">Amount in Words</p>
              <p className="text-sm text-blue-800 font-medium">{toWords(invoice.invoice_amount)}</p>
            </div>
          </div>

          {/* UPI QR / Payment info */}
          {biz.upi_id && !isPaid && (
            <div className="px-8 pb-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Payment Details</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <span className="text-sm">💳</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">UPI ID</p>
                    <p className="text-sm font-mono font-bold text-gray-800">{biz.upi_id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="px-8 pb-4">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Notes / Terms</p>
                <p className="text-sm text-gray-700 leading-relaxed">{invoice.notes}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 pb-8">
            <div className="pt-4 border-t border-gray-100 flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-400">
                  Generated by{" "}
                  <span className="font-semibold text-gray-600">Vantro Flow</span>
                  {" · "}vantroflow.com
                </p>
                {isPaid && invoice.payment_date && (
                  <p className="text-xs text-green-600 font-semibold mt-1">
                    ✅ Paid on {fmtDate(invoice.payment_date)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="border-t border-gray-300 mt-10 pt-1 w-36">
                  <p className="text-xs text-gray-400">Authorised Signatory</p>
                  <p className="text-sm font-semibold text-gray-700">{biz.business_name || ""}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
