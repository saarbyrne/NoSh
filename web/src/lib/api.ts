import { getSupabaseClient } from "@/lib/supabaseClient";

type UploadUrlResponse = {
  photo_id: string;
  signed_url: string;
  storage_path: string;
};

async function invokeEdgeFunction<T = unknown>(
  functionOrUrl: string,
  payload: Record<string, unknown>,
  options?: { action?: string }
): Promise<T> {
  const client = getSupabaseClient();
  const body = options?.action ? { action: options.action, ...payload } : payload;

  // If a local/proxy or full URL is provided, use fetch directly
  if (functionOrUrl.startsWith("/") || functionOrUrl.startsWith("http")) {
    const res = await fetch(functionOrUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Edge function HTTP ${res.status}: ${text || res.statusText}`);
    }
    const ct = res.headers.get("content-type") || "";
    return (ct.includes("application/json") ? await res.json() : (({ text: await res.text() } as unknown) as T));
  }

  // Else, call by function name via Supabase SDK
  const { data, error } = await client.functions.invoke(functionOrUrl, { body });
  if (error) {
    throw new Error(error.message || "Failed to invoke edge function");
  }
  return data as T;
}

export async function createUploadUrl(params: {
  month_ym: string;
  taken_at: string;
}): Promise<UploadUrlResponse> {
  const functionName =
    process.env.NEXT_PUBLIC_SUPABASE_FUNC_UPLOAD || "create-upload-url";
  const action = process.env.NEXT_PUBLIC_SUPABASE_FUNC_UPLOAD_ACTION;
  const override = process.env.NEXT_PUBLIC_SUPABASE_FUNC_OVERRIDE_URL;
  if (override) {
    // Use proxy when override is set to bypass CORS. The proxy returns { ok, status, parsed, ... }
    type ProxyResponse = { ok: boolean; status: number; parsed?: unknown; rawText?: string };
    const raw = await invokeEdgeFunction<ProxyResponse>(
      override,
      { ...params, fn: functionName, action },
      { action: undefined }
    );
    const p = raw?.parsed ?? raw;
    const photo_id = p?.photo_id ?? p?.photoId ?? p?.id ?? p?.data?.photo_id ?? p?.data?.id;
    const signed_url = p?.signed_url ?? p?.signedUrl ?? p?.url ?? p?.data?.signed_url ?? p?.data?.url;
    const storage_path = p?.storage_path ?? p?.storagePath ?? p?.path ?? p?.data?.storage_path ?? undefined;
    if (!photo_id || !signed_url) {
      throw new Error(`Unexpected upload-url response: ${JSON.stringify(raw).slice(0, 400)}`);
    }
    return { photo_id, signed_url, storage_path } as UploadUrlResponse;
  }
  return await invokeEdgeFunction<UploadUrlResponse>(functionName, params, { action });
}

export async function processPhoto(params: { photo_id: string; photo_url?: string }): Promise<unknown> {
  const functionName =
    process.env.NEXT_PUBLIC_SUPABASE_FUNC_PROCESS || "process-photo";
  const action = process.env.NEXT_PUBLIC_SUPABASE_FUNC_PROCESS_ACTION;
  const override = process.env.NEXT_PUBLIC_SUPABASE_FUNC_OVERRIDE_URL;
  if (override) {
    return await invokeEdgeFunction<unknown>(override, { ...params, fn: functionName, action }, { action: undefined });
  }
  return await invokeEdgeFunction<unknown>(functionName, params, { action });
}

export async function summarizeDay(): Promise<void> {
  const { error } = await getSupabaseClient().functions.invoke("summarize-day", { body: {} });
  if (error) throw error;
}

export async function summarizeMonth(): Promise<void> {
  const { error } = await getSupabaseClient().functions.invoke("summarize-month", { body: {} });
  if (error) throw error;
}

export async function generateGoals(params: { month_id: string }): Promise<void> {
  const { error } = await getSupabaseClient().functions.invoke("generate-goals", { body: params });
  if (error) throw error;
}

// Save analyzed items to DB (client-side insert under RLS)
export type MinimalVisionItem = { raw_label: string; confidence: number; packaged?: boolean };

export async function savePhotoItems(
  photoId: string,
  items: MinimalVisionItem[],
  extra?: { user_id?: string; taken_at?: string; storage_path?: string }
): Promise<void> {
  // Prefer server-side insert to avoid RLS issues
  const override = process.env.NEXT_PUBLIC_SUPABASE_FUNC_OVERRIDE_URL || "/api/edge-proxy";
  const functionName = process.env.NEXT_PUBLIC_SUPABASE_FUNC_SAVE || "save-photo-items";
  const body = { photo_id: photoId, items, ...extra };
  await invokeEdgeFunction(override, { ...body, fn: functionName }, { action: undefined });
}

export async function createPhotoRow(params: {
  id: string;
  storage_path: string;
  taken_at: string;
}): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from("photos").insert({
    id: params.id,
    storage_path: params.storage_path,
    taken_at: params.taken_at,
    status: "uploaded",
  } as unknown as Record<string, unknown>);
  if (error) throw error;
}


