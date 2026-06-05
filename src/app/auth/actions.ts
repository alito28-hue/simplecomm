'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/resend/email';
import { confirmEmailTemplate, resetPasswordTemplate } from '@/lib/resend/templates';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) return { error: error.message };

  redirect('/dashboard');
}

export async function register(formData: FormData) {
  const supabase = createAdminClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: {
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        org_name: formData.get('orgName'),
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
    },
  });

  if (error) return { error: error.message };
  if (!data.properties?.action_link) return { error: 'No se pudo generar el link de confirmación' };

  const { error: emailError } = await sendEmail({
    to: email,
    subject: 'Confirmá tu email en SimpleComm',
    html: confirmEmailTemplate(data.properties.action_link),
  });

  if (emailError) return { error: emailError.message };

  redirect('/login?registered=1');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function forgotPassword(formData: FormData) {
  const supabase = createAdminClient();
  const email = formData.get('email') as string;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    },
  });

  if (error) return { error: error.message };
  if (!data.properties?.action_link) return { error: 'No se pudo generar el link de recuperación' };

  const { error: emailError } = await sendEmail({
    to: email,
    subject: 'Recuperá tu contraseña de SimpleComm',
    html: resetPasswordTemplate(data.properties.action_link),
  });

  if (emailError) return { error: emailError.message };

  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  redirect('/dashboard');
}
