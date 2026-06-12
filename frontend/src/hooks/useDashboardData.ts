import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

// ==========================================
// PATIENTS HOOKS
// ==========================================
export function usePatientsQuery(filters: { search?: string; gender?: string; bloodGroup?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/patients', { params: filters });
      return data; // returns { patients: Patient[], total: number }
    },
  });
}

export function usePatientProfileQuery(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data } = await apiClient.get(`/patients/${patientId}`);
      return data.data;
    },
    enabled: !!patientId,
  });
}

export function usePatientTimelineQuery(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-timeline', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data } = await apiClient.get(`/patients/${patientId}/timeline`);
      return data.data;
    },
    enabled: !!patientId,
  });
}

export function usePatientMedicalHistoryQuery(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-medical-history', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data } = await apiClient.get(`/patients/${patientId}/history`);
      return data.data;
    },
    enabled: !!patientId,
  });
}

// ==========================================
// DOCTORS HOOKS
// ==========================================
export function useDoctorsQuery(filters: { search?: string; departmentId?: string; specializationId?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ['doctors', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/doctors', { params: filters });
      return data; // returns { doctors: Doctor[], total: number }
    },
  });
}

export function useDoctorProfileQuery(doctorId: string | undefined) {
  return useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: async () => {
      if (!doctorId) return null;
      const { data } = await apiClient.get(`/doctors/${doctorId}`);
      return data.data;
    },
    enabled: !!doctorId,
  });
}

export function useDoctorStatsQuery(doctorId: string | undefined) {
  return useQuery({
    queryKey: ['doctor-stats', doctorId],
    queryFn: async () => {
      if (!doctorId) return null;
      const { data } = await apiClient.get(`/doctors/${doctorId}/statistics`);
      return data;
    },
    enabled: !!doctorId,
  });
}

export function useDoctorScheduleQuery(doctorId: string | undefined) {
  return useQuery({
    queryKey: ['doctor-schedule', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      const { data } = await apiClient.get(`/appointments/doctor/${doctorId}/schedule`);
      return data.data || data;
    },
    enabled: !!doctorId,
  });
}

// ==========================================
// APPOINTMENTS HOOKS
// ==========================================
export function useAppointmentsQuery(filters: { patientId?: string; doctorId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/appointments', { params: filters });
      return data.data || data;
    },
  });
}

export function useAppointmentStatsQuery() {
  return useQuery({
    queryKey: ['appointment-statistics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/appointments/statistics');
      return data.data || data;
    },
  });
}

// ==========================================
// INPATIENT ADMISSIONS (IPD) HOOKS
// ==========================================
export function useIpdTelemetryQuery() {
  return useQuery({
    queryKey: ['ipd-telemetry'],
    queryFn: async () => {
      const { data } = await apiClient.get('/ipd/dashboard');
      return data.data || data;
    },
  });
}

export function useIpdActiveAdmissionsQuery() {
  return useQuery({
    queryKey: ['ipd-active-admissions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/ipd/admissions/active');
      return data.data || data;
    },
  });
}

// ==========================================
// BILLING & INSURANCE HOOKS
// ==========================================
export function useBillingRevenueQuery() {
  return useQuery({
    queryKey: ['billing-revenue'],
    queryFn: async () => {
      const { data } = await apiClient.get('/billing/dashboard/revenue');
      return data.data || data;
    },
  });
}

export function useBillingInsuranceQuery() {
  return useQuery({
    queryKey: ['billing-insurance'],
    queryFn: async () => {
      const { data } = await apiClient.get('/billing/dashboard/insurance');
      return data.data || data;
    },
  });
}

export function useBillingInvoicesQuery(filters: { patientId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['billing-invoices', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/billing/invoices', { params: filters });
      return data.data || data;
    },
  });
}

export function useRefundRequestsQuery() {
  return useQuery({
    queryKey: ['billing-refunds'],
    queryFn: async () => {
      const { data } = await apiClient.get('/billing/refunds');
      return data.data || data;
    },
  });
}

// ==========================================
// EMERGENCY & ALERTS HOOKS
// ==========================================
export function useEmergencyDashboardQuery() {
  return useQuery({
    queryKey: ['emergency-dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get('/emergency/dashboard');
      return data.data; // returns LiveEmergencyDashboard
    },
  });
}

