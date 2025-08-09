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
    // Use proxy when override is set to bypass CORS
    return await invokeEdgeFunction<UploadUrlResponse>(
      override,
      { ...params, fn: functionName, action },
      { action: undefined }
    );
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


