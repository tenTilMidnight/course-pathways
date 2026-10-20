# Public project demo

Project URL: https://tentilmidnight.github.io/course-pathways/

The source repository stays private. GitHub Pages is public, uses HTTPS, and serves only the static website artifact. All displayed profiles and course data are demo fixtures.

Push to main to run the Deploy public demo workflow: tests, syntax checks, static build, and GitHub Pages deployment. The workflow can also be run manually in Actions. No extra dependencies or hosting credentials are needed.

Run `npm run build` locally to create `dist/`. It contains HTML, CSS, JavaScript and the favicon. Notes, repository documents, tests, Git metadata, personal review modules/routes, the standalone connection experiment and the older deferred Connection renderer/router are excluded. The shared Overview renderer is included. Grace’s local review is retained in the private source repository but is not part of the public artifact. The build checks that local module imports resolve.

Relative asset links and the shared routing module support both the local root URL and the GitHub Pages project subdirectory, including nested return links. The active pathway layouts are Timeline (default) and Overview. Overview displays the semester grid and opens a connection graph on course selection; the separate reading surface keeps prerequisites and corequisites collapsed until requested. Legacy By year links fall back to Timeline.

Connection's preserved source and restoration steps are documented in `docs/experiments/connection-view.md`.
