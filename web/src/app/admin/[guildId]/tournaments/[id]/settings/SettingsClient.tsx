"use client";

import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";
import { Save, CalendarDays, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingsClient({ tournament, guildId }: { tournament: any; guildId: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      start_at: tournament.start_at ? dayjs(tournament.start_at).format('YYYY-MM-DDTHH:mm') : "",
      checkin_start_at: tournament.checkin_start_at ? dayjs(tournament.checkin_start_at).format('YYYY-MM-DDTHH:mm') : "",
      checkin_end_at: tournament.checkin_end_at ? dayjs(tournament.checkin_end_at).format('YYYY-MM-DDTHH:mm') : ""
    }
  });

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    setMessage(null);

    const payload = {
      start_at: data.start_at ? new Date(data.start_at).toISOString() : null,
      checkin_start_at: data.checkin_start_at ? new Date(data.checkin_start_at).toISOString() : null,
      checkin_end_at: data.checkin_end_at ? new Date(data.checkin_end_at).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('tournaments')
      .update(payload)
      .eq('id', tournament.id);

    setIsSaving(false);

    if (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde : ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès !' });
      router.refresh();
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-blue-400" />
          Paramètres du Tournoi
        </h1>
        <p className="text-slate-400">Configurez les dates de ce tournoi.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg font-medium border ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 rounded-xl p-8 border border-slate-700 space-y-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Dates & Horaires</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 md:col-span-2">
            <label className="block text-sm font-semibold text-slate-300">Date de début du tournoi</label>
            <input 
              type="datetime-local" 
              {...register("start_at")} 
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">Début des check-ins</label>
            <input 
              type="datetime-local" 
              {...register("checkin_start_at")} 
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">Fin des check-ins</label>
            <input 
              type="datetime-local" 
              {...register("checkin_end_at")} 
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-slate-700/80 flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
          >
            {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Enregistrer les dates
          </button>
        </div>
      </form>
    </div>
  );
}
