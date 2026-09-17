-- Phase 2 reference data: the documents the college collects, and the
-- headline fee for the one program. Safe to re-run.

insert into public.document_types (name, is_required, sort_order) values
  ('10th Marksheet', true, 1),
  ('12th Marksheet', true, 2),
  ('Graduation Certificate', true, 3),
  ('Aadhaar Card', true, 4),
  ('Passport Photo', true, 5),
  ('Signature', true, 6),
  ('Transfer Certificate', false, 7)
on conflict (name) do nothing;

update public.programs
  set fee_amount = 120000
  where slug = 'pg-advertising-pr' and fee_amount is null;
