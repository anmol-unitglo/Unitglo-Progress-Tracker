import { getServerSession } from "next-auth";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { PrismaClient, Priority } from "@prisma/client";
import { actionCreatePMTask } from "../../../actions/taskActions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const prisma = new PrismaClient();

export default async function PMNewTaskPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PM") return null;

  // Fetch active projects that the PM manages
  const projects = await prisma.project.findMany({
    where: { 
      status: { in: ["ACTIVE", "PLANNING"] },
      OR: [
        { createdById: parseInt(session.user.id) },
        {
          members: {
            some: {
              userId: parseInt(session.user.id),
              role: "PM"
            }
          }
        }
      ]
    }
  });

  const developers = await prisma.user.findMany({
    where: { role: "DEVELOPER" }
  });

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <Link href="/pm/tasks" className="text-gray-500 hover:text-gray-800 flex items-center gap-2 w-fit">
        <ArrowLeft size={16} /> Back to Tasks
      </Link>
      
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h1>
        
        <form action={actionCreatePMTask} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select name="projectId" required className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Developer</label>
              <select name="developerId" required className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Select Developer</option>
                {developers.map(dev => (
                  <option key={dev.id} value={dev.id}>{dev.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input type="text" name="title" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module (Optional)</label>
            <input type="text" name="module" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Planned Start</label>
              <input type="datetime-local" name="plannedStart" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input type="datetime-local" name="deadline" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commitment</label>
              <input type="number" step="0.5" min="0.5" name="commitment" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select name="commitmentUnit" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="HOURS">Hours</option>
                <option value="DAYS">Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select name="priority" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                {Object.values(Priority).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Link href="/pm/tasks" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition">
              Cancel
            </Link>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
