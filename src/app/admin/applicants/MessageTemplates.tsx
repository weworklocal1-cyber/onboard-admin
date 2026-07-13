"use client";

import React from 'react';
import styles from './applicants.module.css';

export type TemplateKey = 'initial' | 'followup' | 'rejected' | 'confirmed';

export const templates: Record<TemplateKey, { subject: string; body: string }> = {
  initial: {
    subject: 'Your Internship Application - Next Steps',
    body: `Hi {{name}},\n\nThank you for applying to our internship program. We have received your application and will review it shortly. Stay tuned for updates.\n\nBest regards,\nLocawala Team`,
  },
  followup: {
    subject: 'Follow‑up on Your Internship Application',
    body: `Hi {{name}},\n\nWe wanted to follow up regarding your internship application. Please let us know if you have any questions.\n\nBest,\nLocawala Team`,
  },
  rejected: {
    subject: 'Internship Application Update',
    body: `Hi {{name}},\n\nThank you for your interest. After careful consideration, we have decided not to move forward with your application at this time. We wish you all the best in your future endeavors.\n\nRegards,\nLocawala Team`,
  },
  confirmed: {
    subject: 'Internship Application - Confirmed!',
    body: `Hi {{name}},\n\nCongratulations! Your internship application has been confirmed. We are excited to have you on board. Please check your email for next steps and onboarding details.\n\nBest regards,\nLocawala Team`,
  },
};

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
