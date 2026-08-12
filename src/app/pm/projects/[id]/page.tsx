import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient, ProjectStatus, Priority, TaskStatus } from "@prisma/client";
import { actionUpdateProject, actionAssignMembers, actionRemoveMember } from "@/app/actions/projectActions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, X } from "lucide-react";
import { format } from "date-fns";

const prisma = new PrismaClient();

export default async function PMProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PM") redirect("/login");

  const { id } = await params;
  const projectId = parseInt(id);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { include: { user: true } },
      tasks: { include: { developer: true } }
    }
  });

  if (!project) return <div className="p-8 text-red-500">Project not found.</div>;

  // Fetch all potential users for assignment
  const allUsers = await prisma.user.findMany({
    where: { role: { in: ["DEVELOPER", "TESTER"] } }
  });
  const currentMemberIds = project.members.map(m => m.userId);
  const availableUsers = allUsers.filter(u => !currentMemberIds.includes(u.id));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <Link href="/pm/projects" className="text-gray-500 hover:text-gray-800 flex items-center gap-2 w-fit">
        <ArrowLeft size={16} /> Back to Projects
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Project Details & Members */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Project Settings</h2>
            <form action={actionUpdateProject.bind(null, project.id)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" name="name" defaultValue={project.name} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" defaultValue={project.description || ""} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" defaultValue={project.status} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    {Object.values(ProjectStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select name="priority" defaultValue={project.priority} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    {Object.values(Priority).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium text-sm">
                Save Changes
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Team Members</h2>
            <div className="space-y-3 mb-6">
              {project.members.map(member => (
                <div key={member.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                  <form action={actionRemoveMember.bind(null, project.id, member.userId)}>
                    <button type="submit" className="text-gray-400 hover:text-red-600 transition p-1">
                      <X size={16} />
                    </button>
                  </form>
                </div>
              ))}
              {project.members.length === 0 && <p className="text-sm text-gray-500">No members assigned.</p>}
            </div>

            <form action={actionAssignMembers.bind(null, project.id)} className="space-y-3 border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700">Assign Users</label>
              <select name="userIds" multiple className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-32">
                {availableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition font-medium text-sm flex items-center justify-center gap-2">
                <UserPlus size={16} /> Assign Selected
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Tasks Overview */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Project Tasks</h2>
              <Link href={`/pm/tasks?project=${project.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View All Tasks
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Dev</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {project.tasks.slice(0, 10).map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[200px]">{task.title}</td>
                      <td className="px-4 py-3 text-gray-600">{task.developer.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {task.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[3rem]">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${task.progress}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500">{task.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {project.tasks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No tasks created for this project yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
