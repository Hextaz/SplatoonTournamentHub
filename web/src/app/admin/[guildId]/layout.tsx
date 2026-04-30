import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { ServerSidebarWrapper } from "@/components/ServerSidebarWrapper";
import {
  LayoutDashboard,
  Settings,
  Trophy,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";

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
    // 1. On vérifie d'abord via l'API Next.js Proxy/Bot si l'utilisateur a Manage Server OU s'il a le TO Role
    // (L'appel classique à Discord.com depuis Next.js ne renvoie que les permissions globales, pas les rôles locaux)
    const discordId = (session.user as any)?.id;
    const botApiUrl = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:8080";
    const botApiSecret = process.env.BOT_API_SECRET;

    if (discordId && botApiSecret) {
      // On récupère d'abord le role TO du serveur
      const { data: serverSettings } = await supabaseAdmin
        .from("server_settings")
        .select("to_role_id")
        .eq("guild_id", guildId)
        .single();
      const toRoleId = serverSettings?.to_role_id || "";

      const permRes = await fetch(
        `${botApiUrl}/api/discord/permissions?guildId=${guildId}&userId=${discordId}&toRoleId=${toRoleId}`,
        { headers: { Authorization: `Bearer ${botApiSecret}` }, cache: 'no-store' }
      );
      
      if (permRes.ok) {
        const permData = await permRes.json();
        if (permData.hasPermission) {
          isAdmin = true;
          
          // CRITIQUE : Puisque la RLS côté base de données est basée sur la colonne "admin_ids", 
          // Injectons ("Sync") l'ID de cet Organisateur directement dans tous les tournois du serveur
          // Ce qui lui donnera un accès total à Supabase.from('tournaments').update(...) côté client !
          const { error: rpcError } = await supabaseAdmin.rpc('add_admin_to_all_tournaments', {
            target_guild_id: guildId,
            new_admin_id: discordId
          });
          if (rpcError) {
            console.error("Failed to sync admin IDs for RLS:", rpcError);
          }
        }
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
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-slate-900 text-white relative">
      {/* Sidebar Server conditionally rendered */}
      <ServerSidebarWrapper>
        {/* Mobile Header */}
        <div className="lg:hidden p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center sticky top-0 z-30">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" /> Panel TO
          </h2>
          <label
            htmlFor="server-sidebar"
            className="p-2 cursor-pointer bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
          >
            <Menu className="w-5 h-5 text-white" />
          </label>
        </div>

        {/* Hidden Checkbox for Mobile Toggle */}
        <input type="checkbox" id="server-sidebar" className="peer hidden" />

        {/* Overlay */}
        <label
          htmlFor="server-sidebar"
          className="fixed inset-0 bg-black/60 z-40 hidden peer-checked:block lg:hidden"
        />

        {/* Sidebar */}
        <aside className="fixed lg:sticky top-0 lg:top-[0rem] left-0 h-[100dvh] lg:h-[calc(100vh-4rem)] w-64 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 z-50 transform -translate-x-full peer-checked:translate-x-0 lg:translate-x-0 transition-transform duration-300">
          <div className="lg:hidden absolute top-4 right-4">
            <label
              htmlFor="server-sidebar"
              className="p-2 cursor-pointer bg-slate-700 rounded-md hover:bg-slate-600 transition-colors flex"
            >
              <X className="w-5 h-5 text-white" />
            </label>
          </div>
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-400" />
              Panel TO
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Administration Serveur
            </p>
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
      </ServerSidebarWrapper>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-[1600px] w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}