export function useEmergencyAnalyticsQuery() {
  return useQuery({
    queryKey: ['emergency-analytics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/emergency/analytics');
      return data.data; // returns EmergencyAnalytics
    },
  });
}

export function useEmergencyCasesQuery(filters: { status?: string; triageLevel?: string } = {}) {
  return useQuery({
    queryKey: ['emergency-cases', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/emergency', { params: filters });
      return data.data;
    },
  });
}

// ==========================================
// SECURITY & COMPLIANCE HOOKS
// ==========================================
export function useSecurityTelemetryQuery() {
  return useQuery({
    queryKey: ['security-telemetry'],
    queryFn: async () => {
      const { data } = await apiClient.get('/security/dashboard');
      return data.data || data;
    },
  });
}

export function useSecurityEventsQuery() {
  return useQuery({
    queryKey: ['security-events'],
    queryFn: async () => {
      const { data } = await apiClient.get('/security/events');
      return data.data || data;
    },
  });
}

export function useSecurityAuditLogsQuery() {
  return useQuery({
    queryKey: ['security-audit-logs'],
    queryFn: async () => {
      const { data } = await apiClient.get('/security/audit-logs');
      return data.data || data;
    },
  });
}

export function useSecurityLockoutsQuery() {
  return useQuery({
    queryKey: ['security-lockouts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/security/lockouts');
      return data.data || data;
    },
  });
}

// ==========================================
// LABS & PHARMACY HOOKS
// ==========================================
export function useLabTelemetryQuery() {
  return useQuery({
    queryKey: ['lab-telemetry'],
    queryFn: async () => {
      const { data } = await apiClient.get('/lab/dashboard');
      return data.data || data;
    },
  });
}

export function useLabOrdersQuery(filters: { patientId?: string; doctorId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['lab-orders', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/lab/orders', { params: filters });
      return data.data || data;
    },
  });
}

export function usePharmacyTelemetryQuery() {
  return useQuery({
    queryKey: ['pharmacy-telemetry'],
    queryFn: async () => {
      const { data } = await apiClient.get('/pharmacy/dashboard');
      return data.data || data;
    },
  });
}

export function usePrescriptionsQuery(filters: { patientId?: string; doctorId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['prescriptions', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/pharmacy/prescriptions', { params: filters });
      return data.data || data;
    },
  });
}

// ==========================================
// PORTAL MUTATION HOOKS
// ==========================================

export function useBookAppointmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; doctorId: string; date: string; time: string; duration?: number; notes?: string }) => {
      const { data } = await apiClient.post('/appointments', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useRescheduleAppointmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; date: string; time: string; reason?: string }) => {
      const { data } = await apiClient.put(`/appointments/${id}/reschedule`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCancelAppointmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await apiClient.put(`/appointments/${id}/cancel`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointmentStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const { data } = await apiClient.put(`/appointments/${id}/status`, { status, reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdatePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; firstName?: string; lastName?: string; dob?: string; gender?: string; phone?: string; email?: string }) => {
      const { data } = await apiClient.put(`/patients/${id}`, payload);
      return data.data || data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useAddMedicalHistoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; doctorId: string; symptoms?: string; observations?: string; followUpInstructions?: string; diagnoses?: any[]; treatmentPlans?: any[]; prescriptions?: any[]; vitals?: any }) => {
      const { data } = await apiClient.post('/emr', payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-medical-history', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useAddPrescriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; doctorId: string; medicines: Array<{ medicineName: string; strength: string; frequency: string; duration: string; instructions?: string }>; notes?: string }) => {
      const { data } = await apiClient.post('/pharmacy/prescriptions', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}

export function useCreateLabOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; doctorId: string; testId: string; instructions?: string; priority?: string }) => {
      const { data } = await apiClient.post('/lab/orders', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
    },
  });
}

export function usePayInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, paymentMethodName, transactionRef, notes }: { id: string; amount: number; paymentMethodName: string; transactionRef?: string; notes?: string }) => {
      const { data } = await apiClient.post(`/billing/invoices/${id}/payments`, { amount, paymentMethodName, transactionRef, notes });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
  });
}

export function useAddVitalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { patientId: string; bloodPressure: string; heartRate: number; respiratoryRate: number; temperature: number; oxygenSaturation: number; height: number; weight: number }) => {
      const { data } = await apiClient.post('/emr/vitals', payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-medical-history', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', variables.patientId] });
    },
  });
}

