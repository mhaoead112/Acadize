import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Grade Trend Chart for Students
interface GradeTrendData {
  week: string;
  grade: number;
  average: number;
}

interface GradeTrendChartProps {
  data: GradeTrendData[];
  title?: string;
}

export function GradeTrendChart({ data, title = "Grade Trends" }: GradeTrendChartProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis 
              dataKey="week" 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="grade" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="Your Grade"
            />
            <Line 
              type="monotone" 
              dataKey="average" 
              stroke="#94a3b8" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#94a3b8', strokeWidth: 2, r: 3 }}
              name="Class Average"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Course Progress Chart for Students
interface CourseProgressData {
  course: string;
  completed: number;
  total: number;
  percentage: number;
}

interface CourseProgressChartProps {
  data: CourseProgressData[];
  title?: string;
}

export function CourseProgressChart({ data, title = "Course Progress" }: CourseProgressChartProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis 
              dataKey="course" 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [`${value}%`, 'Progress']}
            />
            <Bar 
              dataKey="percentage" 
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              name="Progress"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Class Performance Chart for Teachers
interface ClassPerformanceData {
  subject: string;
  averageGrade: number;
  attendance: number;
  engagement: number;
}

interface ClassPerformanceChartProps {
  data: ClassPerformanceData[];
  title?: string;
}

export function ClassPerformanceChart({ data, title = "Class Performance Overview" }: ClassPerformanceChartProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis 
              dataKey="subject" 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="averageGrade" 
              stackId="1"
              stroke="#10b981" 
              fill="#10b981"
              fillOpacity={0.6}
              name="Average Grade"
            />
            <Area 
              type="monotone" 
              dataKey="attendance" 
              stackId="2"
              stroke="#3b82f6" 
              fill="#3b82f6"
              fillOpacity={0.6}
              name="Attendance Rate"
            />
            <Area 
              type="monotone" 
              dataKey="engagement" 
              stackId="3"
              stroke="#8b5cf6" 
              fill="#8b5cf6"
              fillOpacity={0.6}
              name="Engagement Score"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Student Distribution Chart for Teachers
interface StudentDistributionData {
  grade: string;
  count: number;
  color: string;
}

interface StudentDistributionChartProps {
  data: StudentDistributionData[];
  title?: string;
}

export function StudentDistributionChart({ data, title = "Grade Distribution" }: StudentDistributionChartProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ grade, count }) => `${grade}: ${count}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// User Growth Chart for Admins
interface UserGrowthData {
  month: string;
  students: number;
  teachers: number;
  parents: number;
  total: number;
}

interface UserGrowthChartProps {
  data: UserGrowthData[];
  title?: string;
}

export function UserGrowthChart({ data, title = "User Growth Over Time" }: UserGrowthChartProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis 
              dataKey="month" 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="students" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              name="Students"
            />
            <Line 
              type="monotone" 
              dataKey="teachers" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="Teachers"
            />
            <Line 
              type="monotone" 
              dataKey="parents" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              name="Parents"
            />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#f59e0b" 
              strokeWidth={3}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 5 }}
              name="Total Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Revenue Chart for Admins
interface RevenueData {
  month: string;
  revenue: number;
  target: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  title?: string;
}

export function RevenueChart({ data, title = "Revenue Tracking" }: RevenueChartProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis 
              dataKey="month" 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
              tickFormatter={(value) => `$${value/1000}k`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            />
            <Legend />
            <Bar 
              dataKey="revenue" 
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              name="Actual Revenue"
            />
            <Bar 
              dataKey="target" 
              fill="#94a3b8"
              radius={[4, 4, 0, 0]}
              name="Target Revenue"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Engagement Metrics Chart
interface EngagementData {
  day: string;
  messagesSent: number;
  assignmentsSubmitted: number;
  forumPosts: number;
}

interface EngagementChartProps {
  data: EngagementData[];
  title?: string;
}

export function EngagementChart({ data, title = "Daily Engagement Metrics" }: EngagementChartProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis 
              dataKey="day" 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(0,0,0,0.6)"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="messagesSent" 
              stackId="1"
              stroke="#3b82f6" 
              fill="#3b82f6"
              fillOpacity={0.8}
              name="Messages Sent"
            />
            <Area 
              type="monotone" 
              dataKey="assignmentsSubmitted" 
              stackId="1"
              stroke="#10b981" 
              fill="#10b981"
              fillOpacity={0.8}
              name="Assignments Submitted"
            />
            <Area 
              type="monotone" 
              dataKey="forumPosts" 
              stackId="1"
              stroke="#8b5cf6" 
              fill="#8b5cf6"
              fillOpacity={0.8}
              name="Forum Posts"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Performance Gauge Chart
interface PerformanceGaugeData {
  score: number;
  label: string;
}

interface PerformanceGaugeProps {
  data: PerformanceGaugeData;
  title?: string;
  color?: string;
}

export function PerformanceGauge({ 
  data, 
  title = "Performance Score",
  color = "#10b981" 
}: PerformanceGaugeProps) {
  const gaugeData = [
    {
      value: data.score,
      fill: color,
    },
    {
      value: 100 - data.score,
      fill: '#e5e7eb',
    },
  ];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="60%" 
            outerRadius="90%" 
            data={gaugeData}
            startAngle={90}
            endAngle={450}
          >
            <RadialBar 
              dataKey="value" 
              cornerRadius={10}
              fill={color}
            />
            <text 
              x="50%" 
              y="50%" 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className="text-3xl font-bold"
              fill={color}
            >
              {data.score}%
            </text>
            <text 
              x="50%" 
              y="60%" 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className="text-sm"
              fill="rgba(0,0,0,0.6)"
            >
              {data.label}
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Weekly Activity Heatmap (simplified version)
interface ActivityHeatmapData {
  day: string;
  hour: number;
  activity: number;
}

interface ActivityHeatmapProps {
  data: ActivityHeatmapData[];
  title?: string;
}

export function ActivityHeatmap({ data, title = "Activity Heatmap" }: ActivityHeatmapProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getActivityLevel = (day: string, hour: number) => {
    const item = data.find(d => d.day === day && d.hour === hour);
    return item ? item.activity : 0;
  };

  const getColor = (activity: number) => {
    if (activity === 0) return '#f3f4f6';
    if (activity <= 25) return '#dbeafe';
    if (activity <= 50) return '#93c5fd';
    if (activity <= 75) return '#3b82f6';
    return '#1d4ed8';
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-25 gap-1 text-xs">
            <div></div>
            {hours.map(hour => (
              <div key={hour} className="text-center text-xs text-gray-500">
                {hour % 4 === 0 ? hour : ''}
              </div>
            ))}
          </div>
          {days.map(day => (
            <div key={day} className="grid grid-cols-25 gap-1">
              <div className="text-xs text-gray-500 py-1">{day}</div>
              {hours.map(hour => (
                <div
                  key={`${day}-${hour}`}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getColor(getActivityLevel(day, hour)) }}
                  title={`${day} ${hour}:00 - Activity: ${getActivityLevel(day, hour)}%`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 rounded-sm bg-gray-200"></div>
            <div className="w-3 h-3 rounded-sm bg-blue-200"></div>
            <div className="w-3 h-3 rounded-sm bg-blue-400"></div>
            <div className="w-3 h-3 rounded-sm bg-blue-600"></div>
            <div className="w-3 h-3 rounded-sm bg-blue-800"></div>
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
