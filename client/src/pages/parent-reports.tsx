import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import ParentLayout from "@/components/ParentLayout";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint, assetUrl } from '@/lib/config';

interface Child {
  id: string;
  name: string;
  fullName: string;
  gradeLevel?: string;
  school?: string;
}

interface ReportCard {
  id: string;
  period: string;
  academicYear: string;
  fileName: string;
  filePath: string;
  fileSize: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export default function ParentReports() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("All Periods");

  useEffect(() => {
    fetchChildren();
  }, [token]);

  useEffect(() => {
    if (selectedChildId) {
      fetchReportCards();
    }
  }, [selectedChildId, token]);

  const fetchChildren = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiEndpoint('/api/parent/children'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setChildren(data.children || []);
        if (data.children?.length > 0 && !selectedChildId) {
          setSelectedChildId(data.children[0].id);
        }
      } else if (response.status === 401) {
        setLocation('/login');
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const fetchReportCards = async () => {
    if (!token || !selectedChildId) return;

    try {
      setLoading(true);
      const response = await fetch(
        apiEndpoint(`/api/parent/children/${selectedChildId}/reports`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else if (response.status === 401) {
        setLocation('/login');
      }
    } catch (error) {
      console.error('Error fetching report cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (size: string) => {
    const bytes = parseInt(size);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDownload = (report: ReportCard) => {
    window.open(assetUrl(report.filePath), '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const getPeriodColor = (period: string) => {
    const colorMap: Record<string, string> = {
      'Q1': 'text-blue-400',
      'Q2': 'text-green-400',
      'Q3': 'text-yellow-400',
      'Q4': 'text-purple-400',
      'S1': 'text-indigo-400',
      'S2': 'text-pink-400',
      'FINAL': 'text-red-400'
    };
    return colorMap[period] || 'text-slate-400';
  };

  const currentStudent = children.find(c => c.id === selectedChildId);

  const filteredReports = selectedSemester === "All Periods" 
    ? reports 
    : reports.filter(r => r.period === selectedSemester || r.academicYear === selectedSemester);

  return (
    <ParentLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-white text-4xl font-black tracking-tight font-display">Report Cards</h1>
            <p className="text-slate-400 text-base">View and download official academic records for your children.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-700"
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Student Switcher Tabs */}
        <div className="border-b border-slate-800 w-full">
          <div className="flex gap-8">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex items-center gap-3 pb-4 px-2 transition-all relative ${
                  child.id === selectedChildId ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className={`p-1 rounded-full ${child.id === selectedChildId ? 'bg-primary/20' : 'bg-slate-800'}`}>
                  <span className={`material-symbols-outlined text-xl ${child.id === selectedChildId ? 'text-primary' : 'text-slate-500'}`}>face</span>
                </div>
                <span className="font-black text-sm tracking-wide">{child.name || child.fullName}</span>
                {child.id === selectedChildId && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Card Info */}
        <div className="bg-navy-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="appearance-none bg-slate-800 text-white border border-slate-700 rounded-xl pl-4 pr-10 py-3 font-bold focus:ring-2 focus:ring-primary focus:border-transparent outline-none cursor-pointer text-sm"
              >
                <option>All Periods</option>
                <option>Fall 2023-2024</option>
                <option>Spring 2023-2024</option>
                <option>Fall 2022-2023</option>
                <option>Q1</option>
                <option>Q2</option>
                <option>Q3</option>
                <option>Q4</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xl">expand_more</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-800 hidden md:block" />
            <p className="text-slate-400 text-sm font-bold">
              Grade {currentStudent?.gradeLevel || '10'} • {currentStudent?.school || 'Lincoln High School'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-black border border-green-500/20">OFFICIAL RECORDS</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-navy-card rounded-2xl border border-slate-800 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-slate-400 mt-4">Loading report cards...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && reports.length === 0 && (
          <div className="bg-navy-card rounded-2xl border border-slate-800 p-12 text-center">
            <span className="material-symbols-outlined text-7xl text-slate-600 mb-4 block">description</span>
            <h3 className="text-lg font-semibold text-white mb-2">No Report Cards Available</h3>
            <p className="text-slate-400">Report cards will appear here once they are uploaded by teachers.</p>
          </div>
        )}

        {/* Report Cards Table */}
        {!loading && filteredReports.length > 0 && (
          <div className="bg-navy-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
              <h3 className="text-white font-black text-xl font-display">Official Report Cards</h3>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm font-bold">{filteredReports.length} document{filteredReports.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-5">Period</th>
                    <th className="px-6 py-5">Academic Year</th>
                    <th className="px-6 py-5">Document</th>
                    <th className="px-6 py-5">Uploaded By</th>
                    <th className="px-6 py-5">Upload Date</th>
                    <th className="px-6 py-5 text-center">Size</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 ${getPeriodColor(report.period)}`}>
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          <span className="font-black text-sm">{report.period}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-slate-300 font-bold">{report.academicYear}</td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                            <span className="material-symbols-outlined text-xl text-red-400">picture_as_pdf</span>
                          </div>
                          <div>
                            <p className="text-white font-black text-sm">{report.fileName}</p>
                            <p className="text-slate-500 text-xs font-bold">PDF Document</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-slate-300 font-bold">{report.uploadedBy || 'Administrator'}</td>
                      <td className="px-6 py-6 text-slate-400 font-bold">{formatDate(report.uploadedAt)}</td>
                      <td className="px-6 py-6 text-center text-slate-400 font-bold">{formatFileSize(report.fileSize)}</td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(report)}
                            className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-all border border-transparent hover:border-blue-400/20"
                            title="View"
                          >
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                          <button
                            onClick={() => handleDownload(report)}
                            className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all border border-primary/20 hover:border-primary"
                            title="Download"
                          >
                            <span className="material-symbols-outlined">download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Footer */}
        {!loading && reports.length > 0 && (
          <div className="flex justify-center mt-6">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 max-w-2xl">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-400 text-xl mt-0.5">info</span>
                <div>
                  <p className="font-bold text-blue-300 mb-1 text-sm">About Report Cards</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Report cards are official academic documents uploaded by teachers that summarize your child's performance. 
                    Download and save these documents for your records.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ParentLayout>
  );
}
