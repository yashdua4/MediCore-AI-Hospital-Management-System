import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  usePatientsQuery,
  usePrescriptionsQuery,
  useAddPrescriptionMutation,
} from '../../hooks/useDashboardData';
import { Pill, Search, Plus, Trash2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export const DoctorPharmacy: React.FC = () => {
  const { user } = useAuthStore();
  
  const { data: patientsData } = usePatientsQuery({ limit: 50 });
  const { data: prescriptions = [], isLoading, refetch } = usePrescriptionsQuery();
  const addPrescriptionMutation = useAddPrescriptionMutation();

  // Form states
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [notes, setNotes] = useState('');
  
  // Medicines array
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [medName, setMedName] = useState('');
  const [medStrength, setMedStrength] = useState('');
  const [medFreq, setMedFreq] = useState('Once daily');
  const [medDur, setMedDur] = useState('7 days');
  const [medInst, setMedInst] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const addMedicine = () => {
    if (!medName || !medStrength) return;
    setMedicinesList([
      ...medicinesList,
      {
        medicineName: medName,
        strength: medStrength,
        frequency: medFreq,
        duration: medDur,
        instructions: medInst,
      },
    ]);
    setMedName('');
    setMedStrength('');
    setMedInst('');
  };

  const removeMedicine = (idx: number) => {
    setMedicinesList(medicinesList.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedPatientId) {
      setErrorMsg('Please select a patient.');
      return;
    }
    if (medicinesList.length === 0) {
      setErrorMsg('Please add at least one medicine to the prescription.');
      return;
    }

    try {
      await addPrescriptionMutation.mutateAsync({
        patientId: selectedPatientId,
        doctorId: user?.id || 'doc-id',
        medicines: medicinesList,
        notes,
      });

      setSuccessMsg('Prescription written and submitted successfully.');
      setShowFormModal(false);
      setSelectedPatientId('');
      setNotes('');
      setMedicinesList([]);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to submit prescription.');
    }
  };

  const patientsList = patientsData?.patients || [];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Pill className="h-6 w-6 text-emerald-500" />
            Prescription Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Write prescriptions, manage pharmaceutical plans, and check patient drug logs.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Write Prescription
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="h-4.5 w-4.5" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-2 text-xs">
          <ShieldCheck className="h-4.5 w-4.5" />
          {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-400 text-xs">
          No prescriptions issued in this clinic.
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((p: any) => (
            <div
              key={p.id}
              className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-850 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-805 dark:text-slate-100">
                    Patient: {p.patient?.firstName} {p.patient?.lastName}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Issued: {new Date(p.createdAt).toLocaleDateString()} | Prescribed by: {p.doctor?.email || 'Clinical Staff'}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-550/10 text-emerald-500 text-[10px] font-bold uppercase">
                  {p.status || 'ACTIVE'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {p.medicines?.map((med: any) => (
                  <div key={med.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="font-bold text-slate-750 dark:text-slate-250">{med.medicineName} ({med.strength})</span>
                      <p className="text-[10px] text-slate-450 mt-0.5">{med.instructions}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{med.frequency}</span>
                      <p className="text-[10px] text-slate-450 mt-0.5">Duration: {med.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write Prescription Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowFormModal(false)}
              className="absolute right-4 top-4 p-1 rounded-md text-slate-450 hover:bg-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
            <h3 className="text-lg font-display font-semibold text-slate-850 dark:text-white mb-4">Write New Prescription</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-650 dark:text-slate-400 mb-1 font-semibold font-medium">Select Patient *</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                  required
                >
                  <option value="" className="dark:bg-slate-900">-- Choose Patient --</option>
                  {patientsList.map((p: any) => (
                    <option key={p.id} value={p.id} className="dark:bg-slate-900">
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medicine Form Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3">
                <span className="font-semibold text-slate-700 dark:text-slate-350">Medicines</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Medicine Name"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-3 py-1.5 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Strength (e.g. 500mg)"
                    value={medStrength}
                    onChange={(e) => setMedStrength(e.target.value)}
                    className="rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-3 py-1.5 focus:outline-none"
                  />
                  <select
                    value={medFreq}
                    onChange={(e) => setMedFreq(e.target.value)}
                    className="rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2 py-1.5 focus:outline-none"
                  >
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily (BID)">Twice daily (BID)</option>
                    <option value="Three times daily (TID)">Three times daily (TID)</option>
                    <option value="Four times daily (QID)">Four times daily (QID)</option>
                    <option value="As needed (PRN)">As needed (PRN)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Duration (e.g. 7 days)"
                    value={medDur}
                    onChange={(e) => setMedDur(e.target.value)}
                    className="rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-3 py-1.5 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Special instructions (e.g. Take with meal)"
                    value={medInst}
                    onChange={(e) => setMedInst(e.target.value)}
                    className="rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-3 py-1.5 focus:outline-none flex-1"
                  />
                  <button
                    type="button"
                    onClick={addMedicine}
                    className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs"
                  >
                    Add
                  </button>
                </div>

                {medicinesList.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                    {medicinesList.map((med, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-lg text-[10px]">
                        <span>
                          <strong>{med.medicineName} ({med.strength})</strong> — {med.frequency} for {med.duration}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMedicine(idx)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Notes/Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPrescriptionMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                >
                  {addPrescriptionMutation.isPending ? 'Submitting...' : 'Issue Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
