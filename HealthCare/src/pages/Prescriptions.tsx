import React, { useEffect, useState } from 'react';
import { FileText, Calendar, User, Pill, Download, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { Prescription } from '../types/database';

interface ExtendedPrescription extends Prescription {
  doctor: {
    full_name: string;
    specialization: string;
    department: string;
  };
}

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<ExtendedPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  async function fetchPrescriptions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          doctor:doctors(
            full_name,
            specialization,
            department
          )
        `)
        .eq('user_id', user.id)
        .order('prescription_date', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPrescriptions = prescriptions
    .filter(prescription => {
      const searchMatch = prescription.medications.some(med =>
        med.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) || prescription.doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      const prescriptionDate = new Date(prescription.prescription_date);
      const expiryDate = new Date(prescriptionDate);
      expiryDate.setDate(expiryDate.getDate() + (prescription.duration_days || 30));
      const isExpired = expiryDate < new Date();

      switch (filter) {
        case 'active':
          return !isExpired;
        case 'expired':
          return isExpired;
        default:
          return true;
      }
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FileText className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Prescriptions</h1>
        <p className="mt-2 text-blue-100">
          View and manage your medical prescriptions
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search prescriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 input-field"
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'expired')}
              className="input-field"
            >
              <option value="all">All Prescriptions</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="space-y-6">
          {filteredPrescriptions.length > 0 ? (
            filteredPrescriptions.map((prescription) => {
              const prescriptionDate = new Date(prescription.prescription_date);
              const expiryDate = new Date(prescriptionDate);
              expiryDate.setDate(expiryDate.getDate() + (prescription.duration_days || 30));
              const isExpired = expiryDate < new Date();

              return (
                <div
                  key={prescription.id}
                  className={`bg-white rounded-lg border ${
                    isExpired ? 'border-red-200' : 'border-green-200'
                  } p-6 shadow-sm`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">
                          {format(parseISO(prescription.prescription_date), 'PPP')}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-sm rounded-full ${
                            isExpired
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isExpired ? 'Expired' : 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <span>Dr. {prescription.doctor.full_name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {prescription.doctor.specialization} - {prescription.doctor.department}
                      </div>
                    </div>
                    {prescription.file_url && (
                      <a
                        href={prescription.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                      >
                        <Download className="h-5 w-5" />
                        <span>Download</span>
                      </a>
                    )}
                  </div>

                  <div className="mt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Medications</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {prescription.medications.map((medication, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg"
                        >
                          <Pill className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <div className="font-medium">{medication.name}</div>
                            <div className="text-sm text-gray-600">
                              {medication.dosage} - {medication.frequency}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {prescription.instructions && (
                    <div className="mt-4">
                      <h3 className="font-medium text-gray-900 mb-2">Instructions</h3>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {prescription.instructions}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <span>Duration: {prescription.duration_days} days</span>
                    <span>
                      Expires: {format(expiryDate, 'PPP')}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Prescriptions Found</h3>
              <p className="text-gray-500 mt-2">
                {searchTerm
                  ? 'No prescriptions match your search criteria'
                  : 'You don\'t have any prescriptions yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}