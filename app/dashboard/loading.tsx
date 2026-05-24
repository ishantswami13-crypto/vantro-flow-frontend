export default function DashboardLoading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 rounded-lg w-48" />
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-7 bg-gray-200 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
        ))}
      </div>
      {/* List skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 flex justify-between items-center">
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
            <div className="h-5 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
