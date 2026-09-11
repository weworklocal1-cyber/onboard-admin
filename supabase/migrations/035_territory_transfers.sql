-- 035_territory_transfers.sql
-- Territory transfer approval workflow per PRD 18.2/18.3

CREATE TABLE IF NOT EXISTS territory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  from_executive_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_executive_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_territory_transfers_status ON territory_transfers(status);
CREATE INDEX IF NOT EXISTS idx_territory_transfers_territory ON territory_transfers(territory_id);

ALTER TABLE territory_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_read_transfers" ON territory_transfers FOR SELECT USING (is_lead_or_above() OR requested_by = auth.uid() OR to_executive_id = auth.uid());
CREATE POLICY "exec_request_transfer" ON territory_transfers FOR INSERT WITH CHECK (requested_by = auth.uid() AND get_my_role() IN ('onboarding_executive','team_lead','hr_admin','super_admin','founder'));
CREATE POLICY "admin_decide_transfer" ON territory_transfers FOR UPDATE USING (is_admin());

-- Audit: territory transfer history is also logged via audit_logs in API
