# Sogod website

Bilingual English/Tagalog static website starter for Azure Static Web Apps.

## Replace content
- Photos: `assets/images/gallery-1.svg`, `gallery-2.svg`, `gallery-3.svg`
- Video: add `assets/video/sogod-intro.mp4`
- Google Maps: replace the iframe `src` in `index.html` with your exact Google Maps embed URL
- Contact: current form opens the visitor's mail app and addresses the message to `henrik.bergfjord@outlook.com`

## Important about the contact form
A static site cannot securely send email directly without a backend or form service. The included form uses `mailto:` so it works without secrets or server code. For direct delivery later, use Azure Functions, Formspree, Getform or similar.

## Suggested future pages
- `pages/about.html` – longer history / story of Sogod
- `pages/news.html` – updates and construction progress
- `pages/visit.html` – directions, local practical information
- `pages/gallery.html` – larger gallery

## Azure Static Web Apps
Use the repository root as the app location:
- app_location: `/`
- api_location: empty
- output_location: empty
