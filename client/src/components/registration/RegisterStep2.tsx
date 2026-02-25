import React from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap, BookOpen, Users, ArrowLeft, ArrowRight, Calendar } from 'lucide-react';

interface RegisterStep2Props {
  data: {
    role: 'student' | 'teacher' | 'parent';
    subject: string;
    gradeLevel: string;
    dateOfBirth: string;
    childName: string;
  };
  updateData: (data: Partial<RegisterStep2Props['data']>) => void;
  onNext: () => void;
  onBack: () => void;
}

const GRADE_VALUES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] as const;
const SUBJECT_KEYS: Record<string, string> = {
  'Mathematics': 'subjectMathematics', 'Science': 'subjectScience', 'English': 'subjectEnglish', 'History': 'subjectHistory',
  'Geography': 'subjectGeography', 'Physics': 'subjectPhysics', 'Chemistry': 'subjectChemistry', 'Biology': 'subjectBiology',
  'Computer Science': 'subjectComputerScience', 'Arts': 'subjectArts', 'Music': 'subjectMusic', 'Physical Education': 'subjectPhysicalEducation',
};
const SUBJECT_VALUES = Object.keys(SUBJECT_KEYS);

export function RegisterStep2({ data, updateData, onNext, onBack }: RegisterStep2Props) {
  const { t } = useTranslation('auth');
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!data.role) newErrors.role = t('selectRole');
    
    if (data.role === 'student' && !data.gradeLevel) {
      newErrors.gradeLevel = t('gradeLevelRequired');
    }
    if (data.role === 'teacher' && !data.subject) {
      newErrors.subject = t('subjectRequired');
    }
    if (data.role === 'parent' && !data.childName) {
      newErrors.childName = t('childNameRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  const roles = [
    { value: 'student' as const, labelKey: 'student' as const, icon: GraduationCap, descKey: 'iWantToLearn' as const },
    { value: 'teacher' as const, labelKey: 'teacher' as const, icon: BookOpen, descKey: 'iWantToTeach' as const },
    { value: 'parent' as const, labelKey: 'parent' as const, icon: Users, descKey: 'iWantToMonitor' as const },
  ];

  return (
    <div className="w-full max-w-md mx-auto p-8 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('roleProfile')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('tellUsAboutYourself')}</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8 gap-2">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-gold text-navy-900 flex items-center justify-center font-bold text-sm shadow-md">✓</div>
          <span className="ml-2 text-sm font-medium text-primary hidden sm:block">{t('personalInfo')}</span>
        </div>
        <div className="h-1 w-12 bg-gradient-to-r from-primary to-gold rounded-full mx-2"></div>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-gold text-navy-900 flex items-center justify-center font-bold text-sm shadow-md">2</div>
          <span className="ml-2 text-sm font-medium text-primary hidden sm:block">{t('roleDetails')}</span>
        </div>
        <div className="h-1 w-12 bg-gray-200 dark:bg-navy-700 rounded-full mx-2"></div>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-navy-700 text-gray-400 dark:text-gray-500 flex items-center justify-center font-bold text-sm">3</div>
          <span className="ml-2 text-sm font-medium text-gray-400 dark:text-gray-500 hidden sm:block">{t('security')}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Selection */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-3 ml-1">{t('iAm')} *</label>
          <div className="grid grid-cols-3 gap-3">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = data.role === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => updateData({ role: role.value })}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                    isSelected
                      ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-lg scale-105'
                      : 'border-gray-200 dark:border-navy-600 hover:border-primary/50 dark:hover:border-primary/50 bg-white dark:bg-navy-900/50'
                  }`}
                >
                  <Icon size={24} className={isSelected ? 'text-primary' : 'text-gray-400 dark:text-gray-500'} />
                  <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>
                    {t(role.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.role && <p className="text-red-500 text-xs ml-1 mt-2">{errors.role}</p>}
        </div>

        {/* Conditional Fields Based on Role */}
        {data.role === 'student' && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1 ml-1">{t('gradeLevel')} *</label>
              <select
                value={data.gradeLevel}
                onChange={(e) => updateData({ gradeLevel: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border ${errors.gradeLevel ? 'border-red-500' : 'border-gray-200 dark:border-navy-600'} focus:border-primary focus:ring-primary/20 focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 dark:bg-navy-900/50 text-gray-900 dark:text-white`}
              >
                <option value="">{t('selectGrade')}</option>
                {GRADE_VALUES.map((grade, i) => (
                  <option key={grade} value={grade}>{t(`grade${i + 1}`)}</option>
                ))}
              </select>
              {errors.gradeLevel && <p className="text-red-500 text-xs ml-1 mt-1">{errors.gradeLevel}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1 ml-1">{t('dateOfBirthOptional')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <Calendar size={18} />
                </div>
                <input
                  type="date"
                  value={data.dateOfBirth}
                  onChange={(e) => updateData({ dateOfBirth: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-navy-600 focus:border-primary focus:ring-primary/20 focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 dark:bg-navy-900/50 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </>
        )}

        {data.role === 'teacher' && (
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1 ml-1">{t('subject')} *</label>
            <select
              value={data.subject}
              onChange={(e) => updateData({ subject: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border ${errors.subject ? 'border-red-500' : 'border-gray-200 dark:border-navy-600'} focus:border-primary focus:ring-primary/20 focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 dark:bg-navy-900/50 text-gray-900 dark:text-white`}
            >
              <option value="">{t('selectSubject')}</option>
              {SUBJECT_VALUES.map((subject) => (
                <option key={subject} value={subject}>{t(SUBJECT_KEYS[subject])}</option>
              ))}
            </select>
            {errors.subject && <p className="text-red-500 text-xs ml-1 mt-1">{errors.subject}</p>}
          </div>
        )}

        {data.role === 'parent' && (
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1 ml-1">{t('childName')} *</label>
            <input
              type="text"
              value={data.childName}
              onChange={(e) => updateData({ childName: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border ${errors.childName ? 'border-red-500' : 'border-gray-200 dark:border-navy-600'} focus:border-primary focus:ring-primary/20 focus:outline-none focus:ring-4 transition-all duration-200 bg-gray-50/50 dark:bg-navy-900/50 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
              placeholder={t('placeholderChildName')}
            />
            {errors.childName && <p className="text-red-500 text-xs ml-1 mt-1">{errors.childName}</p>}
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="w-1/3 bg-gray-100 dark:bg-navy-700 hover:bg-gray-200 dark:hover:bg-navy-600 text-gray-700 dark:text-gray-300 font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> {t('back')}
          </button>
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-primary via-gold to-primary hover:from-primary-hover hover:via-gold hover:to-primary-hover text-navy-900 font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all duration-200 flex items-center justify-center gap-2"
          >
            {t('nextStep')} <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
