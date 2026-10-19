import { extraCourses } from './demo-curriculum.js';
// Synthetic UI fixtures, NOT real students, official CMU courses, or verified outcomes.
// These intentionally use illustrative course codes. Replace this module with a data adapter later.
const pathwayRows = [
  ['Information Systems', 'Product Manager', 2024, 'alumni', ['Product Strategy', 'Human-Centered Design']],
  ['Information Systems', 'Data Analyst', 2023, 'alumni', ['Data Science', 'Business Analytics']],
  ['Information Systems', 'Software Engineer', 2025, 'alumni', ['Software Engineering', 'Web Applications']],
  ['Information Systems', 'UX Researcher', 2022, 'alumni', ['User Experience Research', 'Interaction Design']],
  ['Information Systems', 'Technical Product Manager', 2020, 'alumni', ['Product Management', 'Information Security']],
  ['Information Systems', 'Business Analyst', 2018, 'alumni', ['Business Administration', 'Economics']],
  ['Information Systems', 'Product Design', 2028, 'current', ['Interaction Design', 'Design Strategy'], 3],
  ['Information Systems', 'Data Science', 2027, 'current', ['Statistics', 'Machine Learning'], 4],
  ['Information Systems', 'Engineering Manager', 2015, 'alumni', ['Software Engineering', 'Technical Leadership']],
  ['Information Systems', 'Solutions Engineer', 2021, 'alumni', ['Cloud Systems', 'Software Design']],
  ['Information Systems', 'Product Management', 2029, 'current', ['Product Strategy', 'Entrepreneurship'], 2],
  ['Information Systems', 'Technology Consultant', 2019, 'alumni', ['Business Administration', 'Design Strategy']],
  ['Information Systems', 'Data Engineer', 2026, 'alumni', ['Data Science', 'Database Design']],
  ['Information Systems', 'Security Analyst', 2024, 'alumni', ['Information Security', 'Computer Networks']],
  ['Information Systems', 'UX Designer', 2016, 'alumni', ['Interaction Design', 'Human-Computer Interaction']],
  ['Information Systems', 'Software Engineering', 2027, 'current', ['Web Applications', 'Computer Networks'], 4],
  ['Information Systems', null, null, 'alumni', ['Systems Design', 'Technical Writing']],
  ['Computer Science', 'Software Engineer', 2025, 'alumni', ['Software Engineering', 'Artificial Intelligence']],
  ['Computer Science', 'Product Manager', 2022, 'alumni', ['Product Management', 'Machine Learning']],
  ['Statistics', 'Data Scientist', 2023, 'alumni', ['Data Science', 'Statistical Modeling']],
  ['Design', 'Product Designer', 2024, 'alumni', ['Interaction Design', 'Design Strategy']],
  ['Electrical Engineering', 'Robotics Engineer', 2021, 'alumni', ['Robotics', 'Embedded Systems']],
  ['Cognitive Science', 'UX Researcher', 2028, 'current', ['User Experience Research', 'Psychology'], 3],
  ['Business Administration', 'Product Manager', 2019, 'alumni', ['Product Management', 'Entrepreneurship']],
  ['Architecture', 'Architectural Designer', 2027, 'current', ['Sustainable Design', 'Digital Fabrication'], 5],
];

// Year of study is explicit; graduation year cannot determine program length or standing.
// Optional academic fields below are illustrative profile entries, not verified CMU programs.
const academicProfiles = {
  0: { additionalMajors: ['Business Administration'] },
  2: { concentrations: ['Software Development'], minors: ['Computer Science'] },
  6: { concentrations: ['Human-Computer Interaction'], additionalMajors: ['Design'] },
  7: { minors: ['Statistics', 'Computer Science'] },
  17: { dualDegrees: ['Mathematical Sciences (B.S.)'] },
  24: { minors: ['Architectural History'] },
};

const pathwayProfiles = pathwayRows.map(([major, role, graduationYear, status, tags, studentYear], index) => ({
  id: `pathway-${String(index + 1).padStart(2, '0')}`, universityId: 'cmu', major, role, graduationYear, status, tags,
  studentYear: status === 'current' ? studentYear : null,
  ...academicProfiles[index],
  // Company names illustrate optional self-reported data; these are fictional profiles.
  company: ({ 0: 'Microsoft', 2: 'Amazon', 4: 'Adobe', 9: 'Salesforce', 17: 'Amazon' })[index] ?? null,
  courses: major === 'Architecture' ? ['Design Studio', 'Building Systems', 'Digital Fabrication', 'Environmental Design', 'Urban Design Studio']
    : major === 'Computer Science' ? ['Application Design', 'Software Design', 'Introduction to Artificial Intelligence', 'Computer Networks', 'Machine Learning Foundations']
    : role?.includes('Software') || role?.includes('Engineer')
    ? ['Application Design', 'Database Design', 'Software Design', 'Computer Networks', 'Information Security']
    : role?.includes('Data') ? ['Database Design', 'Data & Decisions', 'Statistical Modeling', 'Data Visualization', 'Machine Learning Foundations']
      : role?.includes('Product') ? ['Human-Centered Systems', 'User Research Methods', 'Interaction Design Studio', 'Data Visualization', 'Product Strategy']
        : ['Human-Centered Systems', 'User Research Methods', 'Data Visualization', 'Interaction Design Studio', 'Product Strategy'],
  keywords: [...tags, ...(role?.includes('Product Manager') ? ['Product Management'] : []), ...(role?.includes('Software Engineer') ? ['Software Engineering'] : [])],
}));

