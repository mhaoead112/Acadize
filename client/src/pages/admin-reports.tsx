import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoint } from '@/lib/config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Download, Calendar, TrendingUp } from 'lucide-react';

// Mock data - replace with actual API data in the future
const enrollmentData = [
  { name: 'Jan', enrollment: 400, revenue: 2400 },
  { name: 'Feb', enrollment: 300, revenue: 1398 },
  { name: 'Mar', enrollment: 200, revenue: 9800 },
  { name: 'Apr', enrollment: 278, revenue: 3908 },
  { name: 'May', enrollment: 189, revenue: 4800 },
  { name: 'Jun', enrollment: 239, revenue: 3800 },
];

const categoryDistribution = [
  { name: 'Engineering', value: 400 },
  { name: 'Design', value: 300 },
  { name: 'Business', value: 300 },
  { name: 'Marketing', value: 200 },
];

const COLORS = ['#FFD700', '#cbc290', '#3d3920', '#242114'];

export default function AdminReports() {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState('6months');

  // Fetch reports data for potential future use
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['admin-reports-analytics'],
    queryFn: async () => {
      const response = await fetch(apiEndpoint('/api/admin/reports?limit=100'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      return response.json();
    },
    enabled: !!token
  });

  const handleExportPDF = () => {
    toast({
      title: t('toast.exportStarted'),
      description: t('toast.exportPdfDescription'),
    });
    // TODO: Implement actual PDF export functionality
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-16 h-16 border-4 border-slate-200 dark:border-white/10 rounded-full animate-spin border-t-[#FFD700]" />
          <p className="text-slate-600 dark:text-slate-300 font-medium">Loading reports...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12 ml-5">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{t('intelligenceReports')}</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">In-depth performance analysis and financial forecasting.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 h-12 px-6 rounded-2xl bg-slate-800 dark:bg-[#112240] border border-slate-700 dark:border-white/10 text-white text-sm font-black hover:border-[#FFD700]/50 transition-all"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <button
              onClick={() => setTimeRange('6months')}
              className="flex items-center gap-2 h-12 px-6 rounded-2xl bg-[#FFD700] text-slate-900 text-sm font-black hover:scale-105 transition-all"
            >
              <Calendar className="h-4 w-4" />
              Last 6 Months
            </button>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Performance Area Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-slate-900 dark:text-white text-xl font-black">Revenue Performance</h3>
              <span className="text-green-600 dark:text-green-400 font-bold text-sm bg-green-100 dark:bg-green-400/10 px-3 py-1 rounded-full">+24% vs Last Year</span>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={enrollmentData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFD700" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '16px',
                      color: '#fff'
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#FFD700" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Category Distribution Pie Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl"
          >
            <h3 className="text-slate-900 dark:text-white text-xl font-black mb-8">Category Market Share</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 h-[300px]">
              <div className="w-full h-full max-w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {categoryDistribution.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-3">
                    <div className="size-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400 text-sm font-bold">{entry.name}</span>
                    <span className="text-slate-900 dark:text-white font-black text-sm ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Monthly Enrollment Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 p-8 rounded-[2.5rem] shadow-xl"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-slate-900 dark:text-white text-xl font-black">Monthly Enrollment Breakdown</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">New students vs recurring activity</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-[#FFD700]" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">ENROLLMENT</span>
              </div>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 215, 0, 0.05)' }}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #3d3920',
                    borderRadius: '16px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="enrollment" fill="#FFD700" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
