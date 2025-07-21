export interface Profile {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
  blood_type: string | null;
  allergies: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  email: string | null;
  departments: string[];
  created_at: string;
}

export interface Doctor {
  id: string;
  hospital_id: string;
  full_name: string;
  specialization: string;
  department: string;
  email: string | null;
  phone: string | null;
  available_days: string[];
  created_at: string;
}

export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: string;
  value: number;
  unit: string;
  measured_at: string;
  notes: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  doctor_id: string;
  hospital_id: string;
  appointment_date: string;
  status: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  user_id: string;
  appointment_id: string | null;
  doctor_id: string;
  prescription_date: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
  }[];
  instructions: string | null;
  duration_days: number | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  profiles: Profile;
  hospitals: Hospital;
  doctors: Doctor;
  health_metrics: HealthMetric;
  appointments: Appointment;
  prescriptions: Prescription;
}