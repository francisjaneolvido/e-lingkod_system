# Release 2 visual and interaction system

The shared foundation uses locally bundled Archivo headings/numerals and Source Sans 3 working text, while Poppins keeps the familiar brand mark. Font licences remain in `public/fonts`; no runtime font service, map key or new dependency is required.

Use semantic theme tokens and `foundation.css` for content/inset/raised surfaces, spacing and controls. Page families own layout in their existing workspace/public/account/profiling/civic/jobs styles. Reserve elevation for a meaningful task, control or overlay; avoid wrapping every paragraph in a floating card. Keep primary actions and required instructions/consent visible. Supporting tool links can use `ActionGroup`, an inline native disclosure with keyboard, outside-click and Escape focus return. It expands within layout, including cards/dialogs, rather than requiring an arbitrary stacking layer.

Public navigation has shallow Services/Community groups, a contextual account menu and one mobile modal. Admin/Staff navigation uses labelled expandable task groups, automatically exposes the current group and retains an obvious Overview/return path. Even compact navigation keeps text labels. Notifications use an inline panel inside the public mobile modal so keyboard containment and Escape ordering remain coherent. The appearance control is always one button cycling Light → Dark → OLED → Light.

## Form controls and menus

Use native selects for short, familiar single choices. Leave their platform popup behavior intact. Visible working labels, padding, focus rings and selected values must fit the actual parent, not just the viewport. Use content-driven form tracks such as `repeat(auto-fit,minmax(min(100%,220px),1fr))`. Full-width helper rows should use `grid-column:1/-1`; fixed child spans can create unwanted implicit tracks after changing a parent grid. Always inspect open controls and long options at narrow desktop, tablet and mobile sizes.

Opportunities keeps query, barangay and work type directly visible; labelled additional criteria retain every previous filter and value contract. Its former three-column viewport grid inside a 300px sidebar has been replaced with a content-based layout. This preserves readable labels without hiding overflow or inventing a z-index fix. Service-builder delete actions are contextual named 44px controls; edited form answers remain local until Save. Queue actions stay on one line while long record names can wrap.

Analytics geography recovery, history, scope and export contracts are documented in [protected analytics](PROTECTED-BARANGAY-ANALYTICS.md). Neither a theme change nor menu interaction should lose answers, move focus/scroll unexpectedly, apply a geographic filter silently or alter permission scope.

## Verification

Use only explicit guarded disposable environments for writes. The ordinary application database must not be used by these runners. `scripts/verify-flat2.mjs` provides the public/role/theme/viewport matrix and analytics checks; `scripts/verify-flat2-material.mjs` exercises synthetic registrations, document correction, review, saved answers, reports and service documents. Its B3 fixture origin is 3117.

Capture-only recovery has a separate existing `elb_site_release_test_*` guard and 3118 origin. Use `scripts/verify-flat2-recovery-ui.mjs` with its explicit private state. A B3 schema is intentionally not accepted by the recovery capture transport; never weaken that allowlist or relabel unavailable capture delivery as verified. Captured mail and reset links remain private, excluded from review packages. This is not proof of delivery through a real configured sender.

Targeted control runners:

```powershell
node scripts/verify-global-controls.mjs --case opportunities --state $PrivateSyntheticState --playwright $PlaywrightModule --output $IgnoredEvidence
node scripts/verify-global-controls.mjs --case workflows --state $PrivateSyntheticState --admin-state $PrivateAdminSession --playwright $PlaywrightModule --output $IgnoredEvidence
node scripts/verify-analytics-navigation.mjs --state $PrivateSyntheticState --admin-state $PrivateAdminSession --playwright $PlaywrightModule --output $IgnoredEvidence
```

Supply private paths explicitly; do not put credentials into command arguments or tracked files. The maintained tests exercise native keyboard selection, long controls, content-based grids, local answer retention, ActionGroup dismissal/focus within an overlay and queue Apply/Clear recovery. Native browser popup styling is platform-managed; closed screenshots are not evidence of open-menu behavior.

Run the repository suite, TypeScript, scoped lint, Prisma validation/generation and an isolated production build for final handoff. Record exact source hashes, baseline lint findings, guarded skips and failed/interrupted attempts separately. Retain white-paper print output and protected Open/download controls; never relax document ownership, CSP or sandboxing for visual convenience.
