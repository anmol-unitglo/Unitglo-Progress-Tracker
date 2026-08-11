import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDynamicDeveloperPerformance } from "@/services/dashboardService";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Filter, Calendar } from "lucide-react";

export default async function PMProductivityPage({
  searchParams
}: {
  searchParams: { start?: string, end?: string }
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PM") redirect("/login");

  let startDate: Date | undefined = undefined;
  let endDate: Date | undefined = undefined;
  
  if (searchParams.start) {
    startDate = new Date(searchParams.start);
    startDate.setHours(0, 0, 0, 0);
  }
  
  if (searchParams.end) {
    endDate = new Date(searchParams.end);
    endDate.setHours(23, 59, 59, 999);
  }

  const devPerf = await getDynamicDeveloperPerformance(startDate, endDate);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pm/dashboard" className="text-gray-500 hover:text-gray-800 flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Developer Productivity</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center gap-4">
        <Filter size={18} className="text-gray-400" />
        <span className="font-medium text-gray-700">Time Filter:</span>
        <form className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">From</span>
            <input type="date" name="start" defaultValue={searchParams.start || ""} className="border border-gray-300 rounded px-2 py-1 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">To</span>
            <input type="date" name="end" defaultValue={searchParams.end || ""} className="border border-gray-300 rounded px-2 py-1 text-sm" />
          </div>
          <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm transition">
            Apply Filter
          </button>
          {(searchParams.start || searchParams.end) && (
            <Link href="/pm/productivity" className="text-red-500 hover:text-red-700 text-sm">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="space-y-8">
        {devPerf.map(dev => (
          <div key={dev.id} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">{dev.name}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Output */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">Output</h3>
                <div className="space-y-3">
                  <StatRow label="Total Tasks" value={dev.totalTasks} />
                  <StatRow label="Completed" value={dev.completed} />
                  <StatRow label="In Progress" value={dev.inProgress} />
                  <StatRow label="Testing" value={dev.testing} />
                  <StatRow label="Overdue" value={dev.overdue} className="text-red-600 font-medium" />
                </div>
              </div>

              {/* Delivery */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">Delivery</h3>
                <div className="space-y-3">
                  <StatRow label="Avg Start Delay" value={dev.avgStartDelay > 0 ? `+${dev.avgStartDelay.toFixed(1)}d` : '-'} />
                  <StatRow label="Avg Delivery Delay" value={dev.avgDeliveryDelay > 0 ? `+${dev.avgDeliveryDelay.toFixed(1)}d` : '-'} />
                  <StatRow label="On-Time Completion" value={`${dev.onTimeCompletionRate.toFixed(1)}%`} className="text-green-600 font-medium" />
                </div>
              </div>

              {/* Effort */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">Effort</h3>
                <div className="space-y-3">
                  <StatRow label="Total Commitment" value={dev.totalCommitment} />
                  <StatRow label="Actual Effort" value={dev.totalActualEffort} />
                  <StatRow label="Estimation Accuracy" value={dev.avgEstimationAccuracy ? `${dev.avgEstimationAccuracy.toFixed(1)}%` : '-'} />
                </div>
              </div>

              {/* Quality */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">Quality</h3>
                <div className="space-y-3">
                  <StatRow label="First-Pass Success" value={`${dev.firstPassSuccessRate.toFixed(1)}%`} className="text-green-600 font-medium" />
                  <StatRow label="Total Rework" value={dev.totalRework} />
                </div>
              </div>
            </div>
          </div>
        ))}
        {devPerf.length === 0 && (
          <div className="bg-white p-8 text-center text-gray-500 rounded-xl shadow border border-gray-100">
            No developers found for the selected period.
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value, className = "text-gray-900" }: { label: string, value: string | number, className?: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
