const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vantro-flow-backend-production.up.railway.app';
const SESSION_COOKIE = 'vantro_session';
const LEGACY_TOKEN_COOKIE = 'vantro_token';
const CSRF_COOKIE = 'vantro_csrf';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const item = document.cookie.split(';').map(v => v.trim()).find(v => v.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

function setClientCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}${secure}; SameSite=Lax`;
}

function clearClientCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vantro_token');
}

function getCsrfToken(): string | null {
  return getCookie(CSRF_COOKIE);
}

function isUnsafeMethod(method?: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes((method || 'GET').toUpperCase());
}

// ─── Auth mode ────────────────────────────────────────────
// 'cookie' means the session lives in a HttpOnly cookie the browser holds and
// this code can never read — the goal, since an XSS cannot exfiltrate it.
// 'bearer' is the legacy path with the JWT in localStorage.
//
// The mode is decided at login by probing, not assumed: the backend and
// frontend are on different domains (Railway and Vercel), so the auth cookie is
// third-party. Safari blocks those by default and Chrome is restricting them.
// Switching to cookie mode without checking would 401 every request and bounce
// the user back to /login forever, so the token is only discarded once a real
// cookie-only request has succeeded.
const AUTH_MODE_KEY = 'vantro_auth_mode';
type AuthMode = 'cookie' | 'bearer';

export function getAuthMode(): AuthMode {
  if (typeof window === 'undefined') return 'bearer';
  return localStorage.getItem(AUTH_MODE_KEY) === 'cookie' ? 'cookie' : 'bearer';
}

function setAuthMode(mode: AuthMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_MODE_KEY, mode);
}

// Headers that authenticate a request under whichever mode is active. Use this
// for hand-rolled fetch calls; `request()` applies it already. Any fetch using
// these must also set credentials: 'include', or cookie mode sends no session.
export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (token) return { Authorization: `Bearer ${token}` };
  // The CSRF header goes on every cookie-mode request, not just unsafe ones.
  // The backend only validates it for unsafe methods, so sending it on a GET is
  // inert — and a single unconditional shape means call sites don't each have
  // to know their own method.
  const csrf = getCsrfToken();
  return csrf ? { 'X-CSRF-Token': csrf } : {};
}

// Does the browser actually hold and return the auth cookie? Deliberately sends
// no Authorization header, so success means the cookie alone authenticated it.
async function cookieAuthWorks(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function request<T>(path: string, options: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers as Record<string, string>),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include', signal: controller.signal });
    const data = await res.json();
    // Auto-logout on 401 — token expired or invalid, or 404 User not found
    if (res.status === 401 || (res.status === 404 && data?.error === 'User not found')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vantro_token');
        localStorage.removeItem('vantro_user');
        localStorage.removeItem(AUTH_MODE_KEY);
        clearClientCookie(LEGACY_TOKEN_COOKIE);
        clearClientCookie(SESSION_COOKIE);
        window.location.href = '/login';
      }
      throw new Error(data?.error || 'Session expired. Please log in again.');
    }
    if (!res.ok) {
      const errorMsg = data.error || 'Request failed';
      const requestId = res.headers.get('x-request-id') || data.requestId || 'unknown';
      const errorObj = new Error(`${errorMsg} (Error ID: ${requestId})`);
      (errorObj as any).requestId = requestId;
      (errorObj as any).status = res.status;

      if (typeof window !== 'undefined') {
        fetch(`${BASE}/api/client-errors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          credentials: 'include',
          body: JSON.stringify({
            path: window.location.pathname,
            api_route: path,
            status_code: res.status,
            error_id: requestId,
            message: errorMsg,
            browser_info: navigator.userAgent
          })
        }).catch(() => {});
      }
      throw errorObj;
    }
    return data;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Request timed out — please check your connection');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function stripDataUrl(value: string): string {
  const [, base64] = value.split(',');
  return base64 || value;
}

function ensureDataUrl(value: string, mimeType: string): string {
  return value.startsWith('data:') ? value : `data:${mimeType};base64,${value}`;
}

