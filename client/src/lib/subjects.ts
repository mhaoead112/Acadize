export interface GradeSubject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
  skills: string[];
}

export interface GradeLevel {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  icon: string;
  color: string;
  subjects: GradeSubject[];
}

export const gradeLevels: GradeLevel[] = [
  {
    id: "elementary",
    name: "Elementary School",
    description: "Foundational learning and discovery",
    ageRange: "Ages 6-11",
    icon: "baby",
    color: "blue",
    subjects: [
      {
        id: "elementary-math",
        name: "Mathematics",
        description: "Numbers, basic operations, and mathematical thinking",
        icon: "calculator",
        color: "blue",
        examples: [
          "Counting and number recognition (1-100)",
          "Addition and subtraction with fun games",
          "Understanding shapes and patterns",
          "Telling time on digital and analog clocks",
          "Measuring length, weight, and capacity",
          "Introduction to fractions with pizza slices"
        ],
        skills: [
          "Problem-solving with visual aids",
          "Mathematical reasoning",
          "Pattern recognition",
          "Basic geometry concepts"
        ]
      },
      {
        id: "elementary-reading",
        name: "Reading & Language Arts",
        description: "Phonics, vocabulary, and reading comprehension",
        icon: "book-open",
        color: "purple",
        examples: [
          "Phonics and letter sounds (A-Z)",
          "Reading picture books and short stories",
          "Building vocabulary with word games",
          "Writing simple sentences and paragraphs",
          "Story comprehension and discussion",
          "Creative writing with drawings"
        ],
        skills: [
          "Reading fluency",
          "Listening comprehension",
          "Creative expression",
          "Communication skills"
        ]
      },
      {
        id: "elementary-science",
        name: "Science Exploration",
        description: "Hands-on experiments and nature discovery",
        icon: "flask",
        color: "green",
        examples: [
          "Life cycles of butterflies and frogs",
          "Weather patterns and seasons",
          "Simple machines (levers, pulleys, wheels)",
          "Plant growth experiments with seeds",
          "Animal habitats and ecosystems",
          "States of matter with ice and water"
        ],
        skills: [
          "Observation and questioning",
          "Scientific method basics",
          "Critical thinking",
          "Environmental awareness"
        ]
      },
      {
        id: "elementary-social",
        name: "Social Studies",
        description: "Community, culture, and basic history",
        icon: "globe",
        color: "orange",
        examples: [
          "My family, school, and community",
          "Different cultures and traditions",
          "Maps and basic geography",
          "Community helpers (firefighters, doctors)",
          "Historical figures and heroes",
          "Holidays and their meanings"
        ],
        skills: [
          "Cultural awareness",
          "Community responsibility",
          "Basic geography",
          "Historical thinking"
        ]
      },
      {
        id: "elementary-arts",
        name: "Creative Arts",
        description: "Drawing, music, and creative expression",
        icon: "palette",
        color: "pink",
        examples: [
          "Drawing and coloring with different materials",
          "Singing songs and rhythm activities",
          "Simple craft projects and sculptures",
          "Drama and storytelling performances",
          "Basic dance and movement",
          "Art appreciation with famous paintings"
        ],
        skills: [
          "Creative expression",
          "Fine motor skills",
          "Musical appreciation",
          "Artistic techniques"
        ]
      },
      {
        id: "elementary-pe",
        name: "Physical Education",
        description: "Movement, sports, and healthy habits",
        icon: "running",
        color: "red",
        examples: [
          "Running, jumping, and coordination games",
          "Team sports like kickball and soccer",
          "Yoga and stretching exercises",
          "Swimming and water safety",
          "Healthy eating and nutrition basics",
          "Personal hygiene and wellness"
        ],
        skills: [
          "Gross motor development",
          "Teamwork and cooperation",
          "Health awareness",
          "Physical fitness"
        ]
      },
      {
        id: "elementary-tech",
        name: "Technology Basics",
        description: "Computer skills and digital citizenship",
        icon: "laptop",
        color: "indigo",
        examples: [
          "Using a computer mouse and keyboard",
          "Educational games and typing practice",
          "Basic internet safety rules",
          "Simple drawing and writing programs",
          "Introduction to coding with blocks",
          "Digital storytelling and presentations"
        ],
        skills: [
          "Digital literacy",
          "Computer navigation",
          "Online safety",
          "Problem-solving with technology"
        ]
      }
    ]
  },
  {
    id: "middle-school",
    name: "Middle School",
    description: "Building knowledge and developing skills",
    ageRange: "Ages 12-14",
    icon: "school",
    color: "green",
    subjects: [
      {
        id: "middle-math",
        name: "Mathematics",
        description: "Algebra foundations, geometry, and statistics",
        icon: "calculator",
        color: "blue",
        examples: [
          "Pre-algebra with variables and equations",
          "Geometry with area and volume calculations",
          "Fractions, decimals, and percentages",
          "Introduction to coordinate graphing",
          "Basic statistics and data analysis",
          "Problem-solving with real-world applications"
        ],
        skills: [
          "Algebraic thinking",
          "Geometric reasoning",
          "Statistical analysis",
          "Mathematical modeling"
        ]
      },
      {
        id: "middle-english",
        name: "English Language Arts",
        description: "Literature analysis and advanced writing",
        icon: "book-open",
        color: "purple",
        examples: [
          "Reading novels like 'The Outsiders' and 'Holes'",
          "Poetry analysis and creative writing",
          "Research projects with proper citations",
          "Persuasive and argumentative essays",
          "Grammar and sentence structure",
          "Public speaking and presentations"
        ],
        skills: [
          "Literary analysis",
          "Research and writing",
          "Critical reading",
          "Communication skills"
        ]
      },
      {
        id: "middle-science",
        name: "Integrated Science",
        description: "Life, physical, and earth sciences",
        icon: "flask",
        color: "green",
        examples: [
          "Cell structure and microscopy",
          "Forces, motion, and simple physics",
          "Chemical reactions and the periodic table",
          "Geology and earth's layers",
          "Ecology and environmental conservation",
          "Human body systems and health"
        ],
        skills: [
          "Scientific inquiry",
          "Data collection and analysis",
          "Laboratory techniques",
          "Scientific communication"
        ]
      },
      {
        id: "middle-history",
        name: "World History & Geography",
        description: "Ancient civilizations to modern times",
        icon: "globe",
        color: "orange",
        examples: [
          "Ancient civilizations (Egypt, Greece, Rome)",
          "Medieval Europe and the Renaissance",
          "Exploration and colonization",
          "World geography and cultural studies",
          "Government systems and civics",
          "Current events and global awareness"
        ],
        skills: [
          "Historical thinking",
          "Geographic literacy",
          "Cultural understanding",
          "Civic responsibility"
        ]
      },
      {
        id: "middle-arts",
        name: "Visual & Performing Arts",
        description: "Advanced artistic techniques and appreciation",
        icon: "palette",
        color: "pink",
        examples: [
          "Advanced drawing and painting techniques",
          "Band, orchestra, or choir participation",
          "Theater arts and dramatic performances",
          "Digital art and graphic design",
          "Art history and cultural connections",
          "Creative projects and portfolios"
        ],
        skills: [
          "Artistic technique",
          "Creative problem-solving",
          "Performance skills",
          "Aesthetic appreciation"
        ]
      },
      {
        id: "middle-pe",
        name: "Physical Education & Health",
        description: "Fitness, sports, and wellness education",
        icon: "running",
        color: "red",
        examples: [
          "Team sports (basketball, volleyball, soccer)",
          "Individual fitness and strength training",
          "Health education and nutrition",
          "Outdoor education and adventure activities",
          "Mental health awareness and stress management",
          "First aid and safety training"
        ],
        skills: [
          "Physical fitness",
          "Team collaboration",
          "Health literacy",
          "Leadership development"
        ]
      },
      {
        id: "middle-tech",
        name: "Technology & Computer Science",
        description: "Programming, digital design, and tech skills",
        icon: "laptop",
        color: "indigo",
        examples: [
          "Introduction to programming with Scratch/Python",
          "Web design and HTML basics",
          "Digital citizenship and online ethics",
          "Robotics and engineering challenges",
          "Microsoft Office and Google Workspace",
          "Digital media creation and editing"
        ],
        skills: [
          "Computational thinking",
          "Digital design",
          "Problem-solving with technology",
          "Ethical technology use"
        ]
      },
      {
        id: "middle-language",
        name: "World Languages",
        description: "Introduction to foreign languages",
        icon: "languages",
        color: "purple",
        examples: [
          "Spanish vocabulary and basic conversations",
          "French grammar and pronunciation",
          "Cultural exploration through language",
          "Language games and interactive activities",
          "Introduction to other world languages",
          "Cross-cultural communication skills"
        ],
        skills: [
          "Language acquisition",
          "Cultural awareness",
          "Communication skills",
          "Global perspective"
        ]
      }
    ]
  },
  {
    id: "high-school",
    name: "High School",
    description: "Advanced learning and specialization",
    ageRange: "Ages 15-18",
    icon: "graduation-cap",
    color: "purple",
    subjects: [
      {
        id: "high-math",
        name: "Advanced Mathematics",
        description: "Algebra, Geometry, Calculus, and Statistics",
        icon: "calculator",
        color: "blue",
        examples: [
          "Algebra II with quadratic functions and logarithms",
          "Geometry with proofs and trigonometry",
          "Pre-Calculus and advanced functions",
          "AP Calculus AB/BC with derivatives and integrals",
          "Statistics and probability theory",
          "Mathematical modeling for real-world problems"
        ],
        skills: [
          "Advanced algebraic reasoning",
          "Geometric proof writing",
          "Calculus applications",
          "Statistical analysis"
        ]
      },
      {
        id: "high-english",
        name: "English Literature & Composition",
        description: "Advanced literature, writing, and communication",
        icon: "book-open",
        color: "purple",
        examples: [
          "American Literature (Twain, Steinbeck, Morrison)",
          "British Literature (Shakespeare, Dickens, Austen)",
          "World Literature and comparative analysis",
          "AP English Language and Composition",
          "Creative writing and journalism",
          "College-level research and writing"
        ],
        skills: [
          "Literary analysis and criticism",
          "Advanced composition",
          "Research methodology",
          "Public speaking and debate"
        ]
      },
      {
        id: "high-sciences",
        name: "Advanced Sciences",
        description: "Biology, Chemistry, Physics, and Environmental Science",
        icon: "flask",
        color: "green",
        examples: [
          "AP Biology with genetics and molecular biology",
          "Chemistry with chemical equations and lab work",
          "Physics with mechanics, waves, and electricity",
          "Environmental Science and sustainability",
          "Anatomy and Physiology",
          "Advanced placement and dual enrollment courses"
        ],
        skills: [
          "Scientific research methods",
          "Laboratory analysis",
          "Data interpretation",
          "Scientific communication"
        ]
      },
      {
        id: "high-history",
        name: "Social Studies & History",
        description: "World history, government, and economics",
        icon: "globe",
        color: "orange",
        examples: [
          "AP World History and civilizations",
          "US History and government systems",
          "Economics and personal finance",
          "Psychology and human behavior",
          "Contemporary global issues",
          "Political science and civic engagement"
        ],
        skills: [
          "Historical analysis",
          "Critical thinking",
          "Economic literacy",
          "Civic responsibility"
        ]
      },
      {
        id: "high-arts",
        name: "Fine & Performing Arts",
        description: "Advanced artistic expression and technique",
        icon: "palette",
        color: "pink",
        examples: [
          "AP Art and Design portfolios",
          "Advanced band, orchestra, or choir",
          "Theater productions and drama classes",
          "Digital media and film production",
          "Creative writing and literary magazines",
          "Art history and aesthetic theory"
        ],
        skills: [
          "Advanced artistic techniques",
          "Creative portfolio development",
          "Performance mastery",
          "Artistic critique and analysis"
        ]
      },
      {
        id: "high-languages",
        name: "World Languages",
        description: "Advanced foreign language study",
        icon: "languages",
        color: "purple",
        examples: [
          "AP Spanish Language and Culture",
          "French Literature and advanced conversation",
          "Mandarin Chinese and cultural studies",
          "Latin and classical studies",
          "German and European studies",
          "International exchange programs"
        ],
        skills: [
          "Advanced language proficiency",
          "Cultural competency",
          "International communication",
          "Global perspective"
        ]
      },
      {
        id: "high-technology",
        name: "Computer Science & Technology",
        description: "Programming, engineering, and digital design",
        icon: "laptop",
        color: "indigo",
        examples: [
          "AP Computer Science A (Java programming)",
          "Web development with HTML, CSS, JavaScript",
          "Mobile app development and design",
          "Robotics and engineering projects",
          "Cybersecurity and ethical hacking",
          "Data science and artificial intelligence"
        ],
        skills: [
          "Advanced programming",
          "Software development",
          "Problem-solving algorithms",
          "Technology innovation"
        ]
      },
      {
        id: "high-electives",
        name: "Career & Life Skills",
        description: "Preparation for college and careers",
        icon: "briefcase",
        color: "yellow",
        examples: [
          "Business and entrepreneurship",
          "Health science and medical careers",
          "Engineering and technical design",
          "Culinary arts and hospitality",
          "Early childhood education",
          "College and career counseling"
        ],
        skills: [
          "Career exploration",
          "Professional development",
          "Leadership and teamwork",
          "Life skills preparation"
        ]
      }
    ]
  }
];

export const getSubjectsByGrade = (id: string) => gradeLevels.find(g => g.id === id)?.subjects ?? [];

export function getSubjectById(subjectId: string): GradeSubject | undefined {
  for (const grade of gradeLevels) {
    const subject = grade.subjects.find(s => s.id === subjectId);
    if (subject) return subject;
  }
  return undefined;
}

export function getAllSubjects(): GradeSubject[] {
  return gradeLevels.flatMap(grade => grade.subjects);
}

export function getGradeById(gradeId: string): GradeLevel | undefined {
  return gradeLevels.find(grade => grade.id === gradeId);
}
