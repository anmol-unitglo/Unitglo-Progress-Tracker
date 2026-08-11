import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { actionCreateProject } from "@/app/actions/projectActions";
import { Priority } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PMNewProjectPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PM") redirect("/login");

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <Link href="/pm/projects" className="text-gray-500 hover:text-gray-800 flex items-center gap-2 w-fit">
        <ArrowLeft size={16} /> Back to Projects
      </Link>

      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Project</h1>
        
        <form action={actionCreateProject} className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
              <input type="text" name="code" required className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g. PRJ-01" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input type="text" name="name" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" name="startDate" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected End Date</label>
              <input type="date" name="expectedEndDate" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select name="priority" className="w-full px-3 py-2 border border-gray-300 rounded-md">
              {Object.values(Priority).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <Link href="/pm/projects" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition">
              Cancel
            </Link>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
