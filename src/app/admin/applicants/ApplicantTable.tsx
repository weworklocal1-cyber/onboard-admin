"use client";

import React, { useState } from 'react';
import styles from './applicants.module.css';
import { templates, type TemplateKey } from './MessageTemplates';

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
  onSend?: (app: Application) => void;
  onStatusChange?: () => void;
};

export default function ApplicantTable({ applications, onSend, onStatusChange }: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleWhatsAppClick = async (app: Application) => {
    if (!app.phone) return;
    const tmpl = templates[getTemplateKey(app.status)];
    let text = tmpl.body.replace(/{{name}}/g, app.full_name);

    if (app.status === 'confirmed') {
      try {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('adminAuthToken') : null;
        const res = await fetch('/api/academy/cohorts/confirmed', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.whatsappGroupLink) {
            text += `\n\nJoin our WhatsApp group: ${json.whatsappGroupLink}`;
          }
        }
      } catch {
        // ignore
      }
    }

    const cleanPhone = app.phone.replace(/[^\d]/g, '');
    const href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(href, '_blank');
  };

  const handleConfirm = async (app: Application) => {
    if (!showConfirmDialog(app.status)) return;
    setConfirmingId(app.id);
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('adminAuthToken') : null;
      if (!token) {
        alert('Admin session not found. Please log in again.');
        return;
      }

      const res = await fetch(`/api/academy/applications/${app.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "confirmed" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('[confirm] failed:', data);
        alert(data.error || 'Failed to confirm applicant');
        return;
      }

      onStatusChange?.();
    } catch (err) {
      console.error('[confirm] unexpected error:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  const getTemplateKey = (status?: string): TemplateKey => {
    switch (status) {
      case 'confirmed':
      case 'accepted':
        return 'confirmed';
      case 'rejected':
        return 'rejected';
      case 'reviewed':
        return 'followup';
      default:
        return 'initial';
    }
  };

  const handleSendEmail = (app: Application) => {
    const tmpl = templates[getTemplateKey(app.status)];
    const subject = encodeURIComponent(tmpl.subject);
    const body = encodeURIComponent(
      tmpl.body.replace(/{{name}}/g, app.full_name)
    );
    const mailto = `mailto:${app.email}?subject=${subject}&body=${body}`;
    window.open(mailto, '_blank');
    if (onSend) onSend(app);
  };

  const statusColor = (status?: string): React.CSSProperties => {
    switch (status) {
      case 'confirmed': return { background:'#dcfce7', color:'#166534' };
      case 'accepted': return { background:'#dbeafe', color:'#1e40af' };
      case 'rejected': return { background:'#fee2e2', color:'#991b1b' };
      case 'reviewed': return { background:'#fef3c7', color:'#92400e' };
      default: return { background:'#f3f4f6', color:'#374151' };
    }
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
                <td>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    ...statusColor(app.status)
                  }}>
                    {app.status || 'pending'}
                  </span>
                </td>
                <td>{new Date(app.created_at).toLocaleDateString()}</td>
                <td>
                  {app.phone ? (
                    <button className={styles.button} onClick={() => handleWhatsAppClick(app)}>
                      WhatsApp
                    </button>
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
                <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className={styles.button} onClick={() => handleSendEmail(app)}>
                    Send Email
                  </button>
                  {app.status !== 'confirmed' && (
                    <button
                      data-testid="confirm-applicant-btn"
                      className={styles.button}
                      style={{ background: '#166534', color: '#fff', border: '2px solid #fff' }}
                      onClick={() => handleConfirm(app)}
                      disabled={confirmingId === app.id}
                    >
                      {confirmingId === app.id ? 'Confirming…' : 'Confirm'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function showConfirmDialog(status?: string): boolean {
  if (status === 'confirmed') return false;
  return window.confirm(`Confirm this applicant? They will be added to the group and receive WhatsApp & email notifications.`);
}

