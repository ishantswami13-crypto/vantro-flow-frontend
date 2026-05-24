export default function CollectionsLoading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 space-y-1">
            <div className="h-3 bg-gray-200 rounded w-16" />
            <div className="h-5 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
      {/* Filter bar */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded-full w-20" />
        ))}
      </div>
      {/* Invoice rows */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-gray-200 rounded w-36" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-3 bg-orange-100 rounded w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
