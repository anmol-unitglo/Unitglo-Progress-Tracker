import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { PrismaClient, TaskStatus, TestStatus } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";
import { 
  CheckCircle, Clock, AlertTriangle, FileText, CheckSquare, 
  ArrowRight, XCircle, Activity, Bug
} from "lucide-react";

const prisma = new PrismaClient();

export default async function TesterDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TESTER") return null;

  const tasks = await prisma.task.findMany({
    where: { 
      status: { in: [TaskStatus.READY_FOR_TESTING, TaskStatus.TESTING] }
    },
    include: { project: true, developer: true },
    orderBy: { updatedAt: "desc" },
  });

  const defects = await prisma.defect.count({ where: { status: "OPEN" } });

  // Summary Metrics
  const queueCount = tasks.filter((t) => t.status === TaskStatus.READY_FOR_TESTING).length;
  const testingCount = tasks.filter((t) => t.status === TaskStatus.TESTING).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tester Dashboard</h1>
          <p className="text-gray-500">Welcome back, {session.user.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Ready for Testing" value={queueCount} icon={<Clock size={20} className="text-yellow-500" />} />
        <StatCard title="Currently Testing" value={testingCount} icon={<Activity size={20} className="text-indigo-500" />} />
        <StatCard title="Open Defects" value={defects} icon={<Bug size={20} className="text-red-500" />} />
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Testing Queue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Task</th>
                <th className="px-6 py-3">Project</th>
                <th className="px-6 py-3">Developer</th>
                <th className="px-6 py-3">Deadline</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{task.title}</td>
                  <td className="px-6 py-4 text-gray-500">{task.project.code}</td>
                  <td className="px-6 py-4 text-gray-500">{task.developer.name}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {task.deadline ? format(task.deadline, "MMM d, yyyy") : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/tester/tasks/${task.id}`} className="text-blue-600 hover:text-blue-800 flex items-center justify-end gap-1">
                      {task.status === TaskStatus.TESTING ? "Continue" : "Start"} <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No tasks currently require testing.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
    </div>
  );
}
