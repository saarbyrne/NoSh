import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const fnFromQuery = req.nextUrl.searchParams.get("fn") ?? undefined;
    const fnFromBody = (json?.fn as string | undefined) ?? undefined;
    const functionName =
      fnFromQuery || fnFromBody || process.env.NEXT_PUBLIC_SUPABASE_FUNC_UPLOAD || "smooth-handler";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
    }

    const upstreamUrl = `${supabaseUrl}/functions/v1/${functionName}`;
    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(json),
      // Edge Functions may take a bit; allow longer if needed
      cache: "no-store",
    });

    const text = await res.text();
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const baseBody = isJson ? (text ? JSON.parse(text) : {}) : { text };
    const body = res.ok
      ? baseBody
      : { ...baseBody, functionName, upstreamUrl };
    return NextResponse.json(body, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}


