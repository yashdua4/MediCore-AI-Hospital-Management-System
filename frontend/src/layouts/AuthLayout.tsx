import React from 'react';
import { Outlet } from 'react-router-dom';
import { Activity } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-slate-900 text-white font-sans overflow-hidden relative">
      {/* Decorative background grid and blurs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      {/* Left panel: Info & Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative z-10 border-r border-slate-800 bg-slate-950/45 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="h-6 w-6 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-display font-bold text-2xl tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            MediCore <span className="text-emerald-400">AI</span>
          </span>
        </div>

        <div className="space-y-6 max-w-lg my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            Platform Foundation v1.0
          </div>
          <h1 className="text-4xl xl:text-5xl font-display font-bold leading-tight">
            Next-Generation Healthcare Information Architecture
          </h1>
          <p className="text-slate-400 leading-relaxed">
            Integrating advanced clinic analytics, EMR workflows, laboratory reporting, pharmacy logistics, and role-based access control under a unified intelligence suite.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="text-2xl font-bold font-display text-emerald-400">99.99%</div>
              <div className="text-xs text-slate-400">System Availability</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="text-2xl font-bold font-display text-blue-400">&lt;50ms</div>
              <div className="text-xs text-slate-400">API Latency</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} MediCore Inc. ISO 27001 Certified. HIPAA Compliant.
        </div>
      </div>

      {/* Right panel: Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md bg-slate-950/80 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-xl animate-fade-in">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
          <Outlet />
        </div>
      </div>
    </div>
  );
};
