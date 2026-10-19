# Deferred Connection view

Saved on 2026-10-19. The public pathway page now exposes only Timeline and By year.

The preserved implementation is in `src/course-graph-view.js`, with obstacle routing in `src/connection-routing.js`, shared data helpers in `src/learning-graph.js`, and the graph styles in `src/course-detail.css`. Its model and geometry tests remain in `tests/learning-graph.test.js` and `tests/connection-routing.test.js`.

It keeps semesters in one horizontal row, reveals learning connections and the active note on hover or keyboard focus, opens course previews on click, and offers an explicit Focus connections / Show all semesters action. The renderer accepts `(detail, onPreview, closePreview)` and returns its element plus selection, semester-reveal, focus and destroy methods.

To restore it, import the renderer in Pathway Detail, add the layout to the model and toggle, mount/destroy it during layout changes, wire preview-close to clearSelection, and restore the preview's focus action. Remove its two renderer/router modules from the static build exclusion list. The learning-graph model remains active because Course Detail also uses the shared data.

Until then, old `timeLayout=connections` links fall back to Timeline; the renderer is not imported by the application or published in the website artifact.
