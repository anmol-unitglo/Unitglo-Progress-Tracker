import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";
import { 
  CheckCircle, Clock, AlertTriangle, FileText, CheckSquare, 
  ArrowRight, XCircle, Activity 
} from "lucide-react";

const prisma = new PrismaClient();

export default async function DeveloperDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DEVELOPER") return null;

  const tasks = await prisma.task.findMany({
    where: { developerId: parseInt(session.user.id) },
    include: { project: true, assignedBy: true },
    orderBy: { deadline: "asc" },
  });

  // Summary Metrics
  const totalTasks = tasks.length;
  const inProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
  const readyTesting = tasks.filter((t) => t.status === TaskStatus.READY_FOR_TESTING).length;
  const completed = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
  const rework = tasks.filter((t) => t.status === TaskStatus.REWORK_REQUIRED).length;
  const overdue = tasks.filter((t) => t.deadline && new Date() > t.deadline && t.status !== TaskStatus.COMPLETED).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Developer Dashboard</h1>
          <p className="text-gray-500">Welcome back, {session.user.name}</p>
        </div>
        <Link 
          href="/developer/tasks/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
        >
          + New Task
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total" value={totalTasks} icon={<FileText size={20} className="text-blue-500" />} />
        <StatCard title="In Progress" value={inProgress} icon={<Activity size={20} className="text-indigo-500" />} />
        <StatCard title="Testing" value={readyTesting} icon={<Clock size={20} className="text-yellow-500" />} />
        <StatCard title="Rework" value={rework} icon={<AlertTriangle size={20} className="text-orange-500" />} />
        <StatCard title="Completed" value={completed} icon={<CheckCircle size={20} className="text-green-500" />} />
        <StatCard title="Overdue" value={overdue} icon={<XCircle size={20} className="text-red-500" />} />
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">My Tasks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Task</th>
                <th className="px-6 py-3">Project</th>
                <th className="px-6 py-3">Deadline</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Effort</th>
                <th className="px-6 py-3">Delay</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{task.title}</td>
                  <td className="px-6 py-4 text-gray-500">{task.project.code}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {task.deadline ? format(task.deadline, "MMM d, yyyy") : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-[4rem]">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${task.progress}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{task.actualEffort || 0} / {task.commitment} {task.commitmentUnit.charAt(0)}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {task.deliveryDelay ? <span className="text-red-500">+{task.deliveryDelay}d</span> : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/developer/tasks/${task.id}`} className="text-blue-600 hover:text-blue-800 flex items-center justify-end gap-1">
                      Update <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No tasks assigned to you.
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
