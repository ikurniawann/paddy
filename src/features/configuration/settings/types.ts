export interface SettingsBrand {
  id: string;
  name: string;
  industry: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SettingsPosition {
  id: string;
  brand_id: string | null;
  title: string;
  department: string;
  level: string;
  is_active: boolean;
  created_at: string;
  brands?: { name: string } | null;
}

export interface CreateBrandPayload {
  name: string;
  industry?: string;
}

export interface CreateSettingsPositionPayload {
  brand_id?: string;
  title: string;
  department?: string;
  level?: string;
}

export interface UpdateBrandPayload {
  is_active?: boolean;
  name?: string;
  industry?: string;
}

export interface UpdateSettingsPositionPayload {
  title: string;
  department?: string;
  level?: string;
  is_active?: boolean;
  brand_id?: string;
}