// ─── Auth ────────────────────────────────────────────────
export const api = {
  auth: {
    signup: (body: { email: string; phone: string; business_name: string; password: string }) =>
      request<{ token: string; csrf_token?: string | null; user: User }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; csrf_token?: string | null; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<{ user: User }>('/api/auth/me'),
  },

  // ─── Dashboard ──────────────────────────────────────────
  metrics: (userId: string) => request<{ metrics: Metrics }>(`/api/metrics/${userId}`),
  analytics: (userId: string) => request<{ analytics: Analytics }>(`/api/analytics/${userId}`),
  controlRoom: () => request<{
    success: boolean;
    business: any;
    metrics: {
      total_outstanding: number;
      total_payable: number;
      ledger_balance: number;
      inventory_value: number;
    };
    critical_actions: any[];
    recent_activity: any[];
    recent_notifications: any[];
    collections_summary: any;
    inventory_summary: any;
  }>('/api/business/control-room'),

  // ─── Invoices / Collections ─────────────────────────────
  invoices: {
    list: (userId: string) => request<{ invoices: Invoice[]; summary: Summary }>(`/api/invoices/${userId}`),
    get: (invoiceId: string) => request<{ success: boolean; invoice: InvoiceDetail; business: BusinessProfile }>(`/api/invoice/${invoiceId}`),
    create: (body: {
      customer_name: string;
      customer_phone?: string;
      customer_email?: string;
      invoice_amount?: number;
      items?: { name: string; qty: number; unit: string; rate: number }[];
      invoice_date: string;
      due_date?: string;
      invoice_number?: string;
      notes?: string;
    }) => request<{ success: boolean; invoice: Invoice; invoice_number: string }>('/api/invoices/create', { method: 'POST', body: JSON.stringify(body) }),
    markPaid: (invoiceId: string, body: object) =>
      request<{ invoice: Invoice }>('/api/mark-paid', { method: 'POST', body: JSON.stringify({ invoice_id: invoiceId, ...body }) }),
    migrate: () => request<{ success: boolean; message: string }>('/api/invoices/migrate', { method: 'POST' }),
    upload: (userId: string, file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('user_id', userId);
      // No Content-Type — the browser sets the multipart boundary itself.
      return fetch(`${BASE}/api/upload-csv`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: fd,
      }).then(r => r.json());
    },
  },

  // ─── Collections (reminders + automation) ────────────────
  collections: {
    sendReminder: (invoiceId: string) =>
      request<{ success: boolean; auto_sent: boolean; provider: string | null; payment_link: string | null; whatsapp_text: string; phone: string }>('/api/collections/send-reminder', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: invoiceId }),
      }),
    bulkRemind: (minDays: number, tone: 'friendly' | 'firm' | 'urgent') =>
      request<{ success: boolean; total: number; sent: number; results: { id: string; name: string; sent: boolean }[] }>('/api/collections/bulk-remind', {
        method: 'POST',
        body: JSON.stringify({ min_days: minDays, tone }),
      }),
    summary: (userId: string) =>
      request<{ success: boolean; summary: any }>(`/api/collections/summary/${userId}`),
    timeline: (userId: string) =>
      request<{ success: boolean; timeline: any[] }>(`/api/collections/timeline/${userId}`),
  },

  // ─── Scanner ────────────────────────────────────────────
  scanner: {
    extract: (imageBase64: string, mimeType = 'image/jpeg') =>
      request<{ success?: boolean; extracted?: ExtractedInvoice; data?: ExtractedInvoice; error?: string }>('/api/scan-document', {
        method: 'POST',
        body: JSON.stringify({
          image: stripDataUrl(imageBase64),
          image_base64: ensureDataUrl(imageBase64, mimeType),
          mimeType,
          scan_type: 'invoice',
        }),
      }, 60_000),
  },

  // ─── AI Chat ─────────────────────────────────────────────
  aiChat: (userId: string, messages: ChatMessage[], businessName: string) =>
    request<{ message: string; actions: string[]; navigate: string | null; waLinks: WaLink[] }>('/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, messages, business_name: businessName }),
    }),

  // ─── WhatsApp ────────────────────────────────────────────
  generateMessage: (body: { customer_name: string; amount: number; days_overdue: number }) =>
    request<{ message: string }>('/api/generate-message', { method: 'POST', body: JSON.stringify(body) }),

  // ─── Calls ───────────────────────────────────────────────
  calls: {
    list: (userId: string) => request<{ calls: CallLog[] }>(`/api/calls/${userId}`),
    log: (body: object) => request<{ log: CallLog }>('/api/log-call', { method: 'POST', body: JSON.stringify(body) }),
  },

  // ─── ML Briefing ──────────────────────────────────────────
  briefing: () => request<{ success: boolean; briefing: string }>('/api/ml/briefing', { method: 'POST' }),

  // ─── Owner Briefing Agent (Phase 2C.8) ───────────────────
  ownerBriefingPreview: () =>
    request<OwnerBriefingResponse>('/api/agents/core.owner_briefing/preview'),

  // ─── Bills ────────────────────────────────────────────────
  bills: {
    list: () => request<{ success: boolean; bills: any[] }>('/api/bills'),
    create: (body: any) => request<{ success: boolean; bill: any }>('/api/bills', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string | number, body: any) => request<{ success: boolean; bill: any }>(`/api/bills/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string | number) => request<{ success: boolean }>(`/api/bills/${id}`, { method: 'DELETE' }),
  },

  // ─── User Features ────────────────────────────────────────
  userFeatures: () => request<{ success: boolean; features: any }>('/api/user/features'),

  // ─── Khata ────────────────────────────────────────────────
  khata: {
    list: () => request<{ success: boolean; customers: any[] }>('/api/khata'),
    get: (name: string) => request<{ success: boolean; entries: any[]; summary: any }>(`/api/khata/${encodeURIComponent(name)}`),
    createEntry: (body: any) => request<{ success: boolean; entry: any }>('/api/khata/entry', { method: 'POST', body: JSON.stringify(body) }),
    deleteEntry: (id: string | number) => request<{ success: boolean }>(`/api/khata/entry/${id}`, { method: 'DELETE' }),
  },

  // ─── Attendance ──────────────────────────────────────────
  attendance: {
    listWorkers: () => request<{ success: boolean; workers: any[] }>('/api/workers'),
    list: (month?: string | number, year?: string | number) => {
      let path = '/api/attendance';
      if (month && year) path += `?month=${month}&year=${year}`;
      else if (month) path += `?month=${month}`;
      return request<{ success: boolean; attendance: any[] }>(path);
    },
    save: (body: any) => request<{ success: boolean; record: any }>('/api/attendance', { method: 'POST', body: JSON.stringify(body) }),
    salary: (month: string | number, year: string | number) => request<{ success: boolean; salary: any[] }>(`/api/attendance/salary?month=${month}&year=${year}`),
  },

  // ─── Priority ─────────────────────────────────────────────
  priority: (userId: string) =>
    request<{ priority_list: Invoice[] }>(`/api/calculate-priority/${userId}`, { method: 'POST' }),

  // ─── Cash Forecast ────────────────────────────────────────
  forecast: (userId: string, params: { current_cash?: number; daily_expenses?: number; days?: number }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<ForecastResponse>(`/api/cash-forecast/${userId}?${qs}`);
  },

  // ─── Inventory ───────────────────────────────────────────
  inventory: (userId: string) => request<{ products: Product[]; movements: Movement[]; summary: InventorySummary }>(`/api/inventory/${userId}`),

  // ─── CRM / Prospects ─────────────────────────────────────
  prospects: {
    list: (userId: string) => request<{ prospects: Prospect[] }>(`/api/prospects/${userId}`),
    create: (body: object) => request<{ prospect: Prospect }>('/api/prospects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: object) =>
      request<{ prospect: Prospect }>(`/api/prospects/${id}`, { method: 'POST', body: JSON.stringify(body) }),
  },

  // ─── AI Insights ─────────────────────────────────────────
  aiInsights: (userId: string) => request<{ insights: Insight[]; stats: object }>(`/api/ai-insights/${userId}`),

  // ─── Dunning ─────────────────────────────────────────────
  dunning: {
    list: (userId: string) => request<{ rules: DunningRule[] }>(`/api/dunning/${userId}`),
    create: (body: object) => request<{ rule: DunningRule }>('/api/dunning', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: object) =>
      request<{ rule: DunningRule }>(`/api/dunning/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<{ success: boolean }>(`/api/dunning/${id}`, { method: 'DELETE' }),
  },

  // ─── Billing ─────────────────────────────────────────────
  billing: {
    createOrder: (body: { plan: string; period: string }) =>
      request<{ order: RazorpayOrder; key: string }>('/api/billing/create-order', { method: 'POST', body: JSON.stringify(body) }),
    verify: (body: object) => request<{ success: boolean }>('/api/billing/verify', { method: 'POST', body: JSON.stringify(body) }),
    history: () => request<{ history: BillingRecord[] }>('/api/billing/history'),
  },

  // ─── Settings ────────────────────────────────────────────
  settings: {
    get: () => request<{ settings: UserSettings }>('/api/settings'),
    update: (body: Partial<UserSettings>) =>
      request<{ settings: UserSettings }>('/api/settings', { method: 'PATCH', body: JSON.stringify(body) }),
    saveWhatsApp: (body: { provider: string; interakt_api_key?: string; wati_api_url?: string; wati_token?: string }) =>
      request<{ success: boolean; message: string }>('/api/settings/whatsapp', { method: 'POST', body: JSON.stringify(body) }),
    testWhatsApp: () =>
      request<{ success: boolean; provider: string; message: string }>('/api/settings/whatsapp/test', { method: 'POST' }),
    saveRazorpay: (body: { key_id: string; key_secret: string }) =>
      request<{ success: boolean; valid: boolean; message: string }>('/api/settings/razorpay', { method: 'POST', body: JSON.stringify(body) }),
    toggleAutomation: (enabled: boolean) =>
      request<{ success: boolean; automation_enabled: boolean }>('/api/settings/automation/toggle', { method: 'POST', body: JSON.stringify({ enabled }) }),
    saveTwilio: (body: { account_sid: string; auth_token: string; phone_number: string }) =>
      request<{ success: boolean; message: string }>('/api/settings/twilio', { method: 'POST', body: JSON.stringify(body) }),
  },

  // ─── Workers ─────────────────────────────────────────────
  workers: {
    list: () => request<{ success: boolean; workers: any[] }>('/api/workers'),
    create: (body: any) => request<{ success: boolean; worker: any }>('/api/workers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string | number, body: any) => request<{ success: boolean; worker: any }>(`/api/workers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string | number) => request<{ success: boolean }>(`/api/workers/${id}`, { method: 'DELETE' }),
  },

  // ─── Voice ───────────────────────────────────────────────
  voice: {
    getWebhookUrl: () => request<{ success: boolean; url: string; webhook_url?: string; twilio_account_sid?: string; twilio_phone_number?: string }>('/api/voice/webhook-url'),
  },

  // ─── Sales ──────────────────────────────────────────────
  sales: {
    list: () => request<{ success: boolean; sales: any[] }>('/api/sales'),
    create: (body: any) => request<{ success: boolean; sale: any; receivable: any }>('/api/sales', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string | number, body: any) => request<{ success: boolean; sale: any }>('/api/sales/' + id, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string | number) => request<{ success: boolean }>('/api/sales/' + id, { method: 'DELETE' }),
    scan: (imageBase64: string, mimeType = 'image/jpeg') =>
      request<{ success: boolean; data: any }>('/api/sales/scan', {
        method: 'POST',
        body: JSON.stringify({ image: stripDataUrl(imageBase64), mimeType }),
      }, 60_000),
  },

  // ─── Purchases ──────────────────────────────────────────
  purchases: {
    list: () => request<{ success: boolean; purchases: any[] }>('/api/purchases'),
    create: (body: any) => request<{ success: boolean; purchase: any; supplier: any; inventory: any }>('/api/purchases', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string | number, body: any) => request<{ success: boolean; purchase: any }>('/api/purchases/' + id, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string | number) => request<{ success: boolean }>('/api/purchases/' + id, { method: 'DELETE' }),
    scan: (imageBase64: string, mimeType = 'image/jpeg') =>
      request<{ success: boolean; data: any }>('/api/purchases/scan', {
        method: 'POST',
        body: JSON.stringify({ image: stripDataUrl(imageBase64), mimeType }),
      }, 60_000),
  },

  // ─── Suppliers ──────────────────────────────────────────
  suppliers: {
    list: (userId: string) => request<{ success: boolean; suppliers: any[] }>(`/api/suppliers/${userId}`),
  },

  // ─── Bank Ledger / Transactions ──────────────────────────
  transactions: {
    list: (userId: string) =>
      request<{ transactions: Transaction[]; summary: LedgerSummary }>(`/api/transactions/${userId}`),
    create: (body: {
      user_id: string; type: string; category: string; amount: string;
      party_name?: string; description?: string; transaction_date: string;
      payment_method?: string; reference?: string;
    }) => request<{ transaction: Transaction }>('/api/transactions', { method: 'POST', body: JSON.stringify(body) }),
    scan: (imageBase64: string, mimeType = 'image/jpeg') =>
      request<{ success?: boolean; data?: ExtractedTransaction; extracted?: ExtractedTransaction; error?: string }>('/api/transactions/scan', {
        method: 'POST',
        body: JSON.stringify({
          image: stripDataUrl(imageBase64),
          image_base64: ensureDataUrl(imageBase64, mimeType),
          mimeType,
          scan_type: 'transaction',
        }),
      }, 60_000),
    migrate: () => request<{ success: boolean }>('/api/transactions/migrate', { method: 'POST' }),
  },
};

// ─── Auth helpers ─────────────────────────────────────────
// Persists the session. Async because switching to cookie mode is verified
// against the backend rather than assumed — see the auth mode notes above.
// Awaiting it is optional: the bearer fallback is written synchronously first,
// so a caller that navigates immediately is still authenticated either way.
export async function saveAuth(
  token: string,
  user: User,
  rememberMe = true,
  csrfToken?: string | null,
): Promise<AuthMode> {
  // Clear any leftover demo-mode flag so real accounts never see demo data
  localStorage.removeItem('vantro_demo');
  localStorage.setItem('vantro_user', JSON.stringify(user));
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
  setClientCookie(SESSION_COOKIE, '1', maxAge);

  // Write the bearer session first, unconditionally. It is the fallback, and
  // holding it until the cookie is proven means a blocked third-party cookie
  // degrades to the old behaviour instead of locking the user out.
  localStorage.setItem('vantro_token', token);
  setClientCookie(LEGACY_TOKEN_COOKIE, token, maxAge);
  setAuthMode('bearer');

  // No csrf_token means the backend has ENABLE_AUTH_COOKIES off and issued no
  // cookies — nothing to upgrade to.
  if (!csrfToken) return 'bearer';

  if (!(await cookieAuthWorks())) {
    // The backend set the cookie but the browser will not send it back, so the
    // JWT stays in localStorage. Less safe, but functional.
    console.warn('[auth] Cookie session was rejected by the browser — staying on bearer tokens.');
    return 'bearer';
  }

  // The cookie alone authenticated a request, so the readable copies can go.
  setAuthMode('cookie');
  localStorage.removeItem('vantro_token');
  clearClientCookie(LEGACY_TOKEN_COOKIE);
  return 'cookie';
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('vantro_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearAuth() {
  localStorage.removeItem('vantro_token');
  localStorage.removeItem('vantro_user');
  localStorage.removeItem(AUTH_MODE_KEY);
  clearClientCookie(LEGACY_TOKEN_COOKIE);
  clearClientCookie(SESSION_COOKIE);
  // The HttpOnly cookie can only be cleared server-side, so this call is what
  // actually ends a cookie-mode session — not best-effort cleanup.
  fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  }).catch(() => {});
}

