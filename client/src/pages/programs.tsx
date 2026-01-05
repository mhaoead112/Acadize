import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Baby, Users, GraduationCap, Check } from "lucide-react";
import highSchoolImage from "@assets/stock_images/friendly_technology__a8b182a8.jpg";

export default function Programs() {
  return (
    <div className="pt-24 bg-slate-50 dark:luxury-gradient min-h-screen">
      {/* Programs Header */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="bg-white/95 dark:bg-white/10 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-4xl mx-auto border border-slate-200 dark:border-white/30">
              <h1 className="text-4xl font-luxury text-slate-900 dark:text-gray-900 mb-4">Academic Programs</h1>
              <p className="text-xl text-slate-700 dark:text-gray-700 max-w-3xl mx-auto font-elegant">
                Comprehensive educational pathways designed to challenge, inspire, and prepare 
                students for university and beyond.
              </p>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Elementary Program */}
            <Card className="luxury-card overflow-hidden border-0 shadow-2xl hover:scale-105 transition-all duration-400">
              <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=300" 
                alt="Young elementary students engaged in colorful classroom activities" 
                className="w-full h-48 object-cover" 
              />
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <Baby className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl font-luxury text-gray-800">Elementary School</h3>
                </div>
                <p className="text-gray-600 mb-6 font-premium">Ages 5-10 | Primary Years Programme (PYP)</p>
                <p className="text-gray-600 mb-6 font-elegant">
                  Foundation years focusing on inquiry-based learning, creativity, and building 
                  essential skills through play and exploration.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-600">
                    <Check className="text-green-500 mr-2" size={16} />
                    Inquiry-based curriculum
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Check className="text-green-500 mr-2" size={16} />
                    Multilingual education
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Check className="text-green-500 mr-2" size={16} />
                    Creative arts integration
                  </li>
                </ul>
                <Button className="luxury-button w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:shadow-2xl transition-all duration-400 border-2 border-yellow-300/40 relative overflow-hidden font-luxury">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 animate-pulse"></div>
                  <span className="relative z-10">Learn More</span>
                </Button>
              </CardContent>
            </Card>
            
            {/* Middle School Program */}
            <Card className="luxury-card overflow-hidden border-0 shadow-2xl hover:scale-105 transition-all duration-400">
              <img 
                src="https://images.unsplash.com/photo-1577896851231-70ef18881754?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=300" 
                alt="Middle school students conducting science experiments in modern laboratory" 
                className="w-full h-48 object-cover" 
              />
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <Users className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl font-luxury text-gray-800">Middle School</h3>
                </div>
                <p className="text-gray-600 mb-6 font-premium">Ages 11-14 | Middle Years Programme (MYP)</p>
                <p className="text-gray-600 mb-6 font-elegant">
                  Challenging academic curriculum that encourages students to make connections 
                  between subjects and real-world applications.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-600">
                    <Check className="text-green-500 mr-2" size={16} />
                    Interdisciplinary learning
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Check className="text-green-500 mr-2" size={16} />
                    Personal project development
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Check className="text-green-500 mr-2" size={16} />
                    Leadership opportunities
                  </li>
                </ul>
                <Button className="luxury-button w-full bg-gradient-to-r from-blue-400 to-blue-600 text-white hover:shadow-2xl transition-all duration-400 border-2 border-blue-300/40 relative overflow-hidden font-luxury">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-400/20 animate-pulse"></div>
                  <span className="relative z-10">Learn More</span>
                </Button>
              </CardContent>
            </Card>
            
            {/* High School Program */}
            <Card className="luxury-card overflow-hidden border-0 shadow-2xl hover:scale-105 transition-all duration-400">
              <img 
                src={highSchoolImage} 
                alt="Friendly high school students using technology and computers" 
                className="w-full h-48 object-cover" 
              />
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <GraduationCap className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl font-luxury text-gray-800">High School</h3>
                </div>
                <p className="text-gray-600 mb-6 font-premium">Ages 15-18 | Diploma Programme (DP)</p>
                <p className="text-gray-600 mb-6 font-elegant">
                  Rigorous pre-university curriculum that develops intellectual, personal, 
                  emotional and social skills needed for university success.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-600">
                    <Check className="text-green-500 mr-2" size={16} />
                    IB Diploma Programme
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Check className="text-green-500 mr-2" size={16} />
                    University preparation
                  </li>
                  <li className="flex items-center text-gray-600">
                    <Check className="text-green-500 mr-2" size={16} />
                    Extended essay project
                  </li>
                </ul>
                <Button className="luxury-button w-full bg-gradient-to-r from-green-400 to-green-600 text-white hover:shadow-2xl transition-all duration-400 border-2 border-green-300/40 relative overflow-hidden font-luxury">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-transparent to-green-400/20 animate-pulse"></div>
                  <span className="relative z-10">Learn More</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Curriculum Overview */}
      <section className="py-20 bg-white dark:bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-luxury text-slate-900 dark:text-gray-900 mb-4">Curriculum Framework</h2>
            <p className="text-xl text-slate-700 dark:text-gray-700 max-w-3xl mx-auto font-elegant">
              Our international curriculum is designed to develop well-rounded, globally-minded students.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="luxury-card text-center border-0 shadow-2xl hover:scale-105 transition-all duration-400">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="font-luxury text-gray-800 mb-2">Academic Excellence</h3>
                <p className="text-sm text-gray-600 font-elegant">
                  Rigorous academics that challenge students to reach their full potential across all subject areas.
                </p>
              </CardContent>
            </Card>
            
            <Card className="luxury-card text-center border-0 shadow-2xl hover:scale-105 transition-all duration-400">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🌐</div>
                <h3 className="font-luxury text-gray-800 mb-2">International Mindedness</h3>
                <p className="text-sm text-gray-600 font-elegant">
                  Developing global perspectives and cultural understanding through diverse experiences.
                </p>
              </CardContent>
            </Card>
            
            <Card className="luxury-card text-center border-0 shadow-2xl hover:scale-105 transition-all duration-400">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="font-luxury text-gray-800 mb-2">Creative Expression</h3>
                <p className="text-sm text-gray-600 font-elegant">
                  Encouraging creativity through arts, music, drama, and innovative project-based learning.
                </p>
              </CardContent>
            </Card>
            
            <Card className="luxury-card text-center border-0 shadow-2xl hover:scale-105 transition-all duration-400">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">⚽</div>
                <h3 className="font-luxury text-gray-800 mb-2">Physical Development</h3>
                <p className="text-sm text-gray-600 font-elegant">
                  Promoting healthy lifestyles through sports, fitness, and wellness programs.
                </p>
              </CardContent>
            </Card>
            
            <Card className="luxury-card text-center border-0 shadow-2xl hover:scale-105 transition-all duration-400">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="font-luxury text-gray-800 mb-2">Service Learning</h3>
                <p className="text-sm text-gray-600 font-elegant">
                  Building character through community service and social responsibility initiatives.
                </p>
              </CardContent>
            </Card>
            
            <Card className="luxury-card text-center border-0 shadow-2xl hover:scale-105 transition-all duration-400">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">💭</div>
                <h3 className="font-luxury text-gray-800 mb-2">Critical Thinking</h3>
                <p className="text-sm text-gray-600 font-elegant">
                  Developing analytical and problem-solving skills for lifelong learning success.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <Link href="/subjects">
              <Button className="luxury-button bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:shadow-2xl transition-all duration-400 px-8 py-3 border-2 border-yellow-300/40 relative overflow-hidden font-luxury">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-yellow-400/20 animate-pulse"></div>
                <span className="relative z-10">Explore Our Subjects</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
