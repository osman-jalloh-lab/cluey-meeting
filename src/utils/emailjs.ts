const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE_CREATED = import.meta.env.VITE_EMAILJS_TEMPLATE_TASK_CREATED as string | undefined;
const TEMPLATE_DONE = import.meta.env.VITE_EMAILJS_TEMPLATE_TASK_DONE as string | undefined;
const TEMPLATE_INVITE = import.meta.env.VITE_EMAILJS_TEMPLATE_PROJECT_INVITE as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

async function sendEmail(templateId: string, params: Record<string, string>): Promise<boolean> {
  if (!SERVICE_ID || !PUBLIC_KEY) return false;
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: templateId,
        user_id: PUBLIC_KEY,
        template_params: params,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTaskCreatedEmail(params: {
  to_name: string;
  to_email: string;
  from_name: string;
  task_text: string;
  meeting_with: string;
  due_date: string;
  meeting_date: string;
}): Promise<boolean> {
  if (!params.to_email || !TEMPLATE_CREATED) return false;
  return sendEmail(TEMPLATE_CREATED, params as Record<string, string>);
}

export async function sendTaskDoneEmail(params: {
  to_name: string;
  to_email: string;
  completer_name: string;
  task_text: string;
  completed_at: string;
}): Promise<boolean> {
  if (!params.to_email || !TEMPLATE_DONE) return false;
  return sendEmail(TEMPLATE_DONE, params as Record<string, string>);
}

export async function sendProjectInviteEmail(params: {
  to_name: string;
  to_email: string;
  from_name: string;
  project_name: string;
  project_description: string;
  message: string;
}): Promise<boolean> {
  if (!params.to_email || !TEMPLATE_INVITE) return false;
  return sendEmail(TEMPLATE_INVITE, params as Record<string, string>);
}
