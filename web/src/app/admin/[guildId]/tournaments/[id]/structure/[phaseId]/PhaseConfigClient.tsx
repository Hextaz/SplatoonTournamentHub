"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { botApiFetch } from "@/utils/api";
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
    : (phase.format === "DOUBLE_ELIM" 
        ? { bracket_reset: true } 
        : { third_place_match: false });
    
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
      const res = await botApiFetch(`/api/phases/${phase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phase_order: formData.phase_order,
          bracket_size: isGroups ? undefined : formData.bracket_size,
          max_groups: isGroups ? formData.max_groups : undefined,
          settings: formData.settings,
          guildId: guildId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur inconnue');
      }
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

  const activeTabClasses = "text-indigo-400 border-b-2 border-indigo-500 font-bold px-6 py-4 outline-none transition-all";
  const inactiveTabClasses = "text-slate-400 hover:text-slate-200 font-medium px-6 py-4 transition-colors outline-none hover:bg-slate-800/20";

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl max-w-4xl mx-auto overflow-hidden">
      
      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/50">
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
        <button className={inactiveTabClasses + " cursor-not-allowed opacity-40"}>Placement</button>
        <button className={inactiveTabClasses + " cursor-not-allowed opacity-40"}>Paramètres de match</button>
      </div>

      <div className="p-6 md:p-8 space-y-8 bg-slate-900/40 min-h-[400px] text-slate-200">
        {/* TAB: GENERAL */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* Phase Order */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5 font-sans">Numéro <span className="text-slate-500 font-normal">?</span></label>
              <input 
                type="number"
                name="phase_order"
                value={formData.phase_order}
                onChange={handleChange}
                className="w-full border border-slate-800 rounded-lg px-3 py-2.5 text-white bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Sizes */}
            {isGroups ? (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5 font-sans">Taille <span className="text-slate-500 font-normal">({totalTeams} max)</span></label>
                <input 
                  type="number"
                  value={totalTeams}
                  readOnly
                  disabled
                  className="w-full border border-slate-855 rounded-lg px-3 py-2.5 text-slate-500 bg-slate-900/50 cursor-not-allowed font-medium"
                />
                <p className="text-xs text-slate-500 mt-1.5">Bloqué. Basé sur les participants actifs.</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5 font-sans">Taille <span className="text-slate-500 font-normal">(32 max)</span></label>
                <input 
                  type="number"
                  name="bracket_size"
                  value={formData.bracket_size}
                  onChange={handleChange}
                  className="w-full border border-slate-800 rounded-lg px-3 py-2.5 text-white bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5 font-sans">Nom <span className="text-slate-500 font-normal">(30 caractères maximum)</span></label>
              <input 
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-slate-800 rounded-lg px-3 py-2.5 text-white bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Number of Groups or 3rd place */}
            {isGroups ? (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5 font-sans">Nombre de groupes</label>
                <input 
                  type="number"
                  name="max_groups"
                  value={formData.max_groups}
                  onChange={handleChange}
                  className="w-full border border-slate-800 rounded-lg px-3 py-2.5 text-white bg-slate-950 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            ) : phase.format === "DOUBLE_ELIM" ? (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5 font-sans">Bracket Reset ? <span className="text-slate-500 font-normal">(Match additionnel si le gagnant du Winner Bracket perd en Grande Finale)</span></label>
                <div className="flex items-center gap-6 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium hover:text-white transition-colors">
                    <input 
                      type="radio" 
                      name="settings.bracket_reset" 
                      checked={formData.settings.bracket_reset === true}
                      onChange={() => handleRadioChange('bracket_reset', true)}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    Oui
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium hover:text-white transition-colors">
                    <input 
                      type="radio" 
                      name="settings.bracket_reset" 
                      checked={formData.settings.bracket_reset === false}
                      onChange={() => handleRadioChange('bracket_reset', false)}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    Non
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5 font-sans">Match pour la 3e place ? <span className="text-slate-500 font-normal">?</span></label>
                <div className="flex items-center gap-6 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium hover:text-white transition-colors">
                    <input 
                      type="radio" 
                      name="settings.third_place_match" 
                      checked={formData.settings.third_place_match === true}
                      onChange={() => handleRadioChange('third_place_match', true)}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    Oui
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium hover:text-white transition-colors">
                    <input 
                      type="radio" 
                      name="settings.third_place_match" 
                      checked={formData.settings.third_place_match === false}
                      onChange={() => handleRadioChange('third_place_match', false)}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
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
                <label className="block text-sm font-bold text-slate-300 mb-1.5 font-sans">Composition de groupe</label>
                <select disabled className="w-full border border-slate-800 rounded-lg px-3 py-2.5 text-slate-500 bg-slate-900/50 cursor-not-allowed font-medium">
                  <option>Effort équilibré</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5 font-sans">Méthode d'appariement</label>
                <select disabled className="w-full border border-slate-800 rounded-lg px-3 py-2.5 text-slate-500 bg-slate-900/50 cursor-not-allowed font-medium">
                  <option>Round-robin</option>
                </select>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-1">Attribution de points <span className="text-slate-500 font-normal">?</span></h4>
              
              {/* Point Card */}
              <div className="border border-slate-800 rounded-lg p-5 mb-4 bg-slate-900">
                 <div className="flex items-start gap-3 mb-4">
                   <input type="checkbox" checked readOnly className="mt-1 accent-indigo-600 w-4 h-4 rounded bg-slate-950 border-slate-800" />
                   <div>
                     <span className="font-extrabold text-white text-sm block">Résultat de match</span>
                     <p className="text-sm text-slate-400 mt-1 leading-relaxed">Attribue des points en fonction du résultat du match (victoire, match nul ou défaite).</p>
                   </div>
                 </div>
                 <div className="pl-7 grid grid-cols-3 gap-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Victoire</label>
                      <input 
                        type="number" 
                        name="settings.points_win" 
                        value={formData.settings.points_win ?? 3} 
                        onChange={handleChange}
                        className="w-full border border-slate-800 rounded-lg px-3 py-2 text-white bg-slate-950 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Match nul</label>
                      <input 
                        type="number" 
                        name="settings.points_draw" 
                        value={formData.settings.points_draw ?? 1} 
                        onChange={handleChange}
                        className="w-full border border-slate-800 rounded-lg px-3 py-2 text-white bg-slate-950 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Défaite</label>
                      <input 
                        type="number" 
                        name="settings.points_loss" 
                        value={formData.settings.points_loss ?? 0} 
                        onChange={handleChange}
                        className="w-full border border-slate-800 rounded-lg px-3 py-2 text-white bg-slate-950 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium" 
                      />
                    </div>
                 </div>
              </div>

              {/* Match Score Card Disabled visually */}
              <div className="border border-slate-800 bg-slate-955 rounded-lg p-4 mb-4 opacity-40">
                 <div className="flex items-center gap-3">
                   <input type="checkbox" disabled className="accent-slate-500 cursor-not-allowed w-4 h-4" />
                   <span className="font-semibold text-slate-400 text-sm">Score de match</span>
                 </div>
                 <p className="text-sm text-slate-500 pl-7 mt-1">Attribue des points égaux au score du match.</p>
              </div>

              {/* Forfeit Card */}
              <div className="border border-slate-800 rounded-lg p-5 bg-slate-900">
                 <div className="flex items-start gap-3 mb-4">
                   <input type="checkbox" checked readOnly className="mt-1 accent-indigo-600 w-4 h-4 rounded bg-slate-950 border-slate-800" />
                   <div>
                     <span className="font-extrabold text-white text-sm block">Forfait</span>
                     <p className="text-sm text-slate-400 mt-1 leading-relaxed">Attribue des points lorsqu'un participant est forfait dans un match (peut être négatif pour une pénalité).</p>
                   </div>
                 </div>
                 <div className="pl-7 max-w-[120px]">
                    <input 
                      type="number" 
                      name="settings.points_forfeit" 
                      value={formData.settings.points_forfeit ?? 0} 
                      onChange={handleChange}
                      className="w-full border border-slate-800 rounded-lg px-3 py-2 text-white bg-slate-950 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium" 
                    />
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-slate-950/80 border-t border-slate-800 p-4 flex flex-col sm:flex-row justify-center md:justify-end gap-3">
        <Link 
          href={`/admin/${guildId}/tournaments/${tournamentId}/structure`}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors mr-auto w-full sm:w-auto border border-slate-700"
        >
          <ChevronLeft className="w-4 h-4" /> Retour
        </Link>
        <button 
          onClick={() => onSubmit(true)}
          disabled={isSubmitting}
          className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md disabled:opacity-50"
        >
          Mettre à jour + Retour
        </button>
        <button 
          onClick={() => onSubmit(false)}
          disabled={isSubmitting}
          className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" /> Mettre à jour
        </button>
      </div>

    </div>
  );
}
