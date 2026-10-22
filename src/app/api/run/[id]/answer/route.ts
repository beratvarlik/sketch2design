import { z } from "zod";
import { getRun } from "@/lib/runs";

// Node.js çalışma zamanı (cacheComponents açıkken varsayılan; segment config verilemez)

const bodySchema = z.object({ answer: z.string().min(1).max(60) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) return Response.json({ error: "Çalışma bulunamadı" }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Geçersiz istek" }, { status: 400 });

  if (!run.answer(parsed.data.answer)) return Response.json({ error: "Bekleyen soru yok ya da seçenek geçersiz" }, { status: 409 });
  return new Response(null, { status: 204 });
}
