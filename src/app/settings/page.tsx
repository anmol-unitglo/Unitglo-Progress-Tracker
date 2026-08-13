"use client";

import { useState, useRef } from "react";
import { actionChangePassword } from "../actions/userActions";
import { Lock } from "lucide-react";
import Swal from "sweetalert2";

export default function SettingsPage() {
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    
    const formData = new FormData(e.currentTarget);
    try {
      const res = await actionChangePassword(null, formData);
      if (res?.error) {
        Swal.fire("Error", res.error, "error");
      } else if (res?.success) {
        Swal.fire("Success", res.message, "success");
        formRef.current?.reset();
      }
    } catch (err) {
      Swal.fire("Error", "An unexpected error occurred", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Lock size={24} /> Settings & Security
        </h1>
        <p className="text-gray-500">Manage your account credentials.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <h2 className="text-xl font-semibold mb-6">Change Password</h2>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={pending}
              className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {pending ? "Updating..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
