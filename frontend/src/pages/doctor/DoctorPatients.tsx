import React, { useMemo, useState } from 'react';
import { usePatientsQuery } from '../../hooks/useDashboardData';
import { Users, Search, FolderHeart, Calendar, HeartPulse, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DoctorPatients: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: patientsData, isLoading, refetch } = usePatientsQuery({ limit: 50 });

  const filteredPatients = useMemo(() => {
    if (!patientsData?.patients) return [];
    return patientsData.patients.filter((p: any) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patientsData, searchTerm]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            Patients Registry Index
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access demographic indices, contact channels, and retrieve medical histories.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search patient name, email, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-350 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-450 text-xs">
          No patients found matching query criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPatients.map((p: any) => (
            <div
              key={p.id}
              className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm font-bold font-display">
                  {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-sm">
                    {p.firstName} {p.lastName}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Registry ID: {p.id.slice(0, 8)} | {p.gender}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-2">
                <div>Email: {p.email}</div>
                <div>Phone: {p.phone}</div>
                <div>DOB: {new Date(p.dob).toLocaleDateString()}</div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  onClick={() => navigate(`/dashboard/emr`, { state: { selectPatientId: p.id } })}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <FolderHeart className="h-3.5 w-3.5 text-rose-500" />
                  Access EMR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
