# Course Detail prototype

Implemented 2026-10-19 following the user's request to design this page using the established minimal interface.

## Content

- Course code, name, units, department, level and a concise description.
- Recent offerings: semester and instructor in simple text rows.
- Current requirements: program selector and explicitly labeled demo catalog version.
- In student pathways: earlier coursework → this course → later coursework, derived from shared learning connections.
- Who took this course: the same flip cards used in search results, showing major, career, academic details, standing, actual course semester and historical mapping. Clicking the card shows course highlights; View full path opens the student's semester independently on either face.
- Student notes: gray note blocks with student/semester context and a pathway link.

The two student sections initially show six records each. Show more adds six and moves focus to the first new pathway link. Student cards use three columns on wide screens, two at intermediate widths and one on phones. In-progress student profiles have a pale red year label without a preceding dot; alumni retain the plain Class of year. Optional fields are omitted; absent offerings, mappings, students or notes have short empty states. Unknown IDs show Course not found.

## Navigation

All course and pathway links open in a new tab, using safe local return routes. A student's View full path opens the semester where they took this course. The program selection is URL-backed and is carried into return links, including after changing it.

Course search results and pathway course popovers now open this page instead of a placeholder.

## Data and boundaries

`course-data.js` provides explicitly fictional 2026–27 current mappings and recent offerings. These are separate from each student's historical catalog/mappings. The page is not an official course catalog, prerequisite checker or degree audit.

`course-model.js` aggregates same-university enrollments without merging repeated attempts. Earlier/later connections come from explicitly stored support edges, not enrollment order or an inferred curriculum. Student notes remain personal historical records.

The page adds no account system, backend, real instructor data or recommendation score. All data remain demonstration fixtures.

## Verification

Model tests cover university isolation, repeated attempts, optional notes, current versus historical mappings, related-course deduplication and return/program validation. Browser checks cover desktop/mobile cards, flips and Escape, unique per-enrollment flip targets, program changes on both card links, Show more focus, and navigation to the correct pathway semester.
