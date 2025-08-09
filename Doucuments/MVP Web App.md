MVP Web App + PWA (Next.js + Supabase) — Food Photo → Rules → 3 Goals

Objetivo
Construir una web app PWA donde el usuario (via magic link) sube fotos de todo lo que come durante 3 días.
Backend procesa cada foto con Gemini Vision (+OCR), mapea a una taxonomía fija, aplica reglas determinísticas y genera 3 metas con un LLM barato.
El usuario ve el resumen y acepta/edita metas; a fin de mes responde si las logró.

Stack fijo (no cambiar)

Frontend: Next.js 15 (App Router) + TypeScript + Tailwind + PWA (manifest + SW con Workbox).

Auth/DB/Storage: Supabase (Auth con magic links, Postgres con RLS, Storage privado).

Server/Jobs: Supabase Edge Functions (TypeScript), Scheduled Functions para cron.

AI: Gemini 1.5 Flash (visión/ocr + texto) vía REST. (Implementar también cliente OpenAI como fallback opcional).

Deploy: Vercel (frontend). Supabase gestiona funciones y DB.

Requisitos funcionales

Login por magic link.

Subida de fotos (móvil) con <input accept="image/*" capture="environment">.

Por foto: llamar a Gemini visión (+ OCR si es necesario), guardar photo_items.

Taxonomía fija (20–30 categorías) + label_map.csv para mapear labels crudos → categoría.

Reglas determinísticas (archivo rules.ts) → pattern_flags.

Generación de 3 metas (LLM) → JSON validado con Zod.

PWA: manifest + service worker (no cachear fotos privadas).

Privacidad: borrar fotos originales a los 30 días (job programado).

RLS: un usuario solo ve sus datos.

Tests básicos (unit de reglas + contrato JSON).

Estructura del repo

bash
Copy
Edit
/app                      # Next.js (App Router)
  /(auth)/login/page.tsx
  /(app)/upload/page.tsx
  /(app)/day/[date]/page.tsx
  /(app)/month/[ym]/page.tsx
  /(app)/goals/[monthId]/page.tsx
  layout.tsx
  globals.css

/lib
  supabaseClient.ts
  api.ts                  # llamadas a Edge Functions
  schemas.ts              # Zod: vision output, goals schema
  pwa/
    register-sw.ts
    service-worker.ts     # Workbox

/components
  UploadCard.tsx
  PhotoList.tsx
  DaySummary.tsx
  MonthSummary.tsx
  GoalsView.tsx

/edge-functions
  create-upload-url/index.ts
  process-photo/index.ts
  summarize-day/index.ts
  summarize-month/index.ts
  generate-goals/index.ts
  submit-feedback/index.ts
  delete-old-photos/index.ts  # cron 1/día

/mapping
  taxonomy.json
  label_map.csv

/server
  rules.ts                # reglas determinísticas
  ai/
    gemini.ts             # visión/ocr + text
    openai.ts             # opcional fallback
  mapping.ts              # carga y lookup
  summarizers.ts

/supabase
  migrations/...
  policies.sql
  seed.sql (opcional)
Modelado de datos (crear con migraciones Supabase)

Tablas: profiles, months, photos, photo_items, day_summaries, month_summaries, goal_sets, goal_feedback (como te pasé antes).

Activar RLS en todas y políticas “user_id = auth.uid()”.

Endpoints (Edge Functions)

create-upload-url → input { month_ym, taken_at } → output { photo_id, signed_url, storage_path }

process-photo → input { photo_id } → llama a Gemini visión (+OCR si hace falta), mapea → guarda photo_items, marca photos.status='processed'.

summarize-day → recuenta y guarda day_summaries.

summarize-month → agrega → month_summaries + pattern_flags (usa rules.ts).

generate-goals → input { month_id } → LLM → JSON (validar con Zod) → goal_sets.

submit-feedback → input { goal_set_id, achieved, liked, repeat_next, notes? }.

delete-old-photos (scheduled daily) → borra de Storage fotos >30 días y marca en DB.

Schemes JSON (usar Zod en schemas.ts)

ts
Copy
Edit
export const VisionItem = z.object({
  raw_label: z.string(),
  confidence: z.number().min(0).max(1),
  packaged: z.boolean().optional().default(false),
  taxonomy_category: z.string()
});
export const VisionOutput = z.object({
  photo_id: z.string().uuid(),
  items: z.array(VisionItem),
  ocr_text: z.string().optional()
});

export const GoalsOutput = z.object({
  goals: z.array(z.object({
    title: z.string().max(60),
    why: z.string().max(120),
    how: z.string().max(200),
    fallback: z.string().max(120)
  })).length(3)
});
Reglas (server/rules.ts) — MVP

LOW_FIBRE si (fruit + vegetables) < 5 en 3 días.
HIGH_SUGARY_DRINKS si sugary_drinks ≥ 2.
LOW_OMEGA3 si oily_fish = 0.
HIGH_PROCESSED_MEAT si ≥ 2.
HIGH_FIBRE_CEREAL_PRESENT solo si OCR contiene “whole grain” o “≥6g fibre/100g”.

Taxonomía y mapeo (inicial)
mapping/taxonomy.json (ejemplo):

json
Copy
Edit
["fruit","vegetables","high-fibre cereals","low-fibre cereals","sugary drinks",
 "water","oily fish","white fish","processed meats","unprocessed meats",
 "plant proteins","dairy","nuts & seeds","sweets & desserts","fried foods",
 "whole grains","refined grains","coffee/tea (unsweetened)","coffee/tea (sweetened)"]
mapping/label_map.csv (snippet):

java
Copy
Edit
raw_label,taxonomy_category
strawberries,fruit
spinach,vegetables
cornflakes,low-fibre cereals
bran flakes,high-fibre cereals
cola,sugary drinks
diet cola,water
smoked bacon,processed meats
tuna (canned in oil),oily fish
AI: Requisitos
ai/gemini.ts debe exponer:
analyzeImage({ signedUrl }) -> VisionOutput
generateGoals({ monthSummaryJson }) -> GoalsOutput
Forzar salida JSON estricta; reintentar 1 vez si no valida.

PWA
manifest.json completo (iconos 192/512, display:"standalone").
service-worker.ts con Workbox:

HTML/JSON: NetworkFirst
static assets: StaleWhileRevalidate
no cachear rutas de fotos firmadas.
Pantallas mínimas
Login (magic link), Subida, Resumen Día, Resumen Mes, Metas (aceptar/editar), Feedback final.

Definition of Done
Flujo end-to-end funcionando con 1 usuario real.
p95 procesamiento foto < 10s.
Validación Zod pasando.
RLS verificada.
Fotos se borran a los 30 días (probar con override de fecha).

Lighthouse PWA: installable ✅.

No hacer
No cambiar esquemas JSON/DB sin migración.
No cachear imágenes privadas.
No usar cookies para auth; usar sesión Supabase.