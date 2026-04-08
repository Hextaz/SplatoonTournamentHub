import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Note: App Router params in route handlers must be awaited in Next 15 depending on usage.
  const { id: phaseId } = await params;
  
  // Verifier la session
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tournamentId, seededTeams } = body;

    // Simulate backend or database generation logic processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Ici on devrait interroger Supabase ou l'API externe (Express Bot) pour générer les brackets, 
    // round préliminaire, insert des matchs etc...
    // ex: await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/phases/${phaseId}/publish`, ...);

    console.log(`[SERVER] Bracket generated for Phase ${phaseId}, Teams:`, seededTeams);

    return NextResponse.json({ 
      success: true, 
      message: "Phrase generated successfully" 
    });
    
  } catch (error) {
    console.error("Publish Phase Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}