const courseRows = [
  ['IS 210', 'Database Design', 'Information Systems', 'undergraduate', 9, ['Data Modeling', 'SQL'], 'Design relational databases and turn questions into structured queries.'],
  ['IS 220', 'Application Design', 'Information Systems', 'undergraduate', 12, ['Software Design', 'Web Applications'], 'Build usable applications from a problem statement to a working prototype.'],
  ['IS 310', 'Data & Decisions', 'Information Systems', 'undergraduate', 9, ['Data Science', 'Business Analytics'], 'Use data to frame decisions and communicate the reasoning behind them.'],
  ['IS 330', 'Human-Centered Systems', 'Information Systems', 'undergraduate', 9, ['Human-Computer Interaction', 'HCI'], 'Connect user research with the design of useful information systems.'],
  ['CS 240', 'Introduction to Artificial Intelligence', 'Computer Science', 'undergraduate', 12, ['Artificial Intelligence', 'Machine Learning'], 'Explore models for reasoning, learning, and making decisions.'],
  ['CS 350', 'Machine Learning Foundations', 'Computer Science', 'undergraduate', 12, ['Machine Learning', 'Data Science'], 'Study how models learn patterns and how to evaluate their predictions.'],
  ['DS 210', 'Data Visualization', 'Design', 'undergraduate', 6, ['Data Visualization', 'Communication'], 'Translate data into visual explanations that people can understand.'],
  ['DS 320', 'Interaction Design Studio', 'Design', 'undergraduate', 12, ['Interaction Design', 'Human-Computer Interaction', 'HCI'], 'Prototype interactive experiences and improve them through critique.'],
  ['ST 220', 'Statistical Modeling', 'Statistics', 'undergraduate', 9, ['Statistics', 'Data Science'], 'Build statistical models and examine the assumptions behind them.'],
  ['CS 360', 'Computer Networks', 'Computer Science', 'undergraduate', 12, ['Computer Networks', 'Information Security'], 'Explore how connected systems exchange information reliably.'],
  ['IS 340', 'Product Strategy', 'Information Systems', 'undergraduate', 6, ['Product Management', 'Entrepreneurship'], 'Connect user needs, product decisions, and practical constraints.'],
  ['CS 610', 'Applied Machine Learning', 'Computer Science', 'graduate', 12, ['Machine Learning', 'Artificial Intelligence', 'Data Science'], 'Evaluate learning methods through applied projects and experiments.'],
  ['IS 620', 'Information Systems Research', 'Information Systems', 'graduate', 9, ['Research Methods', 'User Experience Research'], 'Frame research questions about how people use information systems.'],
  ['DS 630', 'Advanced Interaction Design', 'Design', 'graduate', 12, ['Interaction Design', 'Human-Computer Interaction', 'HCI'], 'Develop and evaluate interactive systems through iterative design.'],
  ['ST 610', 'Statistical Learning', 'Statistics', 'graduate', 12, ['Machine Learning', 'Statistical Modeling', 'Data Science'], 'Compare statistical approaches to prediction and model selection.'],
  ['CS 230', 'Software Design', 'Computer Science', 'undergraduate', 9, ['Software Design', 'Software Engineering'], 'Structure software so it can be understood, tested, and extended.'],
  ['IS 250', 'Information Security', 'Information Systems', 'undergraduate', 6, ['Information Security', 'Risk'], 'Examine threats and design protections for information systems.'],
  ['DS 230', 'User Research Methods', 'Design', 'undergraduate', 6, ['User Experience Research', 'Human-Computer Interaction', 'HCI'], 'Plan interviews and studies that inform design decisions.'],
];

const originalCourses = courseRows.map(([code, title, department, level, units, tags, description], index) => ({
  id: `course-${String(index + 1).padStart(2, '0')}`, universityId: 'cmu', code, title, department, level, units, tags, description, keywords: tags,
}));

export const courses = [...originalCourses, ...extraCourses];

// Explicit synthetic study dates for the prototype only. Real records must supply each course's term.
function demoTerms(profile) {
  if (profile.status === 'current') {
    if (profile.studentYear <= 2) return [['Fall', 2025], ['Fall', 2025], ['Spring', 2026], ['Spring', 2026], ['Fall', 2026]];
    return [['Fall', 2024], ['Spring', 2025], ['Fall', 2025], ['Spring', 2026], ['Fall', 2026]];
  }
  if (!profile.graduationYear) return Array(5).fill(null);
  const year = profile.graduationYear;
  return [['Fall', year - 4], ['Spring', year - 3], ['Fall', year - 2], ['Spring', year - 1], ['Spring', year]];
}

// Hand-picked fixture highlights, not an algorithmic ranking or a verified transcript.
export const pathways = pathwayProfiles.map(profile => {
  const terms = demoTerms(profile);
  return { ...profile, courses: profile.courses.map((title, index) => {
    const course = courses.find(item => item.title === title);
    const term = terms[index] ? { season: terms[index][0], year: terms[index][1] } : null;
    return course ? { id: course.id, title, code: course.code, units: course.units, term } : { title, term };
  }) };
});
