export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/modules/shared/http";
import { env } from "@/lib/env";
import { pushConfigurado } from "@/lib/push";

export async function GET() {
  try {
    await requireSession();
    if (!pushConfigurado) {
      return NextResponse.json({ error: "Notificaciones push no configuradas" }, { status: 503 });
    }
    return NextResponse.json({ publicKey: env.VAPID_PUBLIC_KEY });
  } catch (error) {
    return handleApiError(error);
  }
}
