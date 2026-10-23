# Admin guide

## Importing chapter members

Use only data your chapter is authorised to use. ConnectSphere does not scrape or log into any third-party system.

1. **Export** your roster from your official member system as CSV or Excel (.xlsx). A fictional example is available from *Import & sync → Sample CSV*.
2. **Upload** it in *Import & sync*. The file is parsed in your browser; nothing is saved yet.
3. **Map columns.** Common headers (Member ID, First/Last Name, Company, Category/Classification, Email, Phone, Website, City, Services, Target Market, Industries, Problems Solved, Keywords, Ideal Referral) are mapped automatically. Unmapped columns are ignored. A name column is required.
4. **Validate & preview.** The server re-validates every row and shows:
   - *New member* — no match found.
   - *Update existing* — matched by member ID, otherwise by email.
   - *Possible duplicate* — same name and company as an existing record but no ID/email match. Choose **Skip**, **Merge into existing** or **Create as new member** per row.
   - *Duplicate in file* — repeated row; skipped.
   - *Error* — e.g. no name; skipped.
   - Warnings: invalid emails, phone numbers, URLs or numbers are dropped from that row, not imported. Categories not in the profession taxonomy are stored as custom categories (lower scoring confidence).
   - Missing-field counts per column.
5. **Import.** Updates are incremental: empty cells never erase existing data, and fields a member has edited themselves are kept unless you tick *Overwrite fields members have edited themselves*. Imported values are marked **Verified**.
6. Results and every past import are listed under *Import history* and in the *Audit log*.

Re-import whenever your roster changes; member ID matching keeps records stable.

## Manual entry

*Member management → Add member* creates a single record (marked as manually entered).

## Invitations and roles

- *Member management → Invite* sends a Supabase invitation linked to that member record. When they sign in, the account is linked automatically.
- Roles: **Admin** (data, imports, settings, roles), **Leadership** (analytics, inactive members, chapter activity), **Member**.
- You cannot change your own role, and admins cannot be removed by members.

## Departed members

- **Deactivate** hides the member from the directory and scoring and removes their sign-in access to the chapter. History is kept; you can reactivate.
- **Erase permanently** (inactive members only) deletes the record and everything linked to it. Use this for deletion requests or retention policy.

## Correcting data and recommendations

- Edit any profile from the member page. Changes are recorded in the member's change history.
- Members can flag referral recommendations as inaccurate. Review them in *Member management → Recommendation review*: record a resolution and optionally withdraw the recommendation for the whole chapter. Withdrawn recommendations can be restored.

## Scoring configuration

*Member management → Scoring weights*: adjust factor weights (must total 100%) and score-band labels. Changes apply to new reports immediately and are audited. See [SCORING.md](SCORING.md).

## Contact spheres

Spheres are derived automatically from members' categories. On the *Contact spheres* page, admins can additionally **record** members as formal sphere members; recorded co-membership counts fully toward the sphere-alignment factor.
