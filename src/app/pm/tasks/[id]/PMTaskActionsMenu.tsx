"use client";
import { useState } from "react";
import { actionCancelTask, actionReassignTask, actionUpdateTaskPlanning } from "@/app/actions/taskActions";
import { Edit2, Users, XCircle } from "lucide-react";

export default function PMTaskActionsMenu({ task }: { task: any }) {
  const [loading, setLoading] = useState(false);

  const canCancel = task.status === "NOT_STARTED" || task.status === "BLOCKED";
  const canReassignDeveloper = task.status === "NOT_STARTED" || task.status === "BLOCKED";
  const canReassignTester = task.status === "NOT_STARTED" || task.status === "BLOCKED" || task.status === "READY_FOR_TESTING";
  const canEditPlanning = !task.actualStart;

  async function handleCancel() {
    if (!confirm(`Are you sure you want to CANCEL task #${task.id}?`)) return;
    setLoading(true);
    try {
      await actionCancelTask(task.id);
      alert("Task cancelled successfully.");
    } catch (e: any) {
      alert(e.message || "Failed to cancel task");
    }
    setLoading(false);
  }

  async function handleReassign() {
    const role = prompt("Reassign DEVELOPER or TESTER? (Enter role name)")?.toUpperCase();
    if (role !== "DEVELOPER" && role !== "TESTER") return;
    
    if (role === "DEVELOPER" && !canReassignDeveloper) return alert("Developer reassignment allowed only when NOT_STARTED or BLOCKED.");
    if (role === "TESTER" && !canReassignTester) return alert("Tester reassignment allowed only when NOT_STARTED, BLOCKED, or READY_FOR_TESTING.");

    const newUserId = prompt(`Enter new ${role} User ID:`);
    if (!newUserId) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("role", role);
    formData.append("newUserId", newUserId);
    try {
      await actionReassignTask(task.id, formData);
      alert(`Task reassigned to user ${newUserId}.`);
    } catch (e: any) {
      alert(e.message || "Failed to reassign task");
    }
    setLoading(false);
  }

  async function handleEditPlanning() {
    if (!canEditPlanning) return alert("Cannot edit planning fields after actual work has started.");
    
    const title = prompt("New Title:", task.title);
    if (title === null) return;
    const commitment = prompt("New Commitment:", task.commitment);
    if (commitment === null) return;

    setLoading(true);
    const formData = new FormData();
    if (title) formData.append("title", title);
    if (commitment) formData.append("commitment", commitment);
    
    try {
      await actionUpdateTaskPlanning(task.id, formData);
      alert("Task planning fields updated.");
    } catch (e: any) {
      alert(e.message || "Failed to update planning");
    }
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      {canEditPlanning && (
        <button disabled={loading} onClick={handleEditPlanning} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1">
          <Edit2 size={14} /> Edit
        </button>
      )}
      {(canReassignDeveloper || canReassignTester) && (
        <button disabled={loading} onClick={handleReassign} className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-100 rounded hover:bg-blue-100 flex items-center gap-1">
          <Users size={14} /> Reassign
        </button>
      )}
      {canCancel && (
        <button disabled={loading} onClick={handleCancel} className="px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-100 rounded hover:bg-red-100 flex items-center gap-1">
          <XCircle size={14} /> Cancel
        </button>
      )}
    </div>
  );
}
