export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
    </div>
  );
}
