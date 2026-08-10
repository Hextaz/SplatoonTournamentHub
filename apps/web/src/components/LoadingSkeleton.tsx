interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
  variant?: "card" | "table" | "text";
}

export default function LoadingSkeleton({ rows = 3, className = "", variant = "card" }: LoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-10 bg-slate-700/50 rounded-lg w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-8 bg-slate-700/30 rounded w-1/4" />
            <div className="h-8 bg-slate-700/30 rounded w-1/2" />
            <div className="h-8 bg-slate-700/30 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-700/30 rounded w-full" style={{ maxWidth: `${90 - i * 10}%` }} />
        ))}
      </div>
    );
  }

  // card variant (default)
  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-[#151722] rounded-lg p-5 border border-slate-800/50 space-y-3">
          <div className="h-5 bg-slate-700/30 rounded w-2/3" />
          <div className="h-4 bg-slate-700/20 rounded w-full" />
          <div className="h-4 bg-slate-700/20 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
