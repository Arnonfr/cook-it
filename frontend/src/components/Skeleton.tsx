// Skeleton loading components for better UX
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 ${className}`} />
);

export const SkeletonText = ({ lines = 1, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="animate-pulse bg-slate-200 h-4 rounded" style={{ width: `${Math.random() * 30 + 70}%` }} />
    ))}
  </div>
);

export const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-white rounded-[12px] overflow-hidden ${className}`}>
    <div className="bg-slate-200 h-40 w-full" />
    <div className="p-4 space-y-3">
      <div className="bg-slate-200 h-5 rounded w-3/4" />
      <div className="bg-slate-200 h-3 rounded w-1/2" />
    </div>
  </div>
);

export const SkeletonHero = () => (
  <div className="relative w-full h-[35vh] min-h-[300px] max-h-[480px] bg-slate-200 animate-pulse overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-t from-slate-300 via-slate-200 to-slate-100" />
    <div className="absolute bottom-6 right-6 left-6 space-y-3">
      <div className="bg-slate-300 h-8 rounded w-3/4" />
      <div className="bg-slate-300 h-4 rounded w-1/2" />
    </div>
  </div>
);

export const SkeletonRecipeGrid = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);
