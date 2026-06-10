export interface AddressCreateInput {
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface EmergencyContactCreateInput {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface InsuranceInformationCreateInput {
  providerName: string;
  policyNumber: string;
  policyHolderName: string;
  coverageDetails?: string;
  expiryDate?: Date;
}

export interface PatientMedicalHistoryCreateInput {
  condition: string;
  diagnosedDate?: Date;
  notes?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

export interface PatientCreateInput {
  userId?: string;
  firstName: string;
  lastName: string;
  dob: Date;
  gender: string;
  bloodGroup?: string;
  email?: string;
  phone: string;
  aadhaar?: string;
  address?: AddressCreateInput;
  emergencyContact?: EmergencyContactCreateInput;
  insuranceInfo?: InsuranceInformationCreateInput;
}

export interface PatientUpdateInput {
  firstName?: string;
  lastName?: string;
  dob?: Date;
  gender?: string;
  bloodGroup?: string;
  email?: string;
  phone?: string;
  aadhaar?: string;
  address?: AddressCreateInput;
  emergencyContact?: EmergencyContactCreateInput;
  insuranceInfo?: InsuranceInformationCreateInput;
}

export interface PatientResponse {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  dob: Date;
  gender: string;
  bloodGroup: string | null;
  email: string | null;
  phone: string;
  aadhaar: string | null;
  isDeleted: boolean;
  address?: {
    id: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  emergencyContact?: {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email: string | null;
  } | null;
  insuranceInfo?: {
    id: string;
    providerName: string;
    policyNumber: string;
    policyHolderName: string;
    coverageDetails: string | null;
    expiryDate: Date | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientMedicalHistoryResponse {
  id: string;
  patientId: string;
  condition: string;
  diagnosedDate: Date | null;
  notes: string | null;
  allergies: string[];
  chronicConditions: string[];
  createdAt: Date;
  updatedAt: Date;
}
