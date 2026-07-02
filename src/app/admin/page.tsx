"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, X, Check, BookOpen } from "lucide-react";

const Icons = {
  Eye: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
  ),
  EyeOff: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.292-4.292M3 3l18 18"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  ),
  LogOut: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
  ),
  Copy: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
  ),
Whatsapp: ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.03 1.99C6.51 1.99 2 6.5 2 12.02c0 2.12.55 4.13 1.51 5.89L0 24l6.38-.95c1.68.91 3.63 1.42 5.65 1.42 5.52 0 10.03-4.51 10.03-10.03S17.55 1.99 12.03 1.99zM12 20.14c-1.87 0-3.6-.5-5.1-1.37l-.36-.22-3.76.55.55-3.69-.23-.36c-.86-1.4-.98-2.93-.98-3.6 0-4.6 3.74-8.34 8.34-8.34 4.6 0 8.34 3.74 8.34 8.34 0 4.6-3.74 8.34-8.34 8.34zm4.12-6.12c-.22-.11-.9-.44-1.08-.49-.18-.05-.32-.08-.46.11-.14.19-.55.68-.67.82-.12.14-.24.15-.46.05-.22-.11-.9-.44-1.08-.49-.18-.05-.32-.08-.46.11-.14.19-.55.68-.67.82-.12.14-.24.15-.46.05-.22-.11-.9-.44-1.08-.49-.18-.05-.32-.08-.46.11-.14.19-.55.68-.67.82-.12.14-.24.15-.46.05-.22-.11-.9-.44-1.08-.49-.18-.05-.32-.08-.46.11-.14.19-.55.68-.67.82-.12.14-.24.15-.46.05-.22-.11z"/></svg>
  ),
  ChevronLeft: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
  ),
};

type Row = Record<string, any>;

type TimeFilter = "all" | "today" | "week" | "month" | "year";
type TableFilter = "all" | string;
type Tab = "leads" | "activity" | "team" | "academy";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-50 text-purple-700 border-purple-200",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
  viewer: "bg-gray-50 text-gray-700 border-gray-200",
};

const TABLE_NAMES: Record<string, string> = {
  all: "All Tables",
  restaurant_partners: "Restaurant Partners",
  delivery_partners: "Delivery Partners",
  careers: "Careers",
  contact_leads: "Contact Leads",
};

const TABLE_COLORS: Record<string, string> = {
  restaurant_partners: "bg-orange-50 text-orange-700 border-orange-200",
  delivery_partners: "bg-blue-50 text-blue-700 border-blue-200",
  careers: "bg-purple-50 text-purple-700 border-purple-200",
  contact_leads: "bg-green-50 text-green-700 border-green-200",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-yellow-50 text-yellow-700 border-yellow-200",
  qualified: "bg-purple-50 text-purple-700 border-purple-200",
  converted: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-gray-50 text-gray-700 border-gray-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const HIDE_FIELDS = new Set(["id", "table", "rawTimestamp", "raw_timestamp", "password", "admin_password"]);

const TIME_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "year", label: "Last Year" },
];

const LABEL_OVERRIDE: Record<string, string> = {
  owner_name: "Owner Name", mobile: "Mobile", whatsapp: "WhatsApp", email: "Email",
  restaurant_name: "Restaurant Name", restaurant_type: "Restaurant Type",
  state: "State", district: "District", city: "City", locality: "Locality",
  landmark: "Landmark", full_address: "Full Address", pincode: "Pincode",
  latitude: "Latitude", longitude: "Longitude", primary_locality: "Primary Locality",
  additional_localities: "Additional Localities", delivery_radius: "Delivery Radius",
  fssai_number: "FSSAI Number", number_of_branches: "No. of Branches",
  average_daily_orders: "Avg Daily Orders", delivery_model: "Delivery Model",
  additional_notes: "Additional Notes", full_name: "Full Name",
  vehicle_type: "Vehicle Type", availability: "Availability",
  working_model: "Working Model", salary_preference: "Salary Preference",
  expected_income: "Expected Income", preferred_working_areas: "Preferred Areas",
  max_travel_distance: "Max Travel Dist.", qualification: "Qualification",
  experience: "Experience", current_company: "Current Company",
  current_salary: "Current Salary", expected_salary: "Expected Salary",
  position_applying_for: "Position", preferred_location: "Preferred Location",
  resume_link: "Resume Link", portfolio_link: "Portfolio Link",
  linkedin_profile: "LinkedIn", portfolio_website: "Portfolio Website",
  cover_letter: "Cover Letter", employment_type: "Employment Type",
  position: "Position", resumename: "Resume Name", salary_range: "Salary Range",
  name: "Name", subject: "Subject", message: "Message", timestamp: "Date",
  rejection_reason: "Rejection Reason",
};

