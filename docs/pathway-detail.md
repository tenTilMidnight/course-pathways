# Pathway detail prototype

Updated 2026-10-19. Run `npm run dev` (Node.js 20+, no installation needed). The default port is 4173; set `PORT` for another port. The active review preview uses 4175.

## Layout and interaction

- Major and career use the same compact size, with a small gap. Career is brand red; concentration, additional degrees and minors follow both lines. White surfaces throughout.
- Pathways open in Timeline by default. The upper-right segmented toggle switches directly between Timeline and By year. Old Connection URLs fall back to Timeline. Course entries remain borderless with units at the top right.
- Timeline alternates semesters around a central axis. Notes sit opposite their course, with a small gray point on the axis aligned to that course. On phones, notes sit below the course beside the left-hand axis.
- By year groups semesters by academic year. Shared grid rows keep the two columns aligned, including wrapped course titles. A small Has note label sits beside the course code without adding a row; click the course to read the note in its preview.
- Connection is deferred and hidden from the application, including old URLs. Its implementation and tests are preserved; see [restoration notes](experiments/connection-view.md). The public build excludes its renderer and routing module.
- Clicking or tapping a course opens its adjacent preview.
- Requirement view and its controls are deferred. Historical mappings and graph data remain available for a future version, but do not create an alternative pathway view.
- Course previews are compact nonmodal popovers beside the course, falling above/below when needed. Every layout includes metadata, term, description, the student's note when shared, and View course details. Notes use a gray block after the description; no grade or missing-requirement footer appears. Escape, close and outside click dismiss; Escape/close return focus.
- Current students have a pale-red year label without a preceding dot. The pathway header also shows their supplied Class of year; search and Course Detail student cards show only their standing.
- Course Detail is implemented. Its links open in a new tab. Return links preserve local view/filter/semester context; unsafe or unrecognized destinations fall back to Search.
- URLs preserve semester layout and a linked semester. A link from Course Detail brings that semester into view; old requirement, row and navigator URLs normalize to the current semester layouts.

## Demo data

All students, identifiers, offerings, notes and mappings are synthetic. Every known semester contains four or five courses; unknown dates remain visibly unknown. Original search-card highlights retain their dates.

`supportingEnrollmentIds` records explicitly authored learning connections between particular enrollments. These are not official prerequisites, nor connections inferred merely from chronological order. Invalid, same-term and backward links are excluded. Repeated enrollments remain distinct.

Historical requirement mappings retain each student's catalog version. Multiple mappings do not imply completion or permission to double count; missing data does not imply an unmet degree requirement. Current course mappings are shown separately on Course Detail.

## Example routes

- `/?view=detail&mode=pathways&id=pathway-03&timeLayout=years` — By year.
- `/?view=detail&mode=pathways&id=pathway-03` — graduate with notes.
- `/?view=detail&mode=pathways&id=pathway-07` — current student.
- `/?view=detail&mode=pathways&id=pathway-17` — unknown catalog/term information.
- `/?view=detail&mode=courses&id=course-01` — implemented Course Detail.

## Verification

The suite has 42 passing tests and 25 syntax-checked JavaScript files. Coverage includes semester ordering, four/five-course loads, repeated enrollments, requirement filters with supporting ancestors, invalid graph edges, university isolation, safe project-subdirectory return URLs, separate historical/current mappings, and the preserved connection model/router.

Browser checks cover the two active layouts, default Timeline, toggle state, notes in previews and project navigation. Previous checks cover notes and timeline markers, aligned year rows, current-student year/class labels, 375px layouts, course cards and pagination. Preserved Connection checks are recorded in its experiment documentation.

The user's notes and README remain unchanged. Public deployment and the commit workflow are described in [deployment](deployment.md).
