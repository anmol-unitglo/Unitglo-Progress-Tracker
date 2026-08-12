import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { actionUpdateTask, actionSubmitForTesting } from "@/app/actions/taskActions";
import { formatInIST } from "@/utils/date";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Activity, CheckCircle } from "lucide-react";

const prisma = new PrismaClient();

export default async function DeveloperTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DEVELOPER") redirect("/login");

  const { id } = await params;
  const taskId = parseInt(id);
  const task = await prisma.task.findUnique({
    where: { id: taskId, developerId: parseInt(session.user.id) },
    include: { 
      project: true, 
      assignedBy: true, 
      updates: { orderBy: { createdAt: "desc" } } 
    }
  });

  if (!task) return <div className="p-8 text-red-500">Task not found or unauthorized.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/developer/dashboard" className="text-gray-500 hover:text-gray-800 flex items-center gap-2 w-fit">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Task Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                <p className="text-gray-500">{task.project.code} — {task.project.name} • {task.module}</p>
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                {task.status.replace(/_/g, " ")}
              </span>
            </div>
            
            <div className="prose max-w-none text-gray-700 mb-6">
              <p>{task.description || "No description provided."}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase">Commitment</p>
                <p className="font-semibold text-gray-900">{task.commitment} {task.commitmentUnit.charAt(0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Actual Effort</p>
                <p className="font-semibold text-gray-900">{task.actualEffort || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Progress</p>
                <p className="font-semibold text-gray-900">{task.progress}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Start Delay</p>
                <p className="font-semibold text-gray-900">{task.startDelay !== null ? `${task.startDelay}d` : "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock size={18} /> Update History</h2>
            <div className="space-y-4">
              {task.updates.map(update => (
                <div key={update.id} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">{formatInIST(update.createdAt)}</span>
                    <span className="text-gray-500">{update.status.replace(/_/g, " ")} • {update.progress}%</span>
                  </div>
                  <p className="text-gray-700 text-sm">{update.remarks}</p>
                </div>
              ))}
              {task.updates.length === 0 && <p className="text-gray-500 text-sm">No updates yet.</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Update Form */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity size={18} /> Daily Update</h2>
            
            {task.status !== TaskStatus.COMPLETED ? (
              <form action={actionUpdateTask.bind(null, task.id)} className="space-y-4">
                {!task.actualStart && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Actual Start</label>
                    <input type="datetime-local" name="actualStart" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" defaultValue={task.status} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value={TaskStatus.NOT_STARTED}>Not Started</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">To finish, use the Submit for Testing button.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Progress %</label>
                    <input type="number" min="0" max="100" name="progress" defaultValue={task.progress} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Effort</label>
                    <input type="number" step="0.5" min="0" name="actualEffort" defaultValue={task.actualEffort || 0} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Remarks</label>
                  <textarea name="remarks" required rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="What did you do today?"></textarea>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium">
                  Log Update
                </button>
              </form>
            ) : (
              <div className="bg-green-50 text-green-700 p-4 rounded-md text-center">
                Task is completed.
              </div>
            )}
          </div>

          {(task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.REWORK_REQUIRED) && (
            <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle size={18} /> Testing</h2>
              <form action={actionSubmitForTesting.bind(null, task.id)}>
                <p className="text-sm text-gray-600 mb-4">Done with development? Send it to QA for testing.</p>
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition font-medium">
                  Submit for Testing
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
