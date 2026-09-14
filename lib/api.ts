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

export async function request<T>(path: string, options: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const token = getToken();
  const csrf = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!token && csrf && isUnsafeMethod(options.method)) headers['X-CSRF-Token'] = csrf;

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
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
      const token = getToken();
      return fetch(`${BASE}/api/upload-csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  // ─── Business State (canonical read-model, see lib/domain/intelligence/businessState.js) ───
  businessState: () => request<BusinessStateResponse>('/api/business-state'),

  // ─── Cortex health (track record of past recommendations, see server.js GET /api/cortex/health) ───
  cortexHealth: () => request<CortexHealthResponse>('/api/cortex/health'),

  // Reads audit_logs — a real, already-populated table (see
  // lib/services/orchestrator/audit.service.js on the backend) that had no
  // read path exposed anywhere until this endpoint.
  audit: {
    list: (before?: string) =>
      request<{ success: boolean; events: AuditEvent[] }>(
        `/api/audit${before ? `?before=${encodeURIComponent(before)}` : ''}`
      ),
  },

  // ─── Customer intelligence (drawer: Business State → Receivables Risk → Customer) ───
  customers: {
    intelligence: (name: string, phone?: string) =>
      request<CustomerIntelligenceResponse>(
        `/api/customers/intelligence?name=${encodeURIComponent(name)}${phone ? `&phone=${encodeURIComponent(phone)}` : ''}`
      ),
    // Phase 10 — portfolio-level revenue concentration + attention-ranked list.
    // Returns { enabled: false, ... } zeroed shape when the feature flag is off.
    portfolio: () => request<CustomerPortfolioResponse>('/api/customers/portfolio'),
  },

  // ─── AI Actions (approve/reject only — execution is a separate, existing pathway) ───
  aiActions: {
    updateStatus: (id: string, status: 'approved' | 'rejected' | 'done') =>
      request<{ success: boolean; action: RankedAction }>(`/api/ai-actions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  // ─── Supply Chain Intelligence (see server.js /api/intelligence/*, lib/domain/intelligence/supplyChainOrchestrator.js) ───
  // Every number here comes from a deterministic backend calculation — this
  // client layer never computes or estimates anything itself.
  intelligence: {
    signals: () => request<IntelligenceSignalsResponse>('/api/intelligence/signals'),
    impact: (signalId: string) => request<IntelligenceImpactResponse>(`/api/intelligence/signals/${signalId}/impact`),
    forecast: (signalId: string) => request<IntelligenceForecastResponse>(`/api/intelligence/signals/${signalId}/forecast`, { method: 'POST' }),
    actions: (signalId: string) => request<IntelligenceActionsResponse>(`/api/intelligence/signals/${signalId}/actions`, { method: 'POST' }),
    approveAndExecute: (actionId: string) =>
      request<IntelligenceExecutionResponse>(`/api/intelligence/actions/${actionId}/approve-and-execute`, { method: 'POST' }),
    verifyOutcome: (signalId: string) =>
      request<IntelligenceVerifyOutcomeResponse>(`/api/intelligence/signals/${signalId}/verify-outcome`, { method: 'POST' }),
  },

  // ─── Demo control (2xA meeting slice) — internal use only, never surfaced as a normal product control ───
  // Long timeout: the backend shells out to two CLI scripts (seed + trigger),
  // and cold Node process spawn on this host can take well over the default
  // 30s request timeout.
  demo2xa: {
    reset: () => request<{ success: boolean; triggerOutput?: string }>('/api/demo/2xa/reset', { method: 'POST' }, 120_000),
  },

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

  // ─── Data connections (Tally, file upload, etc.) ────────
  connections: {
    list: () => request<{ success: boolean; connections: DataConnection[] }>('/api/connections'),
  },
};

