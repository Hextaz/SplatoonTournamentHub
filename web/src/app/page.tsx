"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { LogIn, ArrowRight } from "lucide-react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-6 py-12">
      <div className="max-w-3xl text-center space-y-8">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
          Le hub ultime pour vos tournois <span className="text-indigo-600">Splatoon</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Gérez vos événements communautaires, générez vos arbres de tournoi et synchronisez tout directement avec vos serveurs Discord.
        </p>
        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          {!session ? (
            <button
              onClick={() => signIn("discord", { callbackUrl: "/servers" })}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-transform hover:scale-105"
            >
              <LogIn size={24} />
              Se connecter avec Discord
            </button>
          ) : (
            <Link
              href="/servers"
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg transition-transform hover:scale-105"
            >
              Accéder à mes serveurs
              <ArrowRight size={24} />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Bracket Generator</h3>
          <p className="text-slate-600">Arbres à double élimination, seed folding mathématique et avancement automatique gérés de façon optimale.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Bot Discord Intégré</h3>
          <p className="text-slate-600">Vos joueurs s'inscrivent directement via Discord, les plannings sont mis à jour en temps réel.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl">📱</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Panel Mobile-First</h3>
          <p className="text-slate-600">Une interface propre et accessible pour les Tournament Organizers (TO) depuis n'importe quel ordinateur ou smartphone.</p>
        </div>
      </div>
    </div>
  );
}
