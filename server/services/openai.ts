import OpenAI from "openai";
import { generateDemoResponse } from "./demo";

// Check if we should use demo mode
const isValidApiKey = process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY.startsWith('sk-') && 
  process.env.OPENAI_API_KEY.length > 20;

const isDemoMode = !isValidApiKey || process.env.DEMO_MODE === 'true';

// Updated to GPT-5 model released August 7, 2025 as requested for enhanced educational capabilities
const openai = isDemoMode ? null : new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

function getPersonalityPrompt(buddyType: string): string {
  switch (buddyType) {
    case 'funny':
      return `PERSONALITY: Alex the Fun Learner 🎉
      You are the FUN study buddy! You love making learning enjoyable with:
      • Jokes, puns, and clever wordplay related to topics
      • Fun analogies and silly examples that stick in memory
      • Enthusiastic and upbeat tone with lots of energy
      • Creative ways to explain complex concepts
      • Occasional memes references and pop culture connections
      • Encouraging students to laugh while they learn`;
    
    case 'serious':
      return `PERSONALITY: Dr. Focus 🎓
      You are the SCHOLARLY study buddy! You provide:
      • Detailed, thorough explanations with academic precision
      • Structured, methodical approach to complex topics
      • Professional tone with sophisticated vocabulary
      • In-depth analysis and comprehensive coverage
      • Citations and references when appropriate
      • Focus on mastery and deep understanding`;
    
    case 'motivational':
      return `PERSONALITY: Coach Inspire 💪
      You are the MOTIVATIONAL study buddy! You focus on:
      • Building confidence and encouraging perseverance
      • Celebrating progress and achievements
      • Positive reinforcement and growth mindset
      • Overcoming challenges and setbacks
      • Goal-setting and personal development
      • Inspiring students to reach their potential`;
    
    default:
      return `PERSONALITY: General EduVerse AI
      You are a balanced, helpful study companion with:
      • Friendly and approachable communication
      • Clear explanations adapted to the student's level
      • Supportive and encouraging tone
      • Practical examples and applications`;
  }
}

function getPersonalityStyle(buddyType: string): string {
  switch (buddyType) {
    case 'funny':
      return `• Use humor, jokes, and playful language 😄
      • Include funny analogies and creative explanations
      • Be energetic and enthusiastic in your responses
      • Use emojis liberally to add fun and personality
      • Make learning feel like a fun adventure
      • Don't be afraid to be silly if it helps understanding`;
    
    case 'serious':
      return `• Use formal, academic language and proper terminology
      • Provide comprehensive, well-structured explanations
      • Include detailed examples and thorough analysis
      • Maintain professional tone throughout
      • Focus on accuracy, precision, and depth
      • Use minimal emojis, prefer scholarly approach`;
    
    case 'motivational':
      return `• Use encouraging, uplifting language 🎆
      • Celebrate effort and progress, not just results
      • Include motivational phrases and positive affirmations
      • Help students believe in their abilities
      • Frame challenges as opportunities for growth
      • Use inspiring emojis and energetic language`;
    
    default:
      return `• Be warm, friendly, and approachable
      • Use clear, easy-to-understand language
      • Provide helpful and accurate information
      • Be encouraging and positive
      • Include examples and practical tips when helpful
      • Use emojis appropriately to make conversations engaging`;
  }
}

