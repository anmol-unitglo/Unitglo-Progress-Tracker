import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient, TaskStatus, TestStatus, Priority } from "@prisma/client";
import { actionStartTesting, actionPassTesting, actionFailTesting, actionRetest } from "@/app/actions/taskActions";
import { formatInIST } from "@/utils/date";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Bug, Activity, FileText } from "lucide-react";

const prisma = new PrismaClient();

export default async function TesterTaskPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TESTER") return null;

  const taskId = parseInt(params.id);
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { 
      project: true, 
      developer: true,
      defects: { orderBy: { createdAt: "desc" } },
      retests: { orderBy: { retestDate: "desc" } }
    }
  });

  if (!task) return <div className="p-8 text-red-500">Task not found.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/tester/dashboard" className="text-gray-500 hover:text-gray-800 flex items-center gap-2 w-fit">
        <ArrowLeft size={16} /> Back to Testing Queue
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Task Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                <p className="text-gray-500">{task.project.code} • {task.module} • Dev: {task.developer.name}</p>
              </div>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                {task.status.replace(/_/g, " ")}
              </span>
            </div>
            
            <div className="prose max-w-none text-gray-700 mb-6">
              <p>{task.description || "No description provided."}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Bug size={18} /> Defects & Retests</h2>
            <div className="space-y-4">
              {task.defects.map(defect => (
                <div key={defect.id} className="p-4 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-red-800">Defect #{defect.id}</span>
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">{defect.severity}</span>
                  </div>
                  <p className="text-sm text-red-700">{defect.description}</p>
                </div>
              ))}
              {task.retests.map(retest => (
                <div key={retest.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">Retest at {formatInIST(retest.retestDate)}</span>
                    <span className={`font-bold ${retest.result === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>{retest.result}</span>
                  </div>
                  <p className="text-sm text-gray-600">{retest.remarks}</p>
                </div>
              ))}
              {task.defects.length === 0 && task.retests.length === 0 && (
                <p className="text-gray-500 text-sm">No defects or retests logged.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: QA Actions */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity size={18} /> QA Actions</h2>
            
            {task.status === TaskStatus.READY_FOR_TESTING && (
              <form action={actionStartTesting.bind(null, task.id)}>
                <p className="text-sm text-gray-600 mb-4">Start testing to assign this task to yourself and log the start time.</p>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium">
                  Start Testing
                </button>
              </form>
            )}

            {task.status === TaskStatus.TESTING && task.defectCount === 0 && (
              <div className="space-y-6">
                <form action={actionPassTesting.bind(null, task.id)} className="space-y-4 border-b border-gray-100 pb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Testing Remarks</label>
                    <textarea name="remarks" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Looks good!"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition font-medium flex justify-center items-center gap-2">
                    <CheckCircle size={18} /> Pass Task
                  </button>
                </form>

                <form action={actionFailTesting.bind(null, task.id)} className="space-y-4">
                  <h3 className="font-medium text-red-600 flex items-center gap-2"><Bug size={16} /> Log Defect</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Defect Description</label>
                    <textarea name="description" required rows={3} className="w-full px-3 py-2 border border-red-300 rounded-md text-sm" placeholder="Expected X but got Y..."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                    <select name="severity" className="w-full px-3 py-2 border border-red-300 rounded-md text-sm">
                      {Object.values(Priority).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition font-medium flex justify-center items-center gap-2">
                    <XCircle size={18} /> Fail & Request Rework
                  </button>
                </form>
              </div>
            )}

            {task.status === TaskStatus.TESTING && task.defectCount > 0 && (
              <form action={actionRetest.bind(null, task.id)} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">This task is in a retest cycle.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retest Result</label>
                  <select name="result" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="PASS">Pass (Issue Fixed)</option>
                    <option value="FAIL">Fail (Issue Persists)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retest Remarks</label>
                  <textarea name="remarks" required rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Verified fix..."></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium">
                  Log Retest
                </button>
              </form>
            )}

            {(task.status === TaskStatus.COMPLETED || task.status === TaskStatus.REWORK_REQUIRED) && (
              <div className="bg-gray-50 text-gray-700 p-4 rounded-md text-center text-sm">
                No testing actions available. Task is {task.status.replace(/_/g, " ")}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
