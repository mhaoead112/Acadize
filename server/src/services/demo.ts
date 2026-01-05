// Demo mode responses for Study Buddy personalities
// Provides realistic, personality-specific responses when OpenAI API is not available

interface DemoResponse {
  message: string;
  response: string;
  isEducational: boolean;
}

// Comprehensive educational topic detection for demo mode
export function isEducationalDemo(question: string): boolean {
  const educationalKeywords = [
    // Core Subjects
    'math', 'mathematics', 'algebra', 'geometry', 'calculus', 'statistics', 'trigonometry',
    'science', 'biology', 'chemistry', 'physics', 'astronomy', 'ecology', 'genetics',
    'history', 'geography', 'social studies', 'politics', 'economics', 'psychology',
    'english', 'literature', 'language', 'grammar', 'writing', 'reading', 'poetry',
    'art', 'music', 'drama', 'theater', 'dance', 'design', 'creative',
    
    // STEM & Technology
    'computer', 'programming', 'coding', 'algorithm', 'software', 'technology',
    'engineering', 'robotics', 'ai', 'artificial intelligence', 'machine learning',
    'data', 'database', 'web', 'app', 'development', 'javascript', 'python', 'java',
    
    // Academic Activities
    'study', 'homework', 'assignment', 'project', 'research', 'thesis', 'dissertation',
    'exam', 'test', 'quiz', 'assessment', 'evaluation', 'grade', 'score', 'marks',
    'learn', 'understand', 'explain', 'teach', 'tutor', 'mentor', 'coach',
    'solve', 'calculate', 'analyze', 'evaluate', 'compare', 'contrast', 'discuss',
    
    // Educational Context
    'university', 'college', 'school', 'classroom', 'course', 'class', 'lecture',
    'curriculum', 'syllabus', 'education', 'academic', 'student', 'teacher', 'professor',
    'knowledge', 'skill', 'concept', 'theory', 'principle', 'method', 'technique',
    'training', 'workshop', 'seminar', 'conference', 'presentation', 'report',
    
    // Specific Topics
    'gravity', 'equation', 'formula', 'theorem', 'hypothesis', 'experiment',
    'cell', 'dna', 'evolution', 'ecosystem', 'photosynthesis', 'metabolism',
    'atom', 'molecule', 'compound', 'reaction', 'solution', 'catalyst',
    'democracy', 'government', 'constitution', 'revolution', 'civilization',
    'essay', 'paragraph', 'sentence', 'verb', 'noun', 'adjective', 'metaphor',
    
    // Learning Support
    'note', 'notes', 'summary', 'outline', 'mind map', 'flashcard', 'memory',
    'practice', 'exercise', 'drill', 'review', 'revision', 'preparation',
    'comprehension', 'understanding', 'mastery', 'proficiency', 'fluency'
  ];
  
  const lowerQuestion = question.toLowerCase();
  return educationalKeywords.some(keyword => lowerQuestion.includes(keyword));
}

export function generateDemoResponse(message: string, buddyType: string = 'general'): DemoResponse {
  const isEducational = isEducationalDemo(message);
  
  // Get topic-aware base response
  const baseResponse = getTopicResponse(message);
  
  // Apply personality styling
  const response = applyPersonalityStyle(baseResponse, buddyType, message);
  
  return {
    message,
    response,
    isEducational
  };
}

function getTopicResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // MATHEMATICS TOPICS
  if (lowerMessage.includes('algebra') || lowerMessage.includes('equation') || lowerMessage.includes('solve')) {
    const responses = [
      "Algebra is like solving puzzles with letters! The key is isolating the variable by doing the same operation to both sides of the equation.",
      "When solving equations, think of it as keeping a balance - whatever you do to one side, do to the other. Let's work through this step by step!",
      "Algebraic equations follow logical patterns. Start by simplifying, then isolate the variable. Remember: what you do to one side, you must do to the other!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('geometry') || lowerMessage.includes('triangle') || lowerMessage.includes('angle')) {
    const responses = [
      "Geometry is the study of shapes, sizes, and spatial relationships. Every shape has its own special properties and formulas!",
      "In geometry, we explore how shapes relate to each other. Triangles are fundamental - they're the strongest shape in nature!",
      "Geometric principles are everywhere around us - from architecture to art to nature. Let's discover the patterns together!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('calculus') || lowerMessage.includes('derivative') || lowerMessage.includes('integral')) {
    const responses = [
      "Calculus helps us understand change and motion. Derivatives tell us the rate of change, while integrals find the area under curves.",
      "Think of calculus as the mathematics of change - how fast things are moving, how areas accumulate, how functions behave.",
      "Calculus might seem complex, but it's really about understanding how things change over time. Every curve tells a story!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('math') || lowerMessage.includes('mathematics') || lowerMessage.includes('calculate')) {
    const responses = [
      "Mathematics is the universal language that describes patterns, relationships, and logical structures in our world.",
      "Math is everywhere! From the Fibonacci spiral in sunflowers to the golden ratio in art, numbers tell amazing stories.",
      "Mathematics builds logical thinking skills. Each problem is like a puzzle waiting to be solved with the right approach!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // SCIENCE TOPICS
  if (lowerMessage.includes('physics') || lowerMessage.includes('gravity') || lowerMessage.includes('force')) {
    const responses = [
      "Physics explores how the universe works, from tiny atoms to massive galaxies. Every phenomenon follows physical laws!",
      "Gravity is the force that attracts objects toward each other. On Earth, it gives us weight and keeps our feet on the ground!",
      "Physics helps us understand motion, energy, and the fundamental forces that shape our reality. It's the science of 'how' and 'why'!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('chemistry') || lowerMessage.includes('atom') || lowerMessage.includes('molecule')) {
    const responses = [
      "Chemistry is like cooking with atoms! We study how elements combine and react to form new compounds and materials.",
      "Every substance is made of atoms - the building blocks of matter. Chemistry shows us how they bond and interact!",
      "Chemical reactions are happening everywhere - in our bodies, in cooking, in nature. It's the science of transformation!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('biology') || lowerMessage.includes('cell') || lowerMessage.includes('organism') || lowerMessage.includes('dna')) {
    const responses = [
      "Biology is the study of life in all its amazing forms - from microscopic bacteria to complex ecosystems.",
      "Every living thing is made of cells, the basic units of life. It's incredible how complex life emerges from simple building blocks!",
      "DNA is like the instruction manual for life, containing the genetic code that makes each organism unique and special."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // LANGUAGE ARTS & LITERATURE
  if (lowerMessage.includes('writing') || lowerMessage.includes('essay') || lowerMessage.includes('paragraph')) {
    const responses = [
      "Good writing starts with clear thinking. Organize your ideas first, then let your words flow naturally and persuasively.",
      "Every great essay has a strong thesis, supporting evidence, and a compelling conclusion that ties everything together.",
      "Writing is thinking made visible. Take time to plan your structure: introduction, body paragraphs with evidence, and conclusion."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('literature') || lowerMessage.includes('poetry') || lowerMessage.includes('novel')) {
    const responses = [
      "Literature opens windows into different worlds, times, and perspectives. Every story teaches us something about humanity.",
      "Poetry uses language in beautiful, creative ways to express emotions and ideas that prose sometimes cannot capture.",
      "Great literature endures because it explores universal themes - love, loss, hope, growth - that connect across cultures and time."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('grammar') || lowerMessage.includes('sentence') || lowerMessage.includes('verb')) {
    const responses = [
      "Grammar is the toolkit that helps us build clear, effective sentences. It's like the rules of a game that everyone understands.",
      "Strong grammar makes your ideas shine through clearly. It's not about being perfect - it's about being understood!",
      "Think of grammar as the architecture of language - it gives structure and strength to your ideas and expressions."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // HISTORY & SOCIAL STUDIES
  if (lowerMessage.includes('history') || lowerMessage.includes('historical') || lowerMessage.includes('past')) {
    const responses = [
      "History is the story of humanity - our triumphs, struggles, and lessons learned. Understanding the past helps us navigate the future.",
      "Every historical event connects to others in fascinating ways. History shows us patterns and helps us understand cause and effect.",
      "Studying history develops critical thinking skills as we analyze sources, evaluate evidence, and understand different perspectives."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('geography') || lowerMessage.includes('country') || lowerMessage.includes('climate')) {
    const responses = [
      "Geography explores the relationship between people and places, showing how environment shapes culture and society.",
      "Our planet is amazingly diverse - from frozen tundras to tropical rainforests, each environment creates unique challenges and opportunities.",
      "Geographic knowledge helps us understand global connections, climate patterns, and how human activities affect our world."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // TECHNOLOGY & PROGRAMMING
  if (lowerMessage.includes('programming') || lowerMessage.includes('coding') || lowerMessage.includes('computer')) {
    const responses = [
      "Programming is like learning a new language to communicate with computers. It's creative problem-solving with logical steps!",
      "Coding teaches you to break complex problems into smaller, manageable pieces. It's excellent training for logical thinking!",
      "Every app, website, and digital tool starts with code. Programming lets you create solutions and bring ideas to life!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // STUDY SKILLS & LEARNING
  if (lowerMessage.includes('study') || lowerMessage.includes('learn') || lowerMessage.includes('memory')) {
    const responses = [
      "Effective studying is about quality, not just quantity. Use active techniques like self-testing and spaced repetition!",
      "The best learning happens when you connect new information to what you already know. Build those mental bridges!",
      "Everyone learns differently - visual, auditory, kinesthetic. Discover your learning style and use it to your advantage!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('exam') || lowerMessage.includes('test') || lowerMessage.includes('assessment')) {
    const responses = [
      "Test preparation is most effective when it's spread over time. Practice regularly and review your mistakes to improve!",
      "Exams test not just knowledge but also your ability to think under pressure. Practice good test-taking strategies!",
      "Don't just memorize - understand the concepts deeply. This helps you apply knowledge even to unfamiliar questions!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // ARTS & CREATIVITY
  if (lowerMessage.includes('art') || lowerMessage.includes('creative') || lowerMessage.includes('design')) {
    const responses = [
      "Art is a universal language that expresses ideas and emotions in visual form. Every culture has its own artistic traditions!",
      "Creativity flourishes when you experiment and take risks. Don't be afraid to try new techniques and express your unique vision!",
      "Design combines aesthetics with function - it's about making things both beautiful and useful. Form follows function!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('music') || lowerMessage.includes('song') || lowerMessage.includes('instrument')) {
    const responses = [
      "Music is mathematics in motion - it's built on patterns, ratios, and rhythmic relationships that create emotional experiences.",
      "Learning music develops both creative and analytical skills. It's like learning multiple languages at once!",
      "Every culture has music because it's fundamental to human expression. It connects us across time and geography!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // GENERAL EDUCATIONAL RESPONSES
  if (lowerMessage.includes('help') || lowerMessage.includes('understand') || lowerMessage.includes('explain')) {
    const responses = [
      "I love helping students discover new ideas! What specific concept or topic would you like to explore together?",
      "Understanding comes from making connections. Let's break down complex topics into manageable, relatable pieces!",
      "Every question is an opportunity to learn something new. I'm here to guide you through any challenging concepts!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (isEducationalDemo(message)) {
    const responses = [
      "That's a fantastic question! Learning happens best when we connect new ideas to what we already understand.",
      "Great minds ask great questions! Let's explore this topic together and discover some fascinating insights.",
      "I love your curiosity! Understanding complex topics becomes easier when we break them down step by step.",
      "Excellent topic to explore! Knowledge grows when we ask thoughtful questions and seek deeper understanding."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Non-educational but helpful
  const generalResponses = [
    "I'm here to help you with any questions you have! What would you like to explore or learn about?",
    "Feel free to ask me about any topic - from academic subjects to study tips, I'm here to support your learning journey!",
    "Whether it's homework help, concept explanations, or study strategies, I'm ready to assist! What's on your mind?"
  ];
  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
}

function applyPersonalityStyle(baseResponse: string, buddyType: string, originalMessage: string): string {
  switch (buddyType) {
    case 'funny':
      return applyFunnyStyle(baseResponse, originalMessage);
    
    case 'serious':
      return applySeriousStyle(baseResponse, originalMessage);
    
    case 'motivational':
      return applyMotivationalStyle(baseResponse, originalMessage);
    
    default:
      return baseResponse + "\n\nWould you like me to explain this further or help with something else?";
  }
}

function applyFunnyStyle(response: string, message: string): string {
  const funnyIntros = [
    "🎉 Hey there, learning superstar! ",
    "🤔 Ooh, this is gonna be FUN! ",
    "✨ Buckle up, brain explorer! ",
    "🚀 Ready for some mind-blowing stuff? ",
    "😎 Time to make this topic absolutely epic! ",
    "🌟 Oh boy, do I have some cool things to share! ",
    "🎯 Let's turn this into an adventure! ",
    "🔥 This is going to be AWESOME! "
  ];
  
  const funnyClosers = [
    "\n\n😄 See? Learning doesn't have to be boring when you find the right angle! Want to explore more?",
    "\n\n🎯 Pretty amazing, right? I love how everything connects in weird and wonderful ways!",
    "\n\n🌟 That's the magic of knowledge - it's like collecting superpowers for your brain! 🧠⚡",
    "\n\n😊 Hope that made it click! I'm always here for more brain adventures!",
    "\n\n🚀 Knowledge is power, and power is... well, pretty darn cool! What's next on our learning journey?",
    "\n\n✨ Learning is like leveling up in real life - and you just gained some serious XP! 🎮",
    "\n\n🎪 Who says education can't be entertaining? Let's keep the fun learning train rolling!",
    "\n\n🎨 Beautiful minds think alike, and yours is definitely a masterpiece in progress!"
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Topic-specific humor
  if (lowerMessage.includes('gravity')) {
    return funnyIntros[0] + "Gravity is like that friend who's always pulling you down... but in a GOOD way! 😂 " + response + 
           "\n\n🌙 Fun fact: If you drop a hammer and a feather on the moon, they'll fall at the same rate! It's like they're in a race and it ends in a perfect tie! 🔨🪶 Neil Armstrong would be proud!" +
           funnyClosers[0];
  }
  
  if (lowerMessage.includes('math') || lowerMessage.includes('algebra') || lowerMessage.includes('equation')) {
    return funnyIntros[1] + response + 
           "\n\n🤓 Math jokes are the BEST because they're always... calculated! Get it? 📊 But seriously, math is everywhere - even in pizza slices (thank you, geometry!) and music beats (hello, fractions!)! 🍕🎵" +
           funnyClosers[1];
  }
  
  if (lowerMessage.includes('chemistry') || lowerMessage.includes('atom') || lowerMessage.includes('molecule')) {
    return funnyIntros[2] + response + 
           "\n\n⚗️ Chemistry is basically cooking, but with more explosions and fewer edible results! Though technically, your body is doing chemistry right now to digest your lunch. Mind = blown! 🤯" +
           funnyClosers[2];
  }
  
  if (lowerMessage.includes('biology') || lowerMessage.includes('cell') || lowerMessage.includes('dna')) {
    return funnyIntros[3] + response + 
           "\n\n🧬 Your DNA is like the ultimate recipe book, but instead of making cookies, it makes... well, YOU! And it's written in a language with only 4 letters. Talk about efficiency! 📚✨" +
           funnyClosers[3];
  }
  
  if (lowerMessage.includes('history') || lowerMessage.includes('ancient') || lowerMessage.includes('war')) {
    return funnyIntros[4] + response + 
           "\n\n🏛️ History is like the ultimate reality TV show, except it actually happened and changed the world! Plus, the drama is REAL and the plot twists are legendary! 📺👑" +
           funnyClosers[4];
  }
  
  if (lowerMessage.includes('physics') || lowerMessage.includes('energy') || lowerMessage.includes('force')) {
    return funnyIntros[5] + response + 
           "\n\n⚡ Physics is like the universe's instruction manual - except it's written in math and sometimes breaks your brain in the best way possible! But hey, at least we figured out why things fall down instead of up! 🌍📚" +
           funnyClosers[5];
  }
  
  if (lowerMessage.includes('programming') || lowerMessage.includes('code') || lowerMessage.includes('computer')) {
    return funnyIntros[6] + response + 
           "\n\n💻 Programming is like having a conversation with a REALLY literal friend who does exactly what you tell them to do... including your mistakes! 'I told you to print 100 times!' 'Okay!' *prints 10,000 pages* 😅🖨️" +
           funnyClosers[6];
  }
  
  if (lowerMessage.includes('literature') || lowerMessage.includes('poetry') || lowerMessage.includes('shakespeare')) {
    return funnyIntros[7] + response + 
           "\n\n📖 Literature is like time travel - you get to visit different worlds, meet fascinating characters, and come back with stories to tell! Plus, Shakespeare basically invented half the insults we still use today! 'Thou crusty batch of nature!' 🎭😂" +
           funnyClosers[7];
  }
  
  if (lowerMessage.includes('study') || lowerMessage.includes('exam') || lowerMessage.includes('test')) {
    return funnyIntros[0] + response + 
           "\n\n📚 Studying is like training for your brain Olympics! Every practice session makes you stronger, faster, and more prepared to tackle any challenge! You're basically becoming a knowledge ninja! 🥷📖" +
           funnyClosers[0];
  }
  
  // General funny response
  return funnyIntros[Math.floor(Math.random() * funnyIntros.length)] + response + 
         funnyClosers[Math.floor(Math.random() * funnyClosers.length)];
}

function applySeriousStyle(response: string, message: string): string {
  const academicIntros = [
    "This is an excellent academic inquiry that merits thorough examination. ",
    "Allow me to provide a comprehensive analysis of this fundamental concept. ",
    "This topic requires systematic investigation and careful consideration. ",
    "Let us approach this subject with scholarly precision and methodical analysis. ",
    "Your question touches upon a significant area of study that demands rigorous exploration. ",
    "This presents an opportunity for deep intellectual engagement with the subject matter. ",
    "The complexity of this topic necessitates a structured, analytical approach. ",
    "This inquiry calls for a detailed examination of the underlying principles involved. "
  ];
  
  const academicClosers = [
    "\n\nFor comprehensive mastery, I recommend examining the historical development, theoretical frameworks, and practical applications of this concept across multiple contexts.",
    "\n\nThis foundational knowledge serves as a cornerstone for advanced study and provides the conceptual framework necessary for deeper academic pursuit.",
    "\n\nTo further your scholarly understanding, consider consulting primary sources, peer-reviewed research, and authoritative texts in this field.",
    "\n\nShould you require elaboration on any specific aspect or wish to explore related theoretical implications, I encourage continued academic discourse.",
    "\n\nThe mastery of this concept requires sustained intellectual effort and methodical study. I recommend creating a structured learning plan for continued progress.",
    "\n\nThis knowledge forms part of a broader academic discipline. Understanding the connections between related concepts will enhance your overall comprehension.",
    "\n\nCritical thinking skills developed through engaging with such topics will serve you well across all areas of academic and professional endeavor.",
    "\n\nThe pursuit of knowledge in this area opens pathways to understanding more complex theories and applications within the discipline."
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Topic-specific academic responses
  if (lowerMessage.includes('gravity') || lowerMessage.includes('physics')) {
    return academicIntros[0] + response + 
           "\n\nThis fundamental force, first comprehensively described by Sir Isaac Newton in his Principia Mathematica (1687), governs planetary motion, tidal phenomena, and the large-scale structure of the universe. Einstein's General Theory of Relativity (1915) revolutionized our understanding, describing gravity not as a force per se, but as the curvature of spacetime caused by mass and energy. Current research in gravitational physics includes the study of gravitational waves, dark matter interactions, and quantum gravity theories." +
           academicClosers[0];
  }
  
  if (lowerMessage.includes('math') || lowerMessage.includes('algebra') || lowerMessage.includes('equation')) {
    return academicIntros[1] + response + 
           "\n\nMathematical reasoning forms the foundation of logical thinking and scientific inquiry. Algebraic methods, developed over centuries by mathematicians from al-Khwarizmi to modern theorists, provide powerful tools for modeling relationships and solving complex problems. The systematic manipulation of symbols and equations reflects deeper patterns in mathematical structures and has applications across numerous disciplines including physics, economics, and computer science." +
           academicClosers[1];
  }
  
  if (lowerMessage.includes('chemistry') || lowerMessage.includes('atom') || lowerMessage.includes('molecule')) {
    return academicIntros[2] + response + 
           "\n\nChemical science investigates the composition, structure, properties, and behavior of matter at the molecular and atomic level. The periodic table, developed by Mendeleev and refined through quantum mechanics, organizes elements according to their electronic structure and chemical properties. Understanding chemical bonding, thermodynamics, and kinetics provides insight into reaction mechanisms and enables the design of new materials and processes." +
           academicClosers[2];
  }
  
  if (lowerMessage.includes('biology') || lowerMessage.includes('evolution') || lowerMessage.includes('cell')) {
    return academicIntros[3] + response + 
           "\n\nBiological sciences examine life at multiple organizational levels, from molecular mechanisms to ecosystem dynamics. Darwin's theory of evolution by natural selection, supported by evidence from genetics, paleontology, and molecular biology, provides the unifying framework for understanding biological diversity. Modern molecular biology reveals the intricate mechanisms of cellular processes, gene expression, and heredity that govern living systems." +
           academicClosers[3];
  }
  
  if (lowerMessage.includes('history') || lowerMessage.includes('civilization') || lowerMessage.includes('society')) {
    return academicIntros[4] + response + 
           "\n\nHistorical analysis requires critical evaluation of primary and secondary sources, consideration of multiple perspectives, and understanding of causal relationships within their temporal and cultural contexts. The study of history develops skills in critical thinking, evidence-based reasoning, and the ability to discern patterns and trends across different periods and civilizations. Contemporary historiography emphasizes the importance of diverse voices and interdisciplinary approaches." +
           academicClosers[4];
  }
  
  if (lowerMessage.includes('literature') || lowerMessage.includes('analysis') || lowerMessage.includes('writing')) {
    return academicIntros[5] + response + 
           "\n\nLiterary analysis involves the systematic examination of textual elements including narrative structure, characterization, symbolism, and thematic content within their historical and cultural contexts. Critical theory provides various frameworks for interpretation, from formalist approaches to post-colonial and feminist perspectives. Effective academic writing requires clear argumentation, textual evidence, and engagement with relevant scholarly discourse." +
           academicClosers[5];
  }
  
  if (lowerMessage.includes('programming') || lowerMessage.includes('algorithm') || lowerMessage.includes('computer')) {
    return academicIntros[6] + response + 
           "\n\nComputer science encompasses algorithmic thinking, data structures, computational complexity, and software engineering principles. Programming languages serve as formal systems for expressing computational procedures, each with specific paradigms and applications. The theoretical foundations of computer science, including automata theory, formal logic, and computational mathematics, provide the framework for understanding the capabilities and limitations of computational systems." +
           academicClosers[6];
  }
  
  if (lowerMessage.includes('study') || lowerMessage.includes('research') || lowerMessage.includes('academic')) {
    return academicIntros[7] + response + 
           "\n\nEffective academic study requires metacognitive awareness, strategic planning, and the application of evidence-based learning techniques. Research in cognitive psychology demonstrates the superiority of active learning methods, spaced repetition, and retrieval practice over passive review. The development of critical thinking skills and information literacy is essential for success in higher education and professional practice." +
           academicClosers[7];
  }
  
  // General academic response
  return academicIntros[Math.floor(Math.random() * academicIntros.length)] + response + 
         academicClosers[Math.floor(Math.random() * academicClosers.length)];
}

function applyMotivationalStyle(response: string, message: string): string {
  const motivationalIntros = [
    "💪 YES! You're asking all the RIGHT questions, champion! ",
    "🌟 I absolutely LOVE your curiosity - that's the mindset of a true winner! ",
    "🔥 What an AMAZING question! You're thinking like a future leader! ",
    "✨ Your eagerness to learn is absolutely INSPIRING! ",
    "🚀 WOW! That's the kind of thinking that changes the world! ",
    "⭐ You're on FIRE with these brilliant questions! ",
    "💎 This is exactly how successful people think - keep it up! ",
    "🎯 I can see your potential shining bright through this question! "
  ];
  
  const motivationalClosers = [
    "\n\n🎯 Remember: every EXPERT was once a beginner, every PRO was once an amateur, and every LEGEND started with questions just like yours! You've absolutely got this!",
    "\n\n🚀 Keep that curiosity blazing bright - it's your SECRET WEAPON for success! The world needs more thinkers like you!",
    "\n\n⭐ You're building your knowledge empire brick by brick, and this foundation will take you ANYWHERE you want to go! Dream big!",
    "\n\n💫 Believe in yourself fiercely! Every question you ask, every concept you master makes you STRONGER and SMARTER!",
    "\n\n🌟 Your learning journey is YOUR success story in the making! Every step forward is a victory worth celebrating!",
    "\n\n💪 You're not just learning - you're TRANSFORMING into the amazing person you're meant to be! Keep pushing those boundaries!",
    "\n\n🔥 The fact that you're here, asking questions and growing - THAT is what separates achievers from dreamers! You're doing it!",
    "\n\n✨ Your mind is your most powerful tool, and you're sharpening it every day! That's what champions do!"
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Specific motivational responses based on context
  if (lowerMessage.includes('struggling') || lowerMessage.includes('difficult') || lowerMessage.includes('hard') || lowerMessage.includes('can\'t')) {
    return "🤗 Hey there, CHAMPION! I hear you're finding this challenging, and you know what? That means you're GROWING! That means you're pushing your limits! " + response +
           "\n\n💪 Every challenge is your brain getting STRONGER! Every struggle is building the mental muscles you'll need for even bigger victories! Think about how INCREDIBLE you'll feel when you master this - because you WILL master this! You've conquered difficulties before, and this one doesn't stand a chance against your determination! 🏆" +
           motivationalClosers[3];
  }
  
  if (lowerMessage.includes('exam') || lowerMessage.includes('test') || lowerMessage.includes('nervous') || lowerMessage.includes('worried')) {
    return "🌟 Listen up, SUPERSTAR! Test anxiety just means you CARE about doing well - that's actually a sign of greatness! " + response +
           "\n\n🎯 You've been preparing, you've been learning, and now it's time to SHOW what you know! Every test is just an opportunity to demonstrate how much you've grown. Breathe deep, trust your preparation, and remember - you're more capable than you know! Turn those nerves into EXCITEMENT! 🚀" +
           motivationalClosers[0];
  }
  
  if (lowerMessage.includes('give up') || lowerMessage.includes('quit') || lowerMessage.includes('tired') || lowerMessage.includes('frustrated')) {
    return "🔥 STOP right there, WARRIOR! Feeling frustrated? That means you're pushing boundaries! That means you're not settling for easy! " + response +
           "\n\n💎 Diamonds are formed under pressure, and right now, you're becoming something BRILLIANT! Every moment you don't give up is a moment you're building the persistence that will carry you to SUCCESS! The world needs people who don't quit - people like YOU! Take a breath, remember why you started, and let's keep building your dreams! 🌟" +
           motivationalClosers[6];
  }
  
  if (lowerMessage.includes('goal') || lowerMessage.includes('future') || lowerMessage.includes('career') || lowerMessage.includes('dream')) {
    return "✨ NOW we're talking! I can feel your AMBITION radiating through this question! " + response +
           "\n\n🚀 Your goals aren't just dreams - they're your DESTINY calling! Every skill you learn, every challenge you overcome is building the bridge to your incredible future! You're not just studying - you're PREPARING for greatness! The world is waiting for what you'll contribute! Keep your eyes on that prize! 💫" +
           motivationalClosers[4];
  }
  
  if (lowerMessage.includes('math') || lowerMessage.includes('science') || lowerMessage.includes('programming')) {
    return "💪 YES! You're diving into the languages of the UNIVERSE! " + response +
           "\n\n🧠 Math, science, and technology are the superpowers of the 21st century! Every equation you solve, every concept you grasp makes you more powerful, more capable of changing the world! You're literally training your brain to think like the innovators and leaders who are shaping our future! Keep pushing those mental boundaries! 🌟" +
           motivationalClosers[1];
  }
  
  if (lowerMessage.includes('study') || lowerMessage.includes('learn') || lowerMessage.includes('understand')) {
    return "🎯 That's the SPIRIT of a true learner! I can see your growth mindset shining! " + response +
           "\n\n📚 Every moment you spend learning is an investment in the AMAZING person you're becoming! You're not just memorizing facts - you're building the knowledge and skills that will open doors you can't even imagine yet! Your future self is going to thank you for the hard work you're putting in right now! 🌟" +
           motivationalClosers[2];
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('guidance')) {
    return "🤝 You know what asking for help shows? WISDOM! STRENGTH! INTELLIGENCE! " + response +
           "\n\n💡 The most successful people in the world know when to ask for support - and that's exactly what you're doing! You're showing maturity, humility, and the smart strategy of leveraging resources to achieve your goals! That's leadership thinking! You're building not just knowledge, but the habits of highly successful people! 🚀" +
           motivationalClosers[5];
  }
  
  // General motivational response
  return motivationalIntros[Math.floor(Math.random() * motivationalIntros.length)] + response + 
         motivationalClosers[Math.floor(Math.random() * motivationalClosers.length)];
}

export async function getDemoUser(username: string, password: string) {
  // Demo users - in the real app, this will check the database
  const demoUsers = [
    {
      id: '1',
      username: 'student_demo',
      password: 'demo123',
      role: 'student',
      fullName: 'Alex Student',
      email: 'student@eduverse.demo'
    },
    {
      id: '2', 
      username: 'teacher_demo',
      password: 'demo123',
      role: 'teacher',
      fullName: 'Sarah Teacher',
      email: 'teacher@eduverse.demo'
    },
    {
      id: '3',
      username: 'admin_demo',
      password: 'demo123', 
      role: 'admin',
      fullName: 'Mike Administrator',
      email: 'admin@eduverse.demo'
    },
    {
      id: '4',
      username: 'parent_demo',
      password: 'demo123',
      role: 'parent',
      fullName: 'Lisa Parent',
      email: 'parent@eduverse.demo'
    }
  ];

  return demoUsers.find(user => 
    user.username === username && user.password === password
  );
}