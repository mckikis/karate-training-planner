# Karate Training Planner – project rules

Installable web app (PWA) for karate coaches of the club Katsudo Sabinov. Coaches keep a library of exercises (with photos, GIFs or videos) and build trainings whose duration and time schedule the app calculates. All data lives only on the phone (IndexedDB). There is no backend.

- What and why: `SPEC.md` (Slovak), `project.md`
- How (implementation spec for agents): `karate-training-planner-design.md`
- Pipeline: `/implement karate-training-planner-design.md <step>` (`.claude/skills/implement/SKILL.md`)

## Commands (run from the repository root)

| Purpose | Command |
| --- | --- |
| Install dependencies | `npm ci` |
| Dev server (also reachable from a phone on the same Wi-Fi) | `npm run dev` |
| Type check | `npm run typecheck` |
| Unit tests | `npm test` |
| Lint | `npm run lint` |
| Production build | `npm run build` |

Before reporting, every agent runs `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` – whichever exist at that point of the implementation order.

If `npm install` / `npm ci` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (network or antivirus certificate), run it as `NODE_OPTIONS=--use-system-ca npm ci`. Never disable SSL checks in the project configuration.

## Conventions

- **Language:** all user-facing text is Slovak. Code, identifiers, comments and commit messages are English.
- **Data:** the database is defined only in `src/db.ts` (Dexie). Never edit an existing `db.version(n)` block – a schema change is a new version with its own `upgrade()`.
- **Starter data:** default categories and exercises live in `src/starterData.ts`; their media files in `public/exercises/`.
- **Units:** all durations are integer seconds (except `secondsPerRep`, which may be a decimal). Dates are `YYYY-MM-DD` strings, times `HH:MM`.
- **Time maths** belongs in `src/time.ts` as pure functions with unit tests – never inline in components.
- **Routing:** keep `HashRouter`; GitHub Pages cannot serve other paths. Keep `base` in `vite.config.ts`.
- **Dependencies:** add a package only when the design document names it.
- **Styling:** plain CSS in `src/index.css`, colours as variables in `:root`. Touch targets at least 44 px; inputs at least 16 px font (iOS zoom).
- **Deploy:** a push to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. Agents never push.
