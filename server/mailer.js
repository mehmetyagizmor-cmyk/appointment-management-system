const nodemailer = require("nodemailer");

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "Randevu Yönetim Sistemi";

let transporter = null;
let warned = false;

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    if (!warned) {
      console.warn(
        "> UYARI: SMTP_USER / SMTP_PASS .env dosyasında tanımlı değil. E-posta bildirimleri (onay/hatırlatma) devre dışı."
      );
      warned = true;
    }
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

function formatDateLabelTR(dateISO) {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t || !to) return false;
  try {
    await t.sendMail({ from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`, to, subject, html, text });
    return true;
  } catch (error) {
    console.error("> E-posta gönderilemedi:", error.message);
    return false;
  }
}

function buildAppointmentEmail({ appointment, business, kind }) {
  const dateLabel = formatDateLabelTR(appointment.date);
  const heading = kind === "reminder" ? "Randevu Hatırlatması" : "Randevunuz Onaylandı";
  const intro =
    kind === "reminder"
      ? `${dateLabel} tarihindeki randevunuzu hatırlatmak isteriz.`
      : `${business.businessName || "İşletmemiz"} için randevunuz oluşturuldu.`;

  const lines = [
    `Tarih: ${dateLabel}`,
    `Saat: ${appointment.time}`,
    appointment.serviceName ? `Hizmet: ${appointment.serviceName}` : null,
    appointment.resourceName
      ? `${business.resourceLabel || "Kaynak"}: ${appointment.resourceName}`
      : null,
  ].filter(Boolean);

  const text = [
    intro,
    "",
    ...lines,
    "",
    business.address || "",
    business.phone ? `İletişim: ${business.phone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #2b2118;">
      <h2 style="margin-bottom: 4px;">${heading}</h2>
      <p style="color:#6b5d4f;">${intro}</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        ${lines.map((l) => `<tr><td style="padding:4px 0; color:#6b5d4f;">${l}</td></tr>`).join("")}
      </table>
      ${business.address ? `<p style="color:#6b5d4f; font-size:13px;">${business.address}</p>` : ""}
      ${business.phone ? `<p style="color:#6b5d4f; font-size:13px;">İletişim: ${business.phone}</p>` : ""}
      <p style="margin-top:24px; font-size:12px; color:#9c8d7c;">${
        business.businessName || "Randevu Yönetim Sistemi"
      }</p>
    </div>
  `;

  return { text, html };
}

async function sendBookingConfirmationEmail(appointment, business) {
  if (!appointment.email) return false;
  const { text, html } = buildAppointmentEmail({ appointment, business, kind: "confirmation" });
  return sendMail({
    to: appointment.email,
    subject: `Randevunuz onaylandı — ${business.businessName || "Randevu"}`,
    text,
    html,
  });
}

async function sendReminderEmail(appointment, business) {
  if (!appointment.email) return false;
  const { text, html } = buildAppointmentEmail({ appointment, business, kind: "reminder" });
  return sendMail({
    to: appointment.email,
    subject: `Randevu hatırlatması — ${business.businessName || "Randevu"}`,
    text,
    html,
  });
}

module.exports = { sendBookingConfirmationEmail, sendReminderEmail };
