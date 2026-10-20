import { officialCourses } from './local-official-courses.js';
// Personal review fixture. Excluded from the public build by the local- prefix.
// Student history and catalog enrichment stay separate; null never means none.
const catalog = 'https://coursecatalog.web.cmu.edu/';
const dietrich = catalog + 'schools-colleges/dietrichcollegeofhumanitiesandsocialsciences/';
const checkedAt = '2026-10-19';
const catalogSource = (title, url) => ({ kind: 'official_catalog', title, url, edition: '2026–2027', checkedAt });
export const sources = {
  student: { kind: 'student_report', title: 'Grace’s course history', path: 'notes/data/grace.md', checkedAt: '2026-10-20' },
  scs: catalogSource('CMU · School of Computer Science', catalog + 'schools-colleges/schoolofcomputerscience/courses/'),
  ai280: { kind: 'official_course_page', title: 'CMU · 07-280 · Fall 2026', url: 'https://www.cs.cmu.edu/~07280/', edition: 'Fall 2026', checkedAt: '2026-10-20', supportingUrl: 'https://www.cs.cmu.edu/~07280/07280_syllabus_v1.pdf' },
  is: catalogSource('CMU · Information Systems', dietrich + 'informationsystems/courses/'),
  statistics: catalogSource('CMU · Statistics & Data Science', dietrich + 'departmentofstatistics/courses/'),
  psychology: catalogSource('CMU · Psychology', dietrich + 'departmentofpsychology/courses/'),
  business: catalogSource('CMU · Tepper', catalog + 'schools-colleges/tepper/undergraduatebusinessadministrationprogram/courses/'),
  mathematics: catalogSource('CMU · Mathematical Sciences', catalog + 'schools-colleges/melloncollegeofscience/departmentofmathematicalsciences/courses/'),
  english: catalogSource('CMU · English', dietrich + 'departmentofenglish/courses/'),
  intercollege: catalogSource('CMU · Intercollege Programs', catalog + 'intercollegeprograms/courses/'),
  philosophy: catalogSource('CMU · Philosophy', dietrich + 'departmentofphilosophy/courses/'),
  transfer: { kind: 'student_instruction', title: 'Freshman transfer-credit assumption', checkedAt: '2026-10-20', scope: 'Unlisted prerequisite background is assumed transferred before entering CMU as a Sophomore. Exact equivalent courses and awarded units are unspecified.' },
  heinz: { kind: 'official_course_page', title: 'CMU · Heinz College · 94-829', url: 'https://www.heinz.cmu.edu/current-students/courses/94-829/', edition: null, checkedAt },
};

const course = (code, title, catalogUnits, sourceId) => ({
  id: `cmu-${code}`, institutionId: 'cmu', code, title, catalogUnits,
  description: officialCourses[code].description, fullDescription: officialCourses[code].fullDescription ?? null,
  descriptionType: officialCourses[code].fullDescription ? 'official_full' : 'official_excerpt',
  descriptionTruncated: officialCourses[code].descriptionTruncated, descriptionSource: { url: officialCourses[code].sourceUrl, checkedAt: officialCourses[code].checkedAt }, sourceId,
  // No historical offering, instructor, or actual enrolled units inferred here.
});
const courses = [
  course('15-122', 'Principles of Imperative Computation', 12, 'scs'),
  course('67-262', 'Database Design and Development', 9, 'is'),
  course('05-391', 'Designing Human Centered Software', 12, 'scs'),
  course('36-225', 'Introduction to Probability Theory', 9, 'statistics'),
  course('85-110', 'Cognitive Psychology', 9, 'psychology'),
  course('17-313', 'Foundations of Software Engineering', 12, 'scs'),
  course('67-250', 'The Information Systems Milieux', 9, 'is'),
  course('70-350', 'Acting for Business', 9, 'business'),
  course('21-241', 'Matrices and Linear Transformations', 11, 'mathematics'),
  course('76-101', 'Interpretation and Argument', 9, 'english'),
  course('99-101', 'Core@CMU', 3, 'intercollege'),
  course('07-280', 'Artificial Intelligence and Machine Learning I', 12, 'scs'),
  course('05-317', 'Design of Artificial Intelligence Products', 12, 'scs'),
  course('80-226', 'The Nature of Scientific Revolutions', 9, 'philosophy'),
  course('80-490', 'Philosophical and Practical Aspects of AI', 9, 'philosophy'),
  course('17-619', 'Product Management Essentials I', 6, 'scs'),
  course('94-829', 'Advanced AI and Enterprise Strategy', 6, 'heinz'),
  course('67-200', 'Information Systems Research Colloquium', 1, 'is'),
];

