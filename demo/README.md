# Synthetic demo data

The [README installation](../README.md) creates an empty `e_lingkod_bayan_demo` database, applies current migrations and generates the supported dataset from `demo/fixtures` plus the maintained loader. No SQL dump, existing password hash, session or ID image is required from another computer.

## Dataset and access

The fixture defines 108 reserved-domain accounts: 80 individual Citizens, 20 establishment representatives using Citizen accounts, four Staff and four Admins. It includes submitted/withdrawn/draft survey states and revisions, consent differences, establishment workforce, source-specific census imports, assistance scope and 28 labelled demonstration opportunities. Respondents, imports, establishments and workers remain distinct analytics populations. Fixture year is 2026, not the wall clock. These are fictional examples, not municipal population or recruitment statistics.

Yesel supplies the corresponding private `accounts.csv` separately. Keep it outside the repository and configure `DEMO_ACCOUNTS_FILE` in ignored `.env.demo.local`. Required columns are `email,password`; the supported catalogue also carries role/display/scenario metadata, which is checked where applicable. IDs in a catalogue from another installation are not imported as account identities. New passwords are hashed by installed Better Auth during normal synthetic registration; stored hashes are not distributed.

Account passwords are not MySQL credentials. Do not publish the catalogue or use demo passwords for existing collided accounts. Public registration still requires ID/Admin review. Only exact newly owned fixture identities receive explicit synthetic LEGACY status; they are never presented as ID-verified.

## Fresh setup and verification

Follow the primary README in order: create the empty dedicated database/user, generate local configuration, `npm.cmd ci`, client generation, migrations, `demo:setup`, `demo:verify`, then normal `dev`. The dedicated loader refuses an unmanaged nonempty database. It keeps a durable operation journal; unchanged completed setup does not replace records/passwords.

The setup tool writes local `demo/accounts.csv` and `demo/expected-counts.json` summaries after generation. The generated credential catalogue is ignored/private. Expected aggregate counts contain no credentials; the source fixture and application rules determine them. `demo:verify` checks representative domain/analytics semantics and authenticates all corresponding accounts without logging passwords. Sign-in checks can take several minutes and respect rate limits.

Normal application use is `http://localhost:3000` in this installation. The optional `demo:dev` launcher also supports a separate `http://localhost:3102` installation when `DEMO_BASE_URL` is set consistently; it is not required by colleagues or a dependency on a private review server. Do not run both against conflicting ports/configuration. Use separate browser profiles for separate localhost installations.

## Existing data and interrupted operations

For ordinary existing databases, use [additive import](IMPORT.md), never dedicated setup or a full SQL restore. Totals depend on existing records and collisions; 108 fixture definitions do not imply a fixed final ordinary account count.

Retain journals after interruption. An ambiguous mutation/manual edit stops for deliberate review rather than adopting an account, duplicating a revision or overwriting a newer record. Do not clear metadata, regenerate passwords, change the fixture version or create a new recovery directory to bypass a conflict. Dedicated demo migration upgrades preserve existing fields; they do not authorize resetting a manually edited demo.

## Optional private export/restore

`demo:export` produces a full dedicated-demo SQL export and manifest locally. These generated files contain credential hashes and are private, ignored artifacts—not PR assets or additive merges. It refuses identity-bearing exports. `demo:restore` requires an explicitly configured empty dedicated restore target; it must never target ordinary data. Consult the command's guard/manifest checks before this optional transfer workflow. It is unnecessary for fresh installation because fixture generation is reproducible.

The internal legacy importer paths/aliases remain supported for existing automation; maintained public instructions use [IMPORT.md](IMPORT.md). Synthetic import CSVs and fixture-generation modules are public source; account catalogues, generated SQL, captured mail and private journals are not.
