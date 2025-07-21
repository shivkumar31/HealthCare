import React, { useEffect, useState } from 'react';
import { Activity, Calendar, FileText, Heart, AlertTriangle, UserCircle2, Building2, Scale, Settings as Lungs } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../lib/supabase';
import type { Appointment, HealthMetric, Profile } from '../types/database';

interface HealthVisit {
  id: string;
  doctor_name: string;
  hospital_name: string;
  visit_date: string;
  diagnosis: string;
  specialization: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [healthVisits, setHealthVisits] = useState<HealthVisit[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Fetch appointments
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(full_name, specialization),
          hospital:hospitals(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date')
        .limit(3);

      setAppointments(appointmentsData || []);

      // Fetch metrics
      const { data: metricsData } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(10);

      setMetrics(metricsData || []);

      // Generate health recommendations based on metrics
      generateHealthRecommendations(metricsData || []);

      // Fetch health visits
      const { data: visitsData } = await supabase
        .from('health_visits')
        .select('*')
        .eq('user_id', user.id)
        .order('visit_date', { ascending: false })
        .limit(3);

      setHealthVisits(visitsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateHealthRecommendations(metrics: HealthMetric[]) {
    const recommendations: string[] = [];
    
    // Group metrics by type
    const groupedMetrics = metrics.reduce((acc, metric) => {
      if (!acc[metric.metric_type]) {
        acc[metric.metric_type] = [];
      }
      acc[metric.metric_type].push(metric);
      return acc;
    }, {} as Record<string, HealthMetric[]>);

    // Blood Pressure recommendations
// Blood Pressure recommendations
const bpMetrics = groupedMetrics['blood_pressure'] || [];
if (bpMetrics.length > 0) {
  const latestBP = bpMetrics[0].value;
  if (latestBP > 140) {
    recommendations.push(
      "Your blood pressure is elevated. Reduce processed foods, manage stress with yoga or meditation, stay physically active (30 min/day), and monitor regularly. Consider consulting a cardiologist for personalized medication or risk evaluation."
    );
  } else if (latestBP < 90) {
    recommendations.push(
      "Your blood pressure is lower than normal. Stay well-hydrated, avoid sudden posture changes, and include slightly more sodium in your diet if advised. Persistent low BP should be discussed with a healthcare provider to rule out underlying issues like anemia or adrenal insufficiency."
    );
  }
}

// Heart Rate recommendations
const hrMetrics = groupedMetrics['heart_rate'] || [];
if (hrMetrics.length > 0) {
  const latestHR = hrMetrics[0].value;
  if (latestHR > 100) {
    recommendations.push(
      "Your resting heart rate is elevated. This may be due to stress, dehydration, or poor sleep. Prioritize 7–9 hours of sleep, hydrate consistently, and practice deep breathing or mindfulness. If it persists, consult a cardiologist for arrhythmia or thyroid screening."
    );
  } else if (latestHR < 60) {
    recommendations.push(
      "Your heart rate is below average. This could be normal in athletes, but if you experience fatigue, dizziness, or shortness of breath, seek medical advice to check for bradycardia or electrolyte imbalance."
    );
  }
}

// Blood Sugar recommendations
const bsMetrics = groupedMetrics['blood_sugar'] || [];
if (bsMetrics.length > 0) {
  const latestBS = bsMetrics[0].value;
  if (latestBS > 140) {
    recommendations.push(
      "Your blood sugar levels are above normal. Consider a low glycemic index (GI) diet, increase fiber and protein intake, and engage in regular aerobic exercise. Track your levels using a glucometer. If readings remain high, get tested for insulin resistance or type 2 diabetes."
    );
  } else if (latestBS < 70) {
    recommendations.push(
      "Your blood sugar is low. Eat small, frequent meals and avoid prolonged fasting. Keep quick glucose sources (e.g., fruit juice, glucose tablets) on hand. If episodes are recurrent, consult a doctor to assess for hypoglycemia or insulin imbalance."
    );
  }
}

// Weight recommendations
const weightMetrics = groupedMetrics['weight'] || [];
if (weightMetrics.length > 1) {
  const weightChange = weightMetrics[0].value - weightMetrics[1].value;
  if (Math.abs(weightChange) > 2) {
    recommendations.push(
      `You've experienced a ${weightChange > 0 ? 'gain' : 'loss'} of ${Math.abs(weightChange)}kg. Sudden weight ${weightChange > 0 ? 'gain' : 'loss'} can indicate metabolic changes, hormonal imbalance, or nutritional deficiencies. Consider a professional evaluation to create a sustainable plan tailored to your health goals.`
    );
  }
}

// Temperature recommendations (in °C)
const tempMetrics = groupedMetrics['temperature'] || [];
if (tempMetrics.length > 0) {
  const latestTemp = tempMetrics[0].value;
  if (latestTemp > 37.5) {
    recommendations.push(
      "You have a mild fever. Stay hydrated, rest, and monitor for symptoms like cough, fatigue, or sore throat. Seek medical help if temperature exceeds 38.3°C or symptoms worsen."
    );
  } else if (latestTemp < 36.0) {
    recommendations.push(
      "Your body temperature is below normal. This could be due to cold exposure, low metabolism, or medical conditions. Stay warm and consult a doctor if you experience chills, confusion, or fatigue."
    );
  }
}

// Oxygen Saturation (SpO2) recommendations
const spo2Metrics = groupedMetrics['oxygen_saturation'] || [];
if (spo2Metrics.length > 0) {
  const latestSpO2 = spo2Metrics[0].value;
  if (latestSpO2 < 95) {
    recommendations.push(
      "Your oxygen saturation is below normal. Practice deep breathing exercises, stay upright, and ensure good ventilation. If you experience shortness of breath, chest pain, or levels fall below 92%, seek immediate medical attention."
    );
  } else if (latestSpO2 >= 95 && latestSpO2 <= 100) {
    recommendations.push(
      
    );
  }
}



    setRecommendations(recommendations);
  }

  const metricTypes = {
    blood_pressure: { 
      name: 'Blood Pressure', 
      unit: 'mmHg',
      icon: Heart,
      color: '#ef4444',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    heart_rate: { 
      name: 'Heart Rate', 
      unit: 'bpm',
      icon: Activity,
      color: '#3b82f6',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    blood_sugar: { 
      name: 'Blood Sugar', 
      unit: 'mg/dL',
      icon: AlertTriangle,
      color: '#8b5cf6',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    temperature: { 
      name: 'Temperature', 
      unit: '°C',
      icon: Scale,
      color: '#f59e0b',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    weight: { 
      name: 'Weight', 
      unit: 'kg',
      icon: Scale,
      color: '#10b981',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    oxygen_saturation: { 
      name: 'Oxygen Saturation', 
      unit: '%',
      icon: Lungs,
      color: '#06b6d4',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700'
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Activity className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">
          Welcome back, {profile?.full_name || 'User'}
        </h1>
        <p className="mt-2 text-blue-100">
          Track your health metrics, manage appointments, and view your health records all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(metricTypes).map(([type, metricInfo]) => {
          const latestMetric = metrics.find(m => m.metric_type === type);
          if (!latestMetric) return null;

          const Icon = metricInfo.icon;
          return (
            <div 
              key={type} 
              className={`${metricInfo.bgColor} rounded-lg p-4 shadow-sm`}
            >
              <div className="flex items-center space-x-3">
                <div className={`${metricInfo.textColor} p-2 rounded-lg ${metricInfo.bgColor}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className={`font-medium ${metricInfo.textColor}`}>
                    {metricInfo.name}
                  </h3>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {latestMetric.value}
                    </span>
                    <span className="text-gray-600">
                      {latestMetric.unit}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(latestMetric.measured_at), 'PP')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Health Metrics Trends</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={metrics}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="measured_at"
                tickFormatter={(date) => format(parseISO(date), 'MMM d')}
                stroke="#6b7280"
              />
              <YAxis stroke="#6b7280" />
              <Tooltip
                labelFormatter={(date) => format(parseISO(date as string), 'PPP')}
                contentStyle={{ 
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              {Object.entries(metricTypes).map(([type, { name, color }]) => (
                metrics.some(m => m.metric_type === type) && (
                  <Line
                    key={type}
                    type="monotone"
                    dataKey="value"
                    data={metrics.filter(m => m.metric_type === type)}
                    name={name}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {recommendations.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
            <h3 className="text-red-800 font-medium mb-2">Health Recommendations</h3>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="text-red-700 flex items-start">
                  <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-blue-600 hover:text-blue-700 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {appointments.length > 0 ? (
              appointments.map((appointment) => (
                <div key={appointment.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">
                      {format(parseISO(appointment.appointment_date), 'PPP p')}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    Dr. {appointment.doctor.full_name}
                    <br />
                    {appointment.hospital.name}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No upcoming appointments</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Health Records</h2>
            <Link to="/health-record" className="text-blue-600 hover:text-blue-700 text-sm">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {healthVisits.length > 0 ? (
              healthVisits.map((visit) => (
                <div key={visit.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">
                      {format(parseISO(visit.visit_date), 'PPP')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <UserCircle2 className="h-5 w-5 text-blue-600" />
                      <span>Dr. {visit.doctor_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <span>{visit.hospital_name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {visit.diagnosis}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No health records</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/appointments"
          className="bg-white shadow-lg hover:bg-gray-50 transition-colors duration-200 rounded-lg flex items-center justify-center p-4 space-x-2"
        >
          <Calendar className="h-6 w-6 text-blue-600" />
          <span className="font-medium">Book Appointment</span>
        </Link>
        <Link
          to="/metrics"
          className="bg-white shadow-lg hover:bg-gray-50 transition-colors duration-200 rounded-lg flex items-center justify-center p-4 space-x-2"
        >
          <Activity className="h-6 w-6 text-blue-600" />
          <span className="font-medium">Record Health Metrics</span>
        </Link>
        <Link
          to="/health-record"
          className="bg-white shadow-lg hover:bg-gray-50 transition-colors duration-200 rounded-lg flex items-center justify-center p-4 space-x-2"
        >
          <FileText className="h-6 w-6 text-blue-600" />
          <span className="font-medium">View Health Records</span>
        </Link>
      </div>
    </div>
  );
}