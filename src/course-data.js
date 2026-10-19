import { courses, pathways } from './demo-catalog.js';

// Current illustrative catalog is separate from each student's historical mappings.
// Faculty names and teaching terms are fictional fixtures, not actual CMU offerings.
export const currentCatalog = { year: 2026, label: '2026–27 demo catalog' };
export const coursePrograms = [...new Set(pathways.map(profile => profile.major))].sort();
const faculty = ['Jordan Lee', 'Taylor Morgan', 'Alex Rivera', 'Sam Chen'];
const terms = [{ season: 'Fall', year: 2026 }, { season: 'Spring', year: 2026 }, { season: 'Fall', year: 2025 }];
const categories = {
  core: 'Core coursework', methods: 'Quantitative & technical methods', electives: 'Program electives', breadth: 'College breadth',
};
export const courseDetails = courses.map((course, index) => {
  const mappings = coursePrograms.map(program => {
    const category = course.requirementCategory ?? (course.department === 'Statistics' ? 'methods' : 'core');
    const labels = [];
    if (course.department === program) labels.push(categories[category]);
    else if (category === 'breadth') labels.push('College breadth');
    else if (category === 'methods' && ['Information Systems', 'Computer Science', 'Statistics'].includes(program)) labels.push(categories.methods);
    else if (program === 'Information Systems' && ['Computer Science', 'Design'].includes(course.department)) labels.push('Concentration electives');
    return { program, requirements: [...new Set(labels)] };
  });
  return { id: course.id, universityId: course.universityId, catalog: currentCatalog, mappings,
    offerings: terms.map((term, i) => ({ term, instructor: faculty[(index + i) % faculty.length] })) };
});
