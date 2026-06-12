import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`} />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex gap-4 items-center">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const StatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
};

export const FullScreenLoader: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <div className="relative flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-800 border-t-emerald-500" />
      </div>
      <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">
        Securing telemetry systems...
      </span>
    </div>
  );
};
