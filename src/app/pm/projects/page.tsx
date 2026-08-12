import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProjectPerformance } from "@/services/dashboardService";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import AlertHandler from "@/components/AlertHandler";

export default async function PMProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PM") redirect("/login");

  const projPerf = await getProjectPerformance();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <AlertHandler />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pm/dashboard" className="text-gray-500 hover:text-gray-800 flex items-center gap-2">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        </div>
        <Link href="/pm/projects/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition font-medium flex items-center gap-2">
          <Plus size={18} /> Create Project
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Tasks</th>
                <th className="px-6 py-3 text-right">Completed</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3 text-right">Overdue</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projPerf.map((proj) => (
                <tr key={proj.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">{proj.code}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{proj.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {proj.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">{proj.totalTasks}</td>
                  <td className="px-6 py-4 text-right text-green-600">{proj.completedTasks}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-[4rem]">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${proj.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{proj.progress.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-red-600">{proj.overdue}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/pm/projects/${proj.id}`} className="text-blue-600 hover:text-blue-800">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
