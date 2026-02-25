import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from "framer-motion";
import StudentLayout from "@/components/StudentLayout";
import { useAuth } from '@/hooks/useAuth';
import { 
  Download, 
  Eye,
  FileText,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";
import type { ReportCard, ReportPeriod } from "@shared/schema";
import { apiEndpoint } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  pageVariants, 
  staggerContainer,
  staggerContainerFast, 
  fadeInUpVariants, 
  glowCardVariants, 
  buttonVariants,
  springConfigs 
} from "@/lib/animations";

interface ReportCardWithDetails extends ReportCard {
  uploaderName: string;
}

const PERIODS = [
  { value: 'Q1', label: '1st Quarter', color: 'bg-blue-100 text-blue-700' },
  { value: 'Q2', label: '2nd Quarter', color: 'bg-green-100 text-green-700' },
  { value: 'Q3', label: '3rd Quarter', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'Q4', label: '4th Quarter', color: 'bg-orange-100 text-orange-700' },
  { value: 'S1', label: '1st Semester', color: 'bg-purple-100 text-purple-700' },
  { value: 'S2', label: '2nd Semester', color: 'bg-pink-100 text-pink-700' },
  { value: 'FINAL', label: 'Final Report', color: 'bg-red-100 text-red-700' },
] as const;

const ACADEMIC_YEARS = [
  '2024-2025',
  '2023-2024',
  '2022-2023',
  '2021-2022',
];

export default function StudentReportCards() {
  const { t } = useTranslation('dashboard');
  const { token, user } = useAuth();
  const [reportCards, setReportCards] = useState<ReportCardWithDetails[]>([]);
  const [selectedYear, setSelectedYear] = useState(ACADEMIC_YEARS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod | 'ALL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportCards();
  }, [selectedYear, selectedPeriod]);

  const fetchReportCards = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = apiEndpoint(`/api/report-cards/student?academicYear=${selectedYear}`);
      if (selectedPeriod !== 'ALL') {
        url += `&period=${selectedPeriod}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report cards');
      }

      const data = await response.json();
      setReportCards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (reportCard: ReportCardWithDetails) => {
    if (!token) return;
    
    try {
      const response = await fetch(
        apiEndpoint(`/api/report-cards/${reportCard.id}/view`),
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to view report card');
    }
  };

  const handleDownload = async (reportCard: ReportCardWithDetails) => {
    if (!token) return;
    
    try {
      const response = await fetch(
        apiEndpoint(`/api/report-cards/${reportCard.id}/download`),
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to download report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = reportCard.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download report card');
    }
  };

  const getPeriodInfo = (period: ReportPeriod) => {
    return PERIODS.find(p => p.value === period) || PERIODS[0];
  };

  const filteredReports = reportCards.filter(report => {
    if (selectedPeriod === 'ALL') return true;
    return report.period === selectedPeriod;
  });

  return (
    <StudentLayout>
      <div 
        className="space-y-6 ml-5 mr-10 mt-8 mb-16"
      > 
        {/* Header */}
        <div 
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary dark:text-[#FFD700]" />
              {t('reportCards')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              View and download your academic progress reports
            </p>
          </div>
        </div>

        {/* Filters */}
        <div>
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-white">Filter Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Academic Year
                </label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10">
                    {ACADEMIC_YEARS.map(year => (
                      <SelectItem key={year} value={year} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Period
                </label>
                <Select value={selectedPeriod} onValueChange={(val) => setSelectedPeriod(val as ReportPeriod | 'ALL')}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10">
                    <SelectItem value="ALL" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-surface-accent">All Periods</SelectItem>
                    {PERIODS.map(period => (
                      <SelectItem key={period.value} value={period.value} className="text-white hover:bg-surface-accent">
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Loading State */}
        {loading && (
          <div>
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-[#FFD700]" />
              <span className="ml-3 text-slate-600 dark:text-slate-400">{t('loadingReportCards')}</span>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div>
          <Card className="border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Report Cards List */}
        {!loading && !error && (
          <>
            {filteredReports.length === 0 ? (
              <div>
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {t('noReportCardsFound')}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
                    {t('noReportCardsDescription')}
                  </p>
                </CardContent>
              </Card>
              </div>
            ) : (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredReports.map((report, index) => {
                  const periodInfo = getPeriodInfo(report.period);
                  
                  return (
                    <Card 
                      key={report.id}
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 hover:border-primary/50 dark:hover:border-[#FFD700]/50 transition-all hover:shadow-lg hover:shadow-primary/10 dark:hover:shadow-[#FFD700]/10"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Badge className="bg-primary dark:bg-[#FFD700] text-white dark:text-black hover:bg-primary/90 dark:hover:bg-[#FFD700]/90">
                              {periodInfo.label}
                            </Badge>
                            <CardTitle className="text-lg mt-2 text-slate-900 dark:text-white">
                              {report.academicYear}
                            </CardTitle>
                          </div>
                          <FileText className="h-8 w-8 text-primary dark:text-[#FFD700]" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-slate-600 dark:text-slate-400">
                            <Calendar className="h-4 w-4 mr-2" />
                            Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Uploaded by:</span> {report.uploaderName}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium">File:</span> {report.fileName}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                          <Button 
                            className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-900 dark:text-white border-slate-200 dark:border-white/10" 
                            variant="outline"
                            onClick={() => handleView(report)}
                          >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                          </Button>
                          <Button 
                            className="flex-1 bg-primary dark:bg-[#FFD700] hover:bg-primary/90 dark:hover:bg-[#FFD700]/90 text-white dark:text-black"
                            onClick={() => handleDownload(report)}
                          >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Info Card */}
        <div>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500/50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">About Report Cards</p>
              <p>
                Your report cards are official documents showing your academic progress. 
                They are uploaded by your teachers at the end of each quarter or semester. 
                You can view them online or download them for your records.
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </StudentLayout>
  );
}
