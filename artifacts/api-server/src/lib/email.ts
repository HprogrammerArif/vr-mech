/* ─────────────────────────────────────────────────────────
   Email service — parent notifications via Resend

   DOMAIN VERIFICATION STATUS:
   - Without a verified domain, Resend only delivers to the
     account owner's email (RESEND_TEST_RECIPIENT).
   - Set EMAIL_FROM + EMAIL_REPLY_TO once your domain is
     verified at resend.com/domains to unlock real delivery.
   ───────────────────────────────────────────────────────── */
import { Resend } from "resend";
import { logger } from "./logger.js";

const FROM_ADDRESS = process.env["EMAIL_FROM"] ?? "onboarding@resend.dev";
const REPLY_TO    = process.env["EMAIL_REPLY_TO"] ?? "onboarding@resend.dev";

/* When RESEND_TEST_RECIPIENT is set, all emails are redirected to that
   address (required until a custom sending domain is verified). */
const TEST_RECIPIENT = process.env["RESEND_TEST_RECIPIENT"];

function getResend(): Resend | null {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return null;
  return new Resend(key);
}

export interface EmailPayload {
  to: string;         // intended parent address (always shown in body/subject)
  subject: string;
  body: string;
  html?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();

  if (!resend) {
    logger.warn({ to: payload.to, subject: payload.subject }, "Email not sent — RESEND_API_KEY not configured");
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  /* In test mode, redirect to the Resend account owner's email */
  const isTestMode   = !!TEST_RECIPIENT;
  const deliverTo    = isTestMode ? TEST_RECIPIENT! : payload.to;
  const testPrefix   = isTestMode ? `[TEST → ${payload.to}] ` : "";
  const subject      = testPrefix + payload.subject;

  /* Prepend a test-mode banner to the body so the admin knows who this was for */
  const bodyWithNote = isTestMode
    ? `⚠️  TEST MODE — This email was intended for: ${payload.to}\nTo send directly to parents, verify your domain at resend.com/domains.\n\n${"─".repeat(60)}\n\n${payload.body}`
    : payload.body;

  try {
    const htmlBody = isTestMode
      ? buildHtmlWrapper(subject, bodyWithNote, payload.to)
      : (payload.html ?? buildHtmlWrapper(subject, payload.body));

    const { error } = await resend.emails.send({
      from:    FROM_ADDRESS,
      replyTo: REPLY_TO,
      to:      [deliverTo],
      subject,
      text:    bodyWithNote,
      html:    htmlBody,
    });

    if (error) {
      logger.error({ error, intendedTo: payload.to, deliveredTo: deliverTo }, "Resend email error");
      return { sent: false, error: error.message };
    }

    logger.info(
      { intendedTo: payload.to, deliveredTo: deliverTo, testMode: isTestMode, subject: payload.subject },
      "Parent email sent via Resend"
    );
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err, to: payload.to }, "Email send failed");
    return { sent: false, error: msg };
  }
}

/* ── HTML email wrapper matching 1WayMirror branding ── */
function buildHtmlWrapper(subject: string, body: string, intendedFor?: string): string {
  const lines = body.split("\n").map(l => `<p style="margin:0 0 10px 0">${escapeHtml(l)}</p>`).join("");
  const testBanner = intendedFor
    ? `<tr><td style="background:#7c3aed;padding:12px 32px;text-align:center;color:#fff;font-size:12px;font-weight:600">
         ⚠️ TEST MODE — Intended for: ${escapeHtml(intendedFor)} · Verify your domain at resend.com/domains for live delivery
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1929;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1929;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111f35;border-radius:12px;overflow:hidden;max-width:600px">
        ${testBanner}
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1d2d50,#1d4ed8);padding:28px 32px;text-align:center">
            <div style="color:#f5a524;font-size:22px;font-weight:700;letter-spacing:-0.5px">1WayMirror</div>
            <div style="color:#93c5fd;font-size:13px;margin-top:4px">Safety Alert System</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#e2e8f0;font-size:15px;line-height:1.6">
            <h2 style="color:#f5a524;font-size:18px;margin:0 0 20px 0">${escapeHtml(subject)}</h2>
            ${lines}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0d1929;padding:20px 32px;text-align:center;color:#475569;font-size:12px">
            <p style="margin:0 0 8px 0">1WayMirror · AI-Powered Career Exploration for Students</p>
            <p style="margin:0">Automated safety notification. Reply to reach our safety team.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
