// ─── Payment Link Generator ──────────────────────────────────────────────────
// Generates UPI deep links and WhatsApp-ready payment message strings.

export interface PaymentLinkOptions {
  upiId: string;          // merchant UPI ID (e.g. sharma@upi)
  payeeName: string;      // business name
  amount: number;         // in rupees
  note?: string;          // invoice/reference note
  customerPhone?: string; // for WhatsApp deep link
  customerName?: string;  // for WhatsApp message personalisation
}

/** Generate a UPI intent URL (works in any UPI app on Android/iOS) */
export function generateUPILink({
  upiId, payeeName, amount, note = "Payment",
}: PaymentLinkOptions): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    tn: note,
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}

/** Generate intent:// link (more compatible on Android) */
export function generateUPIIntentLink(opts: PaymentLinkOptions): string {
  const upi = generateUPILink(opts);
  return `intent:${upi}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
}

/** Build a WhatsApp wa.me link that opens with a pre-filled payment message */
export function generateWhatsAppPaymentLink({
  customerPhone, customerName = "ji", payeeName, upiId, amount, note = "payment",
}: PaymentLinkOptions): string {
  const upiLink = generateUPILink({ upiId, payeeName, amount, note });
  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

  const message = [
    `Namaskar ${customerName} 🙏`,
    ``,
    `${payeeName} ka ₹${fmt(amount).replace("₹","")} payment pending hai.`,
    ``,
    `Neeche UPI link se directly pay karein:`,
    upiLink,
    ``,
    `Ya UPI ID pe send karein: ${upiId}`,
    ``,
    `Dhanyawad 🙏`,
  ].join("\n");

  const phone = (customerPhone || "").replace(/\D/g, "");
  const e164 = phone.startsWith("91") ? phone : `91${phone}`;
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

/** Copy UPI link to clipboard and return success */
export async function copyPaymentLink(opts: PaymentLinkOptions): Promise<boolean> {
  try {
    const link = generateUPILink(opts);
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

/** Format rupees for display */
export function fmtRupees(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