export interface DataConnection {
  id: string;
  user_id: string;
  source_type: string;
  status: string;
  connected_at: string | null;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Auth helpers ─────────────────────────────────────────
export function saveAuth(token: string, user: User, rememberMe = true, csrfToken?: string | null) {
  // Clear any leftover demo-mode flag so real accounts never see demo data
  localStorage.removeItem('vantro_demo');
  localStorage.setItem('vantro_user', JSON.stringify(user));
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60;
  setClientCookie(SESSION_COOKIE, '1', maxAge);

  if (csrfToken) {
    localStorage.removeItem('vantro_token');
    clearClientCookie(LEGACY_TOKEN_COOKIE);
    return;
  }

  // Legacy fallback until Railway enables ENABLE_AUTH_COOKIES=true.
  localStorage.setItem('vantro_token', token);
  setClientCookie(LEGACY_TOKEN_COOKIE, token, maxAge);
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
  clearClientCookie(LEGACY_TOKEN_COOKIE);
  clearClientCookie(SESSION_COOKIE);
  fetch(`${BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
}

export function isLoggedIn(): boolean {
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

// ─── RAG Evidence Contract Types (Phase 2C.12) ───────────────────────────────

export interface EvidenceItem {
  id: string;
  source_type: string;
  source_id: string;
  label?: string;
  excerpt?: string;
  amount?: number;
  currency?: string;
  created_at?: string;
  updated_at?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentClaim {
  id: string;
  claim: string;
  claim_type: 'summary' | 'risk' | 'opportunity' | 'action' | 'warning';
  evidence_ids: string[];
  confidence: number;
  safe_to_show_claim: boolean;
  blocked_reason?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentRecommendation {
  id: string;
  title: string;
  description: string;
  action_type: string;
  evidence_ids: string[];
  confidence: number;
  requires_human_approval: boolean;
  safe_to_auto_execute: false;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface OwnerBriefingEvidenceContract {
  briefing_id: string;
  generated_at: string;
  agent: 'core.owner_briefing' | string;
  tenant_id?: string;
  user_id?: string;
  summary: string;
  claims: AgentClaim[];
  recommendations: AgentRecommendation[];
  evidence: EvidenceItem[];
  confidence: number;
  safe_to_show: boolean;
  blocked_claim_count: number;
  evidence_source_ids: string[];
  audit_id?: string;
  fallback_reason?: string;
  contract_version?: string;
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

// ─── Business State (canonical read-model) ───────────────────────────────
// Mirrors lib/domain/intelligence/businessState.js's exact return shape on the
// backend — do not add fields here that the backend doesn't actually return.
export interface OverallState {
  state: 'HEALTHY' | 'UNDER_PRESSURE' | 'NEEDS_ATTENTION';
  reasons: string[];
  computedFrom: { urgentActionCount: number; highRiskCustomerCount: number; cashflowGapPct: number | null };
}

export interface RankedActionCustomer {
  id: string;
  name?: string;
  phone?: string;
  credit_risk_score?: number;
  collection_priority_score?: number;
  score_reason?: string | null;
}

// Day 7 — cashRiskNarrative.js's real output shape (lib/domain/intelligence/cashRiskNarrative.js).
// Additive only. When insufficientEvidence is true, no other fields are populated
// (render calmly — never a scary state for missing evidence).
export interface CashRiskNarrativeEvidenceItem {
  type: 'score_trajectory' | 'revenue_concentration' | 'observed_payer_pattern';
  claim: string;
  sourceRows?: Array<{ table: string; id: string; recorded_at: string; credit_risk_score: number }>;
  honestyNote?: string; // e.g. "2-point comparison only" — the trajectory disclaimer
  sharePct?: number;
  payer_reference?: string;
  count?: number;
  total_amount?: number;
}

export interface CashRiskNarrative {
  insufficientEvidence: boolean;
  reasons?: string[]; // present when insufficientEvidence is true
  trajectory?: 'UNKNOWN' | 'DETERIORATING' | 'IMPROVING' | 'STABLE';
  observation?: string;
  what_changed?: string;
  evidence?: CashRiskNarrativeEvidenceItem[];
  relationship_context?: string;
  why_it_matters?: string;
  likely_consequence?: string;
  recommended_action?: string;
  confidence_components?: {
    trajectory_confidence: number;
    concentration_confidence: number;
    payer_pattern_confidence: number;
  };
  customer?: { id: string; name: string };
  generatedAt?: string;
}

// Day 7 Part 6 — priorityScoring.js's real output shape. Optional/additive;
// callers must fall back to existing priority/risk_level sort when absent.
export interface PriorityScoreV2Component {
  value: number;
  known: boolean;
}

export interface PriorityScoreV2 {
  priorityScoreV2: number;
  components: {
    monetaryExposure: PriorityScoreV2Component;
    urgency: PriorityScoreV2Component;
    deterioration: PriorityScoreV2Component;
    concentration: PriorityScoreV2Component;
    confidence: PriorityScoreV2Component;
  };
  weights: {
    monetaryExposure: number;
    urgency: number;
    deterioration: number;
    concentration: number;
    confidence: number;
  };
}

export interface RankedAction {
  id: string;
  action_type: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  risk_level: 'high' | 'medium' | 'low' | null;
  requires_approval: boolean;
  recommended_message: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  customer: RankedActionCustomer | null;
  created_at: string;
  // Day 7 — additive enrichment (lib/domain/intelligence/businessState.js's
  // enrichRowsWithDay7Intelligence). Only present when a customer is attached
  // AND the underlying evidence honestly cleared the bar (insufficientEvidence
  // narratives are never attached to the row at all).
  cashRiskNarrative?: CashRiskNarrative;
  priorityScoreV2?: PriorityScoreV2;
}

export interface BrainSummary {
  asOf: string;
  generatedAt: string;
  kpis: {
    salesThis: number; salesPrev: number; salesDelta: number;
    grossProfit: number; margin: number; netCashFlow: number;
    cashIn: number; cashOut: number; receivable: number; payable: number;
    // False when there is zero purchase/cost data recorded anywhere in the
    // lookback window — lets the UI say "no costs recorded yet" instead of
    // presenting a suspicious 100% margin as if it were a real number.
    hasCostData: boolean;
  };
  position: {
    receivable: number; payable: number; net: number;
    setoffTotal: number; customerCount: number; supplierCount: number;
  };
  // Per-customer / per-supplier breakdowns behind `position`'s totals —
  // "who owes me, and how late" (daysLate from the invoice's own
  // days_overdue field) and "who I still owe, and by when" (dueDate is the
  // nearest due_date among that supplier's unpaid purchases, if any).
  receivables: Array<{ name: string; amount: number; daysLate: number }>;
  payables: Array<{ name: string; amount: number; dueDate: string | null }>;
  setoff: Array<{ name: string; settle: number }>;
  actions: Array<{ sev: 'hi' | 'mid' | 'lo'; title: string; sub: string; value: number | null }>;
  approximations: { grossProfit: string; cash: string };
  // salesTrend/products intentionally left untyped here — not consumed by Business State V1.
  salesTrend: unknown[];
  products: unknown[];
}

// Day 7 Part 3B — lib/world/businessStateBoundary.js's getWorldExposureStatus()
// real three-state contract. NEVER render DATA_INCOMPLETE and NO_MATERIAL_SIGNALS
// as the same message — they mean genuinely different things (unknown exposure
// vs. verified-but-currently-quiet). Never use FX/currency-risk copy for this —
// it is LOCATION/exposure data (LOCATED_IN/OPERATES_IN), not currency-denominated risk.
export interface IntelligenceReadiness {
  organization_country: 'known' | 'unknown';
  base_currency: 'known' | 'unknown';
  suppliers_with_country: string; // "known/total" e.g. "2/8"
  suppliers_with_currency: string;
  customers_with_country: string;
  customers_with_currency: string;
  external_intelligence_ready: 'none' | 'partial' | 'full';
  generated_at: string;
}

export interface ExternalConditionsSignal {
  signalId: string;
  status: string;
  impactStatus: string;
  affectedBusinessDimensions: string[];
  whyExists: string;
  materialityComponents?: Record<string, unknown>;
  rankScore?: number;
}

export interface ExternalConditions {
  world_exposure_status: 'DATA_INCOMPLETE' | 'NO_MATERIAL_SIGNALS' | 'signals_present';
  reason: string;
  verified_exposure_count?: number;
  signals: ExternalConditionsSignal[];
  intelligence_readiness?: IntelligenceReadiness | { error: string; message: string };
  error?: string; // present on the loadBusinessState fallback when the section itself failed
}

export interface BusinessState {
  overallState: OverallState | null; // null when there isn't enough data to classify honestly — never fabricate a verdict
  rankedActions: RankedAction[];
  receivablesRisk: RankedAction[];
  payablesRisk: RankedAction[];
  cashflow: { expected_inflow: number; expected_outflow: number; error?: string };
  brain: BrainSummary | null; // null if brain_dashboard_enabled is off, or that section failed — see `sections.brain`
  externalConditions?: ExternalConditions; // Day 7 Part 3B — additive-only
  sections?: { rankedActions: 'ok' | 'error'; cashflow: 'ok' | 'error'; brain: 'ok' | 'disabled' | 'error'; externalConditions?: 'ok' | 'error' };
  generatedAt: string;
}

export interface BusinessStateResponse {
  success: true;
  businessState: BusinessState;
  _cached?: boolean;
}

// ─── Cortex health (track record of past recommendations) ───────────────
// Mirrors server.js GET /api/cortex/health's exact response shape — by_action_type
// is additive-only grouping of the already-fetched ai_actions.outcome rows.
export interface CortexHealthActionTypeBreakdown {
  effective: number;
  ineffective: number;
  unknown: number;
  rate: number | null; // null when this type has 0 evaluated actions
}

export interface CortexHealthStats {
  pending_actions: number;
  pending_by_priority: { urgent: number; high: number; medium: number; low: number };
  customer_scores: number;
  active_plans: number;
  memory_entries: number;
  evaluated_actions: number;
  effectiveness_rate: number | null;
  effective_count: number;
  ineffective_count: number;
  by_action_type: Record<string, CortexHealthActionTypeBreakdown>;
}

export interface CortexHealthResponse {
  success: true;
  flags: Record<string, boolean>;
  stats: CortexHealthStats;
}

// Mirrors the real audit_logs row shape (migrations/001_cortex_foundation.sql
// on the backend) — nothing here is invented.
export interface AuditEvent {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value_json: unknown;
  new_value_json: unknown;
  created_at: string;
}

// ─── Customer intelligence (drawer view) ─────────────────────────────────
// Mirrors GET /api/customers/intelligence's exact return shape (server.js).
export interface CustomerIntelligenceResponse {
  success: boolean;
  customer_id: string | null;
  name: string;
  score: {
    credit_risk_score: number;
    collection_priority_score: number;
    promise_reliability_score: number;
    average_delay_days: number;
    max_delay_days: number;
    broken_promise_count: number;
    tier: 'HIGH_RISK' | 'MEDIUM' | 'LOW';
    credit_recommendation: string;
    last_calculated_at: string | null;
  };
  summary: {
    total_outstanding: number;
    overdue_count: number;
    active_promises: number;
    broken_promises: number;
    pending_actions: number;
  };
  promises: Array<{ promised_amount: number; promised_date: string; status: string; created_at: string }>;
  actions: Array<{ action_type: string; title: string; priority: string; status: string; created_at: string }>;
  invoices: Array<{ id: string; invoice_amount: number; payment_status: string; due_date: string; days_overdue: number; created_at: string }>;
  memories: Array<{ memory_key: string; memory_value: unknown; updated_at: string }>;
  // Phase 4 additions — raw evidence from Phase 3's temporal-history tables (customer_score_history,
  // business_events) and the already-computed score_reason_json, previously fetched then discarded.
  scoreHistory?: Array<{
    id: string;
    user_id: string;
    customer_id: string;
    credit_risk_score: number | null;
    promise_reliability_score: number | null;
    broken_promise_count: number | null;
    collection_priority_score: number | null;
    recorded_at: string;
  }>;
  riskEvents?: Array<{
    id: string;
    user_id: string;
    event_type: string;
    entity_type: string | null;
    entity_id: string | null;
    actor_type: string;
    actor_id: string | null;
    payload_json: unknown;
    created_at: string;
  }>;
  scoreReason?: unknown | null;
  // Phase 10 — Customer & Revenue Intelligence. null when the
  // customer_revenue_intelligence feature flag is off or the customer could
  // not be resolved; every populated field always carries a plain-language
  // `evidence` string alongside its number(s) — never a bare figure.
  revenue?: CustomerRevenueBlock | null;
}

export interface CustomerRevenueBlock {
  value: { windowDays: number; revenue: number; orderCount: number; aov: number; evidence: string };
  momentum: {
    status: 'GROWING' | 'DECLINING' | 'FLAT' | 'INSUFFICIENT_HISTORY';
    changePct: number | null;
    evidence: string;
  };
  concentration: { share: number; sharePct: number; isConcentrationRisk: boolean; evidence: string };
  dormancy: { isDormant: boolean; daysSinceLastSale: number | null; avgGapDays: number | null; evidence: string };
  health: { label: 'DORMANT' | 'AT_RISK' | 'WATCH' | 'GROWING' | 'HEALTHY'; evidence: string[] };
}

// Phase 10 — GET /api/customers/portfolio (revenueIntelligence.service.js computePortfolio()).
export interface CustomerPortfolioEntry {
  customerId: string | null;
  customerName: string;
  revenue: number;
  orderCount: number;
  aov: number;
  concentration: { share: number; sharePct: number; isConcentrationRisk: boolean; evidence: string };
  momentum: { status: string; changePct: number | null; evidence: string };
  dormancy: { isDormant: boolean; daysSinceLastSale: number | null; avgGapDays: number | null; evidence: string };
  creditRiskScore: number;
  trajectory: string;
  healthLabel: 'DORMANT' | 'AT_RISK' | 'WATCH' | 'GROWING' | 'HEALTHY';
  healthEvidence: string[];
  attentionScore: number;
  evidence: string[];
}
export interface CustomerPortfolioResponse {
  enabled: boolean;
  customers: CustomerPortfolioEntry[];
  tenantRevenue: number;
  windowDays?: number;
  top1SharePct: number;
  top3SharePct: number;
  top5SharePct: number;
  concentrationRiskCount: number;
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
  evidence_contract?: OwnerBriefingEvidenceContract;
}


// ─── Supply Chain Intelligence types (mirrors lib/domain/intelligence/supplyChainOrchestrator.js + business_signals/ai_actions/predictions table shapes exactly — see server.js /api/intelligence/*) ───

export interface IntelligenceSignal {
  id: string;
  user_id: string;
  world_event_id: string;
  related_entity_type: string;
  related_entity_id: string;
  transmission_channel_id: string;
  plausibility_confidence: number | null;
  evidence_notes: string | null;
  created_at: string;
  status: 'CANDIDATE' | 'ACTIVE' | 'UPDATED' | string;
  business_exposure_id: string;
  first_detected_at: string;
  last_updated_at: string;
  why_exists: string;
  affected_business_dimensions: string[];
  impact_status: string;
  event_title: string | null;
  event_type: string | null;
  event_observed_at: string | null;
}

export interface IntelligenceSignalsResponse {
  success: boolean;
  signals: IntelligenceSignal[];
}

// Every claim in the causal chain is tagged with one of these kinds — the
// frontend must never blur them (see EVIDENCE_KIND in supplyChainOrchestrator.js).
export type EvidenceKind =
  | 'OBSERVED_FACT'
  | 'CALCULATED_FACT'
  | 'ASSUMPTION'
  | 'FORECAST'
  | 'EXTERNAL_EVIDENCE'
  | 'INTERNAL_EVIDENCE';

export interface IntelligenceEvidenceItem {
  kind: EvidenceKind;
  label: string;
  detail: string;
  source: string;
  timestamp?: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

export interface CoverageResult {
  sufficientData: boolean;
  coverageDays?: number;
  reason?: string;
}

export interface StockoutResult {
  sufficientData: boolean;
  alreadyBelowSafetyStock?: boolean;
  daysUntilStockout?: number;
  stockoutDate?: string;
  reason?: string;
}

export interface AffectedFinishedProduct {
  finishedProductId: string;
  quantityPerUnit: number;
}

export interface AffectedDemand {
  sufficientData: boolean;
  affectedOrderCount: number;
  affectedOrderIds: string[];
  affectedLineItems: Array<{ order_id: string; product_id: string; quantity: number; unit_price: number; needed_by: string | null; customer_name?: string; status?: string }>;
}

export interface RevenueExposureResult {
  sufficientData: boolean;
  totalRevenueExposure: number;
  excludedLineCount: number;
}

export interface ImpactComponent {
  component: { id: string; name: string; sku: string };
  coverage: CoverageResult;
  stockout: StockoutResult;
  affectedFinishedProducts: AffectedFinishedProduct[];
  affectedDemand: AffectedDemand;
  revenueExposure: RevenueExposureResult;
  alternateSource: { id: string; name: string } | null;
  leadTimeDays: number | null;
}

export interface SignalImpact {
  signal: IntelligenceSignal & {
    event_summary?: string | null;
    event_source_url?: string | null;
    magnitude?: number | null;
    magnitude_unit?: string | null;
    event_confidence?: number | null;
    channel_code?: string | null;
    mechanism?: string | null;
    rule_explanation?: string | null;
  };
  supplier?: { id: string; name: string; country: string };
  evidence: IntelligenceEvidenceItem[];
  sufficientDataForQuantification: boolean;
  reason?: string;
  components?: ImpactComponent[];
  totalRevenueExposure?: number;
}

export interface IntelligenceImpactResponse {
  success: boolean;
  impact: SignalImpact;
}

export interface IntelligencePrediction {
  id: string;
  entity_id: string;
  target: string;
  horizon_days: number;
  point_estimate: number | null;
  data_quality: 'sufficient' | 'insufficient';
  evidence: { signalId: string; projectedDate: string; stockout: StockoutResult };
  as_of: string;
}

export interface IntelligenceForecastResponse {
  success: boolean;
  predictions: IntelligencePrediction[];
}

export interface RankedInterventionOption {
  id: string;
  label: string;
  cost: number;
  leadTimeDays: number | null;
  benefitToCostRatio: number;
  avoidedRevenueExposure: number;
}

export interface IntelligenceAction {
  id: string;
  user_id: string;
  action_type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'done' | 'expired' | 'system_blocked';
  supplier_id: string | null;
  risk_level: 'low' | 'medium' | 'high';
  requires_approval: boolean;
  reason_json: { signalId: string; componentId: string; rankedOptions: RankedInterventionOption[] };
  approved_by?: string | null;
  approved_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface IntelligenceActionsResponse {
  success: boolean;
  actions: IntelligenceAction[];
}

export interface DemoExecutionResult {
  mode: 'DEMO_ADAPTER' | 'LIVE_ODOO';
  liveExternalWriteOccurred: boolean;
  purchaseOrder: {
    id: string;
    supplier_name: string;
    items: { component_id: string | null; component_name: string | null; note: string };
    estimated_amount: number | null;
    status: string;
    related_ai_action_id: string;
    created_at: string;
  };
  executionRecord: {
    id: string;
    channel: string;
    provider_message_id: string;
    status: string;
    sent_at: string;
  };
  note: string;
}

export interface IntelligenceExecutionResponse {
  success: boolean;
  executionMode: 'DEMO_ADAPTER' | 'LIVE_ODOO';
  execution: DemoExecutionResult;
}

// Mirrors lib/domain/intelligence/outcomeVerification.js's real return shape —
// never resolves a prediction before its horizon has actually elapsed.
export interface IntelligenceVerifyOutcomeResponse {
  success: boolean;
  signalId: string;
  resolvedPredictions: Array<{ predictionId: string; target: string; horizonDays: number; actualValue: number; predicted: number; absError: number; pctError: number | null; coverageHit: boolean | null }>;
  awaitingPredictions: Array<{ predictionId: string; target: string; horizonDays: number; horizonDate: string }>;
  updatedActions: Array<{ actionId: string; outcome: 'effective' | 'ineffective' }>;
  status: 'VERIFIED' | 'AWAITING_OBSERVATION' | 'NO_ACTION_TO_VERIFY';
}
