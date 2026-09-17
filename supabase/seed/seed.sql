-- Demo data for Phase 1 -- run once against a fresh database (`supabase db reset`
-- locally, or paste into the Supabase SQL editor for a hosted project) so you
-- can click through the CRM before entering real leads.
--
-- All demo staff accounts share the password below -- change it immediately
-- on any project that isn't purely local/throwaway.
--
-- Login          Role
-- admin@democollege.edu           super_admin
-- manager@democollege.edu         admissions_manager
-- priya.counselor@democollege.edu counselor
-- arjun.counselor@democollege.edu counselor
-- reviewer@democollege.edu        document_reviewer
--
-- Password for all demo accounts: DemoPass123!

do $$
declare
  v_password text := crypt('DemoPass123!', gen_salt('bf'));
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
  v_admin_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_manager_id uuid := 'a0000000-0000-4000-8000-000000000002';
  v_priya_id uuid := 'a0000000-0000-4000-8000-000000000003';
  v_arjun_id uuid := 'a0000000-0000-4000-8000-000000000004';
  v_reviewer_id uuid := 'a0000000-0000-4000-8000-000000000005';
  v_program_id uuid;
  v_cycle_id uuid;
  v_source_website uuid;
  v_source_google uuid;
  v_source_meta uuid;
  v_source_referral uuid;
  v_source_walkin uuid;
  v_lead_id uuid;
  i int;
  names text[] := array[
    'Aarav Sharma','Vivaan Mehta','Aditi Rao','Diya Kapoor','Ishaan Verma',
    'Ananya Iyer','Kabir Singh','Myra Gupta','Reyansh Nair','Saanvi Joshi',
    'Vihaan Patel','Anika Reddy','Arjun Malhotra','Navya Pillai','Dhruv Bose',
    'Kiara Menon','Ritvik Chawla','Riya Desai','Shaurya Kulkarni','Zara Khan',
    'Yuvraj Thakur','Ira Bhatt','Advait Sinha','Prisha Agarwal','Kabir Anand'
  ];
  statuses public.lead_status[] := array[
    'NEW','NEW','NEW','CONTACTED','CONTACTED','INTERESTED','INTERESTED',
    'COUNSELLING','APPLICATION_STARTED','DOCUMENTS_PENDING','APPLICATION_COMPLETE',
    'OFFER_SENT','FEE_PENDING','ADMITTED','ENROLLED','NOT_INTERESTED',
    'UNQUALIFIED','LOST','NURTURE','WRONG_NUMBER'
  ]::public.lead_status[];
  v_status public.lead_status;
  v_source uuid;
  v_counselor uuid;
