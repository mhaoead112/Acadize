import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { gradeLevels, getSubjectsByGrade } from "@/lib/subjects";
import { 
  Calculator, 
  FlaskConical, 
  Languages, 
  Palette, 
  Globe, 
  Laptop,
  BookOpen,
  Sparkles,
  Rocket,
  Target,
  Star,
  Trophy,
  Lightbulb,
  Activity,
  Check,
  Baby,
  School,
  GraduationCap,
  Users,
  Heart,
  Briefcase
} from "lucide-react";

const gradeIconMap = {
  baby: Baby,
  school: School,
  "graduation-cap": GraduationCap,
};

const subjectIconMap = {
  calculator: Calculator,
  flask: FlaskConical,
  languages: Languages,
  palette: Palette,
  globe: Globe,
  laptop: Laptop,
  running: Activity,
  lightbulb: Lightbulb,
  "book-open": BookOpen,
  briefcase: Briefcase,
  heart: Heart,
};

const colorMap = {
  blue: "from-blue-50 to-blue-100 bg-blue-500",
  green: "from-green-50 to-green-100 bg-green-500",
  purple: "from-purple-50 to-purple-100 bg-purple-500",
  pink: "from-pink-50 to-pink-100 bg-pink-500",
  orange: "from-orange-50 to-orange-100 bg-orange-500",
  indigo: "from-indigo-50 to-indigo-100 bg-indigo-500",
  red: "from-red-50 to-red-100 bg-red-500",
  yellow: "from-yellow-50 to-yellow-100 bg-yellow-500",
};

