// =============================================
// src/types/workforce.ts
// LocalWala Workforce Hub — Shared TypeScript Types
// =============================================

// ─── Enums ───────────────────────────────────

export type Department = string;
export type EmploymentType = string;
export type UserRole = string;

export type EmployeeStatus =
  | 'active'
  | 'inactive'
  | 'on_leave'
  | 'notice_period'
  | 'internship_completed';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'late'
  | 'wfh'
  | 'on_leave';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'blocked';

export type RestaurantStatus =
  | 'new_lead'
  | 'contacted'
  | 'interested'
  | 'follow_up_required'
  | 'documents_pending'
  | 'onboarding_in_progress'
  | 'onboarded'
  | 'live'
  | 'rejected'
  | 'closed_permanently';

export type LeadSource =
  | 'field_visit'
  | 'founder'
  | 'marketing'
  | 'referral'
  | 'walk_in'
  | 'google_maps';

export type InteractionType =
  | 'cold_visit'
  | 'follow_up_visit'
  | 'call'
  | 'whatsapp'
  | 'document_collection'
  | 'onboarding_meeting'
  | 'founder_call'
  | 'status_update';

export type FollowUpType = 'call' | 'visit' | 'whatsapp';

export type NotificationType =
  | 'attendance_reminder'
  | 'checkout_reminder'
  | 'update_reminder'
  | 'follow_up_reminder'
  | 'task_assigned'
  | 'task_updated'
  | 'task_overdue'
  | 'blocker_flagged'
  | 'restaurant_status_changed'
  | 'campaign_assigned'
  | 'general';

export type Mood = 'terrible' | 'bad' | 'neutral' | 'good' | 'great';

export type JobStatus = 'active' | 'paused' | 'closed' | 'filled';

export type LeaveType = 'casual' | 'sick' | 'earned' | 'maternity' | 'paternity' | 'unpaid';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

// ─── Core Entities ───────────────────────────