begin
  -- ── Auth users (Supabase Auth) ─────────────────────────────────────────
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    (v_instance_id, v_admin_id, 'authenticated', 'authenticated', 'admin@democollege.edu', v_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Super Admin"}', now(), now(), '', '', '', ''),
    (v_instance_id, v_manager_id, 'authenticated', 'authenticated', 'manager@democollege.edu', v_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Meera Kulkarni"}', now(), now(), '', '', '', ''),
    (v_instance_id, v_priya_id, 'authenticated', 'authenticated', 'priya.counselor@democollege.edu', v_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Nair"}', now(), now(), '', '', '', ''),
    (v_instance_id, v_arjun_id, 'authenticated', 'authenticated', 'arjun.counselor@democollege.edu', v_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Arjun Mehta"}', now(), now(), '', '', '', ''),
    (v_instance_id, v_reviewer_id, 'authenticated', 'authenticated', 'reviewer@democollege.edu', v_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kavya Reddy"}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values
    (gen_random_uuid(), v_admin_id::text, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@democollege.edu'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_manager_id::text, v_manager_id, jsonb_build_object('sub', v_manager_id::text, 'email', 'manager@democollege.edu'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_priya_id::text, v_priya_id, jsonb_build_object('sub', v_priya_id::text, 'email', 'priya.counselor@democollege.edu'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_arjun_id::text, v_arjun_id, jsonb_build_object('sub', v_arjun_id::text, 'email', 'arjun.counselor@democollege.edu'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_reviewer_id::text, v_reviewer_id, jsonb_build_object('sub', v_reviewer_id::text, 'email', 'reviewer@democollege.edu'), 'email', now(), now(), now())
  on conflict (id) do nothing;

  -- ── Profiles + roles ────────────────────────────────────────────────────
  insert into public.profiles (id, full_name, email, phone, created_by) values
    (v_admin_id, 'Super Admin', 'admin@democollege.edu', '+919800000001', v_admin_id),
    (v_manager_id, 'Meera Kulkarni', 'manager@democollege.edu', '+919800000002', v_admin_id),
    (v_priya_id, 'Priya Nair', 'priya.counselor@democollege.edu', '+919800000003', v_admin_id),
    (v_arjun_id, 'Arjun Mehta', 'arjun.counselor@democollege.edu', '+919800000004', v_admin_id),
    (v_reviewer_id, 'Kavya Reddy', 'reviewer@democollege.edu', '+919800000005', v_admin_id)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values
    (v_admin_id, 'super_admin'),
    (v_manager_id, 'admissions_manager'),
    (v_priya_id, 'counselor'),
    (v_arjun_id, 'counselor'),
    (v_reviewer_id, 'document_reviewer')
  on conflict do nothing;

  -- ── Program + admission cycle ───────────────────────────────────────────
  insert into public.programs (name, slug, degree_level, duration_months, description)
  values ('PG Diploma in Advertising and Public Relations', 'pg-advertising-pr', 'Postgraduate Diploma', 12,
          'Full-time postgraduate diploma covering advertising, public relations, brand strategy and integrated marketing communication.')
  returning id into v_program_id;

  insert into public.admission_cycles (program_id, name, start_date, end_date, application_deadline)
  values (v_program_id, '2026-27', '2026-07-01', '2027-05-31', '2027-05-15')
  returning id into v_cycle_id;

  -- ── Lead sources ─────────────────────────────────────────────────────────
  insert into public.lead_sources (name, category) values
    ('Website', 'website') returning id into v_source_website;
  insert into public.lead_sources (name, category) values
    ('Google', 'google') returning id into v_source_google;
  insert into public.lead_sources (name, category) values
    ('Meta', 'meta') returning id into v_source_meta;
  insert into public.lead_sources (name, category) values
    ('Referral', 'referral') returning id into v_source_referral;
  insert into public.lead_sources (name, category) values
    ('Walk-in', 'walk_in') returning id into v_source_walkin;

  -- ── Demo leads spread across statuses/sources/counselors ───────────────
  for i in 1 .. array_length(names, 1) loop
    v_status := statuses[1 + ((i - 1) % array_length(statuses, 1))];
    v_source := (array[v_source_website, v_source_google, v_source_meta, v_source_referral, v_source_walkin])[1 + (i % 5)];
    v_counselor := case when i % 4 = 0 then null when i % 2 = 0 then v_priya_id else v_arjun_id end;

    insert into public.leads (
      full_name, phone, email, city, state, program_id, admission_cycle_id,
      source_id, campaign, utm_source, utm_medium, utm_campaign, landing_page,
      status, assigned_counselor_id, created_at, last_activity_at
    ) values (
      names[i],
      '98' || lpad((10000000 + i * 137)::text, 8, '0'),
      lower(replace(names[i], ' ', '.')) || '@example.com',
      (array['Mumbai','Pune','Delhi','Bengaluru','Hyderabad','Chennai','Kolkata','Ahmedabad'])[1 + (i % 8)],
      (array['Maharashtra','Maharashtra','Delhi','Karnataka','Telangana','Tamil Nadu','West Bengal','Gujarat'])[1 + (i % 8)],
      v_program_id, v_cycle_id, v_source,
      case when v_source = v_source_meta then 'PG-Ad-PR-Sept-Leads' else null end,
      case v_source when v_source_google then 'google' when v_source_meta then 'facebook' else null end,
      case when v_source in (v_source_google, v_source_meta) then 'cpc' else null end,
      case when v_source in (v_source_google, v_source_meta) then 'pg_ad_pr_2026' else null end,
      '/programs/pg-advertising-pr',
      v_status, v_counselor,
      now() - ((array_length(names, 1) - i) || ' days')::interval,
      now() - ((array_length(names, 1) - i) || ' days')::interval
    )
    returning id into v_lead_id;

    insert into public.lead_activities (lead_id, actor_id, activity_type, description)
    values (v_lead_id, null, 'created', 'Lead captured from ' || (select name from public.lead_sources where id = v_source));

    insert into public.lead_status_history (lead_id, from_status, to_status, changed_by)
    values (v_lead_id, null, 'NEW', null);

    if v_status <> 'NEW' then
      insert into public.lead_status_history (lead_id, from_status, to_status, changed_by)
      values (v_lead_id, 'NEW', v_status, v_counselor);

      insert into public.lead_activities (lead_id, actor_id, activity_type, description)
      values (v_lead_id, v_counselor, 'status_changed', 'Status changed from NEW to ' || v_status);
    end if;

    if v_counselor is not null then
      insert into public.lead_assignments (lead_id, counselor_id, assigned_by)
      values (v_lead_id, v_counselor, v_manager_id);

      insert into public.lead_activities (lead_id, actor_id, activity_type, description)
      values (v_lead_id, v_manager_id, 'assigned', 'Assigned to counselor');

      -- A pending or overdue follow-up task for roughly half the assigned leads.
      if i % 2 = 0 then
        insert into public.tasks (lead_id, title, task_type, due_at, assigned_to, created_by, status)
        values (
          v_lead_id,
          'Follow up with ' || names[i],
          'follow_up',
          now() + (case when i % 3 = 0 then -1 else 2 end || ' days')::interval,
          v_counselor,
          v_counselor,
          'pending'
        );
      end if;
    end if;
  end loop;
end $$;
