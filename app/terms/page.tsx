import { LegalPage, OPERATOR } from "@/components/legal";

export const metadata = { title: "Terms" };

export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="7 November 2026">
      <p>These terms are between you and {OPERATOR.name}. By using Aesthetic OS you agree to them.</p>
      <h2>Your content</h2>
      <p>You own everything you create. You give us permission to store and process it only to run the service for you. You&apos;re responsible for having the rights to images you upload and for your clients&apos; consent before sharing their photos or words.</p>
      <h2>Advertising rules and Muse</h2>
      <p>Muse flags common risky health and beauty claims and missing disclosures for your region. It&apos;s a helpful safety net, not legal advice, and it can miss things. You&apos;re responsible for what you publish and for following your local advertising, licensing and professional rules. Muse never provides medical advice.</p>
      <h2>Acceptable use</h2>
      <ul>
        <li>No unlawful, misleading or harmful content, and no content that infringes others&apos; rights.</li>
        <li>No storing medical records, diagnoses or payment card data.</li>
        <li>No attempts to access other accounts or disrupt the service.</li>
        <li>Follow the terms of each social platform you connect.</li>
      </ul>
      <h2>Fonts and generated assets</h2>
      <p>Brand fonts are licensed under the SIL Open Font License and are free for commercial use. Logo concepts are generated from your inputs. Check trademark availability before relying on a name or logo.</p>
      <h2>Availability and liability</h2>
      <p>We work hard to keep Aesthetic OS available and secure, but it&apos;s provided “as is”. To the extent the law allows, our liability is limited to the amount you paid in the 12 months before the claim. Nothing limits liability that can&apos;t be limited by law, or your statutory consumer rights.</p>
      <h2>Ending</h2>
      <p>You can delete your account at any time in Settings. We may suspend accounts that break these terms.</p>
      <h2>Contact</h2>
      <p>{OPERATOR.contact}</p>
    </LegalPage>
  );
}
