import nodemailer from "nodemailer";
import Notification from "../models/Notification.js";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 1025);

  if (host) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      connectionTimeout: 1500,
      socketTimeout: 1500,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

export function sendEmailFireAndForget({ to, subject, text }) {
  if (!to) return;

  const mailOptions = {
    from: process.env.SMTP_FROM || "lms@local.test",
    to,
    subject,
    text,
  };

  Promise.resolve()
    .then(() => getTransporter().sendMail(mailOptions))
    .catch((err) => {
      console.info(
        `[Email Fallback Log] To: ${to} | Subject: ${subject} | Body: ${text} (SMTP unavailable: ${err.message})`
      );
    });
}

export async function createNotification({
  empId,
  message,
  type = "SYSTEM",
  relatedLeaveId = null,
}) {
  if (!empId) return null;
  return Notification.create({
    empId,
    message,
    type,
    relatedLeaveId,
    createdDate: new Date(),
    readStatus: false,
  });
}

export async function notifyWorkflowTransition({
  type,
  message,
  recipient,
  relatedLeaveId,
  emailSubject,
  emailText,
}) {
  if (!recipient?._id) return;
  await createNotification({
    empId: recipient._id,
    message,
    type,
    relatedLeaveId,
  });

  sendEmailFireAndForget({
    to: recipient.email,
    subject: emailSubject || "LeaveEase Notification",
    text: emailText || message,
  });
}
