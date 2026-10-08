export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" style={{ padding: "32px 24px", maxWidth: 1180, display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="skeleton" style={{ height: 26, width: 160 }} />
      <div style={{ display: "flex", gap: 24 }}>
        <div className="skeleton" style={{ height: 52, width: 140 }} />
        <div className="skeleton" style={{ height: 52, width: 140 }} />
      </div>
      <div className="skeleton" style={{ height: 240 }} />
    </div>
  );
}
