import nodemailer from "nodemailer";

/**
 * Appwrite Function (Node.js)
 * Sends SBA booking requests to silvaboxingacademy@gmail.com via SMTP.
 *
 * Expected request body format (recommended):
 * {
 *   "payload": {
 *     "cycle": "cycle-1",
 *     "cycleLabel": "Next Cycle — starts Thu 15 Feb",
 *     "package": "p3",
 *     "packageLabel": "3 Classes (1 Cycle) — €50 total",
 *     "fullName": "John Doe",
 *     "email": "john@email.com",
 *     "phone": "+49 ...",
 *     "experience": "Novice (First-Time Camp)",
 *     "goals": "Technical growth",
 *     "message": "..."
 *   }
 * }
 */
export default async ({ req, res, log, error }) => {
  try {
    // ---- Robust body parsing (Appwrite can pass object or string depending on config) ----
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // If body is a string but not JSON, treat as empty
        body = {};
      }
    }

    // Support either { payload: {...} } or direct {...}
    const payload = body?.payload && typeof body.payload === "object" ? body.payload : (body || {});

    // ---- SBA form fields ----
    const fullName = payload.fullName || payload.name || "Unknown";
    const userEmail = payload.email || "Unknown";
    const phone = payload.phone || payload.whatsapp || "Unknown";
    const experience = payload.experience || "Unknown";
    const goals = payload.goals || "";
    const message = payload.message || "";

    // Booking selections
    const cycle = payload.cycle || "Unknown";
    const cycleLabel = payload.cycleLabel || cycle; // allow UI label
    const pkg = payload.package || "Unknown";
    const packageLabel = payload.packageLabel || pkg; // allow UI label

    // ---- Basic validation (fail fast) ----
    const missing = [];
    if (!payload.fullName && !payload.name) missing.push("fullName");
    if (!payload.email) missing.push("email");
    if (!payload.phone && !payload.whatsapp) missing.push("phone");
    if (!payload.cycle && !payload.cycleLabel) missing.push("cycle");
    if (!payload.package && !payload.packageLabel) missing.push("package");

    if (missing.length) {
      return res.json(
        {
          ok: false,
          error: `Missing required fields: ${missing.join(", ")}`
        },
        400
      );
    }

    // ---- SMTP config (env vars set in Appwrite Function settings) ----
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const TO_EMAIL = process.env.SBA_ADMIN_EMAIL || "silvaboxingacademy@gmail.com";

    // ---- SBA branded email template (email-safe HTML) ----
    const now = new Date().toLocaleString("en-GB", { timeZone: "Europe/Berlin" });

    // Simple inline “SBA” logo block (email-safe)
    const logoBlock = `
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:44px;height:44px;background:#b91c1c;border-radius:999px;display:flex;align-items:center;justify-content:center;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-style:italic;letter-spacing:-1px;color:#fff;font-size:18px;">
            SBA
          </div>
        </div>
        <div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#fff;font-size:14px;line-height:1;">
            Silva Boxing Academy
          </div>
          <div style="font-family:Arial,Helvetica,sans-serif;color:#9ca3af;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:6px;">
            Booking Request Notification
          </div>
        </div>
      </div>
    `;

    const html = `
      <div style="background:#0a0a0a;padding:28px;margin:0;">
        <div style="max-width:720px;margin:0 auto;border:1px solid #222;background:#111;border-radius:10px;overflow:hidden;">
          
          <div style="padding:22px 22px 18px 22px;border-bottom:1px solid #222;">
            ${logoBlock}
          </div>

          <div style="padding:22px;">
            <h2 style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;color:#fff;text-transform:uppercase;letter-spacing:2px;font-size:18px;">
              New Cycle Booking Request
            </h2>
            <p style="margin:0 0 18px 0;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
              A user submitted a booking request via the SBA website form. Details below.
            </p>

            <div style="display:block;border:1px solid #222;background:#0b0b0b;border-radius:10px;padding:16px;margin-bottom:16px;">
              <div style="color:#b91c1c;font-family:Arial,Helvetica,sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:11px;margin-bottom:10px;">
                Booking Selection
              </div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:220px;border:1px solid #222;border-radius:10px;padding:12px;background:#111;">
                  <div style="color:#9ca3af;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">
                    Cycle
                  </div>
                  <div style="color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;">
                    ${escapeHtml(cycleLabel)}
                  </div>
                </div>

                <div style="flex:1;min-width:220px;border:1px solid #222;border-radius:10px;padding:12px;background:#111;">
                  <div style="color:#9ca3af;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">
                    Package
                  </div>
                  <div style="color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;">
                    ${escapeHtml(packageLabel)}
                  </div>
                </div>
              </div>
            </div>

            <div style="border:1px solid #222;background:#0b0b0b;border-radius:10px;padding:16px;margin-bottom:16px;">
              <div style="color:#b91c1c;font-family:Arial,Helvetica,sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:11px;margin-bottom:10px;">
                Contact Details
              </div>

              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:2px;width:160px;">
                    Full Name
                  </td>
                  <td style="padding:8px 0;color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;">
                    ${escapeHtml(fullName)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:2px;">
                    Email
                  </td>
                  <td style="padding:8px 0;color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
                    ${escapeHtml(userEmail)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:2px;">
                    Phone / WhatsApp
                  </td>
                  <td style="padding:8px 0;color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
                    ${escapeHtml(phone)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:2px;">
                    Experience
                  </td>
                  <td style="padding:8px 0;color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
                    ${escapeHtml(experience)}
                  </td>
                </tr>
              </table>
            </div>

            ${(goals || message) ? `
              <div style="border:1px solid #222;background:#0b0b0b;border-radius:10px;padding:16px;margin-bottom:16px;">
                <div style="color:#b91c1c;font-family:Arial,Helvetica,sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:11px;margin-bottom:10px;">
                  Notes
                </div>
                ${goals ? `
                  <div style="margin-bottom:10px;">
                    <div style="color:#9ca3af;font-family:Arial,Helvetica,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">
                      Primary Goals
                    </div>
                    <div style="color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
                      ${escapeHtml(goals)}
                    </div>
                  </div>
                ` : ''}
                ${message ? `
                  <div>
                    <div style="color:#9ca3af;font-family:Arial,Helvetica,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">
                      Message
                    </div>
                    <div style="color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;white-space:pre-wrap;">
                      ${escapeHtml(message)}
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div style="padding-top:10px;border-top:1px solid #222;color:#6b7280;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;">
              Received: ${escapeHtml(now)} (Europe/Berlin)<br/>
              This email was generated automatically from the SBA Cycle Booking Form.
            </div>
          </div>
        </div>
      </div>
    `;

    const subject = `SBA Booking Request — ${fullName} — ${cycleLabel}`;

    const mailOptions = {
      from: `"SBA Website" <${process.env.SMTP_USER}>`,
      to: TO_EMAIL,
      replyTo: userEmail !== "Unknown" ? userEmail : undefined,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);

    log("✅ SBA booking email sent.");
    return res.json({ ok: true });
  } catch (err) {
    error("❌ SBA email sending failed:", err?.message || String(err));
    return res.json({ ok: false, error: err?.message || String(err) }, 500);
  }
};

// --- Small helper to prevent HTML injection in email ---
function escapeHtml(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
