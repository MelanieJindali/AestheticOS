# Generates the Supabase auth email templates from one Celestial Garden layout.
# Run: python3 supabase/templates/_build.py   (outputs the .html files beside it)
import pathlib
APP = "https://theaestheticos.vercel.app"
HERE = pathlib.Path(__file__).parent

def page(preheader, eyebrow, title, intro, button, show_code, after, reason):
    code = f'''
          <tr><td style="padding:22px 0 6px;font:400 13px/1.5 'Jost','Helvetica Neue',Arial,sans-serif;color:#6B6058;">Or enter this code in the app:</td></tr>
          <tr><td style="padding:0 0 8px;"><span style="display:inline-block;padding:12px 22px;border-radius:14px;background:#ECEEF3;font:500 28px/1 'Courier New',Courier,monospace;letter-spacing:8px;color:#3A322C;">{{{{ .Token }}}}</span></td></tr>''' if show_code else ""
    return f'''<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>{title} · Aesthetic OS</title>
</head>
<body style="margin:0;padding:0;background:#FAF6F0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6F0;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td style="padding:0 8px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;padding-right:10px;"><img src="{APP}/icon-192.png" width="40" height="40" alt="" style="display:block;border-radius:10px;"></td>
          <td style="vertical-align:middle;font:500 22px/1.1 'Cormorant Garamond',Georgia,'Times New Roman',serif;color:#3A322C;">Aesthetic <i style="color:#4E6249;">OS</i><br><span style="font:400 10px/1.8 'Jost','Helvetica Neue',Arial,sans-serif;letter-spacing:2.5px;text-transform:uppercase;color:#6B6058;">Your business, beautifully guided</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#FFFFFF;border:1px solid #EBE2D9;border-radius:24px;padding:32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font:400 12px/1 'Jost','Helvetica Neue',Arial,sans-serif;letter-spacing:2.5px;text-transform:uppercase;color:#85663A;padding-bottom:10px;">{eyebrow}</td></tr>
          <tr><td style="font:500 32px/1.15 'Cormorant Garamond',Georgia,'Times New Roman',serif;color:#3A322C;padding-bottom:14px;">{title}</td></tr>
          <tr><td style="font:400 16px/1.6 'Jost','Helvetica Neue',Arial,sans-serif;color:#3A322C;padding-bottom:24px;">{intro}</td></tr>
          <tr><td>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#4E6249;">
              <a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;padding:14px 30px;font:500 16px/1 'Jost','Helvetica Neue',Arial,sans-serif;letter-spacing:.5px;color:#FAF6F0;text-decoration:none;border-radius:999px;">{button}</a>
            </td></tr></table>
          </td></tr>{code}
          <tr><td style="padding-top:22px;font:400 14px/1.6 'Jost','Helvetica Neue',Arial,sans-serif;color:#6B6058;">{after}</td></tr>
          <tr><td style="padding-top:22px;"><div style="height:1px;background:#EBE2D9;line-height:1px;font-size:0;">&nbsp;</div></td></tr>
          <tr><td style="padding-top:18px;font:400 13px/1.6 'Jost','Helvetica Neue',Arial,sans-serif;color:#6B6058;">
            <b style="color:#3A322C;font-weight:500;">Keeping your studio safe</b><br>
            Aesthetic OS will never ask for your password or your authenticator code by email, phone or message. After this step you&rsquo;ll confirm it&rsquo;s you with your authenticator app.<br><br>
            Didn&rsquo;t ask for this? You can safely ignore this email. Nothing changes unless the link or code is used.
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:22px 12px 0;font:400 12px/1.7 'Jost','Helvetica Neue',Arial,sans-serif;color:#6B6058;text-align:center;">
        Aesthetic OS is the calm business companion for beauty and wellness professionals: brand kit, content, scheduling and Muse, your business guide.<br>
        {reason} · <a href="{APP}/privacy" style="color:#4E6249;">Privacy</a> · <a href="{APP}/terms" style="color:#4E6249;">Terms</a><br>
        <a href="{APP}" style="color:#4E6249;">theaestheticos.vercel.app</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
'''

T = {
  "magic_link.html": page("Your sign-in link for Aesthetic OS. It works for 10 minutes.", "Sign in", "Welcome back to your studio",
      "Tap the button to sign in to Aesthetic OS. It works on any device, even inside your mail app.", "Sign in to Aesthetic OS", True,
      "This link and code work once and expire in 10 minutes.", "You&rsquo;re receiving this because someone asked to sign in with this email"),
  "confirmation.html": page("Confirm your email to open your Aesthetic OS studio.", "Welcome", "Your studio is almost ready",
      "Thank you for joining Aesthetic OS. Confirm your email and we&rsquo;ll guide you through your brand kit, which takes about ten minutes.", "Confirm my email", True,
      "This link and code work once and expire in 10 minutes. Next you&rsquo;ll add an authenticator app to protect your client records.", "You&rsquo;re receiving this because this email was used to create an Aesthetic OS account"),
  "email_change.html": page("Confirm the new email for your Aesthetic OS account.", "Account", "Confirm your new email",
      "You asked to change the email on your Aesthetic OS account to <b style=\"font-weight:500;\">{{ .NewEmail }}</b>. Confirm to finish.", "Confirm new email", False,
      "If you didn&rsquo;t ask for this, don&rsquo;t use the button. Sign in and choose <i>Sign out on all devices</i> in Settings.", "You&rsquo;re receiving this because an email change was requested"),
  "reauthentication.html": page("Your Aesthetic OS confirmation code.", "Confirm it&rsquo;s you", "Your confirmation code",
      "Enter this code in Aesthetic OS to continue. It protects sensitive changes to your account.", "Open Aesthetic OS", True,
      "The code expires in 10 minutes.", "You&rsquo;re receiving this because a sensitive change was requested"),
}
for name, html in T.items():
    if name == "reauthentication.html":
        html = html.replace("{{ .ConfirmationURL }}", APP)
    (HERE / name).write_text(html)
print("wrote", ", ".join(T))
