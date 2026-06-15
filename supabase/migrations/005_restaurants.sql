-- =============================================
-- 005_restaurants.sql
-- LocalWala Workforce Hub - Restaurant CRM
-- =============================================

-- Territories (must exist before restaurants)
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT DEFAULT 'Indore',
  pincodes TEXT[],
  assigned_executive_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  polygon_coords JSONB,  -- GeoJSON for map rendering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER territories_updated_at
  BEFORE UPDATE ON territories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Restaurants (core CRM)
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  address TEXT,
  locality TEXT,
  city TEXT DEFAULT 'Indore',
  pincode TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  google_place_id TEXT,
  cuisine_types TEXT[],
  avg_rating DECIMAL(2,1) CHECK (avg_rating >= 0 AND avg_rating <= 5),
  review_count INTEGER DEFAULT 0,
  -- AI-extracted themes (Phase 2)
  positive_themes TEXT[],
  negative_themes TEXT[],
  -- Assignment
  assigned_executive_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,
  -- Lead tracking
  lead_source TEXT CHECK (lead_source IN (
    'field_visit', 'founder', 'marketing', 'referral', 'walk_in', 'google_maps'
  )) DEFAULT 'field_visit',
  -- Pipeline status
  status TEXT DEFAULT 'new_lead' CHECK (status IN (
    'new_lead', 'contacted', 'interested', 'follow_up_required',
    'documents_pending', 'onboarding_in_progress', 'onboarded',
    'live', 'rejected', 'closed_permanently'
  )),
  onboarded_at TIMESTAMPTZ,
  live_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Restaurant visit/interaction log (timeline)
CREATE TABLE IF NOT EXISTS restaurant_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'cold_visit', 'follow_up_visit', 'call', 'whatsapp',
    'document_collection', 'onboarding_meeting', 'founder_call', 'status_update'
  )),
  outcome TEXT CHECK (outcome IN (
    'interested', 'not_interested', 'follow_up_required',
    'documents_collected', 'rejected', 'no_response', 'onboarded'
  )),
  notes TEXT,
  visit_lat DECIMAL(10,7),
  visit_lng DECIMAL(10,7),
  gps_verified BOOLEAN DEFAULT FALSE,
  gps_distance_meters INTEGER,   -- distance from restaurant at time of visit
  photo_urls TEXT[],
  interacted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant documents (FSSAI, GST, etc.)
CREATE TABLE IF NOT EXISTS restaurant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'fssai', 'gst', 'pan', 'bank_details', 'menu_photos',
    'storefront_photo', 'partnership_agreement', 'other'
  )),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-up scheduler
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  follow_up_type TEXT CHECK (follow_up_type IN ('call', 'visit', 'whatsapp')) DEFAULT 'call',
  scheduled_at TIMESTAMPTZ NOT NULL,
  reminder_minutes INTEGER DEFAULT 30,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'cancelled', 'rescheduled'
  )),
  completed_at TIMESTAMPTZ,
  rescheduled_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_executive ON restaurants(assigned_executive_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_territory ON restaurants(territory_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_lead_source ON restaurants(lead_source);
CREATE INDEX IF NOT EXISTS idx_restaurant_interactions_restaurant ON restaurant_interactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_interactions_executive ON restaurant_interactions(executive_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_at ON follow_ups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
