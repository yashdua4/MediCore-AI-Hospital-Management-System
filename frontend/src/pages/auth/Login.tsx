import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
// We perform custom Zod validation directly in our form resolver option
import * as z from 'zod';
import { authService, DEMO_ACCOUNTS } from '../../services/auth.service';
import { KeyRound, Mail, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }),
  password: z.string().min(4, { message: 'Password must be at least 4 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isSessionExpired = searchParams.get('expired') === 'true';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    // Since we have zodResolver, wait, we can just use manual validation if resolvers is not resolved or use Zod manually:
    resolver: (values) => {
      const result = loginSchema.safeParse(values);
      if (result.success) return { values, errors: {} };
      const fieldErrors: any = {};
      result.error.errors.forEach((err) => {
        const path = err.path[0] as string;
        fieldErrors[path] = { type: 'custom', message: err.message };
      });
      return { values: {}, errors: fieldErrors };
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const response = await authService.login(data.email, data.password);
      const role = response.user.role;

      // Redirect user to the corresponding dashboard based on their role
      if (role === 'SUPER_ADMIN' || role === 'HOSPITAL_ADMIN') {
        navigate('/dashboard/executive');
      } else if (role === 'DOCTOR' || role === 'EMERGENCY_DOCTOR' || role === 'TRAUMA_SURGEON') {
        navigate('/dashboard/doctor');
      } else if (role === 'NURSE') {
        navigate('/dashboard/nurse');
      } else if (role === 'BILLING_EXEC' || role === 'ACCOUNTANT') {
        navigate('/dashboard/billing');
      } else {
        navigate('/dashboard/patient');
      }
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Access authorization rejected. Check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email: string) => {
    setValue('email', email);
    setValue('password', 'password'); // Autofills standard mock password
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-display font-bold text-white">Welcome back</h2>
        <p className="text-xs text-slate-400 mt-1">Authenticate to access the healthcare interface</p>
      </div>

      {isSessionExpired && (
        <div className="flex gap-2.5 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs items-center animate-pulse">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Your session has expired. Please log in again to renew tokens.</span>
        </div>
      )}

      {serverError && (
        <div className="flex gap-2.5 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs items-center">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Input */}
        <div>
          <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 h-4.5 w-4.5 text-slate-500" />
            <input
              type="email"
              {...register('email')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="e.g. doctor@medicore.com"
            />
          </div>
          {errors.email && (
            <span className="text-[10px] text-rose-500 block mt-1">{errors.email.message}</span>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
            Access Key / Password
          </label>
          <div className="relative flex items-center">
            <KeyRound className="absolute left-3.5 h-4.5 w-4.5 text-slate-500" />
            <input
              type="password"
              {...register('password')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          {errors.password && (
            <span className="text-[10px] text-rose-500 block mt-1">{errors.password.message}</span>
          )}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-950 transition-all font-display shadow-md hover:scale-[1.01]"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <span>Authorize Session</span>
          )}
        </button>
      </form>

      {/* Demo Roles Quick Grid */}
      <div className="border-t border-slate-800/80 pt-5 mt-4">
        <span className="block text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-2.5 text-center">
          Developer quick-select profiles
        </span>
        <div className="grid grid-cols-2 gap-2 text-left">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => handleQuickLogin(account.email)}
              className="p-2 bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left rounded-lg text-[10px] transition-all"
            >
              <div className="font-semibold text-slate-300 truncate">{account.name}</div>
              <div className="text-slate-500 truncate mt-0.5">{account.role}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
