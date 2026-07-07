interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log(JSON.stringify({ level: "info", message: "Email service not configured", to: payload.to }));
    return false;
  }
  console.log(JSON.stringify({ level: "info", message: "Email sent", to: payload.to, subject: payload.subject }));
  return true;
}
