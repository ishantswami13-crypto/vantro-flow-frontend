"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FiPrinter, FiShare2 } from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";
const fmtINR = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const toWords = (n: number) => {
  if (n === 0) return "Zero";
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
};

export default function InvoicePage() {
  const { id } = useParams();
  const [bill, setBill] = useState<any>(null);
  const [biz, setBiz] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/bills/public/${id}`).then(r => r.json()).then(d => {
      if (d.success) { setBill(d.bill); setBiz(d.bill.users || {}); }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading invoice…</div>;
  if (!bill) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500">Invoice not found</div>;

  return (
    <>
      {/* Print actions — hidden when printing */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-lg hover:bg-blue-700">
          <FiPrinter size={14} /> Print / PDF
        </button>
        <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied! Share with customer."); }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-lg hover:bg-green-700">
          <FiShare2 size={14} /> Copy Link
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 15mm; }
          body { font-size: 11pt; }
        }
        body { background: #f5f5f5; margin: 0; font-family: Arial, sans-serif; }
      `}</style>

      <div className="max-w-3xl mx-auto my-8 bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-700 text-white px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{biz.business_name || "Business"}</h1>
              {biz.city && <p className="text-blue-200 text-sm">{biz.city}</p>}
              {biz.business_address && <p className="text-blue-200 text-xs mt-0.5">{biz.business_address}</p>}
              {biz.gstin && <p className="text-blue-100 text-xs mt-1 font-mono">GSTIN: {biz.gstin}</p>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-blue-100">TAX INVOICE</p>
              <p className="text-blue-200 font-mono text-sm mt-1">{bill.bill_number}</p>
              <p className="text-blue-200 text-xs mt-0.5">Date: {bill.bill_date}</p>
              {bill.due_date && <p className="text-blue-200 text-xs">Due: {bill.due_date}</p>}
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Bill To */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Bill To</p>
            <p className="font-bold text-gray-800 text-lg">{bill.customer_name}</p>
            {bill.customer_address && <p className="text-gray-600 text-sm">{bill.customer_address}</p>}
            {bill.customer_gstin && <p className="text-gray-500 text-xs font-mono mt-0.5">GSTIN: {bill.customer_gstin}</p>}
            {bill.customer_phone && <p className="text-gray-500 text-xs">📞 {bill.customer_phone}</p>}
          </div>

          {/* Items table */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left py-2 px-3 text-xs text-gray-600 font-semibold w-6">#</th>
                <th className="text-left py-2 px-3 text-xs text-gray-600 font-semibold">Description</th>
                <th className="text-left py-2 px-3 text-xs text-gray-600 font-semibold w-16">HSN</th>
                <th className="text-right py-2 px-3 text-xs text-gray-600 font-semibold w-14">Qty</th>
                <th className="text-left py-2 px-3 text-xs text-gray-600 font-semibold w-14">Unit</th>
                <th className="text-right py-2 px-3 text-xs text-gray-600 font-semibold w-24">Rate</th>
                <th className="text-right py-2 px-3 text-xs text-gray-600 font-semibold w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(bill.items || []).map((item: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="py-2 px-3 text-gray-500 text-xs">{i + 1}</td>
                  <td className="py-2 px-3 text-gray-800 font-medium">{item.description}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs font-mono">{item.hsn || "—"}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{item.unit}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{fmtINR(item.rate)}</td>
                  <td className="py-2 px-3 text-right text-gray-800 font-semibold">{fmtINR(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmtINR(Number(bill.subtotal))}</span></div>
              {Number(bill.cgst) > 0 && <div className="flex justify-between text-gray-600"><span>CGST ({bill.gst_rate/2}%)</span><span>{fmtINR(Number(bill.cgst))}</span></div>}
              {Number(bill.sgst) > 0 && <div className="flex justify-between text-gray-600"><span>SGST ({bill.gst_rate/2}%)</span><span>{fmtINR(Number(bill.sgst))}</span></div>}
              {Number(bill.igst) > 0 && <div className="flex justify-between text-gray-600"><span>IGST ({bill.gst_rate}%)</span><span>{fmtINR(Number(bill.igst))}</span></div>}
              <div className="flex justify-between text-blue-700 font-bold text-lg border-t-2 border-blue-200 pt-2 mt-2">
                <span>Total</span><span>{fmtINR(Number(bill.total))}</span>
              </div>
            </div>
          </div>

          {/* Amount in words */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-600 font-semibold">Amount in Words:</p>
            <p className="text-sm text-blue-800 font-medium">{toWords(Number(bill.total))}</p>
          </div>

          {bill.notes && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 font-semibold">Notes / Terms:</p>
              <p className="text-sm text-gray-700">{bill.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400">Generated by Vantro Flow · vantroflow.com</p>
              <p className={`text-sm font-bold mt-1 ${bill.status === "paid" ? "text-green-600" : "text-orange-500"}`}>
                {bill.status === "paid" ? "✅ PAID" : "⏳ Payment Pending"}
              </p>
            </div>
            <div className="text-right">
              <div className="border-t border-gray-300 mt-8 pt-1 w-32">
                <p className="text-xs text-gray-500">Authorised Signature</p>
                <p className="text-sm font-semibold text-gray-700">{biz.owner_name || biz.business_name || ""}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
