"use client";

import React from 'react';
import styles from './applicants.module.css';
import { templates } from './MessageTemplates';

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  certificate_id?: string;
  motivation?: string;
  resume_url?: string;
  status?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
};

type Props = {
  applications: Application[];
};
export default function ApplicantTable({ applications }: Props) {
  const defaultTemplateKey = 'initial';
  const handleSendEmail = (app: Application) => {
    const tmpl = templates[defaultTemplateKey];
    const subject = encodeURIComponent(tmpl.subject);
    const body = encodeURIComponent(
      tmpl.body.replace(/{{name}}/g, app.full_name)
    );
    const mailto = `mailto:${app.email}?subject=${subject}&body=${body}`;
    window.open(mailto, '_blank');
  };

  const whatsappLink = (app: Application) => {
    if (!app.phone) return '#';
    const tmpl = templates[defaultTemplateKey];
    const text = encodeURIComponent(
      tmpl.body.replace(/{{name}}/g, app.full_name)
    );
    const cleanPhone = app.phone.replace(/[^\d]/g, '');
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <>
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Certificate</th>
              <th>Status</th>
              <th>Applied On</th>
              <th>WhatsApp</th>
              <th>Resume</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="group hover:bg-gray-50/80 transition">
                <td>{app.full_name}</td>
                <td>{app.email}</td>
                <td>{app.phone || '—'}</td>
                <td>{app.certificate_id || '—'}</td>
                <td>{app.status || 'pending'}</td>
                <td>{new Date(app.created_at).toLocaleDateString()}</td>
                <td>
                  {app.phone ? (
                    <a href={whatsappLink(app)} target="_blank" rel="noopener noreferrer">
                      <button className={styles.button}>WhatsApp</button>
                    </a>
                  ) : (
                    <span style={{ color: '#888' }}>N/A</span>
                  )}
                </td>
                <td>
                  {app.resume_url ? (
                    <a
                      href={app.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      View
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <button className={styles.button} onClick={() => handleSendEmail(app)}>
                    Send Email
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
