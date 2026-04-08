"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, UserPlus, Trash2, Search } from "lucide-react";

export function ParticipantsClient({ tournamentId, guildId, initialTeams }: { tournamentId: string; guildId: string; initialTeams: any[] }) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);
  const [isAdding, setIsAdding] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  
  // Custom Combobox State
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdding && members.length === 0) {
      fetch(`http://localhost:8080/api/discord/members`)
        .then((res) => res.json())
        .then((data) => {
          if(Array.isArray(data)) setMembers(data);
        })
        .catch((err) => console.error(err));
    }
  }, [isAdding]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !selectedMember) return;

    try {
      const { data, error } = await supabase.from('teams').insert({
        tournament_id: tournamentId,
        name: newTeamName,
        captain_discord_id: selectedMember.id,
        is_checked_in: true // Manual teams are checked in by default
      }).select().single();

      if (error) throw error;
      
      setTeams([...teams, { ...data, team_members: [] }]);
      setNewTeamName("");
      setSearchTerm("");
      setSelectedMember(null);
      setIsAdding(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout de l'équipe");
    }
  };

  const handleForceCheckIn = async (teamId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('teams').update({ is_checked_in: !currentStatus }).eq('id', teamId);
      if (error) throw error;
      
      setTeams(teams.map(t => t.id === teamId ? { ...t, is_checked_in: !currentStatus } : t));
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour");
    }
  };

  const filteredMembers = members.filter(m => 
    m.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.username?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 50); // limit preview amount

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Liste des Équipes
          <span className="text-sm font-normal px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
            {teams.length} inscrits
          </span>
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-blue-500/20"
        >
          <UserPlus className="w-4 h-4" />
          Ajouter manuellement
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddTeam} className="bg-slate-800 p-4 rounded-xl border border-blue-500/50 flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-2 overflow-visible">
          <input 
            type="text" 
            placeholder="Nom de l'équipe..." 
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            required
          />
          
          {/* Custom Combobox for Discord Search */}
          <div className="flex-1 relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher capitane Discord..." 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                value={selectedMember ? selectedMember.displayName : searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedMember(null); // allow re-search
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                required={!selectedMember}
              />
            </div>
            
            {isDropdownOpen && !selectedMember && (
              <div className="absolute top-11 left-0 w-full bg-slate-800 border border-slate-700 rounded-lg mt-1 max-h-60 overflow-y-auto z-50 shadow-xl overscroll-auto custom-scrollbar">
                {members.length === 0 ? (
                  <div className="p-3 text-sm text-slate-400 text-center">Chargement des membres...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-3 text-sm text-slate-400 text-center">Aucun membre trouvé</div>
                ) : (
                  filteredMembers.map(member => (
                    <div 
                      key={member.id} 
                      className="px-4 py-2 hover:bg-slate-700 cursor-pointer flex flex-col transition-colors"
                      onClick={() => {
                        setSelectedMember(member);
                        setSearchTerm(member.displayName);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span className="text-white font-medium">{member.displayName}</span>
                      <span className="text-xs text-slate-400">@{member.username}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={!selectedMember || !newTeamName} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed">
            Valider
          </button>
        </form>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-slate-900/80 text-slate-400 text-sm border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 font-medium uppercase tracking-wider">Nom de l'équipe</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider">Membres</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider">Statut Check-in</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-right">Actions TO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <UserPlus className="w-8 h-8 opacity-50 mb-2" />
                    <span>Aucune équipe n'est encore inscrite pour le moment.</span>
                  </div>
                </td>
              </tr>
            ) : (
              teams.map(team => (
                <tr key={team.id} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="px-6 py-4 font-bold text-white flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-xs text-slate-400">
                         {team.name.substring(0, 2).toUpperCase()}
                       </div>
                       {team.name}
                    </div>
                    <span className="text-xs text-slate-500 font-normal ml-11">Capt ID: {team.captain_discord_id}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {team.team_members && team.team_members.length > 0 
                      ? <span className="text-sm bg-slate-700 px-2 py-1 rounded text-slate-300">{team.team_members.length} joueur(s)</span>
                      : <span className="text-sm bg-purple-500/10 text-purple-400 px-2 py-1 rounded border border-purple-500/20">Externe / Admin</span>}
                  </td>
                  <td className="px-6 py-4">
                    {team.is_checked_in ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Validé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-700/50 text-slate-400 border border-slate-700">
                        <XCircle className="w-3.5 h-3.5" />
                        En attente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => handleForceCheckIn(team.id, team.is_checked_in)}
                         className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                           team.is_checked_in 
                             ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20" 
                             : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20"
                         }`}
                       >
                         {team.is_checked_in ? "Annuler le check-in" : "👉 Forcer le check-in"}
                       </button>
                     </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
