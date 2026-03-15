export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card-base p-5 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-100 dark:bg-white/5 rounded mb-2 ${i === lines - 1 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
  );
}
