"use client";

import React, { useEffect, useState } from 'react';
import ApplicantTable from './ApplicantTable';
import styles from './applicants.module.css';

type Application = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export default function ApplicantsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/academy/applications')
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
  }, []);

  const handleSendEmail = (app: Application) => {
    console.log('Sending email to', app.email);
    alert(`Email sent to ${app.email}`);
  };

  if (loading) return <div className={styles.loading}>Loading applicants…</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Internship Applicants</h1>
      <ApplicantTable applications={applications} onSend={handleSendEmail} />
    </div>
  );
}
