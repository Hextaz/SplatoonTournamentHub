"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";

export default function TournamentsHistoryPage() {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "";
  const { t } = useTranslation();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("guild_id", guildId)
      .in("status", ["ARCHIVED", "COMPLETED"])
      .order("created_at", { ascending: false });
    
    setHistory(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [guildId]);

  const deleteTournament = async (id: string, name: string) => {
    if (confirm(t("tournamentsHistory.deleteConfirm", { name }))) {
      await supabase.from("tournaments").delete().eq("id", id);
      setHistory(history.filter(t => t.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("tournamentsHistory.title")}</h1>
          <Link href="/tournaments" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-medium">
            {t("tournamentsHistory.backToHub")}
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-gray-500 animate-pulse">{t("tournamentsHistory.loading")}</p>
          ) : history.length === 0 ? (
            <p className="p-8 text-center text-gray-500">{t("tournamentsHistory.noHistory")}</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 text-sm">
                  <th className="p-4 font-semibold">{t("tournamentsHistory.nameHeader")}</th>
                  <th className="p-4 font-semibold">{t("tournamentsHistory.createdHeader")}</th>
                  <th className="p-4 font-semibold text-center">{t("tournamentsHistory.statusHeader")}</th>
                  <th className="p-4 font-semibold text-right">{t("tournamentsHistory.actionsHeader")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tItem) => (
                  <tr key={tItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{tItem.name}</td>
                    <td className="p-4 text-gray-600 text-sm">{new Date(tItem.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${tItem.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                        {tItem.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => deleteTournament(tItem.id, tItem.name)}
                        className="text-sm text-red-600 hover:text-red-900 font-medium px-3 py-1 border border-red-200 hover:bg-red-50 rounded transition"
                      >
                        {t("tournamentsHistory.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

