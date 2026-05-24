# Supabase custom SMTP (Resend)

Supabase's built-in SMTP is capped at ~2–4 emails/hour project-wide. That's
fine for a quick demo but trips immediately during real testing — the auth
logs surface it as `over_email_send_rate_limit` (HTTP 429: "email rate limit
exceeded"). The only way to raise the limit is to attach a real SMTP provider.
Resend is the simplest fit (free tier covers 100/day, 3,000/month, more than
enough for a single-user app).

## Steps

1. **Create a Resend account** at https://resend.com.

2. **(Optional but recommended) Verify a domain** at
   https://resend.com/domains so the "From" address can be something like
   `auth@yourdomain.com`. If you skip, Resend lets you send from
   `onboarding@resend.dev` while testing — fine for now, but real users will
   see that as the sender.

3. **Create an API key** at https://resend.com/api-keys. Save it somewhere
   safe; you'll paste it into Supabase next and won't be able to view it
   again from Resend.

4. **Paste SMTP settings into Supabase** at
   https://supabase.com/dashboard/project/stwmtvigdbtmmedevqip/auth/smtp.
   Toggle "Enable Custom SMTP" and use:

   | Field          | Value                                                  |
   | -------------- | ------------------------------------------------------ |
   | Host           | `smtp.resend.com`                                      |
   | Port           | `465`                                                  |
   | Username       | `resend`                                               |
   | Password       | your Resend API key                                    |
   | Sender email   | `auth@yourdomain.com` (verified) or `onboarding@resend.dev` |
   | Sender name    | `Workout Tracker`                                      |

   Save.

5. **Wait ~1 minute** for the existing rate-limit window to clear, then send
   yourself another sign-in code.

## After the switch

The default project-wide limit jumps to **30 new users/hour**. You can raise
it further at
https://supabase.com/dashboard/project/stwmtvigdbtmmedevqip/auth/rate-limits
if needed — but for a personal app, the default is more than enough.

## Alternatives

If Resend ever stops working out: Postmark, Brevo (free tier 300/day), or AWS
SES all use the same SMTP-host + API-key pattern. Just swap the host/port and
re-save in Supabase.