export function isLoggedIn(): boolean {
  // In cookie mode there is no readable token by design, so the non-HttpOnly
  // session marker set at login is the only client-side signal — same one
  // middleware.ts gates routes on.
  return (!!getToken() || !!getCookie(SESSION_COOKIE)) && !!getUser();
}

// ─── Types ────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  phone: string;
  business_name: string;
  plan: string;
  gstin?: string;
  created_at: string;
}

export interface UserSettings extends User {
  address?: string;
  logo_url?: string;
  whatsapp_phone?: string;
  whatsapp_token?: string;
  // Integration fields
  wa_provider?: 'interakt' | 'wati';
  interakt_api_key?: string; // masked on GET
  wati_api_url?: string;
  wati_token?: string;       // masked on GET
  razorpay_key_id?: string;
  automation_enabled?: boolean;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  invoice_amount: number;
  invoice_number?: string;
  payment_status: 'Pending' | 'Paid';
  days_overdue: number;
  invoice_date: string;
  due_date?: string;
  payment_date?: string;
  payment_amount?: number;
  payment_method?: string;
  priority_score?: number;
  urgency?: string;
  notes?: string;
  // Reminder tracking
  payment_link?: string;
  payment_link_id?: string;
  last_reminder_sent?: string;
  reminder_count?: number;
  snooze_until?: string;
}

