"use client";

import React, { useEffect, useState } from 'react';
import ApplicantTable from '../applicants/ApplicantTable';
import styles from '../applicants/applicants.module.css';

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

export default function InternshipApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Retrieve auth token from session storage (client‑side only)
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('adminAuthToken') : null;

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/academy/applications', { headers });
        if (res.status === 401) {
          setError('Unauthorized – please log in again.');
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch applications');
        const json = await res.json();
        setApplications(json.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const handleSend = (app: Application) => {
    // TODO: integrate email/WhatsApp template handling
    alert(`Send email to ${app.email}`);
  };

  if (loading) return <div className="p-8 text-center text-gray-600">Loading applications…</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Internship Applications</h1>
      <ApplicantTable applications={applications} onSend={handleSend} />
    </div>
  );
}
