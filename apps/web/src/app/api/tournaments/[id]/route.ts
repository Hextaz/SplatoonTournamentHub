import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const guildId = url.searchParams.get("guildId");
  const userId = (session.user as any).id;

  if (!guildId || !id) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // 1. Récupération des paramètres du serveur (T.O Role) depuis la BD
  const { data: serverSettings } = await supabaseAdmin
    .from("server_settings")
    .select("to_role_id")
    .eq("guild_id", guildId)
    .single();

  const toRoleId = serverSettings?.to_role_id || "";

  // 2. Faire appel à notre bot Express Proxy (pour contourner un appel direct depuis le client)
  const botApiUrl = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:8080";
  const botApiSecret = process.env.BOT_API_SECRET;

  try {
    const permRes = await fetch(
      `${botApiUrl}/api/discord/permissions?guildId=${guildId}&userId=${userId}&toRoleId=${toRoleId}`,
      { headers: { Authorization: `Bearer ${botApiSecret}` } }
    );

    if (!permRes.ok) throw new Error("Bot Injoignable");

    const permData = await permRes.json();
    if (!permData.hasPermission) {
      return NextResponse.json({ error: "Accès refusé. Vous n'avez pas le rôle d'Organisateur (T.O) ou Gérer le Serveur." }, { status: 403 });
    }

    // 3. A ce stade, l'utilisateur a le Rôle sur Discord : il a le droit d'effacer le Tournoi de force via Service Role.
    const { error: deletionError } = await supabaseAdmin
      .from("tournaments")
      .delete()
      .eq("id", id)
      .eq("guild_id", guildId); // Securité multi-tenant

    if (deletionError) {
      console.error(deletionError);
      return NextResponse.json({ error: "Impossible de supprimer le tournoi en base de données" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
