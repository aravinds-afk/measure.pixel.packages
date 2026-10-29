# Catalogue provenance

Source: `docs/Measure Pixel - Opportunity Board.pdf` (5 pages, internal). Transcribed into `src/data/opportunity-board.ts`. The database is seeded from that file; each board record keeps the original in `source_snapshot`, admin edits are overrides, and **Settings → Catalogue → Restore board values** undoes them.

## Taken from the board

| Item | Count | Detail |
|---|---|---|
| Service links | 5 | Be found (9) · Be chosen (7) · Capture it (4) · Follow up & retain (7) · Measure (5) |
| Services | 32 | Names exactly as printed |
| Industry clusters | 5 | Healthcare (9) · Education (8) · Property & build (8) · Money & B2B (8) · Consumer & local (11) |
| Industries | 44 | Names exactly as printed |
| Packaged offers | 14 | Number, name, audience label, buyer quote, components as printed, setup/project and monthly bands |
| Revenue | | ₹3,00,000/month by 23 Jan 2027; window from 25 Oct 2026; starting ₹25,000 signed, gap ₹2,75,000; ₹30K profit floor; 1-in-5 close-rate note; 1,408 combinations |
| Five routes | 5 | 12 × ₹25K, 10 × ₹30K, 6 × ₹50K, 4 × ₹75K, 5 × ₹60K average |
| Cash tier | | Dental & skin clinics, CA & CFO firms, Study abroad, Coaching institutes, Solar installers, Home services, Anyone already running ads |
| Measure note | | "Sells on its own at ₹15–25K/month and opens every other column." (kept on the Measure link) |

Offer price bands as seeded (the board's footer: *price bands are planning figures, set per client after discovery*):

| # | Offer | Upfront | Monthly |
|---|---|---|---|
| 1 | Clinic Patient Engine | Setup ₹40–60K | ₹35–50K |
| 2 | Specialty Launch Film | Project ₹1.5–3L | ₹20–30K |
| 3 | Study Abroad Intake System | Setup ₹50K | ₹40–60K |
| 4 | Admissions Season Engine | Setup Included | ₹50–75K × 6 months |
| 5 | Coaching Funnel & LMS | Setup ₹75K | ₹35–50K |
| 6 | Project Launch Package | Project ₹2–4L | ₹50–75K |
| 7 | Interior Enquiry System | Setup ₹60K | ₹50–75K |
| 8 | Professional Services Enquiry Desk | Setup ₹25K | ₹25–35K |
| 9 | B2B Pipeline Build | Setup ₹1L | ₹40–60K |
| 10 | Local Domination Pack | Setup ₹15K | ₹18–28K |
| 11 | Solar & Home Services Lead Engine | Setup ₹25K | ₹25–40K |
| 12 | Hospitality Visibility Pack | Setup ₹40K | ₹30–45K |
| 13 | Measurement Retainer | Setup ₹30K | ₹15–25K |
| 14 | AI Follow-up Layer | Setup ₹60K | ₹25–40K |

## Needs configuration (flagged in the app)

1. **Individual service prices.** The board prices offers, not services. 29 of 32 services have no price and show *Price not configured*; a line for them must be priced in the quotation before it can be issued. Set default tiers in **Settings → Catalogue → Services**.
2. **Example prices from the build brief** (labelled *Example price*, not approved list prices):
   - Video production: Social media video ₹3,500/video; YouTube marketing video ₹5,000/video.
   - Meta Ads and Google Ads: "Performance marketing — management only" ₹50,000/month; "— management + video production" ₹60,000/month. The brief named "performance marketing" without a platform, so both ad services carry these tiers.
3. **Offer component → service mappings.** Components are printed as short labels. Exact matches are marked `exact`; interpreted ones are `inferred` and should be reviewed in **Settings → Catalogue → Offers**:
   - "Landing page", "Landing page & funnel" → Landing pages & funnels
   - "Conversion tracking" → Conversion tracking & CAPI · "Dashboard(s)" → Dashboards & reporting · "Monthly review" → Strategy & consulting
   - "Social media" → Social media management · "Video" → Video production · "Video funnel" → Video production + Landing pages & funnels
   - "Paid amplification", "Meta & Google Ads" → Meta Ads + Google Ads · "Google Ads exact match", "Local Google Ads" → Google Ads
   - "CRM" → CRM setup · "CRM follow-up" → CRM & sales automation · "Email & SMS" → Email & SMS automation · "LMS build" → LMS & online learning
   - "Website" → Website development · "LinkedIn outbound" → LinkedIn & B2B outbound · "Reviews" → Reputation & reviews
   - **"Lead qualification" (Interior Enquiry System) is unmapped** — no board service clearly matches. Recommendations flag it as needing scope confirmation.
4. **Offer → industry fit.** The board gives each offer a cluster, not a list of industries. Cluster membership decides eligibility. A short "suggested industries" list per offer, inferred from the offer name (e.g. Study Abroad Intake System → Study abroad consultants), only adds ranking weight. Editable.
5. **Deliverable descriptions** for services and offers are empty (the board has none). Add client-facing descriptions in Settings; they print on quotations.
6. **Delivery costs** are zero until set; margins show "not configured" until then.

## Measure Pixel defaults (not on the board)

Seeded from `src/data/defaults.ts`, all editable:

- **Audit checklist**: the 10 categories from the brief with 52 items, each mapped to the board services that close the gap; 16 items can be prefilled or suggested from website signals.
- **Recommendation rules**: one rule per offer — audit-gap triggers, goal triggers, weights, minimum score 6, expected outcome text. **Settings → Rules** explains the scoring.
- **Service dependencies**: e.g. Google/Meta Ads → Conversion tracking & CAPI; CRM & sales automation, AI business automation, Email & SMS → CRM setup; Dashboards, CRO, CAPI → GA4 & GTM.
- **Business goals** (10) and **industry keywords** used to suggest an industry from website text.
- **Commercial defaults**: GST 18% on, 15-day validity, consultant discount cap 10%, first recurring period due up front, payment terms, assumptions, exclusions and next-step text. Confirm these with your accountant and update **Settings → General**.

## Brand

No logo file was available. The app uses the board's own header treatment — a lime square and the spaced "MEASURE PIXEL" wordmark — with the board's black, off-white and lime palette. Replace `Wordmark` in `src/components/ui.tsx` and the header in `src/server/pdf/quote-pdf.tsx` when the official logo is available.
