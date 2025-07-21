import React, { useEffect, useState } from 'react';
import { FileText, Calendar, User, Building2, Plus, Search, Filter, Trash2, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';

interface HealthVisit {
  id: string;
  user_id: string;
  doctor_name: string;
  hospital_name: string;
  visit_date: string;
  diagnosis: string;
  notes: string | null;
  specialization: string;
  created_at: string;
}

interface FilterOptions {
  doctor: string;
  hospital: string;
  specialization: string;
  startDate: string;
  endDate: string;
}

export default function HealthRecord() {
  const [visits, setVisits] = useState<HealthVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<HealthVisit | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    doctor: '',
    hospital: '',
    specialization: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVisits();
  }, []);

  async function fetchVisits() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('health_visits')
        .select('*')
        .eq('user_id', user.id)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const visitData = {
        user_id: user.id,
        doctor_name: formData.get('doctor_name'),
        hospital_name: formData.get('hospital_name'),
        visit_date: formData.get('visit_date'),
        diagnosis: formData.get('diagnosis'),
        notes: formData.get('notes'),
        specialization: formData.get('specialization'),
      };

      if (editingVisit) {
        const { error } = await supabase
          .from('health_visits')
          .update(visitData)
          .eq('id', editingVisit.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('health_visits')
          .insert([visitData]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingVisit(null);
      fetchVisits();
    } catch (error) {
      console.error('Error saving visit:', error);
      alert('Error saving visit. Please try again.');
    }
  }

  async function handleDelete(visitId: string) {
    if (!confirm('Are you sure you want to delete this visit?')) return;

    try {
      const { error } = await supabase
        .from('health_visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;
      fetchVisits();
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert('Error deleting visit. Please try again.');
    }
  }

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = 
      visit.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilters =
      (!filters.doctor || visit.doctor_name.toLowerCase().includes(filters.doctor.toLowerCase())) &&
      (!filters.hospital || visit.hospital_name.toLowerCase().includes(filters.hospital.toLowerCase())) &&
      (!filters.specialization || visit.specialization.toLowerCase().includes(filters.specialization.toLowerCase())) &&
      (!filters.startDate || new Date(visit.visit_date) >= new Date(filters.startDate)) &&
      (!filters.endDate || new Date(visit.visit_date) <= new Date(filters.endDate));

    return matchesSearch && matchesFilters;
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
        <h1 className="text-2xl font-bold">Health Record</h1>
        <p className="mt-2 text-blue-100">
          Track and manage your medical history
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 input-field"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>
        <button
          onClick={() => {
            setEditingVisit(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Visit
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Filter Records</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Doctor</label>
              <input
                type="text"
                value={filters.doctor}
                onChange={(e) => setFilters({ ...filters, doctor: e.target.value })}
                className="input-field"
                placeholder="Filter by doctor name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hospital</label>
              <input
                type="text"
                value={filters.hospital}
                onChange={(e) => setFilters({ ...filters, hospital: e.target.value })}
                className="input-field"
                placeholder="Filter by hospital name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Specialization</label>
              <input
                type="text"
                value={filters.specialization}
                onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
                className="input-field"
                placeholder="Filter by specialization"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => setFilters({
                doctor: '',
                hospital: '',
                specialization: '',
                startDate: '',
                endDate: '',
              })}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingVisit ? 'Edit Visit' : 'Add New Visit'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingVisit(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <Plus className="h-5 w-5 transform rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Doctor Name
                  </label>
                  <input
                    name="doctor_name"
                    type="text"
                    defaultValue={editingVisit?.doctor_name}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Hospital/Clinic Name
                  </label>
                  <input
                    name="hospital_name"
                    type="text"
                    defaultValue={editingVisit?.hospital_name}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Visit Date
                  </label>
                  <input
                    name="visit_date"
                    type="date"
                    defaultValue={editingVisit?.visit_date}
                    max={format(new Date(), "yyyy-MM-dd")}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Specialization
                  </label>
                  <input
                    name="specialization"
                    type="text"
                    defaultValue={editingVisit?.specialization}
                    className="input-field"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Diagnosis/Reason
                  </label>
                  <textarea
                    name="diagnosis"
                    defaultValue={editingVisit?.diagnosis}
                    rows={3}
                    className="input-field"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Notes/Comments
                  </label>
                  <textarea
                    name="notes"
                    defaultValue={editingVisit?.notes || ''}
                    rows={3}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingVisit(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingVisit ? 'Save Changes' : 'Add Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {filteredVisits.map((visit) => (
          <div key={visit.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">
                    {format(parseISO(visit.visit_date), 'PPP')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <span>Dr. {visit.doctor_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span>{visit.hospital_name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Specialization: {visit.specialization}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingVisit(visit);
                    setShowForm(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(visit.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-medium text-gray-900">Diagnosis</h3>
              <p className="mt-1 text-gray-600">{visit.diagnosis}</p>
            </div>

            {visit.notes && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900">Notes</h3>
                <p className="mt-1 text-gray-600">{visit.notes}</p>
              </div>
            )}
          </div>
        ))}

        {filteredVisits.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Records Found</h3>
            <p className="text-gray-500 mt-2">
              {searchTerm || Object.values(filters).some(Boolean)
                ? 'No records match your search criteria'
                : 'Start by adding your first medical visit record'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}