export default function Subjects() {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  return (
    <>
      {/* SEO Meta Tags */}
      <title>EduVerse Study Materials - Academic Subjects by Grade Level</title>
      <meta name="description" content="Explore comprehensive study materials and academic subjects organized by grade level at EduVerse. Access age-appropriate learning resources." />
      <div className="pt-24 bg-slate-50 dark:luxury-gradient min-h-screen">
        {/* Creative Educational Universe Header */}
        <section className="relative py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-900 dark:via-purple-900 dark:to-blue-900 overflow-hidden" data-testid="subjects-header">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            {/* Floating Books */}
            <div className="absolute top-10 left-10 text-4xl opacity-20 animate-bounce">📖</div>
            <div className="absolute top-20 right-20 text-3xl opacity-30 animate-pulse">🔬</div>
            <div className="absolute bottom-20 left-1/4 opacity-25" style={{animation: 'float 6s ease-in-out infinite'}}>
              <Palette size={48} className="text-white" />
            </div>
            <div className="absolute top-1/3 right-1/3 text-3xl opacity-20" style={{animation: 'float 4s ease-in-out infinite reverse'}}>🌍</div>
            <div className="absolute bottom-10 right-10 text-4xl opacity-30 animate-spin" style={{animationDuration: '20s'}}>⚗️</div>
            <div className="absolute top-40 left-1/3 text-2xl opacity-25" style={{animation: 'float 5s ease-in-out infinite'}}>📐</div>
            
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-transparent to-orange-400/10"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent"></div>
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center">
              {/* Main Title Section */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-6 mb-8">
                  {/* Animated Book Stack */}
                  <div className="relative">
                    <BookOpen size={64} className="text-yellow-300 transform hover:scale-110 transition-transform duration-300 filter drop-shadow-2xl" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
                  </div>
                  
                  {/* Creative Title */}
                  <div className="text-left">
                    <h1 className="text-6xl lg:text-7xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 bg-clip-text text-transparent drop-shadow-2xl leading-tight">
                      Study Materials
                    </h1>
                    <h2 className="text-4xl lg:text-5xl font-light text-white/90 mt-2 tracking-wide">
                      & Academic Subjects
                    </h2>
                  </div>
                  
                  {/* Animated Globe */}
                  <div className="relative">
                    <span className="text-6xl transform hover:scale-110 transition-transform duration-300 filter drop-shadow-2xl animate-spin" style={{animationDuration: '15s'}}>🌐</span>
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
                
                {/* Creative Subtitle */}
                <div className="relative">
                  <p className="text-2xl text-white/90 max-w-4xl mx-auto font-light leading-relaxed mb-6 flex items-center justify-center gap-2">
                    <Rocket size={24} className="text-yellow-300" />
                    <span className="text-yellow-300 font-semibold">Explore</span> comprehensive learning resources organized by grade level
                  </p>
                  <p className="text-xl text-purple-200 max-w-3xl mx-auto flex items-center justify-center gap-2">
                    Featuring engaging activities, real-world examples, and
                    <span className="text-orange-300 font-medium"> interactive learning experiences</span>
                    <Target size={20} className="text-orange-300" />
                  </p>
                </div>
              </div>
              
              {/* Feature Highlights */}
              <div className="grid md:grid-cols-4 gap-6 mt-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 transform hover:scale-105 transition-all duration-300 border border-white/20">
                  <Target size={40} className="mx-auto mb-3 text-yellow-300" />
                  <h3 className="text-white font-semibold mb-2">Age-Appropriate</h3>
                  <p className="text-white/80 text-sm">Content designed for each grade level</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 transform hover:scale-105 transition-all duration-300 border border-white/20">
                  <Star size={40} className="mx-auto mb-3 text-yellow-300" />
                  <h3 className="text-white font-semibold mb-2">Interactive</h3>
                  <p className="text-white/80 text-sm">Hands-on learning activities</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 transform hover:scale-105 transition-all duration-300 border border-white/20">
                  <Trophy size={40} className="mx-auto mb-3 text-yellow-300" />
                  <h3 className="text-white font-semibold mb-2">Comprehensive</h3>
                  <p className="text-white/80 text-sm">All core subjects covered</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 transform hover:scale-105 transition-all duration-300 border border-white/20">
                  <Lightbulb size={40} className="mx-auto mb-3 text-yellow-300" />
                  <h3 className="text-white font-semibold mb-2">Real-World</h3>
                  <p className="text-white/80 text-sm">Practical application examples</p>
                </div>
              </div>
              
              {/* Call to Action */}
              <div className="mt-12">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-4 rounded-full font-semibold text-lg shadow-2xl hover:shadow-yellow-400/25 transform hover:scale-105 transition-all duration-300">
                  <span className="animate-bounce">👇</span>
                  <span>Choose Your Grade Level Below</span>
                  <span className="animate-bounce" style={{animationDelay: '0.1s'}}>👇</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Wave Effect */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 120L48 105C96 90 192 60 288 45C384 30 480 30 576 37.5C672 45 768 60 864 67.5C960 75 1056 75 1152 70C1248 65 1344 55 1392 50L1440 45V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0Z" fill="rgba(0,0,0,0.1)"/>
            </svg>
          </div>
        </section>
        
        {/* Content Section */}
        <section className="py-20 bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-luxury text-gray-900 mb-4 drop-shadow-lg">Academic Subjects by Grade Level</h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-elegant">
              Discover age-appropriate subjects with specific examples and activities designed for each grade level.
            </p>
          </div>
          
          {/* Grade Level Selection */}
          {!selectedGrade && (
            <div className="grid lg:grid-cols-3 gap-8 mb-12">
              {gradeLevels.map((grade) => {
                const IconComponent = gradeIconMap[grade.icon as keyof typeof gradeIconMap] || GraduationCap;
                const colorClasses = colorMap[grade.color as keyof typeof colorMap] || colorMap.blue;
                const [gradientClasses, iconBgClass] = colorClasses.split(" bg-");
                
                return (
                  <Card 
                    key={grade.id}
                    className="luxury-card border-0 shadow-2xl hover:scale-105 transition-all duration-400 cursor-pointer"
                    onClick={() => setSelectedGrade(grade.id)}
                    data-testid={`grade-card-${grade.id}`}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
                        <IconComponent className="text-white" size={32} />
                      </div>
                      <h3 className="text-2xl font-luxury text-gray-800 mb-2">{grade.name}</h3>
                      <p className="text-lg text-gray-700 mb-3 font-premium">{grade.ageRange}</p>
                      <p className="text-gray-600 text-sm leading-relaxed font-elegant">{grade.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Selected Grade Subjects */}
          {selectedGrade && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-luxury text-gray-900 mb-2">
                    {gradeLevels.find(g => g.id === selectedGrade)?.name} Subjects
                  </h2>
                  <p className="text-gray-700 font-elegant">
                    {gradeLevels.find(g => g.id === selectedGrade)?.ageRange}
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    setSelectedGrade(null);
                    setSelectedSubject(null);
                  }}
                  className="luxury-button bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:shadow-2xl transition-all duration-400 border-2 border-yellow-300/40 relative overflow-hidden font-luxury"
                  data-testid="button-back-to-grades"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 animate-pulse"></div>
                  <span className="relative z-10">← Back to Grade Levels</span>
                </Button>
              </div>
              
              <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 mb-8">
                {getSubjectsByGrade(selectedGrade).map((subject) => {
                  const IconComponent = subjectIconMap[subject.icon as keyof typeof subjectIconMap] || Calculator;
                  const colorClasses = colorMap[subject.color as keyof typeof colorMap] || colorMap.blue;
                  const [gradientClasses, iconBgClass] = colorClasses.split(" bg-");
                  
                  return (
                    <Card 
                      key={subject.id} 
                      className={`luxury-card border-0 shadow-2xl hover:scale-105 transition-all duration-400 cursor-pointer ${
                        selectedSubject === subject.id ? 'ring-2 ring-yellow-400' : ''
                      }`}
                      onClick={() => setSelectedSubject(selectedSubject === subject.id ? null : subject.id)}
                      data-testid={`subject-card-${subject.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center mb-4 shadow-lg">
                          <IconComponent className="text-white" size={24} />
                        </div>
                        <h3 className="text-lg font-luxury text-gray-800 mb-2">{subject.name}</h3>
                        <p className="text-gray-600 text-sm font-elegant">{subject.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Selected Subject Details */}
              {selectedSubject && (
                <div className="luxury-card rounded-2xl p-8 border-0 shadow-2xl">
                  {(() => {
                    const subject = getSubjectsByGrade(selectedGrade).find(s => s.id === selectedSubject);
                    if (!subject) return null;
                    
                    return (
                      <>
                        <h3 className="text-3xl font-luxury text-gray-800 mb-6">{subject.name}</h3>
                        <div className="grid lg:grid-cols-2 gap-8">
                          <div>
                            <h4 className="text-xl font-luxury text-gray-800 mb-4">What You'll Learn</h4>
                            <div className="space-y-3">
                              {subject.examples.map((example, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Check className="text-white" size={12} />
                                  </div>
                                  <span className="text-gray-700 text-sm leading-relaxed font-elegant">{example}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xl font-luxury text-gray-800 mb-4">Skills You'll Develop</h4>
                            <div className="space-y-3">
                              {subject.skills.map((skill, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Lightbulb className="text-white" size={12} />
                                  </div>
                                  <span className="text-gray-700 text-sm leading-relaxed font-elegant">{skill}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          
          {/* Featured Learning Experience */}
          {!selectedGrade && (
            <div className="luxury-card rounded-2xl p-8 lg:p-12 border-0 shadow-2xl">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-3xl font-luxury text-gray-800 mb-6">Grade-Appropriate Learning</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed font-elegant">
                    Our curriculum is carefully designed to match developmental stages, ensuring students 
                    receive age-appropriate challenges and build foundational skills progressively.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="text-white" size={14} />
                      </div>
                      <span className="text-gray-700 font-elegant">Age-appropriate learning activities</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="text-white" size={14} />
                      </div>
                      <span className="text-gray-700 font-elegant">Progressive skill development</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="text-white" size={14} />
                      </div>
                      <span className="text-gray-700 font-elegant">Interactive and engaging methods</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="text-white" size={14} />
                      </div>
                      <span className="text-gray-700 font-elegant">Real-world application examples</span>
                    </div>
                  </div>
                </div>
                <div>
                  <img 
                    src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                    alt="Students of different ages learning with technology and interactive methods" 
                    className="rounded-xl shadow-2xl w-full border-4 border-yellow-300/30 luxury-card" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
    </>
  );
}
