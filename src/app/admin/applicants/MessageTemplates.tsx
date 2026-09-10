"use client";

import React from 'react';
import styles from './applicants.module.css';

export type TemplateKey = 'initial' | 'followup' | 'rejected' | 'confirmed';

export const templates: Record<TemplateKey, { subject: string; body: string }> = {
  initial: {
    subject: 'Your Internship Application - Next Steps',
    body: `Hi {{name}},

Thank you for applying to our internship program. We have received your application and will review it shortly. Stay tuned for updates.

Best regards,
Locawala Team`,
  },
  followup: {
    subject: 'Follow‑up on Your Internship Application',
    body: `Hi {{name}},

We wanted to follow up regarding your internship application. Please let us know if you have any questions.

Best,
Locawala Team`,
  },
  rejected: {
    subject: 'Internship Application Update',
    body: `Hi {{name}},

Thank you for your interest. After careful consideration, we have decided not to move forward with your application at this time. We wish you all the best in your future endeavors.

Regards,
Locawala Team`,
  },
  confirmed: {
    subject: 'Internship Application - Confirmed!',
    body: `Hi {{name}},

Congratulations! Your internship application has been confirmed. We are excited to have you on board. Please check your email for next steps and onboarding details.

Best regards,
Locawala Team`,
  },
};

// Available tags for applicant messages - used in admin templates page
export const AVAILABLE_TAGS = [
  { tag: "{{name}}", label: "Name" },
  { tag: "{{email}}", label: "Email" },
  { tag: "{{phone}}", label: "Phone" },
  { tag: "{{internship}}", label: "Internship" },
  { tag: "{{course}}", label: "Course" },
  { tag: "{{fee}}", label: "Fee" },
  { tag: "{{payment_link}}", label: "Payment Link" },
  { tag: "{{playstore_link}}", label: "PlayStore Link" },
  { tag: "{{whatsapp_group_link}}", label: "WhatsApp Group" },
  { tag: "{{certificate_id}}", label: "Certificate ID" },
  { tag: "{{city}}", label: "City" },
];

// Helper to replace tags with applicant data
export function applyTemplateTags(body: string, data: Record<string, string>): string {
  let out = body;
  for (const [key, value] of Object.entries(data)) {
    const tag = `{{${key}}}`;
    out = out.split(tag).join(value || "");
    // also support {{name}} style directly
    out = out.split(`{{${key}}}`).join(value || "");
  }
  // Legacy {{name}} -> full_name mapping
  if (data.full_name) out = out.split("{{name}}").join(data.full_name);
  if (data.name) out = out.split("{{name}}").join(data.name);
  return out;
}

type Props = {
  selected: string;
  onChange: (key: string) => void;
};

export default function MessageTemplates({ selected, onChange }: Props) {
  return (
    <div className={styles.templates}>
      <label className={styles.label} htmlFor="template-select">
        Message Template:
      </label>
      <select
        id="template-select"
        className={styles.select}
        value={selected}
        onChange={(e) => onChange(e.target.value as TemplateKey)}
      >
        <option value="initial">Initial Invitation</option>
        <option value="followup">Follow‑up</option>
        <option value="rejected">Rejected</option>
        <option value="confirmed">Confirmed</option>
      </select>
    </div>
  );
}
