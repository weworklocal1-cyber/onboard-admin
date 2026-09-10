"use client";

import React, { useState, useEffect } from 'react';
import styles from './applicants.module.css';
import { templates as fallbackTemplates, type TemplateKey } from './MessageTemplates';

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

type DbTemplate = { id: string; key: string; name: string; subject?: string | null; body: string; channel: string; tags: string[]; is_active: boolean };

export default function ApplicantTable({ applications, onSend, onStatusChange }: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [dbTemplates, setDbTemplates] = useState<DbTemplate[] | null>(null);
  const [waOpenId, setWaOpenId] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('adminAuthToken') : null;
    const url = token ? '/api/admin/message-templates?category=applicants' : '/api/admin/message-templates/public?category=applicants';
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(url, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (j?.templates) setDbTemplates(j.templates.filter((t: DbTemplate) => t.is_active));
      })
      .catch(() => {});
  }, []);

  const getDbTemplate = (key: TemplateKey): DbTemplate | null => {
    if (!dbTemplates) return null;
    return dbTemplates.find((t) => t.key === key) || null;
  };

  const applyTags = (body: string, app: Application, extra: Record<string, string> = {}): string => {
    let text = body;
    const map: Record<string, string> = {
      "{{name}}": app.full_name,
      "{{email}}": app.email,
      "{{phone}}": app.phone || "",
      "{{certificate_id}}": app.certificate_id || "",
      "{{internship}}": extra.internship || "Mobile Application Development",
      "{{course}}": extra.course || "Mobile Application Development",
      "{{fee}}": extra.fee || "499",
      "{{payment_link}}": extra.payment_link || `${typeof window !== 'undefined' ? window.location.origin : ""}/academy/courses`,
      "{{playstore_link}}": extra.playstore_link || (process.env.NEXT_PUBLIC_PLAYSTORE_URL as string) || "https://play.google.com/store/apps/details?id=com.localwala.food",
      "{{whatsapp_group_link}}": extra.whatsapp_group_link || "",
      "{{city}}": extra.city || "",
      ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`{{${k}}}`, v])),
    };
    for (const [tag, val] of Object.entries(map)) {
      text = text.split(tag).join(val);
    }
    return text;
  };

  const handleWhatsAppClick = async (app: Application, templateKey?: string) => {
    if (!app.phone) return;
    const key = (templateKey as TemplateKey) || getTemplateKey(app.status);
    const dbTmpl = getDbTemplate(key);
    const fallback = fallbackTemplates[key];
    let text = dbTmpl ? dbTmpl.body : fallback.body;

    const extra: Record<string, string> = {};
    // try to fetch whatsapp group link for confirmed
    if (key === 'confirmed' || app.status === 'confirmed') {
      try {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('adminAuthToken') : null;
        const res = await fetch('/api/academy/cohorts/confirmed', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.whatsappGroupLink) extra.whatsapp_group_link = json.whatsappGroupLink;
        }
      } catch {}
    }
    // Try to fetch payment link / fee from settings if available
    try {
      const res = await fetch('/api/admin/message-templates/public?category=applicants');
      // fee could be stored in settings - fallback
    } catch {}

    text = applyTags(text, app, extra);

    const cleanPhone = app.phone.replace(/[^\d]/g, '');
    const href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(href, '_blank');
    setWaOpenId(null);
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

  const handleSendEmail = (app: Application, templateKey?: string) => {
    const key = (templateKey as TemplateKey) || getTemplateKey(app.status);
    const dbTmpl = getDbTemplate(key);
    const fallback = fallbackTemplates[key];
    const subjectRaw = dbTmpl?.subject || fallback.subject;
    const bodyRaw = dbTmpl ? dbTmpl.body : fallback.body;
    const subject = encodeURIComponent(applyTags(subjectRaw || "", app));
    const body = encodeURIComponent(applyTags(bodyRaw, app));
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
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button className={styles.button} onClick={() => setWaOpenId(waOpenId === app.id ? null : app.id)}>
                        WhatsApp {waOpenId === app.id ? '▲' : '▼'}
                      </button>
                      {waOpenId === app.id && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: '8px', minWidth: '220px', marginTop: '6px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Template:</div>
                          {(dbTemplates && dbTemplates.length > 0 ? dbTemplates : Object.entries(fallbackTemplates).map(([k, v]) => ({ key: k, name: k, body: v.body, subject: v.subject } as any))).map((t: any) => (
                            <button
                              key={t.key}
                              onClick={() => handleWhatsAppClick(app, t.key)}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '8px', fontSize: '13px', color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <span style={{ fontWeight: 600 }}>{t.name || t.key}</span>
                              <span style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '6px' }}>{t.key}</span>
                              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.body.slice(0, 60).replace(/\n/g, ' ')}...</div>
                            </button>
                          ))}
                          <div style={{ borderTop: '1px solid #f3f4f6', marginTop: '6px', paddingTop: '6px' }}>
                            <a href="/admin/applicants/templates" style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600, padding: '4px 8px', display: 'block' }}>⚙️ Manage Templates →</a>
                          </div>
                        </div>
                      )}
                    </div>
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

