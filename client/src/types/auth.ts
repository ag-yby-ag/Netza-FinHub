export interface Permission {
  module: string;
  can_view: number;
  can_create: number;
  can_edit: number;
  can_delete: number;
  can_export: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'master' | 'admin' | 'manager' | 'viewer';
  department: string | null;
  job_title: string | null;
  avatar_url: string | null;
  timezone: string;
  status: 'active' | 'inactive' | 'suspended';
  last_login: string | null;
  created_at: string;
  permissions?: Permission[];
}

export interface AuthSession {
  user: User;
  token: string;
  expires_at: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  module: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
  user_name: string | null;
}

export type Preferences = Record<string, string>;

export interface SystemSetting {
  value: string;
  type: 'string' | 'boolean' | 'number' | 'json';
  description: string;
}

export type SystemSettings = Record<string, SystemSetting>;
