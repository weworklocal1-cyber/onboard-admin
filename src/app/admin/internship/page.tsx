"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const loadApplications = async () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('adminAuthToken') : null;
    if (!token) {
      router.replace('/admin');
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/academy/applications', { headers });
      if (res.status === 401) {
        router.replace('/admin');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch applications');
      const json = await res.json();
      setApplications(json.applications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleSend = (app: Application) => {
    alert(`Send email to ${app.email}`);
  };

  if (loading) return <div className="p-8 text-center text-gray-600">Loading applications…</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 className="text-2xl font-bold mb-0">Internship Applications</h1>
        <a href="/admin/applicants/interns-with-certificates">
          <button style={{ background: '#059669', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
            View Interns With Certificates
          </button>
        </a>
      </div>
      <ApplicantTable applications={applications} onSend={handleSend} onStatusChange={loadApplications} />
    </div>
  );
}
