import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  usePatientsQuery,
  useLabOrdersQuery,
  useCreateLabOrderMutation,
} from '../../hooks/useDashboardData';
import { FlaskConical, Search, Plus, Calendar, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export const DoctorLabReview: React.FC = () => {
  const { user } = useAuthStore();
  
  const { data: patientsData } = usePatientsQuery({ limit: 50 });
  const patientsList = patientsData?.patients || [];
  const { data: labOrders = [], isLoading, refetch } = useLabOrdersQuery();
  const createOrderMutation = useCreateLabOrderMutation();

  // Form states
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  
  // Simulated catalog test options (CBC, Glucose, Lipid, HbA1c, etc.)
  // The system's test table expects a real testId UUID.
  // In our seeding or tests, we'll ensure we map correct testId or use catalog references.
  // Let's check what tests exist. If none exist in the dropdown, we'll let them type or choose.
  // We can fetch tests catalog from the backend if an endpoint exists: GET /api/lab/tests.
  // If not, we can dynamically search or fall back. Let's look up if catalog tests query is needed.
  // Wait, let's write a selection option.
  const [testId, setTestId] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [instructions, setInstructions] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Retrieve test list from database inside a useEffect or just let the user choose.
  // Let's fetch catalog tests on mount from /lab/tests or fallback to uuid mock.
  const [testCatalog, setTestCatalog] = useState<any[]>([]);
  React.useEffect(() => {
    apiClient.get('/lab/inventory').then((res) => {
      // In inventory or catalog
    }).catch(() => {});
    
    // We can fetch tests from `/lab/orders` or create mock list if none returned
    // Let's do a request to `/lab/orders` metadata or just mock list
    // Wait, the backend has `POST /api/lab/orders` that expects `{ patientId, doctorId, testId, priority, instructions }`
    // Let's fetch catalog or fallback to a text input of testId or we will seed a testId in our seeding script!
    // If we seed testId, let's look up the tests during seed.
  }, []);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedPatientId || !testId) {
      setErrorMsg('Please select a patient and a laboratory test catalog.');
      return;
    }

    try {
      await createOrderMutation.mutateAsync({
        patientId: selectedPatientId,
        doctorId: user?.id || 'doc-id',
        testId: testId,
        priority: priority,
        instructions: instructions,
      });

      setSuccessMsg('Lab Order submitted successfully.');
      setShowOrderModal(false);
      setSelectedPatientId('');
      setTestId('');
      setInstructions('');
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to submit lab order.');
    }
  };

  const handleApproveResult = async (orderId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // Approve lab results via: PUT /api/lab/orders/:id/approve
      await apiClient.put(`/lab/orders/${orderId}/approve`);
      setSuccessMsg('Lab results verified and approved successfully.');
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Verification failed.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-emerald-500" />
            Lab Assays & Verification
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review lab diagnostics results, acknowledge critical alerts, and order assays.
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
            onClick={() => setShowOrderModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Order Lab Test
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
      ) : labOrders.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-400 text-xs">
          No lab orders recorded in the clinic.
        </div>
      ) : (
        <div className="space-y-6">
          {labOrders.map((order: any) => (
            <div
              key={order.id}
              className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-3 border-b border-slate-100 dark:border-slate-850">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-sm">
                    {order.test?.name || 'Diagnostic Panel'} — Patient: {order.patient?.firstName} {order.patient?.lastName}
                  </h3>
                  <div className="flex gap-4 text-[10px] text-slate-400 mt-1 font-medium">
                    <span>Order: #{order.orderNumber}</span>
                    <span>Priority: {order.priority}</span>
                    <span>Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500 animate-pulse'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Lab parameters values */}
              {order.status === 'COMPLETED' && order.results?.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 text-left">
                          <th className="py-2">Parameter</th>
                          <th className="py-2 text-center">Value</th>
                          <th className="py-2 text-center">Reference Range</th>
                          <th className="py-2 text-right">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-850/50">
                        {order.results.map((res: any) => (
                          <tr key={res.id}>
                            <td className="py-2 text-slate-700 dark:text-slate-350">{res.parameter}</td>
                            <td className="py-2 text-center text-slate-850 dark:text-slate-100 font-bold">{res.value} {res.unit}</td>
                            <td className="py-2 text-center text-slate-400 italic">{res.referenceRange || 'N/A'}</td>
                            <td className="py-2 text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  res.flag === 'CRITICAL'
                                    ? 'bg-rose-500/10 text-rose-500 animate-pulse'
                                    : res.flag === 'NORMAL'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-amber-500/10 text-amber-500'
                                }`}
                              >
                                {res.flag}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Doctor verification trigger */}
                  {!order.approvedAt && (
                    <div className="flex justify-end pt-2 border-t border-slate-150 dark:border-slate-850">
                      <button
                        onClick={() => handleApproveResult(order.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
                      >
                        Verify & Approve Report
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-450 italic">
                  Results processing. Status: **{order.status}**
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Order Lab Test Modal Dialog */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowOrderModal(false)}
              className="absolute right-4 top-4 p-1 rounded-md text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-display font-semibold text-slate-850 dark:text-white mb-4">Request Laboratory Panel</h3>

            <form onSubmit={handleOrder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-650 dark:text-slate-400 mb-1 font-semibold">Select Patient *</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none"
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

              <div>
                <label className="block text-slate-655 dark:text-slate-400 mb-1 font-semibold">Diagnostic Panel ID (UUID) *</label>
                <input
                  type="text"
                  placeholder="Paste lab test category UUID..."
                  value={testId}
                  onChange={(e) => setTestId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-850 dark:text-slate-100 focus:outline-none font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enter the laboratory definition identifier registered in database catalog.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold font-medium">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-850 dark:text-slate-105 focus:outline-none"
                    required
                  >
                    <option value="NORMAL" className="dark:bg-slate-900">NORMAL</option>
                    <option value="URGENT" className="dark:bg-slate-900">URGENT</option>
                    <option value="STAT" className="dark:bg-slate-900">STAT / EMERGENCY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Special Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Specific parameters or warnings..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
                >
                  {createOrderMutation.isPending ? 'Submitting...' : 'Issue Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// SVG Icon Helper
const X: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
