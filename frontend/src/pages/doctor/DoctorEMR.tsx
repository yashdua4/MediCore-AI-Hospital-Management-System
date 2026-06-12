import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  usePatientsQuery,
  usePatientMedicalHistoryQuery,
  usePatientTimelineQuery,
  useAddMedicalHistoryMutation,
  useAddVitalMutation,
} from '../../hooks/useDashboardData';
import { FolderHeart, HeartPulse, Activity, Save, Search, Plus, Trash2, ShieldAlert, CheckCircle } from 'lucide-react';

export const DoctorEMR: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  
  const { data: patientsData, isLoading: loadingPatients } = usePatientsQuery({ limit: 50 });
  const addEMRMutation = useAddMedicalHistoryMutation();
  const addVitalMutation = useAddVitalMutation();

  const patientsList = patientsData?.patients || [];

  // Selected Patient State
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Handle incoming routing from Patients list
  useEffect(() => {
    const passedId = location.state?.selectPatientId;
    if (passedId) {
      setSelectedPatientId(passedId);
    } else if (patientsList.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patientsList[0].id);
    }
  }, [location.state, patientsList]);

  const activePatient = useMemo(() => {
    return patientsList.find((p: any) => p.id === selectedPatientId);
  }, [patientsList, selectedPatientId]);

  const { data: history = [], isLoading: loadingHistory, refetch: refetchHistory } = usePatientMedicalHistoryQuery(selectedPatientId);
  const { data: timeline = [], isLoading: loadingTimeline, refetch: refetchTimeline } = usePatientTimelineQuery(selectedPatientId);

  // EMR form states
  const [symptoms, setSymptoms] = useState('');
  const [observations, setObservations] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  
  // Diagnoses array form state
  const [diagnosesList, setDiagnosesList] = useState<any[]>([]);
  const [diagCode, setDiagCode] = useState('');
  const [diagName, setDiagName] = useState('');
  const [diagSeverity, setDiagSeverity] = useState('MILD');

  // Vitals form state
  const [bloodPressure, setBloodPressure] = useState('120/80');
  const [heartRate, setHeartRate] = useState(72);
  const [respiratoryRate, setRespiratoryRate] = useState(16);
  const [temperature, setTemperature] = useState(36.8);
  const [oxygenSaturation, setOxygenSaturation] = useState(98);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);

  const [showVitalForm, setShowVitalForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const addDiagnosis = () => {
    if (!diagCode || !diagName) return;
    setDiagnosesList([...diagnosesList, { code: diagCode, name: diagName, severity: diagSeverity }]);
    setDiagCode('');
    setDiagName('');
  };

  const removeDiagnosis = (idx: number) => {
    setDiagnosesList(diagnosesList.filter((_, i) => i !== idx));
  };

  const handleAddEMR = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Fetch Doctor ID from backend/user context
    // Wait, the backend EMRController resolves doctorId internally or uses the payload doctorId.
    // Let's resolve doctor ID. In the system, the doctor is linked to user.id.
    // Let's check how to resolve doctor ID.
    // We can assume active doctor is active doctor profile or we can fetch list of doctors.
    // Let's look up doctors list to find the one linked to logged in user.
    // Let's search doctors list.
    const activeDoc = activePatient?.doctor || patientsList[0]?.doctor; // fallback or resolved

    try {
      await addEMRMutation.mutateAsync({
        patientId: selectedPatientId,
        doctorId: user?.id || activeDoc?.id || 'doc-id-fallback',
        symptoms,
        observations,
        followUpInstructions,
        diagnoses: diagnosesList,
        vitals: {
          bloodPressure,
          heartRate,
          respiratoryRate,
          temperature,
          oxygenSaturation,
          height,
          weight,
        },
      });

      setSuccessMsg('Clinical EMR record appended successfully!');
      setSymptoms('');
      setObservations('');
      setFollowUpInstructions('');
      setDiagnosesList([]);
      refetchHistory();
      refetchTimeline();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'EMR submission failed.');
    }
  };

  const handleAddVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await addVitalMutation.mutateAsync({
        patientId: selectedPatientId,
        bloodPressure,
        heartRate,
        respiratoryRate,
        temperature,
        oxygenSaturation,
        height,
        weight,
      });

      setSuccessMsg('Vitals logged successfully!');
      setShowVitalForm(false);
      refetchHistory();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to record vitals.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderHeart className="h-6 w-6 text-rose-500" />
            EMR Chart Room
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access patient histories, view vitals trends, and upload clinical observations.
          </p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-2 max-w-xs w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
          <Search className="h-4 w-4 text-slate-400" />
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-100 focus:outline-none"
          >
            {patientsList.map((p: any) => (
              <option key={p.id} value={p.id} className="dark:bg-slate-900">
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-2 text-xs">
          <ShieldAlert className="h-4.5 w-4.5" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle className="h-4.5 w-4.5" />
          {successMsg}
        </div>
      )}

      {activePatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Record Entry & List Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* EMR Creator */}
            <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Add Clinical Entry</h3>
              
              <form onSubmit={handleAddEMR} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Symptoms</label>
                    <textarea
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Cough, headache, bodyache..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-rose-500 focus:outline-none h-16 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Observations</label>
                    <textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Red throat, clear lungs..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-rose-500 focus:outline-none h-16 resize-none"
                    />
                  </div>
                </div>

                {/* Add Diagnosis Section */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Diagnoses</span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="ICD Code (e.g. J45)"
                      value={diagCode}
                      onChange={(e) => setDiagCode(e.target.value)}
                      className="rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-3 py-1.5 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Diagnosis Name"
                      value={diagName}
                      onChange={(e) => setDiagName(e.target.value)}
                      className="rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-3 py-1.5 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <select
                        value={diagSeverity}
                        onChange={(e) => setDiagSeverity(e.target.value)}
                        className="rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2 py-1.5 focus:outline-none flex-1"
                      >
                        <option value="MILD">MILD</option>
                        <option value="MODERATE">MODERATE</option>
                        <option value="SEVERE">SEVERE</option>
                      </select>
                      <button
                        type="button"
                        onClick={addDiagnosis}
                        className="px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {diagnosesList.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {diagnosesList.map((diag, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-lg text-[11px]">
                          <span>
                            <strong className="text-slate-400">[{diag.code}]</strong> {diag.name} — <span className="font-bold text-rose-500">{diag.severity}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDiagnosis(idx)}
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
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Follow-Up Instructions</label>
                  <textarea
                    value={followUpInstructions}
                    onChange={(e) => setFollowUpInstructions(e.target.value)}
                    placeholder="Take medicine daily. Revisit in 5 days..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-rose-500 focus:outline-none h-16 resize-none"
                  />
                </div>

                {/* Optional EMR Vitals Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                  <div className="col-span-2 sm:col-span-4">
                    <span className="font-semibold text-slate-700 dark:text-slate-350">Vitals at Consult</span>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Blood Pressure</label>
                    <input
                      type="text"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Heart Rate</label>
                    <input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Oxygen Saturation</label>
                    <input
                      type="number"
                      value={oxygenSaturation}
                      onChange={(e) => setOxygenSaturation(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addEMRMutation.isPending}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-sm"
                >
                  {addEMRMutation.isPending ? 'Saving File...' : 'Commit EMR Entry'}
                </button>
              </form>
            </div>

            {/* EMR Logs History */}
            <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm mb-4">Historical Consultation Logs</h3>

              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No previous consulting records found.</div>
              ) : (
                <div className="space-y-4">
                  {history.map((record: any) => (
                    <div key={record.id} className="p-4 border border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-900/10 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-850">
                        <span>Date: {new Date(record.createdAt).toLocaleDateString()}</span>
                        <span>Diagnosed By: {record.doctor?.email || 'General Staff'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {record.symptoms && (
                          <div>
                            <span className="font-bold text-slate-705 dark:text-slate-300">Symptoms:</span>
                            <p className="text-slate-500 mt-0.5">{record.symptoms}</p>
                          </div>
                        )}
                        {record.observations && (
                          <div>
                            <span className="font-bold text-slate-705 dark:text-slate-300">Observations:</span>
                            <p className="text-slate-500 mt-0.5">{record.observations}</p>
                          </div>
                        )}
                      </div>

                      {record.diagnoses?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400">Diagnoses:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {record.diagnoses.map((diag: any) => (
                              <span key={diag.id} className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[10px] rounded border border-rose-500/20 font-semibold">
                                [{diag.code}] {diag.name} ({diag.severity})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vitals logs trend */}
          <div className="space-y-6">
            <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-display font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                  Vitals & Parameters
                </h3>
                <button
                  onClick={() => setShowVitalForm(!showVitalForm)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
                >
                  {showVitalForm ? 'Cancel' : 'Log Vitals'}
                </button>
              </div>

              {showVitalForm && (
                <form onSubmit={handleAddVitals} className="space-y-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-850 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400">BP (mmHg)</label>
                      <input
                        type="text"
                        value={bloodPressure}
                        onChange={(e) => setBloodPressure(e.target.value)}
                        className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2.5 py-1.5 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-slate-400">Heart Rate</label>
                      <input
                        type="number"
                        value={heartRate}
                        onChange={(e) => setHeartRate(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2.5 py-1.5 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-slate-400">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2.5 py-1.5 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-slate-400">SpO2 (%)</label>
                      <input
                        type="number"
                        value={oxygenSaturation}
                        onChange={(e) => setOxygenSaturation(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-205 dark:border-slate-800 bg-transparent px-2.5 py-1.5 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-755 text-white font-semibold rounded-xl"
                  >
                    Log Readings
                  </button>
                </form>
              )}

              {activePatient.vitals?.length > 0 ? (
                <div className="space-y-3">
                  {activePatient.vitals.map((v: any, idx: number) => (
                    <div key={idx} className="p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/50 dark:bg-slate-900/10">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2">
                        <span className="font-semibold">Recorded</span>
                        <span>{new Date(v.recordedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>BP: <span className="font-semibold">{v.bloodPressure}</span></div>
                        <div>HR: <span className="font-semibold">{v.heartRate} bpm</span></div>
                        <div>Temp: <span className="font-semibold">{v.temperature} °C</span></div>
                        <div>SpO2: <span className="font-semibold">{v.oxygenSaturation}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">No vitals logs.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          Please select a valid patient profile from the registry index.
        </div>
      )}
    </div>
  );
};
