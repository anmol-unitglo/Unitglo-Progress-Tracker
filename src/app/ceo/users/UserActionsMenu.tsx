"use client";
import { useState } from "react";
import { actionUpdateUser, actionResetPassword, actionToggleUserStatus } from "@/app/actions/userActions";
import { Lock, Power, PowerOff, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function UserActionsMenu({ user }: { user: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    const result = await Swal.fire({
      title: "Reset Password?",
      text: `Are you sure you want to reset password for ${user.email}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, reset it"
    });
    
    if (!result.isConfirmed) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append("userId", user.id.toString());
    const res = await actionResetPassword(null, formData);
    if (res?.error) {
      Swal.fire("Error", res.error, "error");
    } else if (res?.tempPassword) {
      Swal.fire({
        title: "Password Reset!",
        html: `Temporary password is: <br/><br/><strong>${res.tempPassword}</strong><br/><br/>Please share this securely.`,
        icon: "success"
      });
    }
    setLoading(false);
  }

  async function handleToggleStatus() {
    const action = user.isActive ? 'deactivate' : 'activate';
    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User?`,
      text: `Are you sure you want to ${action} ${user.email}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, ${action} it`
    });
    
    if (!result.isConfirmed) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("userId", user.id.toString());
    formData.append("isActive", (!user.isActive).toString());
    const res = await actionToggleUserStatus(null, formData);
    if (res?.error) {
      Swal.fire("Error", res.error, "error");
    } else {
      Swal.fire({
        title: "Success",
        text: res?.message,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
      router.refresh();
    }
    setLoading(false);
  }

  async function handleEdit() {
    const { value: formValues } = await Swal.fire({
      title: "Edit User",
      html: `
        <input id="swal-input-name" class="swal2-input" placeholder="Name" value="${user.name}">
        <input id="swal-input-email" type="email" class="swal2-input" placeholder="Email" value="${user.email}">
        <select id="swal-input-role" class="swal2-select" style="width: 275px; margin: 1em auto; display: flex;">
          <option value="PM" ${user.role === 'PM' ? 'selected' : ''}>PM</option>
          <option value="DEVELOPER" ${user.role === 'DEVELOPER' ? 'selected' : ''}>DEVELOPER</option>
          <option value="TESTER" ${user.role === 'TESTER' ? 'selected' : ''}>TESTER</option>
          ${user.role === 'CEO' ? '<option value="CEO" selected>CEO</option>' : ''}
        </select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          newName: (document.getElementById("swal-input-name") as HTMLInputElement).value,
          newEmail: (document.getElementById("swal-input-email") as HTMLInputElement).value,
          newRole: (document.getElementById("swal-input-role") as HTMLSelectElement).value
        }
      }
    });

    if (!formValues) return;
    const { newName, newEmail, newRole } = formValues;

    setLoading(true);
    const formData = new FormData();
    formData.append("userId", user.id.toString());
    formData.append("name", newName);
    formData.append("email", newEmail);
    formData.append("role", newRole);
    
    const res = await actionUpdateUser(null, formData);
    if (res?.error) {
      Swal.fire("Error", res.error, "error");
    } else {
      Swal.fire({
        title: "Success",
        text: res?.message,
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
      router.refresh();
    }
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
