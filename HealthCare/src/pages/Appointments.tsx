import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Building2 as Hospital, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parse, parseISO, addDays, setHours, setMinutes } from 'date-fns';
import emailjs from '@emailjs/browser';
import type { Hospital as HospitalType, Doctor, Appointment } from '../types/database';

interface ExtendedAppointment extends Appointment {
  doctor: {
    full_name: string;
    specialization: string;
    department: string;
  };
  hospital: {
    name: string;
    address: string;
  };
}

export default function Appointments() {
  const [hospitals, setHospitals] = useState<HospitalType[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<ExtendedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Generate time slots between 10 AM and 5 PM in 30-minute intervals
  const timeSlots = Array.from({ length: 15 }, (_, i) => {
    const hour = Math.floor(i / 2) + 10;
    const minutes = (i % 2) * 30;
    const time = setMinutes(setHours(new Date(), hour), minutes);
    return format(time, 'hh:mm a');
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchData();
  }, []);

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!profile) return;

    const fullUser = {
      ...profile,
      id: user.id,
      email: user.email,
    };

    setCurrentUser(fullUser);
  }

  async function fetchData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: hospitalsData, error: hospitalsError } = await supabase
        .from('hospitals')
        .select('*');

      if (hospitalsError) throw hospitalsError;
      setHospitals(hospitalsData || []);

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(
            full_name,
            specialization,
            department
          ),
          hospital:hospitals(
            name,
            address
          )
        `)
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedHospital) {
      fetchDoctors();
    }
  }, [selectedHospital]);

  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate]);

  async function fetchDoctors() {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('hospital_id', selectedHospital);

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  }

  async function sendAppointmentEmail(appointmentData: any) {
    try {
      if (!currentUser?.email) {
        console.error("Cannot send email: currentUser.email is undefined.");
        return;
      }

      emailjs.init("Z9C_dXrkENk74QWgK");

      const templateParams = {
        from_name: "HealthCare",
        to_name: currentUser?.full_name || 'Patient',
        to_email: currentUser?.email,
        appointment_date: format(new Date(appointmentData.appointment_date), 'PPP p'),
        doctor_name: appointmentData.doctor.full_name,
        doctor_specialization: appointmentData.doctor.specialization,
        hospital_name: appointmentData.hospital.name,
        hospital_address: appointmentData.hospital.address,
        reason: appointmentData.reason || 'Not specified'
      };

      await emailjs.send(
        "service_xhxl6kf",
        "template_gt9vt97",
        templateParams
      );
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Parse the selected date and time in IST
      const [time, meridiem] = selectedTime.split(' '); // "10:30", "AM"
const [hoursStr, minutesStr] = time.split(':');
let hours = parseInt(hoursStr, 10);
const minutes = parseInt(minutesStr, 10);

if (meridiem === 'PM' && hours !== 12) hours += 12;
if (meridiem === 'AM' && hours === 12) hours = 0;

const appointmentDate = new Date(selectedDate);
appointmentDate.setHours(hours, minutes, 0, 0);

// Format appointment date as IST string (non-UTC)
const formattedDate = format(appointmentDate, "yyyy-MM-dd HH:mm:ss"); // This will be in your system's local timezone (assumed IST)

const { data: appointmentData, error: appointmentError } = await supabase
  .from('appointments')
  .insert([{
    user_id: user.id,
    hospital_id: selectedHospital,
    doctor_id: selectedDoctor,
    appointment_date: formattedDate, // ✅ use local time string
    reason,
    status: 'scheduled'
  }])

        .select(`
          *,
          doctor:doctors(
            full_name,
            specialization,
            department
          ),
          hospital:hospitals(
            name,
            address
          )
        `)
        .single();

      if (appointmentError) throw appointmentError;

      await sendAppointmentEmail(appointmentData);
      
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error booking appointment:', error);
    }
  }

  function resetForm() {
    setSelectedHospital('');
    setSelectedDoctor('');
    setSelectedDate('');
    setSelectedTime('');
    setReason('');
  }

  async function handleCancelAppointment(appointmentId: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  }

  function isPastTimeSlot(slot: string): boolean {
    if (selectedDate !== format(new Date(), "yyyy-MM-dd")) return false;

    const [time, meridiem] = slot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const selectedSlotDate = new Date();
    selectedSlotDate.setHours(hours, minutes, 0, 0);

    return selectedSlotDate < new Date();
  }

  function formatAppointmentTime(dateString: string): string {
    const date = new Date(dateString);
    return format(date, 'hh:mm a');
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="mt-2 text-blue-100">
          Schedule and manage your medical appointments
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          Book Appointment
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Book New Appointment</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hospital
                </label>
                <select
                  value={selectedHospital}
                  onChange={(e) => {
                    setSelectedHospital(e.target.value);
                    setSelectedDoctor('');
                  }}
                  className="input-field"
                  required
                >
                  <option value="">Select Hospital</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name} - {hospital.city}, {hospital.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Doctor
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="input-field"
                  required
                  disabled={!selectedHospital}
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.full_name} - {doctor.specialization} ({doctor.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Appointment Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Appointment Time (IST)
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select Time</option>
                  {timeSlots
                    .filter((time) => !isPastTimeSlot(time))
                    .map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason for Visit
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-field"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Calendar className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Upcoming Appointments</h3>
            <div className="space-y-4">
              {appointments
                .filter(apt => apt.status === 'scheduled' && new Date(apt.appointment_date) >= new Date())
                .map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Hospital className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">{appointment.hospital.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-blue-600" />
                      <span>Dr. {appointment.doctor.full_name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {appointment.doctor.specialization} - {appointment.doctor.department}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span>{format(parseISO(appointment.appointment_date), 'PPP')}</span>
                      <Clock className="h-5 w-5 text-blue-600 ml-2" />
                      <span>{formatAppointmentTime(appointment.appointment_date)}</span>
                    </div>
                    {appointment.reason && (
                      <div className="text-gray-600">
                        Reason: {appointment.reason}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleCancelAppointment(appointment.id)}
                    className="btn-secondary text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </button>
                </div>
              ))}
              {appointments.filter(apt => apt.status === 'scheduled' && new Date(apt.appointment_date) >= new Date()).length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No upcoming appointments
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Past Appointments</h3>
            <div className="space-y-4">
             {appointments
  .filter(apt =>
    apt.status === 'completed' ||
    apt.status === 'cancelled' ||
    new Date(apt.appointment_date) < new Date()
  )
                .map((appointment) => (
                <div key={appointment.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Hospital className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">{appointment.hospital.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-600" />
                      <span>Dr. {appointment.doctor.full_name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {appointment.doctor.specialization} - {appointment.doctor.department}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <span>{format(parseISO(appointment.appointment_date), 'PPP')}</span>
                      <Clock className="h-5 w-5 text-gray-600 ml-2" />
                      <span>{formatAppointmentTime(appointment.appointment_date)}</span>
                    </div>
                    {appointment.reason && (
                      <div className="text-gray-500">
                        Reason: {appointment.reason}
                      </div>
                    )}
                    <div className="text-sm font-medium mt-1">
  <span
   className={`inline-block px-2 py-1 rounded-full ${
      appointment.status === 'cancelled'
        ? 'bg-red-100 text-red-600'
        : appointment.status === 'completed'
        ? 'bg-green-100 text-green-600'
        : 'bg-blue-100 text-blue-600'
    }`}
  >
    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
  </span>
</div>

                  </div>
                </div>
              ))}
              {appointments.filter(apt =>
  (apt.status === 'completed' || apt.status === 'cancelled' || new Date(apt.appointment_date) < new Date())
).length === 0 && (

                <div className="text-center text-gray-500 py-8">
                  No past appointments
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}