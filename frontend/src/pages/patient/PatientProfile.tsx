import React, { useMemo, useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePatientsQuery, useUpdatePatientMutation } from '../../hooks/useDashboardData';
import { User, Phone, Mail, MapPin, Calendar, Heart, Save, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export const PatientProfile: React.FC = () => {
  const { user } = useAuthStore();
  const { data: patientsData, isLoading, refetch } = usePatientsQuery();
  const updateMutation = useUpdatePatientMutation();

  const activePatient = useMemo(() => {
    if (!patientsData?.patients) return null;
    return patientsData.patients.find((p: any) => p.userId === user?.id) || patientsData.patients[0];
  }, [patientsData, user]);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (activePatient) {
      setFirstName(activePatient.firstName || '');
      setLastName(activePatient.lastName || '');
      setDob(activePatient.dob ? new Date(activePatient.dob).toISOString().split('T')[0] : '');
      setGender(activePatient.gender || '');
      setPhone(activePatient.phone || '');
      setEmail(activePatient.email || '');
    }
  }, [activePatient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!firstName || !lastName || !dob || !gender || !phone || !email) {
      setErrorMsg('All demographic fields are required.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: activePatient.id,
        firstName,
        lastName,
        dob,
        gender,
        phone,
        email,
      });
      setSuccessMsg('Profile updated successfully!');
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Profile modification failed.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!activePatient) {
    return (
      <div className="text-center py-12 text-slate-500">
        No active patient profile was found. Please register in the system.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-6 w-6 text-emerald-500" />
            Demographics & Profile Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain your contact channels, demographics, and registry details.
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

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="h-4.5 w-4.5" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle className="h-4.5 w-4.5" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card View */}
        <div className="lg:col-span-1 p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-6 flex flex-col items-center text-center">
          <div className="h-24 w-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 text-3xl font-display font-bold">
            {firstName.charAt(0)}{lastName.charAt(0)}
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-850 dark:text-slate-100 text-lg">
              {activePatient.firstName} {activePatient.lastName}
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Patient Registry ID: {activePatient.id.slice(0, 8)}
            </span>
          </div>

          <div className="w-full border-t border-slate-100 dark:border-slate-850 pt-4 space-y-3.5 text-xs text-left text-slate-650 dark:text-slate-405">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>{activePatient.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-slate-400" />
              <span>{activePatient.phone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{new Date(activePatient.dob).toLocaleDateString()}</span>
            </div>
            {activePatient.bloodGroup && (
              <div className="flex items-center gap-2.5">
                <Heart className="h-4 w-4 text-rose-500" />
                <span>Blood Group: {activePatient.bloodGroup}</span>
              </div>
            )}
          </div>
        </div>

        {/* Profile Details Edit Form */}
        <div className="lg:col-span-2 p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
          <h3 className="text-sm font-display font-semibold text-slate-800 dark:text-white mb-4">Update Patient Registration</h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Date of Birth *</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  <option value="" className="dark:bg-slate-900">-- Choose Gender --</option>
                  <option value="male" className="dark:bg-slate-900">Male</option>
                  <option value="female" className="dark:bg-slate-900">Female</option>
                  <option value="other" className="dark:bg-slate-900">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Phone Number *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Email Channel *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? 'Saving Registry...' : 'Save Demographics'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
