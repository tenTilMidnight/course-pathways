# Historical search-only prototype

Superseded by [Search and results](results-page.md). The revised specification now authorizes a results page; successful searches navigate there instead of displaying an inline summary. The approved landing-page appearance is retained. The following records the earlier implementation and is not the current scope or acceptance criteria.

Date: 2026-10-18. Source: the user's `../notes/preliminary.md`, read without modification. The user explicitly selected a search-entry-only prototype: submit saves the search and displays a summary on this page. Search results will be designed separately.

## Implemented scope

- English search landing page, with a left-hand button switching between Pathways and Courses, and a search icon button on the right. The larger mode switch includes a pathway icon or book icon on desktop and mobile, without a separator beside it.
- Minimal search-first layout near the top of the page, without promotional headlines, greetings, explanatory paragraphs, footer slogans, or divider lines. The mode switch and input placeholder communicate the search purpose; input labels remain available to assistive technology.
- Four title-cased suggestion chips at a time, with a More suggestions icon button. White chips have generous padding and rounded corners, use natural text widths, align to the search field's left edge, and wrap when needed; they are not stretched to fill the row. Each click randomly selects another batch from 24 local prompts per mode, excluding the current batch. It can be used indefinitely, but prompts eventually recur; this is not an infinite source of unique terms or a claim that matching results exist. Switching preserves the input and the last suggestions for each mode. Selecting a suggestion fills the input without submitting or adding history.
- The page background is white; shadows, subtle surfaces, and control outlines use neutral grays. The user chose selection style A: a rose mist fill (#F4EFF0), burgundy text (#7A1F2B), and a thin gray border (#D9D9D9) matching the unselected chip outline. It uses no checkmark or thick outline. The other four styles and temporary comparison assets have been removed. The accessible pressed state and chip dimensions remain stable when selected. Selecting another suggestion moves the selected state to it. Editing or clearing the input, changing mode, refreshing suggestions, choosing history, or returning from the summary clears the selection. Repeatedly choosing the same suggestion keeps it selected.
- Clicking or focusing the input opens recent searches. Selecting a history item fills the input without submitting; each item has its own delete button.
- Search button and Enter share the same validation and submission behavior. Blank/whitespace-only searches are rejected. Queries are trimmed, repeated whitespace is collapsed, and length is limited to 120 characters.
- Successful submission displays the query, search mode, and university in an inline summary. It does not navigate to a result or detail page, fabricate results, or make a search API request.
- Back to search clears the input and returns focus to it; the last submission remains in history.
- History is limited to six entries per mode, deduplicated without regard to letter case, and scoped by university. It persists in local browser storage. If storage is unavailable, history works for the current session. No sign-in is required.
- Keyboard support includes Tab, Enter, Escape to dismiss history, and Up/Down through recent queries. Input composition does not accidentally submit. All user queries are rendered as text.
- University identity, theme color, search vocabulary, and example terms are configured in `src/config.js`. The page does not offer an unimplemented university picker.

History retention, input length, example terms, preservation of text on mode switch, and the four-suggestion layout are implementation choices for review, not changes to the user's notes. The user's subsequent design direction requires minimum task-focused copy, understated white suggestion chips, and no divider lines. The desktop search field is capped at 720px wide and is 64px tall, positioned near the upper portion of the page. The two removed discovery concepts are retained in `docs/marketing-ideas.md` for possible future marketing work.

## Questions to resolve in a later specification revision

1. **Search results need their own specification.** The happy path and return behavior describe a transition from input to a browsing interface. If separate routes are intended, there are four view types: Search, Results, Pathway Detail, and Course Detail. Pathway and course results could share one Results page with a mode parameter, or be two separate pages. Define result-card fields, click targets, sorting, filters, pagination or loading, and empty/error states. No choice is implemented by this prototype.
2. **What does a query mean?** Can users combine major and career direction in one query? Does a course keyword match its title, description, skills, peer notes, or all of these? These decisions determine actual search behavior; the current page only captures the query and mode.
3. **What does returning from Results preserve?** The note specifies clearing the search input. Decide whether that also resets the search mode, and whether returning from a detail page should preserve filters and result scroll position. This prototype's Back to search clears the query and preserves the mode.
4. **A future Pathway profile needs an in-school alternative to a required job.** The draft allows current students but requires a current job. Consider a goal/status field for students who are not employed. This does not affect the current page.
5. **Identity, contribution, anonymity, and data sources remain open.** University email verification and alumni access need a separate decision when contribution/account work begins. Browsing currently has no authentication requirement. The interface does not claim to be an official university service.

## Suggested acceptance criteria

- The initial page clearly identifies the university and what Pathways searches find.
- One click switches the search mode and updates the mode button, placeholder, suggestions, and accessible labels without losing input.
- Every suggestion is title-cased. More suggestions works repeatedly without adjacent batches sharing terms; it does not change the query, save history, or submit. Clicking a suggestion only fills it.
- Pointer and keyboard selection visibly mark exactly one suggestion. The selected state remains after focus moves and clears when the input or search context changes.
- Input focus opens history; empty history is presented honestly without sample searches masquerading as past activity.
- Selecting a recent search only fills it; deleting a record does not fill or submit it, and the deletion survives reload.
- Enter and the search button create the same summary and history record. Blank input produces an inline error and no history entry.
- The summary contains the actual submitted query, mode, and university, and explicitly identifies that results are outside this preview.
- Back to search clears input and keeps the submitted search available in recent history.
- Mode/university histories do not leak into one another. Missing, malformed, or blocked storage does not disable the form.
- Keyboard users can operate all controls and dismiss history. At 375px wide and desktop width the page has no horizontal overflow.
- No Search Results, Pathway Detail, Course Detail, login, or contribution page is created.

## Run locally

Use Node.js 20 or later. There are no third-party runtime dependencies or installation step.

```powershell
cd C:\Users\grace\Projects\course-pathways\repo
npm run dev
```

Open `http://127.0.0.1:4173`. To use another port, set the process's `PORT` environment variable. The server binds to loopback and serves only the page and its assets, not notes or Git data.

Validation commands: `npm run check` and `npm test`.

Verified on 2026-10-18: all six storage/validation tests and JavaScript syntax checks pass. Browser checks covered blank submission, example/history fill without submission, Enter and button submission, mode isolation, persistence and deletion across reloads, clearing on return, and keyboard history navigation. Deleting a focused history row keeps the panel open and moves focus to the next delete control (or the input when empty). Layouts at 375px, 768px, and 1440px were inspected without horizontal overflow; the browser reported no console warnings or errors. These are browser viewport checks, not physical-device testing.

The implementation uses semantic HTML, CSS, and native JavaScript modules. Search behavior and storage are separated from university configuration. This small first page does not settle the eventual application framework, backend, or search engine. README.md remains unchanged.

Minimal-layout revision verification: existing six tests and syntax checks pass. Browser checks at 1280px and 375px confirmed the compact layout without horizontal overflow. Ten consecutive suggestion changes each returned four unique terms with no overlap with the immediately previous batch. Suggestions use title case. Keyboard Enter activates More suggestions, keeps focus on that button, preserves the typed query, and does not submit. Mode switching updates its own suggestion pool. No browser console warnings or errors were reported.

Selection revision verification: the six existing tests and syntax checks pass. Browser checks confirmed selecting and replacing a suggestion, keyboard Enter selection, clearing the state after editing or clearing input, and clearing it on refresh while retaining the query. Both icon modes and the 375px layout were inspected; there was no horizontal overflow.
