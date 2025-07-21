import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { format } from 'npm:date-fns@3.3.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  appointment: {
    id: string;
    appointment_date: string;
    doctor: {
      full_name: string;
      specialization: string;
      department: string;
    };
    hospital: {
      name: string;
      address: string;
    };
    reason?: string;
  };
  userEmail: string;
  userName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { appointment, userEmail, userName } = await req.json() as EmailPayload;

    const formattedDate = format(new Date(appointment.appointment_date), 'PPP p');

    const emailContent = `
Dear ${userName},

Your appointment has been confirmed for ${formattedDate}.

Details:
- Doctor: Dr. ${appointment.doctor.full_name}
- Specialization: ${appointment.doctor.specialization}
- Department: ${appointment.doctor.department}
- Hospital: ${appointment.hospital.name}
- Address: ${appointment.hospital.address}
${appointment.reason ? `- Reason: ${appointment.reason}` : ''}

Please arrive 15 minutes before your scheduled appointment time.
If you need to reschedule or cancel, please do so at least 24 hours in advance.

Best regards,  
HealthCare Team
`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HealthCare <no-reply@yourdomain.com>',
        to: [userEmail],
        subject: 'Appointment Confirmation',
        text: emailContent,
      }),
    });

    if (!resendRes.ok) {
      const errorBody = await resendRes.text();
      throw new Error(`Email API Error: ${errorBody}`);
    }

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
