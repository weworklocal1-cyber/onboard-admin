export interface Tester {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: 'pending' | 'approved' | 'blocked';
  invited_at: string;
  approved_at?: string;
  last_login?: string;
  device_brand?: string;
  device_model?: string;
  android_version?: string;
}

export interface TestingBuild {
  id: string;
  version: string;
  build_number: string;
  release_date: string;
  status: 'active' | 'paused' | 'completed';
  play_store_url?: string;
  install_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReleaseNote {
  id: string;
  build_id: string;
  new_features?: string;
  improvements?: string;
  bug_fixes?: string;
  known_limitations?: string;
  created_at: string;
}

export interface BugReport {
  id: string;
  tester_id?: string;
  tester?: Tester;
  category: 'ui' | 'performance' | 'crash' | 'feature' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
  screenshot_url?: string;
  screen_recording_url?: string;
  device_brand?: string;
  device_model?: string;
  android_version?: string;
  app_version?: string;
  status: 'open' | 'in_progress' | 'testing' | 'resolved' | 'closed';
  assigned_developer?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureRequest {
  id: string;
  tester_id?: string;
  tester?: Tester;
  title: string;
  description?: string;
  business_value?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'implemented';
  admin_notes?: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  tester_id?: string;
  tester?: Tester;
  rating: number;
  overall_experience?: string;
  suggestions?: string;
  created_at: string;
}

export interface KnownIssue {
  id: string;
  build_id: string;
  title: string;
  description?: string;
  workaround?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}

export interface TestingStats {
  total_testers: number;
  active_testers: number;
  bug_reports: number;
  feature_requests: number;
  feedback_count: number;
  average_rating: number;
  bugs_by_severity: Record<string, number>;
  bugs_by_status: Record<string, number>;
  requests_by_status: Record<string, number>;
}

export const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

export const STATUS_COLORS: Record<string, string> = {
  open: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  testing: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export const FEATURE_STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-700',
  reviewed: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  implemented: 'bg-purple-100 text-purple-700',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-50 text-gray-700 border-gray-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

export const TESTING_STATUS: Record<string, string> = {
  active: 'text-green-600',
  paused: 'text-amber-600',
  completed: 'text-gray-600',
};