export interface InvoiceLineItem {
  name: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface InvoiceDetail extends Invoice {
  items?: InvoiceLineItem[] | null;
}

export interface BusinessProfile {
  business_name?: string;
  gstin?: string;
  business_address?: string;
  city?: string;
  upi_id?: string;
  invoice_prefix?: string;
}

export interface Metrics {
  total_outstanding: number;
  total_payable?: number;
  total_paid: number;
  pending_invoices: number;
  total_customers: number;
  total_suppliers?: number;
  calls_made: number;
  avg_recovery_rate: number;
}

export interface Analytics {
  total_outstanding: number;
  total_recovered: number;
  recovery_rate: number;
  monthly_trend: { month: string; recovered: number }[];
  top_customers: { name: string; amount: number }[];
}

export interface Summary {
  total_outstanding: number;
  total_customers: number;
  most_overdue_days: number;
}

export interface CallLog {
  id: string;
  customer_name: string;
  customer_phone?: string;
  amount: number;
  notes?: string;
  did_pick_up: boolean;
  promised_payment_date?: string;
  called_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  unit_price: number;
  current_stock: number;
  low_stock_alert: number;
  unit: string;
  category?: string;
}

export interface Movement {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out';
  quantity: number;
  moved_at: string;
}

export interface InventorySummary {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface Prospect {
  id: string;
  name: string;
  phone?: string;
  business_type?: string;
  status: string;
  amount_stuck?: number;
  location?: string;
}

export interface Insight {
  title: string;
  insight: string;
  action: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

export interface DunningRule {
  id: string;
  name: string;
  trigger_day: number;
  action: 'whatsapp' | 'call' | 'email';
  tone: 'gentle' | 'firm' | 'urgent';
  enabled: boolean;
  sent?: number;
  paid?: number;
}

export interface BillingRecord {
  id: string;
  plan: string;
  payment_id: string;
  status: string;
  created_at: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface ForecastResponse {
  cashStart: number;
  burnRate: number;
  avgDailyCollections: number;
  totalOutstanding: number;
  scenarios: Record<string, { curve: { day: number; cash: number }[]; endCash: number; runwayDays: number }>;
}

export interface ExtractedInvoice {
  customer_name: string;
  customer_phone?: string;
  customer_gstin?: string;
  supplier_name?: string;
  seller_gstin?: string;
  invoice_number?: string;
  total_amount?: number;
  invoice_amount?: number;
  invoice_date?: string;
  due_date?: string;
  notes?: string;
  items?: string | { description?: string; qty?: number; unit?: string; price?: number; amount?: number }[];
}

export interface ExtractedTransaction {
  type?: 'in' | 'out';
  category?: string;
  amount?: number | string;
  party_name?: string;
  description?: string;
  transaction_date?: string;
  payment_method?: string;
  reference?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WaLink {
  to: string;
  phone: string;
  message: string;
  url: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'in' | 'out';
  category: string;
  amount: number;
  party_name?: string;
  description?: string;
  notes?: string;
  transaction_date: string;
  payment_method?: string;
  reference?: string;
  created_at?: string;
}

export interface LedgerSummary {
  totalIn: number;
  totalOut: number;
  balance: number;
  monthIn: number;
  monthOut: number;
  monthBalance: number;
}

// ─── Owner Briefing Agent Types (Phase 2C.8) ─────────────────────────────────
export interface OwnerBriefingAction {
  action_id: string;
  action_type: string;
  title: string;
  explanation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  entity_type?: string;
  entity_id?: string;
  suggested_next_step: string;
  approval_required: boolean;
  safe_to_auto_execute: boolean;
}

export interface OwnerBriefingSection {
  section_id: string;
  title: string;
  priority: string;
  summary: string;
  items: Record<string, unknown>[];
  source_tables: string[];
  confidence: number;
  action_required: boolean;
}

export interface OwnerBriefingResponse {
  agent_id: string;
  status: string;
  user_id?: string;
  generated_at?: string;
  briefing_date?: string;
  headline: string;
  risk_summary: string;
  cash_summary: string;
  sections: OwnerBriefingSection[];
  top_actions: OwnerBriefingAction[];
  total_actions: number;
  duration_ms: number;
  audit_context: string;
  data_quality_summary?: unknown;
  cost_route_summary?: unknown;
  policy_summary?: unknown;
}
