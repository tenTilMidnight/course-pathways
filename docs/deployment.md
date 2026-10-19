# Public project demo

Project URL: https://tentilmidnight.github.io/course-pathways/

The source repository stays private. GitHub Pages is public, uses HTTPS, and serves only the static website artifact. All displayed profiles and course data are demo fixtures.

Push to main to run the Deploy public demo workflow: tests, syntax checks, static build, and GitHub Pages deployment. The workflow can also be run manually in Actions. No extra dependencies or hosting credentials are needed.

Run `npm run build` locally to create `dist/`. It contains HTML, CSS, JavaScript and the favicon. Notes, repository documents, tests, Git metadata and the deferred Connection renderer/router are excluded. The build checks that local module imports resolve.

Relative asset links and the shared routing module support both the local root URL and the GitHub Pages project subdirectory, including nested return links. Existing Connection URLs open Timeline. The active pathway layouts are Timeline (default) and By year.

Connection's preserved source and restoration steps are documented in `docs/experiments/connection-view.md`.
