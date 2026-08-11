"use client";

import { useActionState } from "react";
import { actionChangePassword } from "../actions/userActions";
import { Lock } from "lucide-react";

export default function SettingsPage() {
  const [state, formAction, pending] = useActionState(actionChangePassword, null);

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
        
        {state?.error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-100">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6 border border-green-100">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-4">
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