const ref = (code, minimumGrade = null) => ({ courseCode: code, minimumGrade });
const any = (...codes) => ({ anyOf: codes.map(code => ref(code)) });
const anyC = (...codes) => ({ anyOf: codes.map(code => ref(code, 'C')) });
const prerequisites = {
  '15-122': anyC('02-120', '15-112'),
  '67-262': any('15-122', '15-121', '15-112', '02-120'),
  '05-391': any('15-110', '15-112', '15-122', '02-120', '15-104'),
  '36-225': { anyOf: [{ allOf: [ref('21-112'), ref('21-111')] }, ref('21-120'), ref('21-256'), ref('21-259')] },
  '17-313': any('15-121', '15-122'),
  '07-280': { allOf: [anyC('15-122', '15-121'), anyC('18-202', '21-254', '21-241', '21-240'), anyC('21-127', '15-151', '21-128')] },
};
const courseRules = courses.map(c => ({
  courseId: c.id, sourceId: c.sourceId,
  prerequisiteStatus: prerequisites[c.code] ? 'listed' : 'not_listed_in_consulted_source',
  prerequisiteExpression: prerequisites[c.code] ?? null,
  corequisiteExpression: c.code === '07-280' ? { allOf: [ref('21-122'), any('36-225', '36-217', '15-259', '21-325', '15-359', '36-218', '36-219', '36-235')] } : null,
  corequisiteSourceId: c.code === '07-280' ? 'ai280' : null,
  recommendations: c.code === '21-241' ? [{ courseCode: '21-127', strength: 'strongly_recommended' }] : [],
  effectiveForStudentTerm: 'unconfirmed',
}));
const terms = [
  ['Fall', 2025, ['15-122', '67-262', '05-391', '36-225', '85-110']],
  ['Spring', 2026, ['17-313', '67-250', '70-350', '21-241', '76-101', '99-101']],
  ['Fall', 2026, ['07-280', '05-317', '80-226', '80-490', '17-619', '94-829', '67-200']],
];
const enrollments = terms.flatMap(([season, year, codes]) => codes.map(code => ({
  id: `grace-${year}-${season.toLowerCase()}-${code}`, studentId: 'grace', courseId: `cmu-${code}`,
  term: { season, year }, sourceId: 'student', status: 'not_shared',
  enrolledUnits: null, grade: null, note: null, section: null, instructor: null, termPart: null,
})));

export const gracePathway = {
  schemaVersion: 1, id: 'grace', visibility: 'local_review',
  profile: {
    id: 'grace', displayName: 'Grace', displayNameSource: 'file_identifier', institutionId: 'cmu',
    major: 'Information Systems', concentrations: ['AI Management'], minors: ['Philosophy'],
    graduationYear: 2028, studentYear: 3, status: 'current', role: 'Product Management', company: null,
    additionalMajors: [], dualDegrees: [], applicableDegreeCatalog: null, sourceId: 'student',
  },
  coverage: { completeHistory: false, priorInstitutionYear: 'freshman_transfer_assumptions', cmuEntry: { season: 'Fall', year: 2025, studentYear: 2 }, sourceId: 'transfer' },
  sources, courses, courseRules, enrollments,
  // Personal learning links and degree mappings require student/advisor input.
  learningConnections: [], requirementMappings: [],
  reviewItems: [
    { id: 'units', text: 'Actual enrolled units have not been supplied. Please confirm 21-241 for Spring 2026; its official course listing says 11.' },
    { id: 'status', text: 'Course status, grades, and personal notes have not been supplied.' },
    { id: 'coverage', text: 'CMU coursework begins in Sophomore year. Missing prerequisite background is represented as assumed Freshman transfer credit; exact external courses are not specified.' },
    { id: 'rules', text: 'Connections combine prerequisite and corequisite matches with your Freshman transfer-credit assumption. Alternative options remain alternatives.' },
    { id: 'historical', text: 'Descriptions are short official excerpts. Historical offerings, sections, mini terms, and degree mappings have not been verified.' },
  ],
};
