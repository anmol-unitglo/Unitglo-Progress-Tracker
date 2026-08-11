"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";

export default function Navigation() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <span className="text-xl font-bold text-blue-600 tracking-tight">DevTrack</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">MVP</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <User size={16} className="text-gray-400" />
              <span className="font-medium">{session.user?.name}</span>
              <span className="text-gray-400">|</span>
              <span className="text-xs font-semibold uppercase text-blue-600">{session.user?.role}</span>
            </div>
            
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
