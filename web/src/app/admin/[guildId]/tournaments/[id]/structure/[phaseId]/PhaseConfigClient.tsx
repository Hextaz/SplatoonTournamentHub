"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { CheckCircle2, ChevronLeft } from "lucide-react";

export function PhaseConfigClient({ 
  phase, 
  tournamentId, 
  guildId, 
  totalTeams 
}: { 
  phase: any, 
  tournamentId: string, 
  guildId: string, 
  totalTeams: number 
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"general" | "advanced">("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isGroups = phase.format === "ROUND_ROBIN";
  const defaultSettings: any = isGroups 
    ? { points_win: 3, points_draw: 1, points_loss: 0, points_forfeit: 0 }
    : { third_place_match: false };
    
  const parsedSettings = phase.settings || {};
  const initialSettings = { ...defaultSettings, ...parsedSettings };
  
  if (isGroups) {
    if (initialSettings.points_win === '' || initialSettings.points_win === undefined || initialSettings.points_win === null || Number.isNaN(initialSettings.points_win)) initialSettings.points_win = 3;
    if (initialSettings.points_draw === '' || initialSettings.points_draw === undefined || initialSettings.points_draw === null || Number.isNaN(initialSettings.points_draw)) initialSettings.points_draw = 1;
    if (initialSettings.points_loss === '' || initialSettings.points_loss === undefined || initialSettings.points_loss === null || Number.isNaN(initialSettings.points_loss)) initialSettings.points_loss = 0;
    if (initialSettings.points_forfeit === '' || initialSettings.points_forfeit === undefined || initialSettings.points_forfeit === null || Number.isNaN(initialSettings.points_forfeit)) initialSettings.points_forfeit = 0;
  }

  const [formData, setFormData] = useState({
    name: phase.name,
    phase_order: phase.phase_order,
    bracket_size: phase.bracket_size || 8,
    max_groups: phase.max_groups || 8,
    settings: initialSettings
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore
    const checked = type === "radio" || type === "checkbox" ? e.target.checked : undefined;
    
    if (name.startsWith("settings.")) {
      const settingName = name.split(".")[1];
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingName]: type === "number" ? (value === '' ? '' : Number(value)) : (type === "checkbox" ? checked : (value === 'true'))
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: (type === "number" || name === 'bracket_size' || name === 'max_groups') 
                 ? (value === '' ? '' : parseInt(value)) 
                 : value
      }));
    }
  };

  const handleRadioChange = (name: string, val: boolean) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [name]: val
      }
    }));
  };

  const onSubmit = async (shouldRedirect: boolean) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('phases')
        .update({
          name: formData.name,
          phase_order: formData.phase_order,
          bracket_size: isGroups ? undefined : formData.bracket_size,
          max_groups: isGroups ? formData.max_groups : undefined,
          settings: formData.settings
        })
        .eq('id', phase.id);

      if (error) throw error;
      router.refresh();
      if (shouldRedirect) {
        router.push(`/admin/${guildId}/tournaments/${tournamentId}/structure`);
      } else {
        alert("Paramètres mis à jour !");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la mise à jour");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTabClasses = "text-blue-500 border-b-2 border-blue-500 font-bold px-4 py-3 outline-none";
  const inactiveTabClasses = "text-slate-400 hover:text-slate-300 font-medium px-4 py-3 transition-colors outline-none";

  return (
    <div className="bg-white rounded border border-slate-200 shadow-sm max-w-4xl mx-auto overflow-hidden">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('general')}
          className={activeTab === 'general' ? activeTabClasses : inactiveTabClasses}
        >
          Général
        </button>
        {isGroups && (
          <button 
            onClick={() => setActiveTab('advanced')}
            className={activeTab === 'advanced' ? activeTabClasses : inactiveTabClasses}
          >
            Avancé
          </button>
        )}
        <button className={inactiveTabClasses + " cursor-not-allowed opacity-50"}>Placement</button>
        <button className={inactiveTabClasses + " cursor-not-allowed opacity-50"}>Paramètres de match</button>
      </div>

      <div className="p-6 md:p-8 space-y-8 bg-white min-h-[400px]">
        {/* TAB: GENERAL */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* Phase Order */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Numéro <span className="text-slate-400 font-normal">?</span></label>
              <input 
                type="number"
                name="phase_order"
                value={formData.phase_order}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            {/* Sizes */}
            {isGroups ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Taille <span className="text-slate-400 font-normal">({totalTeams} max)</span></label>
                <input 
                  type="number"
                  value={totalTeams}
                  readOnly
                  disabled
                  className="w-full border border-slate-200 rounded px-3 py-2 text-slate-500 bg-slate-100 cursor-not-allowed font-medium"
                />
                <p className="text-xs text-slate-400 mt-1">Bloqué. Basé sur les participants actifs.</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Taille <span className="text-slate-400 font-normal">(32 max)</span></label>
                <input 
                  type="number"
                  name="bracket_size"
                  value={formData.bracket_size}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nom <span className="text-slate-400 font-normal">(30 caractères maximum)</span></label>
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            {/* Number of Groups or 3rd place */}
            {isGroups ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre de groupes</label>
                <input 
                  type="number"
                  name="max_groups"
                  value={formData.max_groups}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Match pour la 3e place ? <span className="text-slate-400 font-normal">?</span></label>
                <div className="flex items-center gap-6 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input 
                      type="radio" 
                      name="settings.third_place_match" 
                      checked={formData.settings.third_place_match === true}
                      onChange={() => handleRadioChange('third_place_match', true)}
                      className="accent-slate-800 w-4 h-4 cursor-pointer"
                    />
                    Oui
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input 
                      type="radio" 
                      name="settings.third_place_match" 
                      checked={formData.settings.third_place_match === false}
                      onChange={() => handleRadioChange('third_place_match', false)}
                      className="accent-slate-800 w-4 h-4 cursor-pointer"
                    />
                    Non
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: ADVANCED (Groups Only) */}
        {activeTab === 'advanced' && isGroups && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Composition de groupe</label>
                <select disabled className="w-full border border-slate-200 rounded px-3 py-2 text-slate-500 bg-slate-100 cursor-not-allowed font-medium">
                  <option>Effort équilibré</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Méthode d'appariement</label>
                <select disabled className="w-full border border-slate-200 rounded px-3 py-2 text-slate-500 bg-slate-100 cursor-not-allowed font-medium">
                  <option>Round-robin</option>
                </select>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">Attribution de points <span className="text-slate-400 font-normal">?</span></h4>
              
              {/* Point Card */}
              <div className="border border-slate-300 rounded-md p-4 mb-4 bg-white">
                 <div className="flex items-start gap-3 mb-4">
                   <input type="checkbox" checked readOnly className="mt-1 accent-slate-800 w-4 h-4 rounded" />
                   <div>
                     <span className="font-bold text-slate-800 text-sm block">Résultat de match</span>
                     <p className="text-sm text-slate-600 mt-1 leading-relaxed">Attribue des points en fonction du résultat du match (victoire, match nul ou défaite).</p>
                   </div>
                 </div>
                 <div className="pl-7 grid grid-cols-3 gap-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Victoire</label>
                      <input 
                        type="number" 
                        name="settings.points_win" 
                        value={formData.settings.points_win ?? 3} 
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Match nul</label>
                      <input 
                        type="number" 
                        name="settings.points_draw" 
                        value={formData.settings.points_draw ?? 1} 
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Défaite</label>
                      <input 
                        type="number" 
                        name="settings.points_loss" 
                        value={formData.settings.points_loss ?? 0} 
                        onChange={handleChange}
                        className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium" 
                      />
                    </div>
                 </div>
              </div>

              {/* Match Score Card Disabled visually */}
              <div className="border border-slate-200 bg-slate-50 rounded-md p-4 mb-4 opacity-60">
                 <div className="flex items-center gap-3">
                   <input type="checkbox" disabled className="accent-slate-400 cursor-not-allowed w-4 h-4" />
                   <span className="font-semibold text-slate-700 text-sm">Score de match</span>
                 </div>
                 <p className="text-sm text-slate-500 pl-7 mt-1">Attribue des points égaux au score du match.</p>
              </div>

              {/* Forfeit Card */}
              <div className="border border-slate-300 rounded-md p-4 bg-white">
                 <div className="flex items-start gap-3 mb-4">
                   <input type="checkbox" checked readOnly className="mt-1 accent-slate-800 w-4 h-4" />
                   <div>
                     <span className="font-bold text-slate-800 text-sm block">Forfait</span>
                     <p className="text-sm text-slate-600 mt-1 leading-relaxed">Attribue des points lorsqu'un participant est forfait dans un match (peut être négatif pour une pénalité).</p>
                   </div>
                 </div>
                 <div className="pl-7 max-w-[120px]">
                    <input 
                      type="number" 
                      name="settings.points_forfeit" 
                      value={formData.settings.points_forfeit ?? 0} 
                      onChange={handleChange}
                      className="w-full border border-slate-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium" 
                    />
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-center md:justify-end gap-3">
        <Link 
          href={`/admin/${guildId}/tournaments/${tournamentId}/structure`}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded font-bold text-slate-600 bg-slate-400/20 hover:bg-slate-300/50 transition-colors mr-auto w-full sm:w-auto"
        >
          <ChevronLeft className="w-4 h-4" /> Retour
        </Link>
        <button 
          onClick={() => onSubmit(true)}
          disabled={isSubmitting}
          className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-5 py-2.5 rounded font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
        >
          Mettre à jour + Retour
        </button>
        <button 
          onClick={() => onSubmit(false)}
          disabled={isSubmitting}
          className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-5 py-2.5 rounded font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" /> Mettre à jour
        </button>
      </div>

    </div>
  );
}
