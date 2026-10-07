export default function Loading() {
  return (
    <div className="p-6 md:p-8 animate-pulse space-y-6 flex-1">
      <div className="h-8 bg-[var(--bg-hover)] rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-[var(--bg-hover)] rounded"></div>
        <div className="h-32 bg-[var(--bg-hover)] rounded"></div>
        <div className="h-32 bg-[var(--bg-hover)] rounded"></div>
      </div>
      <div className="h-64 bg-[var(--bg-hover)] rounded"></div>
    </div>
  );
}