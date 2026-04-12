"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicTournamentNav({ guildId, tournamentId }: { guildId: string, tournamentId: string }) {
  const pathname = usePathname();
  
  const baseUrl = `/${guildId}/tournaments/${tournamentId}`;
  
  const tabs = [
    { name: "Vue d'ensemble", path: "" },
    { name: "Phases", path: "/stages" },
    { name: "Matchs", path: "/matches" },
    { name: "Participants", path: "/participants" },
  ];

  return (
    <nav className="border-b border-slate-800/50 bg-[#0f111a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="flex flex-row space-x-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const href = `${baseUrl}${tab.path}`;
            const isActive = tab.path === "" 
              ? pathname === href 
              : pathname.startsWith(href);
            
            return (
              <li key={tab.path} className="flex-shrink-0">
                <Link
                  href={href}
                  className={`inline-block py-4 px-1 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? "border-blue-500 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {tab.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
