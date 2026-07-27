-- Allow admins and HR to delete daily updates
CREATE POLICY "admin_delete_daily_updates"
  ON daily_updates FOR DELETE
  USING (is_admin());
