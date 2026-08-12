import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { calculateOverdue, formatInIST } from "@/utils/date";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Activity, Bug } from "lucide-react";
import PMTaskActionsMenu from "./PMTaskActionsMenu";

const prisma = new PrismaClient();

export default async function PMTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PM") redirect("/login");

  const { id } = await params;
  const taskId = parseInt(id);
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { 
      project: true, 
      assignedBy: true,
      developer: true,
      tester: true,
      updates: { orderBy: { createdAt: "desc" } },
      defects: { orderBy: { createdAt: "desc" } },
      retests: { orderBy: { retestDate: "desc" } }
    }
  });

  if (!task) return <div className="p-8 text-red-500">Task not found.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/pm/tasks" className="text-gray-500 hover:text-gray-800 flex items-center gap-2 w-fit">
        <ArrowLeft size={16} /> Back to All Tasks
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">#{task.id} - {task.title}</h1>
                <p className="text-gray-500">{task.project.code} — {task.project.name} • Dev: {task.developer.name} • Tester: {task.tester?.name || "Unassigned"}</p>
              </div>
              <div className="flex items-center gap-3">
                <PMTaskActionsMenu task={task} />
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {task.status.replace(/_/g, " ")}
                </span>
              </div>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock size={18} /> Daily Updates</h2>
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

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity size={18} /> Delivery Metrics</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-600">Expected Delivery</span>
                <span className="font-medium">{task.expectedDelivery ? formatInIST(task.expectedDelivery, "MMM d, yyyy") : "-"}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-600">Actual Completion</span>
                <span className="font-medium">{task.actualCompletion ? formatInIST(task.actualCompletion, "MMM d, yyyy") : "-"}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-600">Historical Del. Delay</span>
                <span className={`font-medium ${task.deliveryDelay! > 0 ? "text-red-600" : ""}`}>{task.deliveryDelay !== null ? `${task.deliveryDelay}d` : "-"}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-600">Current Overdue</span>
                {task.status !== TaskStatus.COMPLETED && calculateOverdue(task.expectedDelivery)! > 0 ? (
                  <span className="font-medium text-red-600">{calculateOverdue(task.expectedDelivery)}d</span>
                ) : (
                  <span className="font-medium text-gray-500">-</span>
                )}
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-600">Estimation Accuracy</span>
                <span className="font-medium">{task.estimationAccuracy !== null ? `${task.estimationAccuracy}%` : "-"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Bug size={18} /> Quality & Testing</h2>
            <div className="space-y-4">
              {task.defects.map(defect => (
                <div key={defect.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex justify-between items-start mb-1 text-sm">
                    <span className="font-semibold text-red-800">Defect #{defect.id}</span>
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">{defect.severity}</span>
                  </div>
                  <p className="text-xs text-red-700">{defect.description}</p>
                </div>
              ))}
              {task.retests.map(retest => (
                <div key={retest.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-900">{formatInIST(retest.retestDate)}</span>
                    <span className={`font-bold ${retest.result === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>{retest.result}</span>
                  </div>
                  <p className="text-xs text-gray-600">{retest.remarks}</p>
                </div>
              ))}
              {task.defects.length === 0 && task.retests.length === 0 && (
                <p className="text-gray-500 text-sm">No defects or retests logged.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
