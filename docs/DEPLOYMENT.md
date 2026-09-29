# Gallery production deployment handoff

This release registers only Gallery Functions (`api/src/index.js` imports
`api/src/gallery.js`). Keep `BOOKING_ENABLED=false`. PostgreSQL-backed booking
handlers are not registered for this release; online requests use the email
fallback, and PostgreSQL, `DATABASE_URL` and migrations are not Gallery deployment
prerequisites. The workflow validates committed source before upload and does not
run generation scripts or rewrite source files.

The legacy local MP4 files and poster images are intentionally deleted. The Gallery
starts without legacy video entries; no clips need migration. Future videos are added
by pasting a YouTube URL into Gallery Admin and play inside the public Gallery using
the privacy-enhanced YouTube embed.

## Data handling and privacy

The public `request.html` form collects a name, email address, optional phone number,
travel dates, group size, selected services, budget/location details and a free-text
message. Its consent checkbox states that Sogod may use those details to handle the
request. When enabled, the API stores them in PostgreSQL (`service_requests`) and
may queue acknowledgement/front-desk emails in `mail_outbox`. A staff member sends
queued messages from the front desk; acceptance by Microsoft is not proof of delivery.
The request system does not take payment.

If online requests are disabled or unavailable, the request page can prepare a
`mailto:` message to the same front-desk address used by the legacy booking form.
The visitor must send it from their email app; it is not stored by the website.

No automatic retention or deletion schedule is implemented in the API or migrations.
Before enabling submissions with real guests, publish a verified privacy notice and
contact point, define retention/deletion and backup expiry, and test the process. The
repository's `BOOKING_ENABLED=false` example is only a default. At the last public
service check, online requests and mail were both reported unavailable; re-check the
service endpoint after deployment because Azure settings can change independently.

The separate `pages/contact.html` form builds a `mailto:` link and opens the visitor's
email app; it does not post to the request API. Microsoft Clarity remains enabled on
the pages that were previously instrumented; forms on tracked pages are marked for
masking. Keep the privacy notice and any applicable consent behavior aligned with the
analytics configuration.

The public `/gallery.html` and its curated static photos remain publicly accessible.
New photos are processed in the Functions API, converted to optimized WebP full
images (maximum 1800×1800, quality 84) and 480×480 previews (quality 78), then
written to the public `gallery-public` Blob container. Sharp applies orientation and
does not copy EXIF metadata to the optimized versions. The request body is limited to
25 MB and 40 megapixels. The original is also saved in the private
`gallery-originals` container; only the authenticated gallery API can download it.
Originals retain their embedded metadata, so authorized managers should treat them as
potentially location-sensitive and only upload images intended for gallery
administration. The original is never served to public gallery visitors. Both
original and optimized files persist across deployments. The admin interface can
download either the protected original or the public optimized full image.
Image processing is synchronous and must complete within Static Web Apps' 45-second
maximum API request duration; the admin client times out at 40 seconds. Failed
processing occurs before storage writes, and a failed save cleans up partial outputs.
No video file upload or video storage is implemented.

Gallery administration uses the Static Web Apps Microsoft sign-in. Static Web Apps
protects `/gallery-admin.html` with the `gallery` role, and every list, upload, edit,
original/optimized download and delete API independently checks the trusted
client-principal header for that explicit role. Authenticated users without that
role cannot manage gallery entries. YouTube records contain only the validated
video ID, title, caption and date. Players use youtube-nocookie embeds and are
created only after a visitor activates a poster. Video bytes are neither uploaded nor
stored by this site.

## Gallery Azure setup

1. Create a Storage account with anonymous blob access permitted at the account level.
2. Configure `GALLERY_STORAGE_CONNECTION_STRING` as a server-side SWA API setting.
   Optionally set `GALLERY_PUBLIC_CONTAINER` (default `gallery-public`) and
   `GALLERY_ORIGINALS_CONTAINER` (default `gallery-originals`). Do not put connection
   strings in the repository or browser code.
3. Assign the `gallery` custom role to the explicitly approved Microsoft accounts
   through Static Web Apps role invitations. The role is not granted to all
   authenticated users. Normal public gallery routes do not require authentication.
4. The API creates the public-read blob container, private originals container and
   public JSON manifest on first use. Verify anonymous blob reads work for the public
   container and that the originals container has no public access. If either
   container already exists, set and verify its access level explicitly; the API
   does not change an existing container's access policy. Existing gallery items are
   not migrated automatically into the manifest.
5. The Gallery intentionally starts without legacy videos. Add a video later by
   pasting its YouTube URL into Gallery Admin. Video files are not uploaded to Sogod.

## Future booking service — not part of this release

The following database-backed booking implementation is future work. Do not provision
PostgreSQL, apply migrations, or set `DATABASE_URL` for the Gallery release. Keep
`BOOKING_ENABLED=false`; the public request form uses its email fallback.

Before a separate booking-service release, provision PostgreSQL with TLS and
restricted access; apply `database/001_services.sql` and then
`database/002_products_proposals.sql`; define customer-data retention and backup
expiry; add abuse protection; verify property/resource data, Microsoft roles and mail
settings; and complete staging integration tests. Do not enable online requests until
those checks pass.

The booking modules and proposal flows have separate outstanding work: supplier
and external-calendar integration, staff operations, customer proposal lifecycle,
verified property configuration and production end-to-end testing. Do not treat these
features as live or available in this release.


## Local checks

`node scripts/check-site.mjs` checks page metadata, local links/assets, analytics policy
and JavaScript syntax. `npm ci --prefix api` then `npm test --prefix api` runs validation,
access-role and PostgreSQL-compatible transaction tests using PGlite in memory. These
checks do not test Azure infrastructure or send mail. Static preview:
`python3 -m http.server 8767`; without the registered booking API, online submission
is unavailable and the form offers its `mailto:` fallback.
No production customer data has been created during development.

## Official integration references

- https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization
- https://learn.microsoft.com/en-us/azure/static-web-apps/user-information
- https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/auth-v2-service
- https://www.airbnb.com/help/article/99
