"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ApplicantTable from './ApplicantTable';
import styles from './applicants.module.css';

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

export default function ApplicantsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadApplications = () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('adminAuthToken') : null;
    if (!token) {
      router.replace('/admin');
      return;
    }

    fetch('/api/academy/applications', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch applicants');
        return res.json();
      })
      .then((data) => {
        setApplications(data.applications || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleSendEmail = (app: Application) => {
    console.log('Sending email to', app.email);
    alert(`Email sent to ${app.email}`);
  };

  if (loading) return <div className={styles.loading}>Loading applicants…</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 className={styles.title} style={{ marginBottom: 0 }}>Internship Applicants</h1>
          <a href="/admin/applicants/interns-with-certificates">
          <button className={styles.button} style={{ background: '#059669' }}>
            View Interns With Certificates
          </button>
        </a>
      </div>
      <ApplicantTable applications={applications} onSend={handleSendEmail} onStatusChange={loadApplications} />
    </div>
  );
}