function formatLabel(key: string): string {
  return LABEL_OVERRIDE[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(key: string, value: any): React.ReactNode {
  if (value == null || value === "") return <span className="text-gray-400">—</span>;
  if (Array.isArray(value)) return value.join(", ");
  if (key === "email") {
    return <a href={`mailto:${value}`} className="text-blue-600 hover:text-blue-800 hover:underline">{value}</a>;
  }
  if (key === "mobile" || key === "whatsapp") {
    return <a href={`tel:${value}`} className="text-blue-600 hover:text-blue-800 hover:underline">{value}</a>;
  }
  if (["resume_link", "portfolio_link", "linkedin_profile", "portfolio_website"].includes(key)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
        {value.length > 40 ? value.slice(0, 40) + "..." : value} <Icons.ExternalLink className="w-3 h-3" />
      </a>
    );
  }
  if (key === "latitude" || key === "longitude") {
    return value ? (
      <a href={`https://www.google.com/maps?q=${value}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
        {value} <Icons.ExternalLink className="w-3 h-3" />
      </a>
    ) : "—";
  }
  return String(value);
}

function maskMobile(mobile: string) {
  if (!mobile || mobile === "—") return "—";
  if (mobile.length <= 4) return mobile;
  return `${mobile.slice(0, 2)}****${mobile.slice(-2)}`;
}

function formatDate(val: any) {
  if (!val) return "—";
  try { return new Date(val).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return String(val); }
}

function formatDateShort(val: any) {
  if (!val) return "—";
  try { return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return String(val); }
}

function formatActivityDate(val: any) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return String(val); }
}

type WhatsappTemplateFn = (data: Row) => string;

const WHATSAPP_TEMPLATES: Record<string, WhatsappTemplateFn> = {
  restaurant_partners: (data: any) => `Hello ${data.owner_name || data.restaurant_name || "there"}! Thank you for your interest in LocalWala Food. We're excited to partner with "${data.restaurant_name || ""}" and will be in touch soon to discuss the partnership details. Our team will contact you at ${data.whatsapp || data.mobile || ""} for next steps.`,
  restaurant_partners_followup: (data: any) => `Hello ${data.owner_name || data.restaurant_name || "there"}! This is a follow-up regarding your restaurant partnership inquiry with "${data.restaurant_name || ""}" on LocalWala Food. We wanted to check if you have any questions and discuss the next steps.`,
  restaurant_partners_rejected: (data: any) => `Hello ${data.owner_name || data.restaurant_name || "there"}! Thank you for your interest in partnering with LocalWala Food. Unfortunately, we're unable to proceed with "${data.restaurant_name || ""}" at this time due to certain criteria not being met. Feel free to reach out if you have any questions.`,
  delivery_partners: (data: any) => `Hello ${data.full_name || "there"}! Thanks for applying to be a delivery partner with LocalWala Food. We've received your application and will review it shortly. We'll contact you at ${data.whatsapp || data.mobile || ""} regarding the next steps.`,
  delivery_partners_followup: (data: any) => `Hello ${data.full_name || "there"}! Following up on your delivery partner application. We'd like to schedule an interview and document verification. Please let us know your availability.`,
  delivery_partners_rejected: (data: any) => `Hello ${data.full_name || "there"}! Thank you for applying to be a delivery partner. After careful review, we're unable to move forward with your application at this time. We appreciate your interest in LocalWala Food.`,
  careers: (data: any) => `Hello ${data.full_name || "there"}! Thank you for applying for the ${data.position_applying_for || "position"} role at LocalWala Food. We've received your application and our HR team will review it. We'll reach out to you at ${data.whatsapp || data.mobile || ""} for further discussion.`,
  careers_followup: (data: any) => `Hello ${data.full_name || "there"}! Following up on your application for ${data.position_applying_for || "the position"}. We'd like to schedule an interview. Could you please confirm your availability for this week?`,
  careers_rejected: (data: any) => `Hello ${data.full_name || "there"}! Thank you for your interest in the ${data.position_applying_for || "position"} role at LocalWala Food. After reviewing your profile, we've decided to move forward with other candidates. We'll keep your resume for future opportunities.`,
  contact_leads: (data: any) => `Hello ${data.name || "there"}! Thank you for reaching out to LocalWala Food. We've received your ${data.subject ? `inquiry about "${data.subject}"` : "message"} and will get back to you shortly.`,
  contact_leads_followup: (data: any) => `Hello ${data.name || "there"}! Following up on your inquiry about "${data.subject || "LocalWala Food"}". We'd be happy to provide more information. Please let us know how we can assist you.`,
};

function getWhatsappNumber(row: Row): string | null {
  return row.whatsapp || row.mobile || null;
}

function getWhatsappLink(row: Row, templateKey?: string): string {
  const phone = getWhatsappNumber(row);
  if (!phone) return "";
  let message = "";
  if (templateKey && WHATSAPP_TEMPLATES[templateKey]) {
    message = WHATSAPP_TEMPLATES[templateKey](row);
  } else if (row.table && WHATSAPP_TEMPLATES[row.table]) {
    message = WHATSAPP_TEMPLATES[row.table](row);
  }
  return `https://wa.me/${phone.replace("+", "").replace(/\s/g, "")}?text=${encodeURIComponent(message)}`;
}

const ROWS_PER_PAGE = 25;

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string | undefined; full_name: string; role: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("leads");
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [visibleMobile, setVisibleMobile] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<Record<string, string>>({});
  const [editingReason, setEditingReason] = useState<Record<string, string>>({});
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);

  const [activityLog, setActivityLog] = useState<Row[]>([]);
  const [team, setTeam] = useState<Row[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [addingUser, setAddingUser] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [whatsappDropdown, setWhatsappDropdown] = useState<string | null>(null);
  const [academyTab, setAcademyTab] = useState<"courses" | "modules" | "lessons" | "quizzes" | "questions">("courses");

  const isViewer = user?.role === "viewer";
  const isSuperAdmin = user?.role === "super_admin";

  const filteredActivityLog = useMemo(() => {
    let logs = activityLog;
    if (activityFilter !== "all") {
      logs = logs.filter((log) => log.action === activityFilter);
    }
    if (userFilter !== "all") {
      logs = logs.filter((log) => log.user_id === userFilter);
    }
    return logs;
  }, [activityLog, activityFilter, userFilter]);

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const log of activityLog) {
      if (!map.has(log.user_id)) {
        map.set(log.user_id, { id: log.user_id, name: log.user_name || "Unknown" });
      }
    }
    return Array.from(map.values());
  }, [activityLog]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) => Object.values(r).filter(v => typeof v === "string").join(" ").toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const paginatedRows = filteredRows.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [tableFilter, timeFilter, searchQuery]);

  const handleLogout = async () => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch("/api/admin/logout", { method: "POST", headers });
    } catch {}
    sessionStorage.removeItem("adminAuthToken");
    sessionStorage.removeItem("adminUser");
    setAuthed(false);
    setUser(null);
    setToken(null);
    setEmail("");
    setPassword("");
    setActiveTab("leads");
  };

  useEffect(() => {
    const checkSession = async () => {
      const storedToken = sessionStorage.getItem("adminAuthToken");
      const storedUser = sessionStorage.getItem("adminUser");
      if (storedToken && storedUser) {
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          headers["Authorization"] = `Bearer ${storedToken}`;
          const res = await fetch("/api/admin/me", { headers });
          if (res.ok) {
            const json = await res.json();
            setToken(storedToken);
            setUser(json.user);
            setAuthed(true);
          } else {
            sessionStorage.removeItem("adminAuthToken");
            sessionStorage.removeItem("adminUser");
          }
        } catch {
          // Fallback to local session in case of network issue
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setAuthed(true);
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tableFilter !== "all") params.set("table", tableFilter);
      if (timeFilter !== "all") params.set("filter", timeFilter);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/leads?${params}`, { headers });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setRows(json.data);
      setCount(json.count);
    } catch { setRows([]); setCount(0); }
    finally { setLoading(false); }
  };

  const fetchActivityLog = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/leads?table=activity_log", { headers });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setActivityLog(json.data);
    } catch { setActivityLog([]); }
    finally { setLoading(false); }
  };

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/team", { headers });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setTeam(json.data ?? []);
    } catch { setTeam([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (authed && activeTab === "leads") fetchLeads();
    if (authed && activeTab === "activity") fetchActivityLog();
    if (authed && activeTab === "team") fetchTeam();
  }, [authed, activeTab, tableFilter, timeFilter]);

  useEffect(() => {
    if (authed && activeTab === "activity" && (activityFilter !== "all" || userFilter !== "all")) {
      fetchActivityLog();
    }
  }, [activityFilter, userFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Login failed"); return; }
      sessionStorage.setItem("adminAuthToken", json.accessToken);
      sessionStorage.setItem("adminUser", JSON.stringify(json.user));
      setToken(json.accessToken);
      setUser(json.user);
      setAuthed(true);
    } catch { setError("Network error"); }
  };

  const toggleMobile = (id: string) => {
    setVisibleMobile((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleUpdateStatus = async (table: string, id: string) => {
    if (isViewer) return;
    const newStatus = editingStatus[id];
    const reason = editingReason[id] || "";
    if (!newStatus) return;
    setUpdatingRowId(id);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ table, id, status: newStatus, rejection_reason: newStatus === "rejected" ? reason : null }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error("Failed to update status");
      setRows((prev) =>
        prev.map((row) =>
          row.id === id && row.table === table
            ? { ...row, status: newStatus, rejection_reason: newStatus === "rejected" ? reason : null }
            : row
        )
      );
      alert("Lead updated successfully!");
    } catch (err) {
      alert("Error updating status: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUpdatingRowId(null);
    }
  };

  const handleDeleteLead = async (table: string, id: string) => {
    if (!isSuperAdmin) return;
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/leads", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ table, id }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error("Failed to delete");
      setRows((prev) => prev.filter((row) => !(row.id === id && row.table === table)));
      alert("Lead deleted successfully!");
    } catch (err) {
      alert("Error deleting lead: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError("");
    if (!newEmail || !newName) {
      setTeamError("Email and name are required");
      return;
    }
    setAddingUser(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: newEmail, full_name: newName, role: newRole }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setTeamError(json.error || "Failed to add user");
      } else {
        setShowAddUser(false);
        setNewEmail("");
        setNewName("");
        setNewRole("viewer");
        if (json.temp_password) {
          alert(`User created. Temporary password: ${json.temp_password}`);
        } else {
          alert("User added successfully");
        }
        fetchTeam();
      }
    } catch {
      setTeamError("Network error");
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (member: any) => {
    if (member.id === user?.id) {
      alert("You cannot remove yourself");
      return;
    }
    if (!confirm(`Remove ${member.full_name} (${member.email})?`)) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/team", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ id: member.id }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error("Failed");
      alert("User removed");
      fetchTeam();
    } catch (err) {
      alert("Error removing user: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRoleChange = async (member: any, role: string) => {
    if (member.id === user?.id && role !== "super_admin") {
      alert("You cannot change your own super_admin role");
      return;
    }
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ id: member.id, role }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error("Failed");
      setTeam((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
    } catch (err) {
      alert("Error updating role: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch {}
  };

  const tableCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.table] = (c[r.table] || 0) + 1;
    return c;
  }, [rows]);

  const stats = useMemo(() => {
    const s: Record<string, number> = { all: count };
    for (const r of rows) s[r.table] = (s[r.table] || 0) + 1;
    return s;
  }, [rows, count]);

  if (loading && !authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">LocalWala Food</p>
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-100">{error}</div>}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none bg-gray-50" autoFocus />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none bg-gray-50" />
          <button type="submit" className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">LW</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">LocalWala Leads</h1>
                <p className="text-xs text-gray-500">Manage your business leads</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
                <div className="w-7 h-7 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{user?.full_name?.charAt(0)?.toUpperCase() || "U"}</span>
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">{user?.full_name}</div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded-full border inline-block ${ROLE_COLORS[user?.role || "viewer"] || ROLE_COLORS.viewer}`}>
                    {user?.role?.replace("_", " ")}
                  </div>
                </div>
              </div>
              <button onClick={fetchLeads} disabled={loading}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                <Icons.RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-gray-500" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button onClick={handleLogout}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all shadow-sm">
                <Icons.LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "leads" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Leads
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "activity" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Activity Log
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("team")}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "team" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Team
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("academy")}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "academy" ? "border-academy-primary text-academy-primary" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Academy
            </button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {activeTab === "leads" ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs font-medium text-gray-500 mb-1">Total Leads</div>
                <div className="text-3xl font-bold text-gray-900">{count}</div>
              </div>
              {Object.entries(TABLE_NAMES).filter(([k]) => k !== "all").map(([key]) => (
                <div key={key} className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer ${tableFilter === key ? "ring-2 ring-gray-900 border-gray-300" : "border-gray-100"}`}
                  onClick={() => setTableFilter(key as TableFilter)}>
                  <div className="text-xs font-medium text-gray-500 mb-1 truncate">{TABLE_NAMES[key]}</div>
                  <div className="text-3xl font-bold text-gray-900">{stats[key] || 0}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 justify-between">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TABLE_NAMES).map(([key, label]) => (
                    <button key={key} onClick={() => { setTableFilter(key as TableFilter); setCurrentPage(1); }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        tableFilter === key
                          ? "bg-gray-900 text-white border-gray-900 shadow-md"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}>
                      {label}
                      {key !== "all" && tableCounts[key] && <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${tableFilter === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>{tableCounts[key]}</span>}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <select value={timeFilter} onChange={(e) => { setTimeFilter(e.target.value as TimeFilter); setCurrentPage(1); }}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer hover:border-gray-300">
                    {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="mt-4 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search leads by name, email, phone, or any field..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-4 w-10"></th>
                      <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                      <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Table</th>
                      <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                      <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Name</th>
                      <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Mobile</th>
                      <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Email</th>
                      <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">Location</th>
                      {isSuperAdmin && <th className="px-5 py-4 font-semibold text-gray-600 text-xs uppercase tracking-wider w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 && (
                      <tr>
                        <td colSpan={isSuperAdmin ? 9 : 8} className="px-5 py-16 text-center">
                          <div className="text-gray-300 mb-2">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                          </div>
                          <p className="text-gray-500 font-medium">{loading ? "Loading leads..." : "No leads found"}</p>
                          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or search query</p>
                        </td>
                      </tr>
                    )}
                    {paginatedRows.map((r) => {
                      const isExpanded = expandedRows.has(r.id);
                      const allFields = Object.entries(r).filter(([key]) => !HIDE_FIELDS.has(key) && key !== "rawTimestamp");
                      return (
                        <Fragment key={`${r.table}-${r.id}`}>
                          <tr key={`${r.table}-${r.id}`}
                            className={`border-b border-gray-50 hover:bg-gray-50/80 transition-all cursor-pointer group ${isExpanded ? "bg-blue-50/30" : ""}`}
                            onClick={() => toggleExpand(r.id)}>
                            <td className="px-5 py-4">
                              <Icons.ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-90 text-gray-600" : "group-hover:text-gray-600"}`} />
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[r.status] || STATUS_COLORS.new}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${TABLE_COLORS[r.table] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                                {r.table?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-gray-600 whitespace-nowrap text-xs">{formatDateShort(r.timestamp)}</td>
                            <td className="px-5 py-4 text-gray-900 font-semibold">{r.name}</td>
                            <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700 font-mono text-xs">{visibleMobile.has(r.id) ? r.mobile : maskMobile(r.mobile)}</span>
                                <button onClick={() => toggleMobile(r.id)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg">
                                  {visibleMobile.has(r.id) ? <Icons.EyeOff className="w-3.5 h-3.5" /> : <Icons.Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs max-w-[200px] truncate" title={r.email}>{r.email}</td>
                            <td className="px-5 py-4 text-xs text-gray-600">
                              {r.state !== "—" ? <span className="font-medium">{r.state}</span> : "—"}
                              {r.state !== "—" && r.city !== "—" ? <span className="text-gray-400 mx-1">•</span> : ""}
                              {r.city}
                            </td>
                            {isSuperAdmin && (
                              <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleDeleteLead(r.table, r.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded-lg"
                                  title="Delete lead"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </td>
                            )}
                          </tr>
{isExpanded && (
                             <tr key={`${r.table}-${r.id}-detail`} className="bg-gradient-to-r from-gray-50 to-white">
                               <td colSpan={isSuperAdmin ? 9 : 8} className="px-5 py-6">
                                 <div className="flex items-center justify-between mb-4">
                                   <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Full Details</h3>
                                   <div className="flex items-center gap-2">
                                     {getWhatsappNumber(r) && (
                                       <div className="relative">
                                         <button
                                           onClick={(e) => { e.stopPropagation(); setWhatsappDropdown(whatsappDropdown === r.id ? null : r.id); }}
                                           className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-all"
                                         >
                                           <Icons.Whatsapp className="w-3.5 h-3.5" />
                                           WhatsApp
                                         </button>
{whatsappDropdown === r.id && (
                                            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-64 z-10">
                                              <div className="text-xs font-semibold text-gray-600 mb-2 px-2">Select message template:</div>
                                              {Object.entries(WHATSAPP_TEMPLATES)
                                                .filter(([key]) => key.startsWith(r.table))
                                                .map(([key]) => (
                                                  <a
                                                    key={key}
                                                    href={getWhatsappLink(r, key)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={() => setWhatsappDropdown(null)}
                                                    className="block text-xs text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
                                                  >
                                                    {key === r.table 
                                                      ? `Initial Message` 
                                                      : key.replace(`${r.table}_`, "").replace(/_/g, " ")}
                                                  </a>
                                                ))}
                                            </div>
                                          )}
                                       </div>
                                     )}
                                     <button onClick={() => copyToClipboard(JSON.stringify(r, null, 2), r.id)}
                                       className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-all">
                                       {copiedId === r.id ? <span className="text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" />Copied!</span> : <><Icons.Copy className="w-3.5 h-3.5" />Copy JSON</>}
                                     </button>
                                   </div>
                                 </div>

{/* Status and Action Editor */}
                                  {!isViewer && (
                                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-md mb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                                      <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
                                        <div>
                                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Manage Lead Status</div>
                                          <div className="relative">
                                            <select
                                              value={editingStatus[r.id] !== undefined ? editingStatus[r.id] : r.status}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setEditingStatus(prev => ({ ...prev, [r.id]: val }));
                                                if (val !== "rejected") {
                                                  setEditingReason(prev => ({ ...prev, [r.id]: "" }));
                                                }
                                              }}
                                              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer hover:border-gray-300 w-full md:w-56"
                                            >
                                              <option value="new">New</option>
                                              <option value="contacted">Contacted</option>
                                              <option value="qualified">Qualified</option>
                                              <option value="converted">Converted</option>
                                              <option value="closed">Closed</option>
                                              <option value="rejected">Rejected</option>
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                          </div>
                                        </div>

                                        {(editingStatus[r.id] === "rejected" || (!editingStatus[r.id] && r.status === "rejected")) && (
                                          <div className="flex-1 w-full">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Rejection Reason</div>
                                            <input
                                              type="text"
                                              value={editingReason[r.id] !== undefined ? editingReason[r.id] : (r.rejection_reason || "")}
                                              onChange={(e) => setEditingReason(prev => ({ ...prev, [r.id]: e.target.value }))}
                                              placeholder="Why was this lead rejected? (e.g. Budget mismatch, Not reachable...)"
                                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-end self-stretch md:self-auto justify-end">
                                        <button
                                          onClick={() => handleUpdateStatus(r.table, r.id)}
                                          disabled={updatingRowId === r.id}
                                          className="w-full md:w-auto bg-gray-900 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                          {updatingRowId === r.id ? (
                                            <>
                                              <Icons.RefreshCw className="w-4 h-4 animate-spin" />
                                              Updating...
                                            </>
                                          ) : (
                                            "Save Changes"
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {allFields.map(([key, value]) => {
                                    if (key === "timestamp") {
                                      return (
                                        <div key={key} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                                          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{formatLabel(key)}</div>
                                          <div className="text-sm text-gray-900 font-medium">{formatDate(value)}</div>
                                        </div>
                                      );
                                    }
                                    if (key === "additional_localities" && Array.isArray(value)) {
                                      return (
                                        <div key={key} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm md:col-span-2 lg:col-span-3">
                                          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{formatLabel(key)}</div>
                                          <div className="text-sm text-gray-900">{formatValue(key, value)}</div>
                                        </div>
                                      );
                                    }
                                    if (["cover_letter", "message", "full_address", "additional_notes"].includes(key)) {
                                      return (
                                        <div key={key} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm md:col-span-2 lg:col-span-3">
                                          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{formatLabel(key)}</div>
                                          <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">{String(value || "—")}</div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={key} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                                        <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{formatLabel(key)}</div>
                                        <div className="text-sm text-gray-900 break-words">{formatValue(key, value)}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1} to {Math.min(currentPage * ROWS_PER_PAGE, filteredRows.length)} of {filteredRows.length} leads
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                      <Icons.ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 5) page = i + 1;
                        else if (currentPage <= 3) page = i + 1;
                        else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                        else page = currentPage - 2 + i;
                        return (
                          <button key={page} onClick={() => setCurrentPage(page)}
                            className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-all ${
                              currentPage === page ? "bg-gray-900 text-white border-gray-900 shadow-md" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                            }`}>
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                      <Icons.ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activeTab === "activity" ? (
          /* Activity Log Tab */
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const counts: Record<string, number> = {};
                for (const log of activityLog) {
                  counts[log.action] = (counts[log.action] || 0) + 1;
                }
                const summaryItems = [
                  { key: "login", label: "Logins", icon: "🔐", color: "bg-green-50 text-green-700 border-green-200", count: counts.login || 0 },
                  { key: "logout", label: "Logouts", icon: "🚪", color: "bg-gray-50 text-gray-700 border-gray-200", count: counts.logout || 0 },
                  { key: "status_change", label: "Status Changes", icon: "🔄", color: "bg-blue-50 text-blue-700 border-blue-200", count: counts.status_change || 0 },
                  { key: "delete_lead", label: "Deleted Leads", icon: "🗑️", color: "bg-red-50 text-red-700 border-red-200", count: counts.delete_lead || 0 },
                ];
                return summaryItems.map((item) => (
                  <div key={item.key} className={`bg-white rounded-2xl p-5 border shadow-sm ${item.color}`}>
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="text-xs font-medium opacity-80">{item.label}</div>
                  </div>
                ));
              })()}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Activity Timeline</h2>
                <p className="text-xs text-gray-500 mt-1">All admin actions in chronological order</p>
              </div>

              {/* Filters */}
              <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/30 flex flex-col sm:flex-row gap-3">
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="all">All Actions</option>
                  <option value="login">Logins</option>
                  <option value="logout">Logouts</option>
                  <option value="status_change">Status Changes</option>
                  <option value="delete_lead">Deleted Leads</option>
                  <option value="add_member">Added Members</option>
                  <option value="remove_member">Removed Members</option>
                  <option value="update_role">Role Updates</option>
                </select>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="all">All Users</option>
                  {uniqueUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {filteredActivityLog.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="text-gray-300 mb-2">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  </div>
                  <p className="text-gray-500 font-medium">No activity yet</p>
                  <p className="text-gray-400 text-xs mt-1">Actions will appear here as the team works</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-100" />

                  <div className="divide-y divide-gray-50">
                    {filteredActivityLog.map((log) => {
                      const actionConfig: Record<string, { icon: string; label: string; bg: string; border: string; text: string }> = {
                        login: { icon: "🔐", label: "Login", bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
                        logout: { icon: "🚪", label: "Logout", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" },
                        status_change: { icon: "🔄", label: "Status Change", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
                        delete_lead: { icon: "🗑️", label: "Delete Lead", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
                        add_member: { icon: "👤", label: "Add Member", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
                        remove_member: { icon: "👤", label: "Remove Member", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
                        update_role: { icon: "🔑", label: "Update Role", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
                      };
                      const config = actionConfig[log.action] || { icon: "📋", label: log.action, bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" };

                      let detailsText = "";
                      let detailsObj: any = null;
                      try {
                        const d = log.details;
                        if (d && typeof d === "object") {
                          detailsObj = d;
                          if (d.from && d.to) detailsText = `${d.from} → ${d.to}`;
                          else if (d.to) detailsText = String(d.to);
                          else if (d.login_time) detailsText = `Logged in at ${formatDate(d.login_time)}`;
                          else if (d.logout_time) detailsText = `Logged out at ${formatDate(d.logout_time)}`;
                          else if (d.lead_id || d.table) detailsText = `${d.table || "record"} • ID ${(d.lead_id || d.target_id || "").slice(0, 8)}`;
                          else detailsText = JSON.stringify(d);
                        }
                      } catch {}

                      const renderDetails = () => {
                        if (!detailsText && !detailsObj) return null;
                        switch (log.action) {
                          case "status_change":
                            return (
                              <span>
                                Changed status: <span className="font-semibold text-gray-900">{detailsText}</span>
                                {detailsObj?.rejection_reason && <span className="text-gray-500"> • Reason: {String(detailsObj.rejection_reason)}</span>}
                              </span>
                            );
                          case "delete_lead":
                            return <span>Deleted lead • ID {(detailsObj?.lead_id || log.target_id || "").slice(0, 8)}</span>;
                          case "login":
                            return <span>Signed in • {detailsObj?.email}</span>;
                          case "logout":
                            return <span>Signed out</span>;
                          case "view_lead":
                            return <span>Viewed lead • ID {(detailsObj?.lead_id || log.target_id || "").slice(0, 8)}</span>;
                          case "add_member":
                            return <span>Added {detailsObj?.added_name} as {detailsObj?.added_role}</span>;
                          case "remove_member":
                            return <span>Removed member • ID {(log.target_id || "").slice(0, 8)}</span>;
                          case "update_role":
                            return <span>Updated to {detailsObj?.new_role}{detailsObj?.new_name ? ` • ${detailsObj.new_name}` : ""}</span>;
                          default:
                            return <span>{detailsText}</span>;
                        }
                      };

                      return (
                        <div key={log.id} className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`relative z-10 w-10 h-10 rounded-full border-2 ${config.bg} ${config.border} ${config.text} flex items-center justify-center text-sm font-bold shadow-sm`}>
                              {config.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${config.bg} ${config.border} ${config.text}`}>
                                      {config.label}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900">{log.user_name || "Unknown"}</span>
                                  </div>
                                  {detailsText && (
                                    <div className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                                      {renderDetails()}
                                    </div>
                                  )}
                                  {log.target_table && !detailsObj?.table && (
                                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                      <span className="font-medium">
                                        {log.target_table?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                      </span>
                                      {log.target_id && (
                                        <span className="font-mono text-gray-400">
                                          • ID: {log.target_id.slice(0, 8)}...
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 whitespace-nowrap mt-0.5 font-medium">
                                  {formatActivityDate(log.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "team" ? (
          /* Team Management Tab */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Team Members</h2>
                <p className="text-xs text-gray-500 mt-1">Manage access and roles for your team</p>
              </div>
              <button
                onClick={() => setShowAddUser(true)}
                className="bg-gray-900 text-white rounded-xl px-4 py-2 text-xs font-semibold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
              >
                Add Member
              </button>
            </div>

            {showAddUser && (
              <form onSubmit={handleAddUser} className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email address"
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full name"
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={addingUser}
                      className="flex-1 bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                    >
                      {addingUser ? "Adding..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddUser(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                {teamError && <div className="text-red-600 text-xs mt-2">{teamError}</div>}
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Email</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Role</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Joined</th>
                    <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {team.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-500 text-sm">
                        No team members yet
                      </td>
                    </tr>
                  )}
                  {team.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/80">
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{member.full_name}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{member.email}</td>
                      <td className="px-5 py-3">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value)}
                          disabled={member.id === user?.id}
                          className={`appearance-none border rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold outline-none focus:ring-2 focus:ring-gray-900 ${ROLE_COLORS[member.role] || ROLE_COLORS.viewer}`}
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Admin</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {member.created_at ? formatDateShort(member.created_at) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleRemoveUser(member)}
                          disabled={member.id === user?.id}
                          className="text-xs text-red-600 hover:text-red-700 font-semibold disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          ) : activeTab === "academy" ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-200">
                {(["courses", "modules", "lessons", "quizzes", "questions"] as const).map((tab) => (
                  <button key={tab} onClick={() => setAcademyTab(tab)} className={`px-4 py-2 text-sm font-semibold border-b-2 capitalize ${academyTab === tab ? "border-academy-primary text-academy-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <a href={academyTab === "courses" ? "/admin/academy/courses" : academyTab === "modules" ? "/admin/academy/modules" : academyTab === "lessons" ? "/admin/academy/lessons" : academyTab === "quizzes" ? "/admin/academy/quizzes" : "/admin/academy/questions"}>
                  <button className="bg-academy-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-academy-secondary transition-colors">
                    Open {academyTab.charAt(0).toUpperCase() + academyTab.slice(1)} Management →
                  </button>
                </a>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Manage {academyTab.charAt(0).toUpperCase() + academyTab.slice(1)}</h3>
                <p className="text-sm text-gray-500 mb-4">Click the button above to open the {academyTab} management interface in a new tab.</p>
              </div>
            </div>
          ) : null}
      </main>

      <div className="mt-6 text-center text-xs text-gray-400 pb-8">LocalWala Food Admin • Multi-User Auth with Supabase</div>
    </div>
  );
}
