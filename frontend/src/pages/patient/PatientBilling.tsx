import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePatientsQuery, useBillingInvoicesQuery, usePayInvoiceMutation } from '../../hooks/useDashboardData';
import { CreditCard, Calendar, CheckSquare, DollarSign, X, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

export const PatientBilling: React.FC = () => {
  const { user } = useAuthStore();
  const { data: patientsData } = usePatientsQuery();

  const activePatient = useMemo(() => {
    if (!patientsData?.patients) return null;
    return patientsData.patients.find((p: any) => p.userId === user?.id) || patientsData.patients[0];
  }, [patientsData, user]);

  const patientId = activePatient?.id;

  const { data: invoices = [], isLoading, refetch } = useBillingInvoicesQuery(patientId ? { patientId } : {});
  const payMutation = usePayInvoiceMutation();

  // State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState<any>(null);

  // Payment form state
  const [payMethod, setPayMethod] = useState<'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING'>('CREDIT_CARD');
  const [txnRef, setTxnRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((inv: any) => inv.status === 'FINALIZED' || inv.status === 'PARTIALLY_PAID')
      .reduce((sum: number, inv: any) => sum + parseFloat(inv.outstandingAmount || 0), 0);
  }, [invoices]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');

    try {
      const invoice = showPayModal;
      await payMutation.mutateAsync({
        id: invoice.id,
        amount: Number(invoice.outstandingAmount),
        paymentMethodName: payMethod,
        transactionRef: txnRef || `TXN-PORTAL-${Date.now()}`,
        notes: payNotes || 'Online patient portal checkout',
      });

      setPaySuccess('Payment processed successfully!');
      setTimeout(() => {
        setShowPayModal(null);
        setPaySuccess('');
        setSelectedInvoice(null);
        refetch();
      }, 1500);
    } catch (err: any) {
      setPayError(err.response?.data?.message || err.message || 'Payment processing failed.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-500" />
            Financial Ledger & Statements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review your outstanding billing sheets, invoices, and settle balances online.
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Outstanding Balance</span>
            <div className="text-2xl font-bold font-display text-rose-500 mt-1">
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Includes all finalized clinical consults and medicines</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Settled Invoices</span>
            <div className="text-2xl font-bold font-display text-emerald-500 mt-1">
              {invoices.filter((inv: any) => inv.status === 'PAID').length} Statements
            </div>
            <p className="text-[10px] text-slate-400 mt-1">All insurance approvals registered successfully</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckSquare className="h-5 w-5" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-450 text-xs">
          No billing ledger statements exist.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoices List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Invoice Registry</h3>
            <div className="space-y-3">
              {invoices.map((inv: any) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                    selectedInvoice?.id === inv.id
                      ? 'bg-slate-50 dark:bg-slate-850 border-indigo-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">#{inv.invoiceNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : inv.status === 'FINALIZED' || inv.status === 'PARTIALLY_PAID'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex gap-4">
                        <span>Issued: {new Date(inv.createdAt).toLocaleDateString()}</span>
                        {inv.dueDate && <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        ₹{parseFloat(inv.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      {parseFloat(inv.outstandingAmount) > 0 && (
                        <div className="text-[10px] text-rose-500 font-semibold mt-0.5">
                          Owed: ₹{parseFloat(inv.outstandingAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Details & Checkout */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Statement Breakdown</h3>
            {selectedInvoice ? (
              <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4 text-xs">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-850">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-150">Invoice Details</h4>
                  <span className="font-mono text-[10px] text-slate-400">#{selectedInvoice.invoiceNumber}</span>
                </div>

                <div className="space-y-3">
                  {selectedInvoice.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{item.description}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Qty: {item.quantity} × ₹{parseFloat(item.unitPrice).toFixed(2)}</p>
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        ₹{(item.quantity * parseFloat(item.unitPrice)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-850 space-y-2 text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{parseFloat(selectedInvoice.subTotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedInvoice.discountAmount) > 0 && (
                    <div className="flex justify-between text-emerald-500">
                      <span>Discount:</span>
                      <span>-₹{parseFloat(selectedInvoice.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax (GST):</span>
                    <span>₹{parseFloat(selectedInvoice.taxAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100 text-sm pt-2 border-t border-slate-50 dark:border-slate-850/50">
                    <span>Total Amount:</span>
                    <span>₹{parseFloat(selectedInvoice.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Settle outstanding billing */}
                {(selectedInvoice.status === 'FINALIZED' || selectedInvoice.status === 'PARTIALLY_PAID') && (
                  <button
                    onClick={() => setShowPayModal(selectedInvoice)}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-750 text-white font-semibold py-2 px-4 rounded-xl text-center transition-all shadow-sm"
                  >
                    Settle Bill (₹{parseFloat(selectedInvoice.outstandingAmount).toFixed(2)})
                  </button>
                )}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl text-center text-slate-400 text-xs">
                Select an invoice from the ledger to view item descriptions and process payment checkouts.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Online Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowPayModal(null)}
              className="absolute right-4 top-4 p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-855"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-display font-semibold text-slate-850 dark:text-white mb-2">Checkout Settlement</h3>
            <p className="text-xs text-slate-500 mb-4">
              Settle outstanding invoice balance of **₹{parseFloat(showPayModal.outstandingAmount).toFixed(2)}** for Statement #{showPayModal.invoiceNumber}.
            </p>

            {payError && (
              <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="h-4.5 w-4.5" />
                {payError}
              </div>
            )}

            {paySuccess && (
              <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-2 text-xs">
                <CheckCircle className="h-4.5 w-4.5 font-bold" />
                {paySuccess}
              </div>
            )}

            <form onSubmit={handlePay} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1.5 font-semibold">Payment Channel *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CREDIT_CARD', label: 'Credit Card' },
                    { id: 'UPI', label: 'UPI / QR Code' },
                    { id: 'DEBIT_CARD', label: 'Debit Card' },
                    { id: 'NET_BANKING', label: 'Net Banking' },
                  ].map((chan) => (
                    <button
                      key={chan.id}
                      type="button"
                      onClick={() => setPayMethod(chan.id as any)}
                      className={`p-3 border rounded-xl font-semibold text-center transition-all ${
                        payMethod === chan.id
                          ? 'border-indigo-600 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-350'
                      }`}
                    >
                      {chan.label}
                    </button>
                  ))}
                </div>
              </div>

              {payMethod === 'CREDIT_CARD' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Cardholder Name *</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Card Number *</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      placeholder="4000 1234 5678 9010"
                      required
                    />
                  </div>
                </div>
              )}

              {payMethod === 'UPI' && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Virtual Payment Address (VPA) *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="name@upi"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Transaction Reference / ID (Optional)</label>
                <input
                  type="text"
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  placeholder="Leave empty for auto-generated ID"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-600 dark:text-slate-450 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {payMutation.isPending ? 'Processing Card...' : `Authorize ₹${parseFloat(showPayModal.outstandingAmount).toFixed(2)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
