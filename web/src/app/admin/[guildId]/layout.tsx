import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { LayoutDashboard, Settings, Trophy, ArrowLeft } from "lucide-react";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !(session as any).accessToken) {
    redirect("/");
  }

  let isAdmin = false;
  try {
    const res = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${(session as any).accessToken}` },
      // Shorter cache to not be locked out if permissions change suddenly
      next: { revalidate: 30 } 
    });

    if (res.ok) {
      const guilds = await res.json();
      const guild = guilds.find((g: any) => g.id === guildId);
      if (guild && (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8)) {
        isAdmin = true;
      }
    }
  } catch (e) {
    console.error("Error validating admin role:", e);
  }

  if (!isAdmin) {
    // If you don't have the permission, get redirected to the public hub
    redirect(`/${guildId}`);
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-slate-900 text-white">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            Panel TO
          </h2>
          <p className="text-sm text-slate-400 mt-1">Administration Serveur</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href={`/admin/${guildId}`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link
            href={`/admin/${guildId}/settings`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Paramètres Serveur
          </Link>
          <Link
            href={`/admin/${guildId}/tournaments`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Trophy className="w-5 h-5" />
            Gestion Tournois
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <Link
            href={`/${guildId}`}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors p-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la vue publique
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
