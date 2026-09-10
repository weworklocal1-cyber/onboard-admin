"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Plus, Trash2, Edit, Copy, Eye, X, MessageSquare, Mail } from "lucide-react";

type Template = {
  id: string;
  key: string;
  name: string;
  category: string;
  channel: string;
  subject?: string | null;
  body: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const AVAILABLE_TAGS = [
  { tag: "{{name}}", label: "Name", desc: "Applicant name", example: "Rahul Sharma" },
  { tag: "{{email}}", label: "Email", desc: "Applicant email", example: "rahul@example.com" },
  { tag: "{{phone}}", label: "Phone", desc: "Phone number", example: "+91 98765 43210" },
  { tag: "{{internship}}", label: "Internship", desc: "Internship name", example: "Mobile App Development" },
  { tag: "{{course}}", label: "Course", desc: "Course title", example: "Local Commerce" },
  { tag: "{{fee}}", label: "Fee", desc: "Fee amount", example: "499" },
  { tag: "{{payment_link}}", label: "Payment Link", desc: "Razorpay / Checkout link", example: "https://onboard.localwala.tech/academy/courses/.../checkout" },
  { tag: "{{playstore_link}}", label: "PlayStore Link", desc: "PlayStore URL", example: "https://play.google.com/store/apps/details?id=com.localwala.food" },
  { tag: "{{whatsapp_group_link}}", label: "WhatsApp Group", desc: "Group invite link", example: "https://chat.whatsapp.com/AbC123" },
  { tag: "{{certificate_id}}", label: "Certificate ID", desc: "Certificate", example: "CERT-2024-001" },
  { tag: "{{city}}", label: "City", desc: "City", example: "Indore" },
];

const SAMPLE_DATA: Record<string, string> = {
  "{{name}}": "Rahul Sharma",
  "{{email}}": "rahul@example.com",
  "{{phone}}": "+91 98765 43210",
  "{{internship}}": "Mobile App Development",
  "{{course}}": "Understanding Local Commerce",
  "{{fee}}": "499",
  "{{payment_link}}": "https://onboard.localwala.tech/academy/courses/mobile-app/checkout",
  "{{playstore_link}}": "https://play.google.com/store/apps/details?id=com.localwala.food",
  "{{whatsapp_group_link}}": "https://chat.whatsapp.com/InviteLink123",
  "{{certificate_id}}": "CERT-2024-001",
  "{{city}}": "Indore",
};

function renderPreview(body: string) {
  let out = body;
  for (const [tag, val] of Object.entries(SAMPLE_DATA)) {
    out = out.split(tag).join(val);
  }
  return out;
}

export default function MessageTemplatesAdminPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [form, setForm] = useState({
    key: "",
    name: "",
    category: "applicants",
    channel: "whatsapp",
    subject: "",
    body: "",
    is_active: true,
  });

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const fetchTemplates = async () => {
    const token = sessionStorage.getItem("adminAuthToken");
    if (!token) {
      router.replace("/admin");
      return;
    }
    try {
      const res = await fetch("/api/admin/message-templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      const json = await res.json();
      setTemplates(json.templates || []);
    } catch (e) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ key: "", name: "", category: "applicants", channel: "whatsapp", subject: "", body: "", is_active: true });
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      key: t.key,
      name: t.name,
      category: t.category,
      channel: t.channel,
      subject: t.subject || "",
      body: t.body,
      is_active: t.is_active,
    });
    setShowModal(true);
  };

  const insertTag = (tag: string) => {
    const el = bodyRef.current;
    if (!el) {
      setForm((f) => ({ ...f, body: f.body + tag }));
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = form.body.substring(0, start);
    const after = form.body.substring(end);
    const newBody = before + tag + after;
    setForm((f) => ({ ...f, body: newBody }));
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + tag.length;
    }, 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.key.trim() || !form.name.trim() || !form.body.trim()) {
      toast.error("Key, Name and Body are required");
      return;
    }
    const token = sessionStorage.getItem("adminAuthToken");
    if (!token) return;
    setSaving(true);

    // Auto-extract tags from body
    const extractedTags = AVAILABLE_TAGS.filter((t) => form.body.includes(t.tag)).map((t) => t.tag);

    try {
      const method = editing ? "PUT" : "POST";
      const payload = editing
        ? { id: editing.id, ...form, tags: extractedTags }
        : { ...form, tags: extractedTags };

      const res = await fetch("/api/admin/message-templates", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      toast.success(editing ? "Template updated" : "Template created");
      setShowModal(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const token = sessionStorage.getItem("adminAuthToken");
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/message-templates?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Deleted");
      fetchTemplates();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleDuplicate = async (t: Template) => {
    const token = sessionStorage.getItem("adminAuthToken");
    if (!token) return;
    try {
      const res = await fetch("/api/admin/message-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          key: `${t.key}_copy_${Date.now().toString().slice(-4)}`,
          name: `${t.name} (Copy)`,
          category: t.category,
          channel: t.channel,
          subject: t.subject,
          body: t.body,
          tags: t.tags,
          is_active: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      toast.success("Duplicated");
      fetchTemplates();
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  const filtered = filterCategory === "all" ? templates : templates.filter((t) => t.category === filterCategory);

  if (loading) return <div className="p-6">Loading templates...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Manage Initial, Follow-up & Pre-registration messages with tags for Applicants</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/applicants">
            <Button variant="outline" size="sm">← Applicants</Button>
          </a>
          <Button onClick={openCreate} className="bg-[#059669] hover:bg-[#047857]">
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${filterCategory === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}
        >
          All ({templates.length})
        </button>
        <button
          onClick={() => setFilterCategory("applicants")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${filterCategory === "applicants" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}
        >
          Applicants ({templates.filter((t) => t.category === "applicants").length})
        </button>
        <button
          onClick={() => setFilterCategory("general")}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${filterCategory === "general" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}
        >
          General
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Available Tags - click to insert in message body:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {AVAILABLE_TAGS.map((t) => (
              <span key={t.tag} className="inline-flex items-center gap-1 bg-white border border-blue-200 rounded-full px-3 py-1 text-xs font-mono">
                {t.tag} <span className="text-gray-400">- {t.label}</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">Example: Hi {`{{name}}`}, pay Rs {`{{fee}}`} here: {`{{payment_link}}`} + App: {`{{playstore_link}}`}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 && (
          <Card className="col-span-2">
            <CardContent className="p-12 text-center text-gray-500">No templates found. Create your first one.</CardContent>
          </Card>
        )}
        {filtered.map((t) => (
          <Card key={t.id} className={`overflow-hidden ${!t.is_active ? "opacity-60" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    {!t.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    <Badge variant="outline" className="text-xs capitalize">
                      {t.channel === "whatsapp" ? <MessageSquare className="h-3 w-3 mr-1" /> : t.channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : null}
                      {t.channel}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-gray-500 mt-1">key: {t.key} • {t.category}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewId(previewId === t.id ? null : t.id)} title="Preview">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(t)} title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)} title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(t.id)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {t.subject && (
                <p className="text-sm mb-2">
                  <span className="font-medium text-gray-700">Subject:</span> <span className="text-gray-600">{t.subject}</span>
                </p>
              )}

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto border">
                {t.body}
              </div>

              {t.tags && t.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {t.tags.map((tag) => (
                    <span key={tag} className="text-[11px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {previewId === t.id && (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview with sample data:</p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                    {t.subject && <p className="font-semibold mb-2">{renderPreview(t.subject)}</p>}
                    {renderPreview(t.body)}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={`https://wa.me/919876543210?text=${encodeURIComponent(renderPreview(t.body))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                        Test on WhatsApp
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">{editing ? "Edit Template" : "New Template"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Key * (unique, e.g. initial)</Label>
                  <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="initial" required />
                  <p className="text-xs text-gray-400">Lowercase, a-z, 0-9, _ only</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Initial Invitation" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm">
                    <option value="applicants">Applicants</option>
                    <option value="restaurant_partners">Restaurant Partners</option>
                    <option value="delivery_partners">Delivery Partners</option>
                    <option value="careers">Careers</option>
                    <option value="contact_leads">Contact Leads</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Channel</Label>
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                    Active
                  </label>
                </div>
              </div>

              {(form.channel === "email" || form.channel === "both") && (
                <div className="space-y-1.5">
                  <Label>Subject (for Email)</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Your Internship Application - Next Steps" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Message Body *</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {AVAILABLE_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => insertTag(t.tag)}
                      className="text-xs font-mono bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full px-2.5 py-1 transition-colors"
                      title={`${t.label}: ${t.desc}`}
                    >
                      + {t.tag}
                    </button>
                  ))}
                </div>
                <Textarea
                  ref={bodyRef as any}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Hi {{name}},

Thank you for applying for {{internship}}...

Pay here: {{payment_link}}
App: {{playstore_link}}"
                  rows={10}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500">{form.body.length} characters • Tags will be replaced with applicant data</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Live Preview:</p>
                <div className="bg-white rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap border max-h-40 overflow-y-auto">
                  {form.body ? renderPreview(form.body) : <span className="text-gray-400">Start typing to see preview...</span>}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-[#059669] hover:bg-[#047857]" disabled={saving}>
                  {saving ? "Saving..." : editing ? "Update Template" : "Create Template"}
                  {!saving && <Save className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
