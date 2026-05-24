export default function AnalyticsLoading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-32" />
      {/* Chart skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 h-56 flex items-end gap-2">
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-blue-100 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-6 bg-gray-200 rounded w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
