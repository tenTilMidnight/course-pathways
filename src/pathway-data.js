import { pathways, courses } from './demo-catalog.js';

// Entirely synthetic shared coursework and historical requirement mappings.
// These are deliberately not a degree audit, complete transcript, or official CMU catalog.
const personalNotes = {
  'Database Design': 'Building the database for a team project helped me see how much a good data model changes the rest of an application.',
  'Application Design': 'My first end-to-end application. Working with a partner made me more deliberate about explaining design decisions.',
  'User Research Methods': 'I took this to get better at asking questions before jumping to a solution. The interview project changed how I approached later studios.',
  'Data Visualization': 'A useful complement to my technical courses. I kept returning to the question of what someone should understand from a chart.',
  'Software Design': 'I started to enjoy the structure behind a system as much as the feature itself. That helped clarify the kind of work I wanted to explore.',
  'Interaction Design Studio': 'The weekly critiques were the most valuable part for me. I learned to make smaller prototypes and test them earlier.',
};

const alternateNotes = {
  'Database Design': ['The project gave me a better sense of how to structure data before building an interface.', 'I used the SQL work again in later analytics classes. The most useful part was checking assumptions in the data.'],
  'Application Design': ['This was the first time I brought research, interface decisions, and implementation together in one project.', 'Working on a real application helped me decide that I wanted more software-focused courses.'],
  'User Research Methods': ['Learning to write an interview guide was useful in my next studio. I became more careful about leading questions.', 'The fieldwork helped me connect what people said with what they actually did.'],
  'Data Visualization': ['I used the critique process again when explaining results in my capstone project.', 'The assignments helped me think about what to leave out of a chart, as much as what to include.'],
  'Software Design': ['The design reviews changed how I approached team code. I started documenting tradeoffs before implementation.', 'I found myself using the same design patterns in the next project, especially when responsibilities became unclear.'],
  'Interaction Design Studio': ['Making several small prototypes helped me get feedback before committing to a direction.', 'I liked connecting the research to concrete interface decisions. That helped shape my later course choices.'],
};
function personalNote(title, profile) {
  const options = [personalNotes[title], ...(alternateNotes[title] ?? [])].filter(Boolean);
  return options.length ? options[Number(profile.id.split('-')[1]) % options.length] : null;
}

// Explicit FICTIONAL relationships for testing the requirement-path interaction.
// Learning support described in fictional student experiences, not official prerequisites.
const demoSupports = {
  'Database Design': ['Programming Principles', 'Systems Analysis'],
  'Data Structures': ['Programming Principles', 'Discrete Mathematics'],
  'Algorithms': ['Data Structures', 'Discrete Mathematics'],
  'Web Development': ['Programming Principles', 'Visual Communication'],
  'Software Testing': ['Software Design'],
  'Distributed Systems': ['Computer Networks', 'Algorithms'],
  'Cloud Application Development': ['Web Development', 'Database Design'],
  'Data Engineering': ['Database Design', 'Programming Principles'],
  'Applied Regression': ['Probability & Statistics', 'Linear Algebra'],
  'Decision Support Systems': ['Data & Decisions', 'Data Visualization'],
  'Client Consulting Project': ['Systems Analysis', 'Project Management'],
  'Capstone Studio': ['Software Design', 'Client Consulting Project'],
  'Service Design': ['User Research Methods', 'Interaction Design Studio'],
  'Accessible Interaction': ['Human-Centered Systems'],
  'Experimental Design': ['Probability & Statistics'],
  'Software Design': ['Application Design', 'Database Design'],
  'Computer Networks': ['Software Design'],
  'Information Security': ['Computer Networks'],
  'Data & Decisions': ['Database Design'],
  'Data Visualization': ['Data & Decisions'],
  'Machine Learning Foundations': ['Statistical Modeling', 'Introduction to Artificial Intelligence'],
  'User Research Methods': ['Human-Centered Systems'],
  'Interaction Design Studio': ['User Research Methods'],
  'Product Strategy': ['Interaction Design Studio'],
  'Building Systems': ['Design Studio'],
  'Digital Fabrication': ['Building Systems'],
  'Urban Design Studio': ['Environmental Design', 'Digital Fabrication'],
};
const demoMappings = {
  core: ['Application Design', 'Software Design', 'Human-Centered Systems', 'Interaction Design Studio', 'Design Studio', 'Building Systems'],
  methods: ['Database Design', 'Data & Decisions', 'Statistical Modeling', 'Introduction to Artificial Intelligence', 'Digital Fabrication'],
  electives: ['Computer Networks', 'Information Security', 'Machine Learning Foundations', 'Product Strategy', 'Urban Design Studio'],
  breadth: ['Data Visualization', 'User Research Methods', 'Environmental Design'],
  minor: ['Database Design', 'Software Design', 'Introduction to Artificial Intelligence'],
};

