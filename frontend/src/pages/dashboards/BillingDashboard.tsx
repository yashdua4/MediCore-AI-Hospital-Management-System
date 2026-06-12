import React, { useMemo } from 'react';
import { CreditCard, DollarSign, FileSpreadsheet, AlertCircle, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import {
  useBillingRevenueQuery,
  useBillingInsuranceQuery,
  useBillingInvoicesQuery,
  useRefundRequestsQuery,
} from '../../hooks/useDashboardData';
import { DataTable, Column } from '../../components/DataTable';
import { Invoice } from '../../types';

export const BillingDashboard: React.FC = () => {
  // 1. Fetch finance telemetry and claims lists
  const { data: revenueData, isLoading: loadingRevenue } = useBillingRevenueQuery();
  const { data: insuranceData, isLoading: loadingInsurance } = useBillingInsuranceQuery();
  const { data: invoices = [], isLoading: loadingInvoices } = useBillingInvoicesQuery();
  const { data: refunds = [], isLoading: loadingRefunds } = useRefundRequestsQuery();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Settled</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">Partial</span>;
      case 'UNPAID':
      case 'DRAFT':
      case 'FINALIZED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">Pending</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-400/10 text-slate-400">{status}</span>;
    }
  };

  const invoiceList = useMemo(() => {
    return Array.isArray(invoices) ? invoices : (invoices as any).invoices || [];
  }, [invoices]);

  const settledAmount = useMemo(() => {
    return invoiceList.reduce((sum: number, inv: any) => sum + parseFloat(inv.paidAmount || 0), 0);
  }, [invoiceList]);

  const totalInvoiced = useMemo(() => {
    return invoiceList.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || 0), 0);
  }, [invoiceList]);

  // Columns for DataTable
  const columns: Column<Invoice>[] = [
    {
      header: 'Invoice ID',
      accessor: (row) => <span className="font-mono font-semibold">{row.id || (row as any).invoiceNumber}</span>,
      sortable: true,
      sortKey: 'invoiceNumber',
    },
    {
      header: 'Patient Name',
      accessor: (row) => (
        <span className="font-semibold text-slate-850 dark:text-slate-200">
          {row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : 'Guest Patient'}
        </span>
      ),
      sortable: true,
      sortKey: 'patient.lastName',
    },
    {
      header: 'Issue Date',
      accessor: (row) => <span>{new Date(row.createdAt).toLocaleDateString()}</span>,
      sortable: true,
      sortKey: 'createdAt',
    },
    {
      header: 'Due Date',
      accessor: (row) => <span>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}</span>,
    },
    {
      header: 'Invoice Total',
      accessor: (row) => <span className="text-right block font-semibold">₹{parseFloat(row.totalAmount).toLocaleString('en-IN')}</span>,
      sortable: true,
      sortKey: 'totalAmount',
    },
    {
      header: 'Paid Amount',
      accessor: (row) => <span className="text-right block text-emerald-500 font-semibold">₹{parseFloat(row.paidAmount).toLocaleString('en-IN')}</span>,
    },
    {
      header: 'Billing Status',
      accessor: (row) => getStatusBadge(row.status),
      sortable: true,
      sortKey: 'status',
    },
    {
      header: 'Action',
      accessor: () => (
        <div className="text-right">
          <button className="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-650 dark:text-slate-350 transition-colors">
            Process
          </button>
        </div>
      ),
    },
  ];

  const isLoading = loadingRevenue || loadingInsurance || loadingInvoices || loadingRefunds;

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Financial Ledger</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage invoice queries, audit insurance claims, and review payment settlements.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        /* Finance Metrics Overview */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Invoiced</span>
              <DollarSign className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              ₹{totalInvoiced.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>Real-time collection aggregate</span>
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Settled (Paid)</span>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              ₹{settledAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              <span>₹{revenueData?.dailyRevenue ? revenueData.dailyRevenue.toLocaleString('en-IN') : 0} collected today</span>
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Unpaid Balance</span>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              ₹{(revenueData?.outstandingPayments || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-rose-500 mt-1">
              <span>{invoiceList.filter((i: any) => i.status === 'UNPAID').length} pending invoices</span>
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Insurance Claims</span>
              <AlertCircle className="h-5 w-5 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              {insuranceData?.totalClaimsCount || 0} Total
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              <span>{insuranceData?.claimApprovalRate || 0}% Claims approval rate</span>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Registry Table */}
      <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
        <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-4">Active Invoice Ledger</h3>
        <DataTable
          data={invoiceList}
          columns={columns}
          searchPlaceholder="Search invoices, patients..."
          searchKeys={['id', 'status']}
          exportFileName="billing_invoices"
        />
      </div>
    </div>
  );
};