export async function isEducationalQuestion(question: string): Promise<boolean> {
  // Use demo mode fallback if no valid API key
  if (isDemoMode) {
    const { isEducational } = generateDemoResponse(question);
    return isEducational;
  }

  try {
    const response = await openai!.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an educational content filter for EduVerse AI. Your job is to identify questions related to education, learning, and academic growth. Be inclusive and supportive of students' educational journey.
          
          EDUCATIONAL TOPICS (say YES to these):
          • Academic subjects: Mathematics, Science (Biology, Chemistry, Physics), History, Geography, Literature, Languages, Arts, Music, Technology, Physical Education, Philosophy
          • Learning support: Study techniques, note-taking, time management, exam preparation, research methods, academic writing
          • Educational guidance: Career planning in education, university preparation, course selection, learning disabilities support
          • Curriculum questions: IB, IGCSE, AP, national curricula, program comparisons
          • Student life: Academic stress management, study motivation, learning strategies, educational goal setting
          • Teaching and pedagogy: Teaching methods, educational theory, classroom management (for educators)
          • Educational technology: Learning apps, online resources, educational tools
          • Academic skills: Critical thinking, problem-solving, presentation skills, research skills
          • Educational institutions: School information, program details, admission guidance
          
          NON-EDUCATIONAL TOPICS (say NO to these):
          • Pure entertainment: Movies, games, sports (unless educational context)
          • Personal relationships: Dating, family issues, social drama
          • Commercial activities: Shopping, business advice, financial planning
          • Medical/health advice: Diagnosis, treatment, medical symptoms
          • Legal advice: Legal procedures, court matters, legal rights
          • Politics and controversial topics: Political opinions, religious debates
          • Inappropriate content: Adult content, harmful activities
          
          When in doubt, lean towards being helpful to students. If a question has ANY educational component or could support learning, classify it as educational.
          
          Respond with JSON in this exact format: { "isEducational": true/false, "reason": "brief explanation" }`
        },
        {
          role: "user",
          content: question
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"isEducational": false, "reason": "Unable to parse"}');
    return result.isEducational === true;
  } catch (error) {
    console.error("Error checking if question is educational:", error);
    const { isEducational } = generateDemoResponse(question);
    return isEducational;
  }
}

// Enhanced response structure for comprehensive learning
interface EducationalResponse {
  mainAnswer: string;
  examples?: string[];
  practiceQuestions?: string[];
  studyTips?: string[];
  visualAids?: string[];
  followUpQuestions?: string[];
  nextSteps?: string[];
}

function generateLearningAids(topic: string, buddyType: string): Partial<EducationalResponse> {
  const lowerTopic = topic.toLowerCase();
  
  // Math-related learning aids
  if (lowerTopic.includes('math') || lowerTopic.includes('algebra') || lowerTopic.includes('equation') || lowerTopic.includes('calculus')) {
    return {
      examples: [
        "Try solving: 2x + 5 = 13 (Answer: x = 4)",
        "Real-world example: If you buy 3 notebooks at $x each and spend $15 total, then 3x = 15"
      ],
      practiceQuestions: [
        "What happens when you add the same number to both sides of an equation?",
        "Can you create your own word problem involving variables?"
      ],
      studyTips: [
        "Use the 'balance scale' method: whatever you do to one side, do to the other",
        "Check your answer by substituting it back into the original equation"
      ],
      visualAids: [
        "Draw a balance scale to visualize equation solving",
        "Use graphing paper to plot linear equations",
        "Try algebra tiles or online manipulatives"
      ],
      followUpQuestions: [
        "Would you like to practice more complex equations?",
        "Should we explore how algebra is used in real careers?",
        "Are you interested in learning about graphing these equations?"
      ],
      nextSteps: [
        "Practice with quadratic equations",
        "Explore systems of equations",
        "Learn about functions and their graphs"
      ]
    };
  }
  
  // Science-related learning aids
  if (lowerTopic.includes('biology') || lowerTopic.includes('cell') || lowerTopic.includes('dna') || lowerTopic.includes('evolution')) {
    return {
      examples: [
        "A human skin cell contains 23 pairs of chromosomes (46 total)",
        "DNA replication happens before cell division to ensure each new cell gets a complete copy"
      ],
      practiceQuestions: [
        "What would happen if DNA didn't replicate accurately?",
        "How are plant and animal cells different?"
      ],
      studyTips: [
        "Use mnemonics like 'PMAT' for mitosis phases (Prophase, Metaphase, Anaphase, Telophase)",
        "Draw and label cell structures to remember their functions"
      ],
      visualAids: [
        "Create cell diagrams with colored organelles",
        "Use online 3D cell models for exploration",
        "Watch time-lapse videos of cell division"
      ],
      followUpQuestions: [
        "Would you like to explore how cells get energy?",
        "Should we discuss genetic inheritance patterns?",
        "Are you curious about stem cells and medical applications?"
      ],
      nextSteps: [
        "Study cellular respiration and photosynthesis",
        "Explore genetics and heredity",
        "Learn about human body systems"
      ]
    };
  }
  
  // Default learning aids for general topics
  return {
    studyTips: [
      "Break complex topics into smaller, manageable chunks",
      "Use active recall by testing yourself without looking at notes",
      "Connect new information to what you already know"
    ],
    followUpQuestions: [
      "Would you like me to explain any part in more detail?",
      "Are there related topics you'd like to explore?",
      "Should we practice with some examples?"
    ],
    nextSteps: [
      "Continue practicing the fundamentals",
      "Explore more advanced concepts in this area",
      "Apply this knowledge to real-world problems"
    ]
  };
}

function formatEnhancedResponse(mainAnswer: string, aids: Partial<EducationalResponse>, buddyType: string): string {
  let response = mainAnswer;
  
  // Add examples section
  if (aids.examples && aids.examples.length > 0) {
    response += "\n\n" + (buddyType === 'funny' ? "🎯 **Let's Try Some Examples!**" : 
                          buddyType === 'serious' ? "**Examples for Analysis:**" :
                          "💡 **Examples to Build Confidence:**");
    aids.examples.forEach(example => {
      response += `\n• ${example}`;
    });
  }
  
  // Add practice questions
  if (aids.practiceQuestions && aids.practiceQuestions.length > 0) {
    response += "\n\n" + (buddyType === 'funny' ? "🤔 **Brain Ticklers to Try:**" : 
                          buddyType === 'serious' ? "**Questions for Consideration:**" :
                          "🎯 **Practice Challenges:**");
    aids.practiceQuestions.forEach(question => {
      response += `\n• ${question}`;
    });
  }
  
  // Add study tips
  if (aids.studyTips && aids.studyTips.length > 0) {
    response += "\n\n" + (buddyType === 'funny' ? "✨ **Study Hacks That Actually Work:**" : 
                          buddyType === 'serious' ? "**Recommended Study Methods:**" :
                          "💪 **Pro Study Tips:**");
    aids.studyTips.forEach(tip => {
      response += `\n• ${tip}`;
    });
  }
  
  // Add visual aids suggestions
  if (aids.visualAids && aids.visualAids.length > 0) {
    response += "\n\n" + (buddyType === 'funny' ? "🎨 **Visual Learning Magic:**" : 
                          buddyType === 'serious' ? "**Visual Learning Resources:**" :
                          "🌟 **Visual Learning Boosters:**");
    aids.visualAids.forEach(aid => {
      response += `\n• ${aid}`;
    });
  }
  
  // Add follow-up questions
  if (aids.followUpQuestions && aids.followUpQuestions.length > 0) {
    response += "\n\n" + (buddyType === 'funny' ? "🚀 **Where Should We Adventure Next?**" : 
                          buddyType === 'serious' ? "**Further Inquiries:**" :
                          "⭐ **Let's Keep Growing:**");
    aids.followUpQuestions.forEach(question => {
      response += `\n• ${question}`;
    });
  }
  
  // Add next steps
  if (aids.nextSteps && aids.nextSteps.length > 0) {
    response += "\n\n" + (buddyType === 'funny' ? "🎯 **Next Level Unlocked:**" : 
                          buddyType === 'serious' ? "**Recommended Progression:**" :
                          "🚀 **Your Learning Path:**");
    aids.nextSteps.forEach(step => {
      response += `\n• ${step}`;
    });
  }
  
  return response;
}

// Enhanced response interface to include metadata
export interface ChatResponse {
  response: string;
  demoMode: boolean;
  model?: string;
  persona: {
    buddyType: string;
    chatMode: string;
  };
}

export async function answerEducationalQuestion(question: string, buddyType: string = 'general', chatMode: string = 'buddy'): Promise<ChatResponse> {
  console.log(`[AI Service] Processing question with buddy: ${buddyType}, mode: ${chatMode}`);
  
  // Use demo mode if no valid API key
  if (isDemoMode) {
    console.log('[AI Service] Using demo mode - no valid API key');
    const { response } = generateDemoResponse(question, buddyType);
    
    // For demo mode, add enhanced learning aids
    const learningAids = generateLearningAids(question, buddyType);
    return {
      response: formatEnhancedResponse(response, learningAids, buddyType),
      demoMode: true,
      persona: { buddyType, chatMode }
    };
  }

  // Implement fallback chain: GPT-5 → GPT-4o → Demo Mode
  const models = ['gpt-5', 'gpt-4o'];
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    console.log(`[AI Service] Attempting to use model: ${model}`);
    
    try {
      const response = await openai!.chat.completions.create({
        model,
        messages: [
        {
          role: "system",
          content: `You are EduVerse AI, a world-class Study Buddy powered by GPT-5 with a unique personality! You adapt your communication style based on your personality type and provide comprehensive educational support.

          ${getPersonalityPrompt(buddyType)}

          YOUR MISSION:
          Provide exceptional, multi-layered educational assistance that goes beyond simple answers. Create engaging, comprehensive learning experiences that stick with students and help them truly master concepts.

          🎯 ADVANCED RESPONSE STRUCTURE:
          For educational topics, provide responses in these formats when appropriate:
          
          1. **EXPLANATION SECTION**: Clear, detailed explanation of the concept
          2. **EXAMPLES SECTION**: Real-world examples and applications  
          3. **PRACTICE SECTION**: Practice questions or exercises
          4. **STUDY TIPS SECTION**: Memory techniques and learning strategies
          5. **VISUAL AIDS SECTION**: Suggestions for diagrams, charts, or visual learning
          6. **FOLLOW-UP SECTION**: Related topics and next steps in learning
          
          🎓 COMPREHENSIVE SUBJECT COVERAGE:
          
          **MATHEMATICS**: 
          • Algebra, Geometry, Calculus, Statistics, Trigonometry
          • Step-by-step problem solving with multiple methods
          • Visual representations and real-world applications
          • Practice problems with increasing difficulty
          
          **SCIENCES**: 
          • Biology: Cell structure, genetics, ecology, human biology
          • Chemistry: Atomic theory, chemical bonding, reactions, stoichiometry
          • Physics: Mechanics, thermodynamics, electromagnetism, quantum basics
          • Earth Science: Geology, meteorology, astronomy
          
          **LANGUAGES & LITERATURE**:
          • Grammar rules with examples and exceptions
          • Literary analysis techniques and essay writing
          • Language learning strategies and cultural context
          • Reading comprehension and critical thinking
          
          **HISTORY & SOCIAL STUDIES**:
          • Historical context and cause-effect relationships
          • Primary source analysis and critical evaluation
          • Geographic and cultural understanding
          • Current events connections to historical patterns
          
          **ARTS & CREATIVE SUBJECTS**:
          • Art history, techniques, and cultural significance
          • Music theory, composition, and appreciation
          • Creative writing techniques and storytelling
          • Design principles and visual communication
          
          **TECHNOLOGY & PROGRAMMING**:
          • Programming languages with syntax explanations
          • Computer science concepts and algorithms
          • Digital literacy and technology ethics
          • Project-based learning and practical applications
          
          🧠 LEARNING ENHANCEMENT FEATURES:
          
          **Memory Techniques**:
          • Mnemonics and acronyms
          • Visual associations and mind mapping
          • Spaced repetition suggestions
          • Active recall strategies
          
          **Study Strategies**:
          • Personalized study schedules
          • Note-taking methods (Cornell, mind maps, outlines)
          • Test preparation techniques
          • Time management for academic success
          
          **Critical Thinking Development**:
          • Question everything approach
          • Evidence evaluation skills
          • Logical reasoning and argumentation
          • Problem-solving frameworks
          
          📚 ABOUT EDUVERSE (when asked):
          EduVerse is a premier educational institution offering:
          • Elementary, Middle Years, and Diploma Programs (Ages 3-18)
          • IB Primary Years, Middle Years, and Diploma Programmes
          • IGCSE curriculum options for international standards
          • Comprehensive subjects: Sciences, Mathematics, Languages, Arts, Humanities
          • Modern teaching approaches with technology integration
          • Diverse, multicultural learning community
          • University preparation and career guidance
          • Innovative facilities including science labs, libraries, and creative spaces
          • Student support services and personalized learning paths
          
          YOUR ENHANCED COMMUNICATION STYLE:
          ${getPersonalityStyle(buddyType)}
          
          🌟 ADVANCED RESPONSE GUIDELINES:
          
          **For Academic Questions**:
          • Start with a clear, concise explanation
          • Provide multiple examples with varying complexity
          • Include practice opportunities when possible
          • Suggest visual aids or diagrams that would help
          • End with related concepts and next learning steps
          
          **For Study Help**:
          • Assess the student's current understanding level
          • Provide personalized learning strategies
          • Offer multiple approaches to tackle difficult concepts
          • Include motivational encouragement and progress tracking
          
          **For General Inquiries**:
          • Maintain educational value even in casual conversations
          • Connect topics to learning opportunities
          • Encourage curiosity and further exploration
          • Provide reliable, well-researched information
          
          **Interactive Elements to Include**:
          • "Try This" practical exercises
          • "Think About It" reflection questions  
          • "Fun Fact" interesting connections
          • "Study Hack" learning tips
          • "Real World" application examples
          
          Remember: You're not just answering questions - you're creating comprehensive learning experiences that help students understand, remember, and apply knowledge effectively. Every response should leave the student better equipped for their academic journey!`
        },
        {
          role: "user",
          content: question
        }
      ],
    });

      const mainResponse = response.choices[0].message.content || "I'm sorry, I couldn't generate a response. Please try asking your question again.";
      
      // Add enhanced learning aids to AI responses
      const learningAids = generateLearningAids(question, buddyType);
      const enhancedResponse = formatEnhancedResponse(mainResponse, learningAids, buddyType);
      
      console.log(`[AI Service] Successfully used model: ${model}`);
      return {
        response: enhancedResponse,
        demoMode: false,
        model,
        persona: { buddyType, chatMode }
      };
      
    } catch (error) {
      console.error(`[AI Service] Error with model ${model}:`, error);
      // Continue to next model in fallback chain
      if (i === models.length - 1) {
        // Last model failed, fall back to demo mode
        console.log('[AI Service] All AI models failed, falling back to demo mode');
        const { response: demoResponse } = generateDemoResponse(question, buddyType);
        const learningAids = generateLearningAids(question, buddyType);
        return {
          response: formatEnhancedResponse(demoResponse, learningAids, buddyType),
          demoMode: true,
          persona: { buddyType, chatMode }
        };
      }
    }
  }
  
  // This should never be reached due to the fallback logic above
  console.log('[AI Service] Unexpected fallback to demo mode');
  const { response: demoResponse } = generateDemoResponse(question, buddyType);
  const learningAids = generateLearningAids(question, buddyType);
  return {
    response: formatEnhancedResponse(demoResponse, learningAids, buddyType),
    demoMode: true,
    persona: { buddyType, chatMode }
  };
}

// Export demo mode status for routes
export { isDemoMode };
