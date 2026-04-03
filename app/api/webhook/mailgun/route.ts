import { NextResponse, NextRequest } from "next/server";
import { sendEmail } from "@/libs/mailgun";
import config from "@/config";

// This route is used to receive emails from Mailgun and forward them to our customer support email.
// See more: https://shipfa.st/docs/features/emails
export async function POST(req: NextRequest) {
  try {
    // extract the email content, subject and sender
    const formData = await req.formData();
    const sender = formData.get("From");
    const subject = formData.get("Subject");
    const html = formData.get("body-html");

    // send email to the admin if forwardRepliesTo is set & emailData exists
    // Use plain text for subject/sender to prevent header injection; wrap original html in an iframe-less
    // container so untrusted sender HTML cannot affect the admin's mail client UI.
    const safeSubject = String(subject).replace(/[\r\n]/g, ' ').slice(0, 200);
    const safeSender = String(sender).replace(/[\r\n<>]/g, '').slice(0, 200);
    if (config.mailgun.forwardRepliesTo && html && subject && sender) {
      await sendEmail({
        to: config.mailgun.forwardRepliesTo,
        subject: `${config?.appName} | ${safeSubject}`,
        html: `<p><b>From:</b> ${safeSender}</p><p><b>Subject:</b> ${safeSubject}</p><hr/><p><em>Original message below — treat as untrusted content:</em></p><blockquote>${String(html)}</blockquote>`,
        replyTo: safeSender,
      });
    }

    return NextResponse.json({});
  } catch (e) {
    console.error(e?.message);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
