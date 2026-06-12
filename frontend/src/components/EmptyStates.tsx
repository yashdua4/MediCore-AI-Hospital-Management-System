import React from 'react';
import { LucideIcon, HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = HelpCircle,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 rounded-2xl animate-fade-in font-sans min-h-[300px]">
      <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 mb-4">
        <Icon className="h-8 w-8 stroke-[1.5]" />
      </div>
      <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.02]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
