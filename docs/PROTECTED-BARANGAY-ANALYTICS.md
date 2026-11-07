# Protected barangay analytics

The workforce overview remains available only through the existing CENSUS role/module and exact barangay authorization. Public census analytics is deferred. The maps describe the selected source population, survey year and applied filters; they are not municipal population estimates.

## Populations and measures

| Population | First map | Second map | Denominator and missing inputs |
|---|---|---|---|
| Individual | Eligible retained annual respondents by barangay | Respondents whose training interest is exactly YES | First-map context: all eligible respondents in that applied source group, including unmapped geography. Second-map denominator: eligible respondents in that barangay, including missing answers. YES/MAYBE/NO/NOT_NOW are known; missing/invalid answers remain missing. |
| Imports | Accepted source observations by barangay | Observations whose training interest is exactly YES | Same arithmetic within one accepted source/year group after existing stable-source deduplication and conflict rules. Observations are not unique additional people. |
| Establishments | Eligible retained annual establishment records | Sum of known reported totalWorkers | Show establishments with known workforce / eligible establishments. Known numeric zero is retained; missing is not zero. Do not add overlapping worker subcategories or call this unique municipal employment. |
| SPES | Eligible observations in one source/year/dataset group | Observations with at least one normalized nonblank training/program-interest selection | Count each observation once. Denominator: all eligible observations in that barangay. No recorded selection is missing, not evidence of no interest or verified training demand. |

Entirely missing secondary inputs produce `null` (Not recorded), never an asserted zero. An empty barangay has zero eligible records and an unavailable secondary measure. The two maps have separate scales and units. No account counts enter these measures.

The server calls the geographic summarizer beside the existing aggregate summarizer on each **final eligible row array**, in the same RepeatableRead transaction. Existing annual submission, consent, withdrawal, source/dataset, held/rejected import and deduplication rules are retained. Marginal charts are never used to infer joint geography.

## Scope, aliases and export

Exact stored barangay authorization is enforced before display-name mapping. Canonical PSGC identity does not authorize a row. Current names and historical aliases can share a polygon without rewriting records; unmapped eligible rows remain explicitly counted in source totals.

An existing exact-name filter retains its meaning. The drawer names its source filter key, with an explanation when the displayed PSA name differs. For example, applying `Tadlac` does not silently include other stored historical labels. Changing this filter contract would require a separately reviewed authorization/data change.

Only authorized cells, metric inputs, maxima and integer legend bins reach the client. Outside-scope geometry is public background context and contains no numeric cell data. Map/detail/CSV use the same applied response; geographic export rows include metric, numerator, denominator, known and missing counts. Names, contacts, identity review state and ID documents are absent.

## Geometry and interaction

See [geometry provenance, licence and reproducibility](barangay-geometry.md). Fourteen full-fidelity OCHA/NAMRIA/PSA polygons are bundled locally; there is no tile service, invented polygon, geographic runtime dependency or simplification. Shared Mercator display projection preserves shared boundaries. Dual boundary strokes remain visible against zero and heat fills without changing numeric meaning.

Positive values use authorized-data sequential bins with exact inclusive integer ranges. Zero, missing and outside-scope have separate patterns. Click/tap/Enter/Space open aggregate details; arrows/Home/End move through authorized regions. The table provides all fourteen names and equivalent available actions. Opening details never applies a filter. The named native drawer focuses its heading, contains focus, closes on Close/Escape and returns focus to its trigger. Reduced motion keeps these states without movement.

Draft filters are explicit until Apply. Successful, meaningful applications add browser history entries; Back/Forward, reload and valid shared URLs restore the applied controls and results. Failed requests do not commit a new URL. Abort plus synchronous request generations reject superseded responses, including delayed failure JSON and responses interrupted by history navigation. Retry performs a new request. Previous results are explicitly labelled during loading/failure, and exports are withheld during draft/loading/error states.

Clear barangay beside the overview removes only the applied geographic filter, preserving population, source, year and other applied filters. Optional applied-filter chips can be removed individually. Reset all filters returns to individual respondents, the current Manila calendar year, all authorised barangays and no optional filters. The overview geography selector and detailed controls share draft state; Apply commits it explicitly.

Permission scope is separate from current geography. The server's `availableRegions` contains only exact permitted `code`/`filterKey` navigation pairs, without counts. Applied `cells`, scales, chart data and export remain restricted to the applied eligible rows. Another permitted region is labelled **Not in applied view**, remains selectable, and offers an explicit Apply action without fetching its counts first. Forbidden regions remain **Outside scope**, inert and without data. Display aliases never broaden stored-key authority.

## Setup and verification

No new database migration, dependency version, sender configuration or map API key is required by Release 2. Release 1's reviewed schema and identity policy remain prerequisites. Keep private document storage, RSA and server-only mail configuration as documented in the existing setup guides; this release does not verify real email delivery.

`npm ci` generates the ignored Prisma client using repository-pinned versions. Run `npm run typecheck` and `npm run test:all -- --test-concurrency=1`. Geographic unit/regression tests are `tests/barangay-*.test.mjs`. Guarded database analytics checks use the maintained census verifier; never point test markers at an ordinary database.

`scripts/verify-flat2.mjs` provides the protected browser matrix, and `scripts/verify-flat2-material.mjs` exercises material synthetic workflows. Read their `--env`/`--state` guards before use. Private fixture credentials, local captured mail and ID artifacts belong outside source/staging. Fresh run results and tested hashes belong in the review handoff, not in this maintained design contract.
