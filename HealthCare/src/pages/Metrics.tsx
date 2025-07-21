import React, { useEffect, useState } from 'react';
import { Plus, Trash, X, Heart, Activity, Droplets, Thermometer, Scale, Settings as Lungs } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { HealthMetric } from '../types/database';

export default function Metrics() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newMetric, setNewMetric] = useState({
    metric_type: 'blood_pressure',
    value: '',
    unit: 'mmHg',
    notes: ''
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false });

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!newMetric.value.trim()) {
      alert("Please enter a value before saving.");
      return;
    }

    const parsedValue = parseFloat(newMetric.value);
    if (isNaN(parsedValue)) {
      alert("Invalid value. Please enter a valid number.");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to save metrics.");
        return;
      }

      const nowIST = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      const [datePart, timePart] = nowIST.split(", ");
      const [day, month, year] = datePart.split("/");
      const measuredAtIST = `${year}-${month}-${day}T${timePart}`;

      const { error } = await supabase.from('health_metrics').insert([
        {
          user_id: user.id,
          metric_type: newMetric.metric_type,
          value: parsedValue,
          unit: newMetric.unit,
          notes: newMetric.notes || null,
          measured_at: measuredAtIST,
        },
      ]);

      if (error) {
        console.error("Supabase Error:", error);
        alert(`Error: ${error.message}`);
        return;
      }

      alert("Metric saved successfully!");
      setShowForm(false);
      setNewMetric({ metric_type: 'blood_pressure', value: '', unit: 'mmHg', notes: '' });
      fetchMetrics();
    } catch (error) {
      console.error("Error adding metric:", error);
      alert("Failed to save metric. Please try again.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this metric?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('health_metrics')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      alert("Metric deleted successfully!");
      setMetrics(metrics.filter(metric => metric.id !== id));
    } catch (error) {
      console.error("Error deleting metric:", error);
      alert("An error occurred while deleting the metric.");
    }
  }

  const metricTypes = {
    blood_pressure: { 
      name: 'Blood Pressure', 
      unit: 'mmHg',
      icon: Heart,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200'
    },
    heart_rate: { 
      name: 'Heart Rate', 
      unit: 'bpm',
      icon: Activity,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200'
    },
    blood_sugar: { 
      name: 'Blood Sugar', 
      unit: 'mg/dL',
      icon: Droplets,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200'
    },
    temperature: { 
      name: 'Temperature', 
      unit: '°C',
      icon: Thermometer,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200'
    },
    weight: { 
      name: 'Weight', 
      unit: 'kg',
      icon: Scale,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200'
    },
    oxygen_saturation: { 
      name: 'Oxygen Saturation', 
      unit: '%',
      icon: Lungs,
      color: 'cyan',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700',
      borderColor: 'border-cyan-200'
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Health Metrics</h1>
        <p className="mt-2 text-blue-100">
          Track and monitor your vital health measurements
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Measurements</h2>
          <button 
            onClick={() => setShowForm(true)} 
            className="btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" /> Add Metric
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => {
            const metricType = metricTypes[metric.metric_type];
            const Icon = metricType.icon;
            
            return (
              <div 
                key={metric.id} 
                className={`${metricType.bgColor} ${metricType.borderColor} border rounded-lg p-4 relative group`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`${metricType.textColor} p-2 rounded-lg ${metricType.bgColor}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className={`font-medium ${metricType.textColor}`}>
                        {metricType.name}
                      </h3>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {metric.value}
                        </span>
                        <span className="text-gray-600">
                          {metric.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(metric.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600"
                  >
                    <Trash className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {metric.measured_at.replace("T", " ")} IST
                  </p>
                  {metric.notes && (
                    <p className="mt-1 text-sm text-gray-600">
                      {metric.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {metrics.length === 0 && (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No metrics recorded</h3>
            <p className="text-gray-500 mt-2">
              Start tracking your health metrics by adding your first measurement
            </p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
            <button 
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" 
              onClick={() => setShowForm(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">Add New Health Metric</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Metric Type
                </label>
                <select
                  value={newMetric.metric_type}
                  onChange={(e) => setNewMetric({
                    ...newMetric,
                    metric_type: e.target.value,
                    unit: metricTypes[e.target.value as keyof typeof metricTypes].unit
                  })}
                  className="input-field"
                >
                  {Object.entries(metricTypes).map(([key, { name }]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Value
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    value={newMetric.value}
                    onChange={(e) => setNewMetric({ ...newMetric, value: e.target.value.replace(/[^0-9.]/g, '') })}
                    className="input-field"
                    required
                  />
                  <span className="ml-2 text-gray-600">{newMetric.unit}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <textarea
                  value={newMetric.notes}
                  onChange={(e) => setNewMetric({ ...newMetric, notes: e.target.value })}
                  className="input-field"
                  rows={3}
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Save Metric
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
