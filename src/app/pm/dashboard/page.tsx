import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDashboardSummary, getDynamicDeveloperPerformance } from "@/services/dashboardService";
import Link from "next/link";
import { 
  Briefcase, CheckCircle, Clock, AlertTriangle, FileText, 
  Activity, XCircle, Users, BarChart2
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function PMDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PM") redirect("/login");

  const data = await getDashboardSummary();
  const devPerf = await getDynamicDeveloperPerformance();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Manager Dashboard</h1>
          <p className="text-gray-500">Welcome back, {session.user.name}</p>
        </div>
        <div className="flex gap-4">
          <Link href="/pm/projects" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md transition font-medium">
            Manage Projects
          </Link>
          <Link href="/pm/tasks" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition font-medium">
            View All Tasks
          </Link>
          <Link href="/pm/productivity" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition font-medium flex items-center gap-2">
            <BarChart2 size={16} /> Productivity
          </Link>
        </div>
      </div>

      {/* SUMMARY SECTION */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Briefcase size={18}/> Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <MiniStat title="Projects" value={data.summary.activeProjects} />
          <MiniStat title="Total Tasks" value={data.summary.totalTasks} />
          <MiniStat title="Completed" value={data.summary.completedTasks} className="text-green-600" />
          <MiniStat title="In Progress" value={data.summary.inProgressTasks} className="text-blue-600" />
          <MiniStat title="Ready Test" value={data.summary.readyTestingTasks} className="text-yellow-600" />
          <MiniStat title="Testing" value={data.summary.testingTasks} className="text-indigo-600" />
          <MiniStat title="Rework" value={data.summary.reworkTasks} className="text-orange-600" />
          <MiniStat title="Blocked" value={data.summary.blockedTasks} className="text-red-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DELIVERY SECTION */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Clock size={18}/> Delivery Metrics</h2>
          <div className="grid grid-cols-2 gap-6">
            <MetricCard title="Tasks Due Today" value={data.delivery.dueToday} />
            <MetricCard title="Tasks Due Soon" value={data.delivery.dueSoon} />
            <MetricCard title="Overdue (Current)" value={data.delivery.overdueTasks} className="text-red-600" />
            <MetricCard title="On-Time Completion" value={`${data.delivery.onTimeCompletion.toFixed(1)}%`} />
            <MetricCard title="Avg Start Delay" value={`${data.delivery.avgStartDelay.toFixed(1)} days`} />
            <MetricCard title="Avg Delivery Delay" value={`${data.delivery.avgDeliveryDelay.toFixed(1)} days`} />
          </div>
        </div>

        {/* QUALITY SECTION */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle size={18}/> Quality Metrics</h2>
          <div className="grid grid-cols-2 gap-6">
            <MetricCard title="Testing Pass Rate" value={`${data.quality.testingPassRate.toFixed(1)}%`} />
            <MetricCard title="First-Pass Success" value={`${data.quality.firstPassSuccessRate.toFixed(1)}%`} />
            <MetricCard title="Total Defects" value={data.quality.defectCount} />
            <MetricCard title="Total Rework" value={data.quality.reworkCount} />
            <MetricCard title="Total Retests" value={data.quality.retestCount} />
          </div>
        </div>
      </div>

      {/* DEVELOPER PERFORMANCE SECTION */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Users size={18}/> Developer Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Developer</th>
                <th className="px-6 py-3 text-right">Tasks</th>
                <th className="px-6 py-3 text-right">Completed</th>
                <th className="px-6 py-3 text-right">Progress</th>
                <th className="px-6 py-3 text-right">Commitment</th>
                <th className="px-6 py-3 text-right">Effort</th>
                <th className="px-6 py-3 text-right">Start Dly</th>
                <th className="px-6 py-3 text-right">Deliv Dly</th>
                <th className="px-6 py-3 text-right">Accuracy</th>
                <th className="px-6 py-3 text-right">Rework</th>
                <th className="px-6 py-3 text-right">First Pass</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devPerf.map((dev) => (
                <tr key={dev.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{dev.name}</td>
                  <td className="px-6 py-4 text-right">{dev.totalTasks}</td>
                  <td className="px-6 py-4 text-right">{dev.completed}</td>
                  <td className="px-6 py-4 text-right">{dev.avgProgress.toFixed(0)}%</td>
                  <td className="px-6 py-4 text-right">{dev.totalCommitment}</td>
                  <td className="px-6 py-4 text-right">{dev.totalActualEffort}</td>
                  <td className="px-6 py-4 text-right">{dev.avgStartDelay > 0 ? `+${dev.avgStartDelay.toFixed(1)}d` : '-'}</td>
                  <td className="px-6 py-4 text-right">{dev.avgDeliveryDelay > 0 ? `+${dev.avgDeliveryDelay.toFixed(1)}d` : '-'}</td>
                  <td className="px-6 py-4 text-right">{dev.avgEstimationAccuracy ? `${dev.avgEstimationAccuracy.toFixed(0)}%` : '-'}</td>
                  <td className="px-6 py-4 text-right">{dev.totalRework}</td>
                  <td className="px-6 py-4 text-right text-green-600 font-medium">{dev.firstPassSuccessRate.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ title, value, className = "text-gray-900" }: { title: string, value: number, className?: string }) {
  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-center">
      <p className="text-xs text-gray-500 mb-1 truncate">{title}</p>
      <p className={`text-xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

function MetricCard({ title, value, className = "text-gray-900" }: { title: string, value: string | number, className?: string }) {
  return (
    <div className="border-b border-gray-100 pb-2">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${className}`}>{value}</p>
    </div>
  );
}
