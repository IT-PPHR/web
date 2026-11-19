Phi Phi Loy Krathong Online – API-only cleanup (based on Web.zip uploaded 19 Nov 2026)

UPDATED
- app.js: removed SEED_KRATHONGS and local mocked krathong creation/display.
- app.js: API create MUST succeed with item.id before showing success.
- app.js: API list failure shows error, does not generate seed/local test entries.
- app.js: HR Login always requires API hr_login and a real token; invalid/stale tokens cannot unlock HR UI.
- app.js: admin_list failure no longer substitutes local/seed participants.
- app.js: removes previous phiPhiLocalKrathongs_v1 browser cache on load.
- index.html: bumped app.js cache version to v51.

PRESERVED
- All site visuals, krathong design wizard, animation, sea movement, music, and HR interface.
- Local SavedDesign mappings (used for visual compatibility of previously submitted API items).
- Existing HR Lucky Draw logic (separate issue, still picks winner client-side and stores winner history in localStorage; NOT yet server-authoritative).

NOT INCLUDED
- Two unrelated archived ChatGPT conversation HTML files from the supplied archive (not website assets).
- No Worker or database source was provided, so backend validation/security rules could not be changed.

UPLOAD
Upload the included files to the existing site folder. For minimal deployment, only app.js and index.html need replacement; retain your existing config.js and other assets.

TEST CHECKLIST
1. Open website with valid API; only real backend records appear.
2. Temporarily point API_URL to a non-existent URL; sea must show error/no fake items and create must not succeed.
3. Test correct/incorrect HR PIN; incorrect or offline must never unlock HR.
4. Test stale local_admin_* token; HR panel must remain closed.
5. Submit a krathong and verify record exists in backend before claiming success.
