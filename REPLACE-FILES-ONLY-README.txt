E-LINGKOD BAYAN — LANDING PAGE V3 PATCH
====================================
This ZIP updates the public landing page ONLY. The latest Login/Register pages stay unchanged.

HOW TO APPLY (Windows / VS Code)
1. Close the development server (Ctrl+C).
2. Extract this ZIP somewhere temporary.
3. Copy the 'src' and 'public' folders from this ZIP.
4. Paste them into your EXISTING 'e-lingkod-bayan' project root (where package.json lives).
5. Choose 'Replace files in destination' when Windows asks.
   Existing login/register code, package.json, and MySQL setup are NOT replaced.
6. Run: npm run dev
7. Open: http://localhost:3000

WHAT HAS CHANGED
- New human-centered photographic hero and refined navigation/footer.
- Quick access shortcuts.
- Search and filter for all SIX approved service modules.
- Native accessible dialog previews for each module.
- Interactive SAMPLE report tracking (use ELB-DEMO-001).
- Editorial community photograph + clearer About section.
- Steps overview and a unified style guide.

WHAT IS NOT CONNECTED YET
No backend, submissions, photo uploads, GPS, MySQL, email, real-time alerts, or actual
civic reports. Emergency phone numbers are intentionally not shown until verified.
Photos are AI-generated illustrations, not records of real government activities.

TEST DISPLAY SIZES
1920x1080, 1366x768, 1024x768, 768x1024, 390x844 and 360x800.
Check with Chrome F12 > Ctrl+Shift+M and inspect any Console errors.

FILES WERE ORGANIZED BY FEATURE:
src/features/landing/data/services.ts       approved modules, all copy & feature data
src/features/landing/sections/*              reusable landing sections
src/components/layout/*                      shared site-wide header/footer
src/lib/site-config.ts                       brand/navigation config
public/images/landing/*                      local optimized WebP photos

For maintaining a consistent brand, refer to BRAND-AND-UI-GUIDE.txt.
