# Frontend Observability & Error Visibility Plan (Vantro Flow)

This document establishes the frontend architecture for capturing, reporting, and handling client-side exceptions and network failure states in the Vantro Flow Next.js application.

---

## 1. Traceable Error Toast UI
When an API request fails, the frontend should display a clean, actionable toast or error modal. 

### Recommended Toast Error UI Component
Instead of plain text alerts, utilize a template that captures and renders the backend **Request ID** so customers can copy and send it to support channels.

```tsx
import React from 'react';

interface ErrorBannerProps {
  message: string;
  requestId?: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, requestId, onRetry }) => {
  return (
    <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/20 backdrop-blur text-red-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Request Failed</p>
          <p className="text-xs opacity-75">{message}</p>
        </div>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="px-3 py-1 text-xs rounded bg-red-500/20 hover:bg-red-500/30 transition border border-red-500/30"
          >
            Retry Connection
          </button>
        )}
      </div>
      {requestId && (
        <div className="mt-2 pt-2 border-t border-red-500/10 flex items-center justify-between text-[10px] font-mono opacity-50">
          <span>Trace ID: {requestId}</span>
          <button 
            onClick={() => navigator.clipboard.writeText(requestId)}
            className="hover:underline"
          >
            Copy ID
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## 2. Global Error Boundary Strategy
To prevent raw white-screen-of-death crashes:
*   Wrap critical layout components inside React **Error Boundaries**.
*   We recommend implementing a recovery fallback boundary in `app/error.tsx` that auto-detects unhandled errors, logs them to Sentry, and offers an active "Reset Dashboard" retry action.

---

## 3. Network Offline vs. Session Expiration Handling

We must distinguish between network-level losses and authentication failures:

*   **Offline Mode**:
    *   Monitor client connectivity status using standard `navigator.onLine` events.
    *   Render a persistent, non-intrusive warning header: *"You are currently offline. Local actions will sync once network is restored."*
*   **Authentication Expiration (401 Unauthorized)**:
    *   Intercept all `401` status responses in the fetch wrapper (`lib/api.ts`).
    *   Show an explicit toast message: *"Your session has expired. Redirecting to login..."* and redirect within 2 seconds instead of locking the UI with endless skeleton screens.

---

## 4. Frontend Log Aggregation (Future State)
Once approved, we will deploy the **Sentry browser SDK** with a custom integrations hook:

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // Sample 10% of sessions to optimize pricing limits
  beforeSend(event) {
    // Sanitize user inputs, strip local passwords
    return event;
  }
});
```
