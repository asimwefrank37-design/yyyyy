import sgMail from "@sendgrid/mail";

export const emailReady = () => Boolean(process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM);

export const sendResetCodeEmail = async (to: string, code: string) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Email is not configured");
  }

  sgMail.setApiKey(apiKey);

  try {
    await sgMail.send({
      to,
      from: { email: from, name: "Open Margin" },
      subject: "Your Open Margin password reset code",
      html: `
        <p>Hello,</p>
        <p>Use this code to reset your Open Margin password:</p>
        <p><strong>${code}</strong></p>
        <p>The code expires in 10 minutes.</p>
        <p>If you did not ask for this, you can ignore the email.</p>
      `,
    });
  } catch (error) {
    const response = (error as { response?: { body?: { errors?: { message?: string }[] } } }).response;
    throw new Error(response?.body?.errors?.[0]?.message || "Could not send the reset email");
  }
};
