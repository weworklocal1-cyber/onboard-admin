-- Message Templates for Applicants & Leads with tag support
-- Allows admin to manage initial messages, follow-ups etc.

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  category text not null default 'applicants' check (category in ('applicants', 'restaurant_partners', 'delivery_partners', 'careers', 'contact_leads', 'general')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'email', 'both')),
  subject text,
  body text not null,
  tags text[] default array['{{name}}'],
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_message_templates_category on message_templates(category);
create index if not exists idx_message_templates_key on message_templates(key);
create index if not exists idx_message_templates_active on message_templates(is_active);

alter table message_templates enable row level security;

-- Allow authenticated admins to manage templates
drop policy if exists "admins can manage message_templates" on message_templates;
create policy "admins can manage message_templates" on message_templates for all to authenticated using (
  (select role from profiles where id = auth.uid()) in ('founder', 'super_admin', 'hr_admin')
);

-- Allow authenticated to read active templates (for ApplicantTable), and public read for fallback
drop policy if exists "authenticated can read message_templates" on message_templates;
create policy "authenticated can read message_templates" on message_templates for select to authenticated using (true);

drop policy if exists "anon can read active message_templates" on message_templates;
create policy "anon can read active message_templates" on message_templates for select to anon using (is_active = true);

-- Updated at trigger
create or replace function set_message_templates_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_message_templates_updated_at on message_templates;
create trigger trigger_message_templates_updated_at before update on message_templates for each row execute procedure set_message_templates_updated_at();

-- Seed default applicant templates (from MessageTemplates.tsx) with extended tag support
insert into message_templates (key, name, category, channel, subject, body, tags) values
  ('initial', 'Initial Invitation', 'applicants', 'both',
   'Your Internship Application - Next Steps',
   'Hi {{name}},

Thank you for applying to our internship program. We have received your application and will review it shortly. Stay tuned for updates.

Best regards,
Locawala Team',
   array['{{name}}', '{{email}}', '{{phone}}', '{{internship}}', '{{payment_link}}', '{{playstore_link}}', '{{fee}}']
  ),
  ('followup', 'Follow-up (Day 1)', 'applicants', 'whatsapp',
   'Follow‑up on Your Internship Application',
   'Hi {{name}} 👋

We wanted to follow up regarding your internship application for {{internship}}. Your seat is still reserved.

💰 Pre-registration Fee: Rs {{fee}}
🔗 Pay here: {{payment_link}}
📱 App: {{playstore_link}}

Let us know if you have any questions.

Best,
Locawala Team',
   array['{{name}}', '{{internship}}', '{{fee}}', '{{payment_link}}', '{{playstore_link}}']
  ),
  ('followup_2', 'Follow-up 2 (Day 3)', 'applicants', 'whatsapp',
   'Final Reminder - Complete Your Registration',
   'Hi {{name}} ⚠️

Final reminder for {{internship}} - your reserved seat will expire tonight.

Pay Rs {{fee}} now: {{payment_link}}

Reply YES for help or NO to release seat.

- Locawala Team',
   array['{{name}}', '{{internship}}', '{{fee}}', '{{payment_link}}']
  ),
  ('pre_registration_fee', 'Pre-registration Fee', 'applicants', 'both',
   'Complete Pre-registration - Lock Your Seat',
   'Hi {{name}} 👋

Your application for {{internship}} at LocalWala is Pre-Approved ✅

To reserve your seat, complete pre-registration:

💰 Pre-registration Fee: Rs {{fee}} (adjustable in final fee)
🎓 Includes: Offer Letter + LMS Access + Certificate

Pay here: {{payment_link}}
📱 Download App: {{playstore_link}}

⏳ Link valid for 24 hours only.

Reply YES for help.
- Team LocalWala',
   array['{{name}}', '{{internship}}', '{{fee}}', '{{payment_link}}', '{{playstore_link}}']
  ),
  ('rejected', 'Rejected', 'applicants', 'both',
   'Internship Application Update',
   'Hi {{name}},

Thank you for your interest. After careful consideration, we have decided not to move forward with your application at this time. We wish you all the best in your future endeavors.

Regards,
Locawala Team',
   array['{{name}}']
  ),
  ('confirmed', 'Confirmed', 'applicants', 'both',
   'Internship Application - Confirmed!',
   'Hi {{name}},

Congratulations! Your internship application has been confirmed. We are excited to have you on board. Please check your email for next steps and onboarding details.

Join our WhatsApp group: {{whatsapp_group_link}}
📱 Download App: {{playstore_link}}

Best regards,
Locawala Team',
   array['{{name}}', '{{whatsapp_group_link}}', '{{playstore_link}}']
  )
on conflict (key) do nothing;