export interface Profile {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: Department | null;
  designation: string | null;
  employment_type: EmploymentType;
  role: UserRole;
  status: EmployeeStatus;
  reporting_manager_id: string | null;
  joining_date: string | null;
  profile_picture_url: string | null;
  work_location: string | null;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  reporting_manager?: Pick<Profile, 'id' | 'full_name' | 'designation'>;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  working_hours: number | null;
  status: AttendanceStatus;
  is_late: boolean;
  wfh_approved: boolean;
  notes: string | null;
  override_by: string | null;
  override_reason: string | null;
  override_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  employee?: Pick<Profile, 'id' | 'full_name' | 'department' | 'profile_picture_url'>;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  department: Department | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  blocker_reason: string | null;
  blocker_resolved: boolean;
  blocker_resolved_at: string | null;
  github_pr_url: string | null;
  tags: string[] | null;
  attachment_urls: string[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee?: Pick<Profile, 'id' | 'full_name' | 'profile_picture_url'>;
  creator?: Pick<Profile, 'id' | 'full_name'>;
  comments?: TaskComment[];
  assignees?: TaskAssignee[];
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  employee_id: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: Pick<Profile, 'id' | 'full_name' | 'profile_picture_url'>;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  attachment_url: string | null;
  created_at: string;
  author?: Pick<Profile, 'id' | 'full_name' | 'profile_picture_url'>;
}

export interface DailyUpdate {
  id: string;
  employee_id: string;
  date: string;
  completed_today: string;
  plan_for_tomorrow: string;
  blockers: string | null;
  has_blocker: boolean;
  blocker_resolved: boolean;
  blocker_resolved_at: string | null;
  mood: Mood | null;
  github_links: string | null;
  ticket_count: number | null;
  restaurants_visited: number | null;
  submitted_at: string;
  employee?: Pick<Profile, 'id' | 'full_name' | 'department' | 'profile_picture_url'>;
}

export interface Restaurant {
  id: string;
  name: string;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  address: string | null;
  locality: string | null;
  city: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  cuisine_types: string[] | null;
  avg_rating: number | null;
  review_count: number;
  positive_themes: string[] | null;
  negative_themes: string[] | null;
  assigned_executive_id: string | null;
  territory_id: string | null;
  lead_source: LeadSource;
  status: RestaurantStatus;
  onboarded_at: string | null;
  live_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_executive?: Pick<Profile, 'id' | 'full_name' | 'phone'>;
  territory?: Pick<Territory, 'id' | 'name'>;
  interactions?: RestaurantInteraction[];
}

export interface RestaurantInteraction {
  id: string;
  restaurant_id: string;
  executive_id: string;
  interaction_type: InteractionType;
  outcome: string | null;
  notes: string | null;
  visit_lat: number | null;
  visit_lng: number | null;
  gps_verified: boolean;
  gps_distance_meters: number | null;
  photo_urls: string[] | null;
  interacted_at: string;
  created_at: string;
  executive?: Pick<Profile, 'id' | 'full_name'>;
}

export interface FollowUp {
  id: string;
  restaurant_id: string;
  assigned_to: string;
  follow_up_type: FollowUpType;
  scheduled_at: string;
  reminder_minutes: number;
  notes: string | null;
  status: 'pending' | 'completed' | 'cancelled' | 'rescheduled';
  completed_at: string | null;
  rescheduled_to: string | null;
  created_at: string;
  restaurant?: Pick<Restaurant, 'id' | 'name' | 'owner_name' | 'owner_phone'>;
}

export interface Territory {
  id: string;
  name: string;
  city: string;
  pincodes: string[] | null;
  assigned_executive_id: string | null;
  polygon_coords: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_executive?: Pick<Profile, 'id' | 'full_name'>;
}

export interface JobOpening {
  id: string;
  job_id: string;
  title: string;
  department: Department | null;
  employment_type: EmploymentType;
  openings: number;
  description: string | null;
  experience_min: number | null;
  experience_max: number | null;
  ctc_min: number | null;
  ctc_max: number | null;
  hiring_manager: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  // Joined
  hiring_manager_profile?: Pick<Profile, 'id' | 'full_name'>;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveRequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  // Joined
  employee?: Pick<Profile, 'id' | 'full_name' | 'department'>;
  approver?: Pick<Profile, 'id' | 'full_name'>;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

// ─── Dashboard Summary Types ──────────────────

export interface FounderDashboardStats {
  attendance: {
    total_active: number;
    present: number;
    absent: number;
    late: number;
    on_leave: number;
  };
  restaurants: {
    total: number;
    new_leads: number;
    follow_up_required: number;
    onboarding_in_progress: number;
    onboarded: number;
    live: number;
  };
  daily_updates: {
    submitted: number;
    pending: number;
    has_blocker: number;
  };
  tasks: {
    total_open: number;
    urgent: number;
    overdue: number;
    blocked: number;
  };
}

export interface EmployeeDashboardStats {
  todayAttendance: Attendance | null;
  myTasks: Task[];
  todayUpdate: DailyUpdate | null;
  recentNotifications: Notification[];
}

// ─── Form Input Types ─────────────────────────

export interface CheckInPayload {
  lat: number;
  lng: number;
  notes?: string;
  is_wfh?: boolean;
}

export interface CheckOutPayload {
  lat: number;
  lng: number;
  notes?: string;
}

export interface DailyUpdatePayload {
  completed_today: string;
  plan_for_tomorrow: string;
  blockers?: string;
  has_blocker: boolean;
  mood?: Mood;
  github_links?: string;
  ticket_count?: number;
  restaurants_visited?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assigned_to: string;
  priority: TaskPriority;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  department?: Department;
}

export interface LogVisitPayload {
  restaurant_id: string;
  interaction_type: InteractionType;
  outcome: string;
  notes: string;
  lat: number;
  lng: number;
  photo_urls?: string[];
  next_follow_up?: {
    scheduled_at: string;
    follow_up_type: FollowUpType;
    notes?: string;
  };
}

// ─── Role Permission Helpers ──────────────────

export const ADMIN_ROLES: UserRole[] = ['founder', 'super_admin', 'hr_admin'];
export const LEAD_AND_ABOVE: UserRole[] = [...ADMIN_ROLES, 'team_lead'];
export const HR_ROLES: UserRole[] = ADMIN_ROLES;
export const CAN_MANAGE_RESTAURANTS: UserRole[] = [...LEAD_AND_ABOVE, 'onboarding_executive'];
export const CAN_MANAGE_CAMPAIGNS: UserRole[] = ['founder', 'super_admin', 'marketing_executive'];

export function isAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isLeadOrAbove(role: UserRole): boolean {
  return LEAD_AND_ABOVE.includes(role);
}

export function isHr(role: UserRole): boolean {
  return HR_ROLES.includes(role);
}

export function canAccessRestaurantCRM(role: UserRole): boolean {
  return CAN_MANAGE_RESTAURANTS.includes(role);
}

export function canManageMarketing(role: UserRole): boolean {
  return CAN_MANAGE_CAMPAIGNS.includes(role);
}

// ─── Restaurant Status Labels ─────────────────

export const RESTAURANT_STATUS_LABELS: Record<RestaurantStatus, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  interested: 'Interested',
  follow_up_required: 'Follow-up Required',
  documents_pending: 'Documents Pending',
  onboarding_in_progress: 'Onboarding In Progress',
  onboarded: 'Onboarded',
  live: 'Live 🟢',
  rejected: 'Rejected',
  closed_permanently: 'Closed Permanently',
};

export const RESTAURANT_STATUS_COLORS: Record<RestaurantStatus, string> = {
  new_lead: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  interested: 'bg-indigo-100 text-indigo-700',
  follow_up_required: 'bg-yellow-100 text-yellow-700',
  documents_pending: 'bg-orange-100 text-orange-700',
  onboarding_in_progress: 'bg-purple-100 text-purple-700',
  onboarded: 'bg-teal-100 text-teal-700',
  live: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  closed_permanently: 'bg-gray-100 text-gray-500',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export const MOOD_EMOJIS: Record<Mood, string> = {
  terrible: '😔',
  bad: '😐',
  neutral: '🙂',
  good: '😊',
  great: '🔥',
};

export type HrDocumentType =
  | 'offer_letter'
  | 'internship_letter'
  | 'employment_agreement'
  | 'nda'
  | 'aadhaar'
  | 'pan'
  | 'bank_details'
  | 'exit_document'
  | 'other';

export interface HrDocument {
  id: string;
  employee_id: string;
  document_type: HrDocumentType;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  employee?: Pick<Profile, 'id' | 'full_name'>;
  uploader?: Pick<Profile, 'id' | 'full_name'>;
}

export const HR_DOCUMENT_LABELS: Record<HrDocumentType, string> = {
  offer_letter: 'Offer Letter',
  internship_letter: 'Internship Letter',
  employment_agreement: 'Employment Agreement',
  nda: 'NDA',
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  bank_details: 'Bank Details',
  exit_document: 'Exit Document',
  other: 'Other',
};

// ─── Marketing Campaign Types ───────────────────

export type InfluencerStatus = 'active' | 'inactive' | 'blacklisted';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type AssignmentStatus = 'assigned' | 'accepted' | 'rejected' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'disputed';
export type Platform = 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'other';

export interface Influencer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  followers_count: number | null;
  category: string | null;
  location: string | null;
  assigned_executive_id: string | null;
  status: InfluencerStatus;
  created_at: string;
  updated_at: string;
  assigned_executive?: Pick<Profile, 'id' | 'full_name'>;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  target_metrics: Record<string, unknown> | null;
  created_by: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  creator?: Pick<Profile, 'id' | 'full_name'>;
}

export interface CampaignAssignment {
  id: string;
  campaign_id: string;
  influencer_id: string;
  assigned_by: string;
  status: AssignmentStatus;
  payment_amount: number | null;
  payment_status: PaymentStatus;
  payment_date: string | null;
  deliverable_details: Record<string, unknown> | null;
  actual_metrics: Record<string, unknown> | null;
  assigned_at: string;
  completed_at: string | null;
  campaign?: Pick<MarketingCampaign, 'id' | 'name'>;
  influencer?: Pick<Influencer, 'id' | 'full_name' | 'instagram_handle' | 'followers_count'>;
  assigner?: Pick<Profile, 'id' | 'full_name'>;
}

export interface InfluencerPayment {
  id: string;
  assignment_id: string;
  amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  paid_by: string;
  paid_at: string;
}

// ─── Salary Management Types ─────────────────

export type PaymentFrequency = 'monthly' | 'weekly' | 'bi_weekly' | 'one_time';
export type SalaryStatus = 'active' | 'revised' | 'inactive';

export interface SalaryRecord {
  id: string;
  employee_id: string;
  // Earnings
  gross_salary: number;
  base_salary: number;
  hra: number | null;
  special_allowance: number | null;
  performance_bonus: number | null;
  travel_allowance: number | null;
  medical_allowance: number | null;
  other_allowances: number | null;
  // Deductions
  pf_employee: number | null;
  pf_employer: number | null;
  professional_tax: number | null;
  tds: number | null;
  other_deductions: number | null;
  // Net
  net_salary: number;
  // Meta
  payment_frequency: PaymentFrequency;
  effective_from: string;
  effective_to: string | null;
  status: SalaryStatus;
  perks: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  employee?: Pick<Profile, 'id' | 'full_name' | 'designation' | 'department'>;
  creator?: Pick<Profile, 'id' | 'full_name'>;
}
