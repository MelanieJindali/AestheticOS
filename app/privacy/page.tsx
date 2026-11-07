import { LegalPage, OPERATOR } from "@/components/legal";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="7 November 2026">
      <p>Aesthetic OS is operated by {OPERATOR.name} ({OPERATOR.address}), the data controller for your account data. Contact: {OPERATOR.contact}.</p>
      <h2>The short version</h2>
      <ul>
        <li>We collect only what each feature needs. No feature needs your clients&apos; names, contact details or health information.</li>
        <li>Before anything is sent to an AI provider, names, contact details, addresses, dates of birth and health details are removed automatically.</li>
        <li>No advertising trackers. We only use cookies to keep you signed in.</li>
        <li>You can export everything or permanently delete your account at any time from Settings.</li>
      </ul>
      <h2>What we collect and why</h2>
      <ul>
        <li><b>Account</b>: email address, sign-in and two-step verification data. Used to secure your account (contract).</li>
        <li><b>Business profile</b>: business name, services, prices, town/city, brand choices, goals. Used to provide the service (contract).</li>
        <li><b>Content</b>: drafts, captions, images you upload (with location and camera metadata removed), schedules. Used to provide the service (contract).</li>
        <li><b>Client consent records</b>: a client alias you choose (never a full name), what they agreed to, their signature and timestamps. Used to evidence consent for client images (legal obligation / legitimate interest). Photos of treatment results can be health data, so we only process them with your client&apos;s explicit consent.</li>
        <li><b>Connected social accounts</b>: encrypted access tokens with the minimum posting/insights permissions. Used only to publish what you approve.</li>
        <li><b>Activity log</b>: actions such as sign-ins, publishes and AI requests (never content). Used for your security and transparency (legitimate interest).</li>
      </ul>
      <h2>AI processing</h2>
      <p>If AI features are enabled, a redacted version of your request plus your business profile is sent to our AI provider (Anthropic) under terms where your data isn&apos;t used to train models. Muse never uses client-related data unless you switch that on, and even then it only sees aliases. Muse doesn&apos;t make decisions with legal or similarly significant effects. You approve everything before it&apos;s published.</p>
      <h2>Sub-processors</h2>
      <ul>
        <li>Supabase: database, authentication and file storage (region chosen by the operator).</li>
        <li>Hosting provider (e.g. Vercel / Netlify / Cloudflare): application hosting.</li>
        <li>Anthropic: AI text generation (only if enabled).</li>
        <li>Social platforms you connect (Meta, TikTok, Pinterest, LinkedIn, Google): only to publish your posts.</li>
        <li>Email provider (e.g. Resend): sign-in codes and reminders (only if enabled).</li>
      </ul>
      <p>Where data is transferred outside the UK/EEA, we rely on adequacy decisions or Standard Contractual Clauses.</p>
      <h2>Retention</h2>
      <p>We keep your data while your account is open. When you delete your account, your data, images and activity log are permanently deleted and social connections are revoked immediately. Encrypted backups expire within 30 days. Consent records expire on the date your client agreed to.</p>
      <h2>Your rights</h2>
      <p>Depending on where you live (GDPR, UK GDPR, CCPA/CPRA, PIPEDA, the Australian Privacy Act, LGPD and others), you can access, correct, export, delete or restrict use of your data, and object to processing. Use Settings → Export / Delete, or email {OPERATOR.contact}. We don&apos;t sell or share personal information for cross-context behavioural advertising. You can complain to your local data protection authority.</p>
      <h2>Your clients&apos; data</h2>
      <p>For data about your own clients (e.g. consent records and treatment photos), you are the controller and we act as your processor. Please don&apos;t store medical records, diagnoses or treatment notes in Aesthetic OS. If you&apos;re a US healthcare provider covered by HIPAA, protected health information must not be stored here unless the operator has signed a Business Associate Agreement with you.</p>
      <h2>Children</h2>
      <p>Aesthetic OS is for business owners aged 18+.</p>
      <h2>Security</h2>
      <p>TLS encryption in transit, encryption at rest, mandatory two-step verification, row-level data isolation between accounts, encrypted tokens and an append-only activity log.</p>
    </LegalPage>
  );
}
