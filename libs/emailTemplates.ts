const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://flowvault.io';

const wrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlowVault</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <a href="${BASE_URL}" style="text-decoration:none;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">
                <span style="color:#6366f1;">Flow</span>Vault
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #f1f3f8;padding:40px 36px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">
              FlowVault · <a href="${BASE_URL}" style="color:#94a3b8;text-decoration:none;">flowvault.io</a><br />
              <a href="${BASE_URL}/legal/terms" style="color:#94a3b8;text-decoration:none;">Terms</a> ·
              <a href="${BASE_URL}/legal/privacy" style="color:#94a3b8;text-decoration:none;">Privacy</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export function welcomeEmail({ username }: { username?: string }) {
  const greeting = username ? `Hey @${username} 👋` : 'Welcome to FlowVault 👋';
  return wrapper(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">${greeting}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
      You're in. FlowVault lets you store, share and copy Webflow components in one click — no exports, no extensions, just the native Webflow clipboard.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${[
        ['📋', 'Copy from Webflow', 'Ctrl+C a component in the Designer — paste it on FlowVault.'],
        ['🔗', 'Share a link', 'Get a public or password-protected link to share with anyone.'],
        ['⚡', 'One-click copy', 'Anyone with the link can paste it straight into their own project.'],
      ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:10px 0;vertical-align:top;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:20px;padding-right:12px;vertical-align:top;line-height:1.4;">${icon}</td>
                <td>
                  <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">${title}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#64748b;line-height:1.5;">${desc}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `).join('')}
    </table>

    <a href="${BASE_URL}/upload"
       style="display:inline-block;background:#6366f1;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
      Upload your first component →
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
      Questions? Just reply to this email — I read every message.<br />
      — Clément, founder of FlowVault
    </p>
  `);
}

export function moderationRejectedEmail({
  componentName,
  reason,
  componentSlug,
}: {
  componentName: string;
  reason: string;
  componentSlug: string;
}) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">Your component was removed from Browse</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#64748b;line-height:1.6;">
      Your component <strong style="color:#0f172a;">"${componentName}"</strong> has been unpublished from the public Browse page.
    </p>

    <div style="background:#fafafe;border:1px solid #f1f3f8;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
      <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;">${reason}</p>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
      Your component is still in your library — it's just no longer visible to others. You can edit it and resubmit it for review from your dashboard.
    </p>

    <a href="${BASE_URL}/c/${componentSlug}"
       style="display:inline-block;background:#6366f1;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
      View component →
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
      If you think this is a mistake, reply to this email and I'll take another look.<br />
      — Clément, FlowVault
    </p>
  `);
}

export function moderationApprovedEmail({
  componentName,
  componentSlug,
}: {
  componentName: string;
  componentSlug: string;
}) {
  return wrapper(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">Your component is live 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
      Your component <strong style="color:#0f172a;">"${componentName}"</strong> has been reviewed and is now visible in the public Browse page.
    </p>

    <a href="${BASE_URL}/c/${componentSlug}"
       style="display:inline-block;background:#6366f1;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
      View your component →
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
      Thanks for contributing to the community.<br />
      — Clément, FlowVault
    </p>
  `);
}
