import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { calculateOverdue } from "@/utils/date";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { format } from "date-fns";

const prisma = new PrismaClient();

export default async function PMTasksPage({
  searchParams
}: {
  searchParams: { project?: string, dev?: string, status?: string, q?: string }
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PM") redirect("/login");

  const whereClause: any = {};
  if (searchParams.project) whereClause.projectId = parseInt(searchParams.project);
  if (searchParams.dev) whereClause.developerId = parseInt(searchParams.dev);
  if (searchParams.status) whereClause.status = searchParams.status;
  if (searchParams.q) {
    whereClause.OR = [
      { title: { contains: searchParams.q } },
      { description: { contains: searchParams.q } },
      // if q is a number, search by ID
      ...(isNaN(parseInt(searchParams.q)) ? [] : [{ id: parseInt(searchParams.q) }])
    ];
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: { project: true, developer: true, tester: true },
    orderBy: { createdAt: "desc" }
  });

  // Fetch filter options
  const projects = await prisma.project.findMany();
  const developers = await prisma.user.findMany({ where: { role: "DEVELOPER" } });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pm/dashboard" className="text-gray-500 hover:text-gray-800 flex items-center gap-2">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">All Tasks</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
        <form className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input type="text" name="q" defaultValue={searchParams.q || ""} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Task ID, Title..." />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
            <select name="project" defaultValue={searchParams.project || ""} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Developer</label>
            <select name="dev" defaultValue={searchParams.dev || ""} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">All Developers</option>
              {developers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select name="status" defaultValue={searchParams.status || ""} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>

          <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2">
            <Filter size={16} /> Filter
          </button>
          
          {(searchParams.project || searchParams.dev || searchParams.status || searchParams.q) && (
            <Link href="/pm/tasks" className="text-red-500 hover:text-red-700 text-sm font-medium px-2">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Task Title</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Developer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3 text-right">Effort</th>
                <th className="px-4 py-3 text-right">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => {
                const isOverdue = task.status !== TaskStatus.COMPLETED && calculateOverdue(task.expectedDelivery)! > 0;
                
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-500 font-medium">#{task.id}</td>
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {/* Normally would link to PM detail view, but prompt didn't explicitly mandate a new detailed page just for PM viewing task, but it did say "PM should be able to drill down into a task". Let's link to it, we'll create it. */}
                      <Link href={`/pm/tasks/${task.id}`} className="text-blue-600 hover:underline">{task.title}</Link>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{task.project.code}</td>
                    <td className="px-4 py-4 text-gray-600">{task.developer.name}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {task.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[3rem]">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${task.progress}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500">{task.actualEffort || 0} / {task.commitment}</td>
                    <td className="px-4 py-4 text-right font-medium">
                      {isOverdue ? <span className="text-red-600">Yes</span> : <span className="text-gray-400">-</span>}
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No tasks found matching your filters.
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
