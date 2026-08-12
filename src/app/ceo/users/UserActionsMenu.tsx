"use client";
import { useState } from "react";
import { actionUpdateUser, actionResetPassword, actionToggleUserStatus } from "@/app/actions/userActions";
import { Lock, Power, PowerOff, Edit2 } from "lucide-react";

export default function UserActionsMenu({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    if (!confirm(`Are you sure you want to reset password for ${user.email}?`)) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("userId", user.id.toString());
    const res = await actionResetPassword(null, formData);
    if (res?.error) alert(res.error);
    else if (res?.tempPassword) alert(`Password reset! Temporary password is: ${res.tempPassword}\n\nPlease share this securely.`);
    setLoading(false);
  }

  async function handleToggleStatus() {
    if (!confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.email}?`)) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("userId", user.id.toString());
    formData.append("isActive", (!user.isActive).toString());
    const res = await actionToggleUserStatus(null, formData);
    if (res?.error) alert(res.error);
    else alert(res?.message);
    setLoading(false);
  }

  async function handleEdit() {
    const newName = prompt("Enter new name:", user.name);
    if (!newName) return;
    const newEmail = prompt("Enter new email:", user.email);
    if (!newEmail) return;
    const newRole = prompt("Enter new role (PM, DEVELOPER, TESTER):", user.role);
    if (!newRole) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("userId", user.id.toString());
    formData.append("name", newName);
    formData.append("email", newEmail);
    formData.append("role", newRole);
    const res = await actionUpdateUser(null, formData);
    if (res?.error) alert(res.error);
    else alert(res?.message);
    setLoading(false);
  }

  return (
    <div className="flex gap-2 justify-end">
      <button disabled={loading} onClick={handleEdit} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Edit User">
        <Edit2 size={14} />
      </button>
      <button disabled={loading} onClick={handleResetPassword} className="p-1 hover:bg-gray-100 rounded text-orange-500" title="Reset Password">
        <Lock size={14} />
      </button>
      <button disabled={loading} onClick={handleToggleStatus} className={`p-1 hover:bg-gray-100 rounded ${user.isActive ? 'text-green-500' : 'text-red-500'}`} title="Toggle Status">
        {user.isActive ? <Power size={14} /> : <PowerOff size={14} />}
      </button>
    </div>
  );
}
