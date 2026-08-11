import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDashboardSummary, getDynamicDeveloperPerformance, getProjectPerformance } from "@/services/dashboardService";
import { 
  CheckCircle, Clock, AlertTriangle, Briefcase,
  Activity, XCircle, Users, BarChart, Shield
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function CEODashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CEO") redirect("/login");

  const data = await getDashboardSummary();
  const devPerf = await getDynamicDeveloperPerformance();
  const projPerf = await getProjectPerformance();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="text-blue-600" /> Executive Dashboard
          </h1>
          <p className="text-gray-500">Welcome back, {session.user.name}. View is read-only.</p>
        </div>
      </div>

      {/* SYSTEM SUMMARY */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart size={18}/> System Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <MiniStat title="Active Projects" value={data.summary.activeProjects} />
          <MiniStat title="Total Tasks" value={data.summary.totalTasks} />
          <MiniStat title="Completed" value={data.summary.completedTasks} className="text-green-600" />
          <MiniStat title="Pending" value={data.summary.totalTasks - data.summary.completedTasks} className="text-blue-600" />
          <MiniStat title="Overdue" value={data.summary.overdueTasks} className="text-red-600" />
          <MiniStat title="Testing" value={data.summary.testingTasks} className="text-yellow-600" />
          <MiniStat title="Rework" value={data.summary.reworkTasks} className="text-orange-600" />
          <MiniStat title="Blocked" value={data.summary.blockedTasks} className="text-gray-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QUALITY SECTION */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle size={18}/> Quality</h2>
          <div className="grid grid-cols-2 gap-6">
            <MetricCard title="Testing Pass Rate" value={`${data.quality.testingPassRate.toFixed(1)}%`} />
            <MetricCard title="First-Pass Success" value={`${data.quality.firstPassSuccessRate.toFixed(1)}%`} />
            <MetricCard title="Defects" value={data.quality.defectCount} />
            <MetricCard title="Retests" value={data.quality.retestCount} />
            <MetricCard title="Rework" value={data.quality.reworkCount} />
          </div>
        </div>

        {/* DELIVERY SECTION */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Clock size={18}/> Delivery</h2>
          <div className="grid grid-cols-2 gap-6">
            <MetricCard title="On-Time Completion" value={`${data.delivery.onTimeCompletion.toFixed(1)}%`} className="text-green-600" />
            <MetricCard title="Overdue Tasks (Incomplete)" value={data.delivery.overdueTasks} className="text-red-600" />
            <MetricCard title="Avg Delivery Delay" value={`${data.delivery.avgDeliveryDelay.toFixed(1)} days`} />
            <MetricCard title="Avg Start Delay" value={`${data.delivery.avgStartDelay.toFixed(1)} days`} />
          </div>
        </div>
      </div>

      {/* PROJECT PERFORMANCE */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Briefcase size={18}/> Project Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Project</th>
                <th className="px-6 py-3 text-right">Total Tasks</th>
                <th className="px-6 py-3 text-right">Completed</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3 text-right">Overdue</th>
                <th className="px-6 py-3 text-right">Delayed (Hist.)</th>
                <th className="px-6 py-3 text-right">Testing</th>
                <th className="px-6 py-3 text-right">Defects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projPerf.map((proj) => (
                <tr key={proj.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{proj.code} - {proj.name}</td>
                  <td className="px-6 py-4 text-right">{proj.totalTasks}</td>
                  <td className="px-6 py-4 text-right">{proj.completedTasks}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-[4rem]">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${proj.progress}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500">{proj.progress.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-red-600">{proj.overdue}</td>
                  <td className="px-6 py-4 text-right text-orange-600">{proj.delayed}</td>
                  <td className="px-6 py-4 text-right">{proj.testing}</td>
                  <td className="px-6 py-4 text-right">{proj.totalDefects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEVELOPER PERFORMANCE */}
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
                <th className="px-6 py-3 text-right">Comp. %</th>
                <th className="px-6 py-3 text-right">Avg Prog.</th>
                <th className="px-6 py-3 text-right">Start Dly</th>
                <th className="px-6 py-3 text-right">Deliv Dly</th>
                <th className="px-6 py-3 text-right">Accuracy</th>
                <th className="px-6 py-3 text-right">First Pass</th>
                <th className="px-6 py-3 text-right">Rework</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {devPerf.map((dev) => (
                <tr key={dev.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{dev.name}</td>
                  <td className="px-6 py-4 text-right">{dev.totalTasks}</td>
                  <td className="px-6 py-4 text-right">{dev.completed}</td>
                  <td className="px-6 py-4 text-right">{dev.completionRate.toFixed(0)}%</td>
                  <td className="px-6 py-4 text-right">{dev.avgProgress.toFixed(0)}%</td>
                  <td className="px-6 py-4 text-right">{dev.avgStartDelay > 0 ? `+${dev.avgStartDelay.toFixed(1)}d` : '-'}</td>
                  <td className="px-6 py-4 text-right">{dev.avgDeliveryDelay > 0 ? `+${dev.avgDeliveryDelay.toFixed(1)}d` : '-'}</td>
                  <td className="px-6 py-4 text-right">{dev.avgEstimationAccuracy ? `${dev.avgEstimationAccuracy.toFixed(0)}%` : '-'}</td>
                  <td className="px-6 py-4 text-right text-green-600 font-medium">{dev.firstPassSuccessRate.toFixed(0)}%</td>
                  <td className="px-6 py-4 text-right">{dev.totalRework}</td>
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