function createDemoDetail(profile) {
  const knownYear = profile.status === 'current' || Number.isInteger(profile.graduationYear);
  const start = profile.status === 'current' ? 2027 - profile.studentYear : profile.graduationYear - 4;
  const count = profile.status === 'current' ? profile.studentYear * 2 - 1 : 8;
  const requirements = [
    { id: 'core', title: `${profile.major} core`, category: 'Major' },
    { id: 'methods', title: 'Quantitative & technical methods', category: 'Major' },
    { id: 'electives', title: 'Concentration electives', category: 'Major' },
    { id: 'breadth', title: 'College breadth', category: 'College' },
  ];
  if (profile.minors?.length) requirements.push({ id: 'minor', title: `${profile.minors[0]} minor`, category: 'Minor' });
  const semesters = knownYear ? Array.from({ length: count }, (_, index) => ({
    id: `semester-${index + 1}`, term: { season: index % 2 ? 'Spring' : 'Fall', year: start + Math.ceil(index / 2) }, courses: [],
  })) : [{ id: 'semester-unknown', term: null, courses: [] }];
  let serial = 0;
  const used = new Set();
  function addCourse(source, semester, highlight = false) {
    if (used.has(source.title)) return;
    used.add(source.title);
    const index = serial++;
    const currentTerm = semester.term?.year === 2026 && semester.term.season === 'Fall' && profile.status === 'current';
    const requirementIds = knownYear ? requirements.filter(requirement => demoMappings[requirement.id]?.includes(source.title) || source.requirementCategory === requirement.id).map(requirement => requirement.id) : [];
    semester.courses.push({
      id: `${profile.id}-enrollment-${index + 1}`, courseId: source.id ?? null, title: source.title,
      code: source.code ?? null, units: source.units ?? null,
      description: source.description ?? courses.find(course => course.id === source.id)?.description ?? null,
      requirementIds: [...new Set(requirementIds)],
      grade: !currentTerm && index % 3 === 0 ? (index % 2 ? 'A−' : 'A') : null,
      note: highlight ? personalNote(source.title, profile) : null,
      termPart: index === 3 ? 'Mini 3' : null,
      inProgress: currentTerm,
    });
  }
  // Reuse the exact highlight terms from the search cards.
  for (const highlight of profile.courses) {
    const semester = semesters.find(item => item.term?.year === highlight.term?.year && item.term?.season === highlight.term?.season) ?? semesters.at(-1);
    addCourse(highlight, semester, true);
  }
  const pool = courses.filter(course => course.level === 'undergraduate' && (course.department !== 'Architecture' || profile.major === 'Architecture'));
  if (knownYear) semesters.forEach((semester, index) => {
    const target = index % 2 === 0 ? 4 : 5;
    const stage = Math.min(4, Math.floor(index * 5 / semesters.length));
    const score = course => Math.abs((course.studyStage ?? 2) - stage) * 10 + (course.department === profile.major ? 0 : 3);
    const options = pool.filter(course => !used.has(course.title)).sort((a, b) => score(a) - score(b));
    for (const course of options) {
      if (semester.courses.length >= target) break;
      addCourse(course, semester);
    }
  });
  const termOrder = term => term ? term.year * 4 + ({ Spring: 0, Summer: 1, Fall: 2, Winter: 3 })[term.season] : null;
  const rows = semesters.flatMap(semester => semester.courses.map(course => ({ course, term: semester.term })));
  for (const { course, term } of rows) {
    course.supportingEnrollmentIds = (demoSupports[course.title] ?? []).flatMap(title => {
      const prerequisite = rows.find(row => row.course.title === title);
      return prerequisite?.term && term && termOrder(prerequisite.term) < termOrder(term) ? [prerequisite.course.id] : [];
    });
  }
  return { id: profile.id, universityId: profile.universityId,
    catalog: knownYear ? { year: start, label: `${start}–${String(start + 1).slice(-2)} requirements`, program: profile.major } : null,
    requirements: knownYear ? requirements : [], semesters };
}

export const pathwayDetails = pathways.map(createDemoDetail);
