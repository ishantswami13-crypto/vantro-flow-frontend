const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vantro-flow-backend-production.up.railway.app';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vantro_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Auth ────────────────────────────────────────────────
export const api = {
  auth: {
    signup: (body: { email: string; phone: string; business_name: string; password: string }) =>
      request<{ token: string; user: User }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<{ user: User }>('/api/auth/me'),
  },

  // ─── Dashboard ──────────────────────────────────────────
  metrics: (userId: string) => request<{ metrics: Metrics }>(`/api/metrics/${userId}`),
  analytics: (userId: string) => request<{ analytics: Analytics }>(`/api/analytics/${userId}`),

  // ─── Invoices / Collections ─────────────────────────────
  invoices: {
    list: (userId: string) => request<{ invoices: Invoice[]; summary: Summary }>(`/api/invoices/${userId}`),
    markPaid: (invoiceId: string, body: object) =>
      request<{ invoice: Invoice }>('/api/mark-paid', { method: 'POST', body: JSON.stringify({ invoice_id: invoiceId, ...body }) }),
    upload: (userId: string, file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('user_id', userId);
      const token = getToken();
      return fetch(`${BASE}/api/upload-csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(r => r.json());
    },
  },

  // ─── Scanner ────────────────────────────────────────────
  scanner: {
    extract: (imageBase64: string) =>
      request<{ extracted: ExtractedInvoice }>('/api/scan-document', {
        method: 'POST',
        body: JSON.stringify({ image_base64: imageBase64, scan_type: 'invoice' }),
      }),
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
  },

  // ─── Seed ────────────────────────────────────────────────
  seed: (userId: string) => request<{ seeded: object }>(`/api/seed/${userId}`, { method: 'POST' }),
};

// ─── Auth helpers ─────────────────────────────────────────
export function saveAuth(token: string, user: User) {
  localStorage.setItem('vantro_token', token);
  localStorage.setItem('vantro_user', JSON.stringify(user));
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
}

export function isLoggedIn(): boolean {
  return !!getToken() && !!getUser();
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
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone?: string;
  invoice_amount: number;
  payment_status: 'Pending' | 'Paid';
  days_overdue: number;
  invoice_date: string;
  payment_date?: string;
  payment_amount?: number;
  payment_method?: string;
  priority_score?: number;
  urgency?: string;
}

export interface Metrics {
  total_outstanding: number;
  total_paid: number;
  pending_invoices: number;
  total_customers: number;
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
  invoice_amount?: number;
  invoice_date?: string;
  items?: string;
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
