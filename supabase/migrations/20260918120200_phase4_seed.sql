-- Phase 4 reference data: a few starter WhatsApp templates and one broad
-- segment, so the messaging surfaces aren't empty on first load. Safe to re-run.

insert into public.message_templates (name, category, body) values
  (
    'welcome_enquiry',
    'utility',
    'Hi {{first_name}}, thanks for your interest in {{program}}! This is the admissions team. Reply here with any questions and we''ll help you through your application.'
  ),
  (
    'document_reminder',
    'utility',
    'Hi {{first_name}}, a quick reminder to upload your pending documents to complete your application. Let us know if you need any help.'
  ),
  (
    'application_followup',
    'marketing',
    'Hi {{first_name}}, your application to {{program}} is almost there. Your counselor {{counselor}} is happy to help you finish it — just reply to this message.'
  )
on conflict (name) do nothing;

insert into public.audience_segments (name, description, definition) values
  ('All active leads', 'Every lead not marked lost or unqualified.', '{}'::jsonb)
on conflict (name) do nothing;
