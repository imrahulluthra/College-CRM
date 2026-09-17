# Connecting the college website to the CRM

The CRM never needs to touch the website's codebase or CMS. It exposes one
public endpoint, `POST /api/leads`, that accepts a standard form submission
and turns it into a lead. This works with any website platform (WordPress,
Wix, Webflow, a static HTML site, a custom app) because it's just an HTTP
request — no plugin, SDK, or specific tech stack required, which is what
makes it reliable to keep working long-term even if the website itself is
rebuilt later.

## 1. Generate a key

In the CRM, go to **Settings → Website Integration** (super admin only) and
generate a key. Copy it immediately — it's shown once. Give each integration
(e.g. the main website, a separate landing-page builder) its own key, so one
can be revoked without breaking the others.

## 2. Choose an integration method

### Option A — JavaScript embed (recommended)

Drop this before `</body>` on the page with the admission enquiry form. It
works alongside the site's existing form — it does not replace it — by
listening for the form's submit event and forwarding the data in the
background.

```html
<script>
  (function () {
    var FORM_ID = "admission-enquiry-form"; // the <form id="..."> on your page
    var ENDPOINT = "https://YOUR-CRM-DOMAIN/api/leads";
    var API_KEY = "PASTE_YOUR_KEY_HERE";

    var form = document.getElementById(FORM_ID);
    if (!form) return;

    form.addEventListener("submit", function () {
      var params = new URLSearchParams(new FormData(form));
      var qs = new URLSearchParams(window.location.search);

      fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          name: params.get("name"),
          phone: params.get("phone"),
          email: params.get("email"),
          program: params.get("program"),
          city: params.get("city"),
          source: "Website",
          campaign: qs.get("utm_campaign") || undefined,
          utm_source: qs.get("utm_source") || undefined,
          utm_medium: qs.get("utm_medium") || undefined,
          utm_campaign: qs.get("utm_campaign") || undefined,
          utm_content: qs.get("utm_content") || undefined,
          utm_term: qs.get("utm_term") || undefined,
          landing_page: window.location.href,
        }),
        keepalive: true,
      }).catch(function () {
        /* Never block the site's own form submission on this. */
      });
    });
  })();
</script>
```

Adjust the `params.get("...")` calls to match the actual `name` attributes
on the website's form fields.

**Security note:** this key is visible in the page source, since it runs in
the browser. That's expected — it's a low-privilege key that can only create
leads (see `src/app/api/leads/route.ts`), it can't read any data, and it can
be revoked instantly from Settings if it's ever misused. Two extra layers
reduce risk further: set `LEAD_CAPTURE_ALLOWED_ORIGINS` (see below) so the
key only works from the college's own domain, and rotate the key
periodically.

### Option B — Plain HTML form (no JavaScript)

For a form that should work even with JavaScript disabled, point the form
directly at the endpoint and pass the key as a hidden field:

```html
<form action="https://YOUR-CRM-DOMAIN/api/leads" method="POST">
  <input type="hidden" name="api_key" value="PASTE_YOUR_KEY_HERE" />
  <input type="text" name="name" placeholder="Full name" required />
  <input type="tel" name="phone" placeholder="Phone number" required />
  <input type="email" name="email" placeholder="Email" />
  <input type="text" name="program" placeholder="Program" />
  <input type="text" name="city" placeholder="City" />
  <button type="submit">Submit</button>
</form>
```

Note this posts the browser directly to the CRM domain, so there is no
redirect back to a "thank you" page out of the box — pair it with a small
JS snippet (`fetch` + `event.preventDefault()`, then redirect) if that's
needed, or use Option A instead.

### Option C — Server-to-server (highest security)

If the website has any backend of its own (PHP, Node, a form-handling
service like Netlify Forms), have that backend call `POST /api/leads`
instead of the browser. The API key then never appears in page source at
all. Same request/response shape as above — see `docs/API.md`.

## 3. Restrict the key to the college's domain (recommended)

Set this environment variable on the CRM deployment:

```
LEAD_CAPTURE_ALLOWED_ORIGINS=https://www.thecollege.edu,https://thecollege.edu
```

When set, `/api/leads` rejects browser requests whose `Origin` header isn't
in the list — so a leaked key can't be used to spam leads from another site.
Server-to-server requests (Option C) don't send an `Origin` header and are
unaffected by this setting.

## 4. Field reference

| Field          | Required | Notes                                             |
| -------------- | -------- | -------------------------------------------------- |
| `name`         | yes      | Full name                                          |
| `phone`        | yes      | Any format; normalized to the last 10 digits       |
| `email`        | no       |                                                     |
| `program`      | no       | Program name or slug; falls back to the only active program if omitted and there's exactly one |
| `city`         | no       |                                                     |
| `state`        | no       |                                                     |
| `source`       | no       | Matched against Settings → lead sources; defaults to "Website" |
| `campaign`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `landing_page` | no | Stored as-is for attribution reporting |

## 5. What happens on submit

- If the phone number (normalized) already matches an existing lead, no
  duplicate lead is created — the existing lead gets a
  `duplicate_submission` activity entry and any missing email/city/state is
  filled in. This is the "same person moving through the funnel" rule (see
  `docs/DATABASE.md`).
- Otherwise a new lead is created with status `NEW`, unassigned, and shows
  up on the CRM dashboard immediately. Counselor assignment is manual (see
  `docs/WORKFLOWS.md`) — Phase 1 intentionally doesn't auto-assign.
- The response is JSON: `{ "success": true, "duplicate": false, "leadId": "..." }`.

## 6. Testing the connection

```bash
curl -X POST https://YOUR-CRM-DOMAIN/api/leads \
  -H "Content-Type: application/json" \
  -H "x-api-key: PASTE_YOUR_KEY_HERE" \
  -d '{"name":"Test Lead","phone":"9876543210","email":"test@example.com"}'
```

A `201` response with `"success": true` means the integration works — check
the lead appears in the CRM's lead list, then delete/ignore the test lead.
