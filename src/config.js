// University branding and vocabulary belong here, rather than in search behavior.
export const campusPalette = Object.freeze({
  machineryHallTan: '#BCB49E',
  kittanningBrickBeige: '#E4DAC4',
  hornbostelTeal: '#1F4C4C',
  palladianGreen: '#719F94',
  weaverBlue: '#182C4B',
  skiboRed: '#941120',
});

export const university = Object.freeze({
  id: 'cmu',
  name: 'Carnegie Mellon University',
  shortName: 'CMU',
  brandColor: campusPalette.skiboRed,
  brandSource: 'https://brand.cmu.edu/visual-identity/colors',
  searchModes: {
    pathways: {
      name: 'Pathways',
      singular: 'pathway',
      label: 'Search Pathways',
      placeholder: 'Major or career direction',
      // Query prompts, not verified results or a list of available profiles.
      examples: [
        'Information Systems', 'Product Management', 'Software Engineering',
        'Computer Science', 'Data Science', 'Interaction Design',
        'Electrical Engineering', 'Robotics', 'Business Administration',
        'Statistics', 'Cognitive Science', 'Computational Biology',
        'User Experience Research', 'Environmental Engineering', 'Economics',
        'Architecture', 'Public Policy', 'Technical Writing',
        'Game Design', 'Mechanical Engineering', 'Quantitative Finance',
        'Psychology', 'Biomedical Engineering', 'Design Strategy',
      ],
    },
    courses: {
      name: 'Courses',
      singular: 'course',
      label: 'Search Courses',
      placeholder: 'Course name or keyword',
      examples: [
        'Database Design', 'Human-Computer Interaction', 'Artificial Intelligence',
        'Machine Learning', 'Data Visualization', 'Creative Writing',
        'Linear Algebra', 'Computer Networks', 'Behavioral Economics',
        'Interaction Design', 'Statistical Modeling', 'Computer Graphics',
        'Digital Fabrication', 'Public Speaking', 'Software Design',
        'Research Methods', 'Discrete Mathematics', 'Cognitive Psychology',
        'Embedded Systems', 'Information Security', 'Sustainable Design',
        'Natural Language Processing', 'Entrepreneurship', 'Social Psychology',
      ],
    },
  },
});
