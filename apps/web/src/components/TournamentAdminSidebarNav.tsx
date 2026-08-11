"use client";

import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Settings,
  Users,
  Sword,
  GitMerge,
  ListOrdered,
  Menu,
  X,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

export function TournamentAdminSidebarNav({
  guildId,
  tournamentId,
  tournamentName,
}: {
  guildId: string;
  tournamentId: string;
  tournamentName: string;
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Mobile Header Toggle */}
      <div className="lg:hidden p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-30">
        <h2 className="text-lg font-bold truncate pr-4">{tournamentName}</h2>
        <label
          htmlFor="tournament-sidebar"
          className="p-2 cursor-pointer bg-slate-800 rounded-md hover:bg-slate-700 transition-colors shrink-0"
        >
          <Menu className="w-5 h-5 text-white" />
        </label>
      </div>

      {/* Hidden Checkbox */}
      <input type="checkbox" id="tournament-sidebar" className="peer hidden" />

      {/* Overlay */}
      <label
        htmlFor="tournament-sidebar"
        className="fixed inset-0 bg-black/60 z-40 hidden peer-checked:block lg:hidden"
      />

      {/* Tournament Admin Sidebar */}
      <aside className="fixed lg:sticky top-0 lg:top-[0rem] left-0 h-[100dvh] lg:h-[calc(100vh-4rem)] w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-50 transform -translate-x-full peer-checked:translate-x-0 lg:translate-x-0 transition-transform duration-300">
        <div className="lg:hidden absolute top-4 right-4">
          <label
            htmlFor="tournament-sidebar"
            className="p-2 cursor-pointer bg-slate-800 rounded-md hover:bg-slate-700 transition-colors flex"
          >
            <X className="w-5 h-5 text-white" />
          </label>
        </div>
        <div className="p-6 border-b border-slate-800">
          <Link
            href={`/admin/${guildId}/tournaments`}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("adminSidebar.backToTournaments")}
          </Link>
          <h2 className="text-xl font-bold truncate" title={tournamentName}>
            {tournamentName}
          </h2>
          <p className="text-sm text-blue-400 mt-1">{t("adminSidebar.tournamentSpace")}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            {t("adminSidebar.overview")}
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}/settings`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-5 h-5" />
            {t("adminSidebar.settings")}
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}/structure`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <GitMerge className="w-5 h-5" />
            {t("adminSidebar.structure")}
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}/participants`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Users className="w-5 h-5" />
            {t("adminSidebar.participants")}
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}/placement`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ListOrdered className="w-5 h-5" />
            {t("adminSidebar.placement")}
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments/${tournamentId}/matches`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Sword className="w-5 h-5" />
            {t("adminSidebar.matches")}
          </Link>
        </nav>
      </aside>
    </>
  );
}
