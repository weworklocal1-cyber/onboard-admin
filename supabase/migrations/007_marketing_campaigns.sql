-- =============================================
-- 009_marketing_campaigns.sql
-- LocalWala Workforce Hub - Marketing Module
-- =============================================

-- Influencers table
CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  instagram_handle TEXT,
  followers_count INTEGER,
  category TEXT,
  location TEXT,
  assigned_executive_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER influencers_updated_at
  BEFORE UPDATE ON influencers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_influencers_executive ON influencers(assigned_executive_id);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON influencers(status);

-- Marketing campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  target_metrics JSONB,  -- {impressions, clicks, conversions, etc}
  created_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON marketing_campaigns(created_by);

-- Campaign-Influencer assignments
CREATE TABLE IF NOT EXISTS campaign_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  influencer_id UUID REFERENCES influencers(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed')),
  payment_amount DECIMAL(12,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'disputed')),
  payment_date DATE,
  deliverable_details JSONB,  -- {posts, stories, reels, etc}
  actual_metrics JSONB,       -- {impressions, clicks, etc} after completion
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assignments_campaign ON campaign_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_assignments_influencer ON campaign_assignments(influencer_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON campaign_assignments(status);

-- Influencer payments tracking
CREATE TABLE IF NOT EXISTS influencer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES campaign_assignments(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('upi', 'bank_transfer', 'cash', 'other')),
  transaction_reference TEXT,
  paid_by UUID NOT NULL REFERENCES profiles(id),
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_assignment ON influencer_payments(assignment_id);