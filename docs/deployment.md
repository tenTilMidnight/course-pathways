# Public project demo

Project URL: https://tentilmidnight.github.io/course-pathways/

The source repository stays private. GitHub Pages is public, uses HTTPS, and serves only the static website artifact. The site includes Grace’s explicitly approved public pathway alongside clearly identified demo fixtures.

Push to main to run the Deploy public demo workflow: tests, syntax checks, static build, and GitHub Pages deployment. The workflow can also be run manually in Actions. No extra dependencies or hosting credentials are needed.

Run `npm run build` locally to create `dist/`. It contains HTML, CSS, JavaScript and the favicon. Notes, repository documents, tests, Git metadata, personal review modules/routes, the standalone connection experiment and the older deferred Connection renderer/router are excluded. The shared Overview renderer is included. Grace authorized publishing her profile, 18 CMU course enrollments, related official course information and the existing transfer-background/connection view on 2026-10-20. The explicit `src/published-grace.js` snapshot is public; private review metadata, grade/note fields and source-file paths remain excluded. `scripts/publish-grace.mjs` regenerates that snapshot only when an approved update is intentionally published, not during routine builds. The build checks that local module imports resolve.

Relative asset links and the shared routing module support both the local root URL and the GitHub Pages project subdirectory, including nested return links. The active pathway layouts are Timeline (default) and Overview. Overview displays the semester grid and opens a connection graph on course selection; the separate reading surface keeps prerequisites and corequisites collapsed until requested. Legacy By year links select Overview.

Connection's preserved source and restoration steps are documented in `docs/experiments/connection-view.md`.

Grace’s public route is `?view=detail&mode=pathways&id=grace`; add `timeLayout=connections` for Overview. Her real course routes use `?view=detail&mode=courses&id=cmu-07-280` (and the other published course IDs). All links and return navigation support the GitHub Pages project base. Default Best match temporarily prioritizes her matching profile over demos; explicit sorts and filters still apply.
