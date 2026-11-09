# Sign-in email templates (Celestial Garden)

Branded Supabase Auth emails for Aesthetic OS. They're generated from `_build.py`, so edit that file and re-run `python3 supabase/templates/_build.py`.

| Supabase template | File | Subject |
|---|---|---|
| Magic Link | `magic_link.html` | Your Aesthetic OS sign-in link |
| Confirm signup | `confirmation.html` | Welcome to Aesthetic OS: confirm your email |
| Change Email Address | `email_change.html` | Confirm your new Aesthetic OS email |
| Reauthentication | `reauthentication.html` | Your Aesthetic OS confirmation code |

## Apply them
Supabase only allows custom templates once a custom email sender (SMTP) is set up.
1. **Authentication → Emails → SMTP Settings:** turn on custom SMTP.
   - *No domain:* Gmail. `smtp.gmail.com`, port `465`, user = your Gmail address, password = a Google **App password** (Google Account → Security → 2-Step Verification → App passwords). Sender name: `Aesthetic OS`. Allows roughly 500 emails a day.
   - *With your own domain:* Resend. `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, sender `hello@yourdomain.com`.
2. **Authentication → Emails → Templates:** for each row above, paste the subject and the file's full HTML.
3. **Authentication → Rate Limits:** raise "emails sent per hour" (e.g. 30).

The emails show both a one-tap link and a 6-digit code (`{{ .Token }}`). The app accepts either: the link works on any device, and the code can be typed on the sign-in screen.
