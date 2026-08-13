"use client";

import { useState } from "react";
import { actionCreateUser } from "@/app/actions/userActions";
import { UserPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function CreateUserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await actionCreateUser(null, formData);
      
      if (result.error) {
        Swal.fire({
          icon: "error",
          title: result.error,
          timer: 3000,
          showConfirmButton: false,
        });
      } else if (result.success) {
        Swal.fire({
          icon: "success",
          title: result.message || "User created successfully",
          timer: 3000,
          showConfirmButton: false,
        });
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "An unexpected error occurred",
        timer: 3000,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <UserPlus size={18}/> Create New User
        </h2>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="e.g. Alice Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="alice@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
            >
              <option value="">Select Role...</option>
              <option value="PM">PM (Project Manager)</option>
              <option value="DEVELOPER">Developer</option>
              <option value="TESTER">Tester</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            Create User
          </button>
        </form>
      </div>
    </div>
  );
}
