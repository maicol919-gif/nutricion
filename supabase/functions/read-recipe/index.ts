// Edge Function "read-recipe": lee una receta a partir de una foto o un PDF y devuelve sus datos estructurados.
// La app Nutrición propone esos datos y tú los confirmas antes de guardar nada.
//
// Requisitos (los configura el dueño de la cuenta, nunca se guardan en el código):
//   - Secreto ANTHROPIC_API_KEY en Supabase (Project Settings → Edge Functions → Secrets).
//   - Opcional: secreto RECIPE_MODEL para cambiar de modelo (por defecto claude-opus-5-5).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Anthropic from "npm:@anthropic-ai/sdk"

// Solo estos correos pueden usar la función (la clave de API es tuya y cada lectura tiene un coste).
const ALLOWED_EMAILS = ["maycolmartinezc@gmail.com"]
const ALLOWED_ORIGINS = ["https://maicol919-gif.github.io", "http://localhost:5173", "http://127.0.0.1:5173"]
const MODEL = Deno.env.get("RECIPE_MODEL") ?? "claude-opus-5-5"
const MAX_BASE64_CHARS = 7_000_000
const MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"])

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "servings", "minutes", "method", "ingredients", "steps", "notes"],
  properties: {
    name: { type: "string" },
    servings: { type: ["number", "null"] },
    minutes: { type: ["number", "null"] },
    method: { type: "string", enum: ["horno", "sarten", "microondas", "olla", "plancha", "sin_cocinar", "no_indicado"] },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity", "unit", "grams", "optional"],
        properties: {
          name: { type: "string" },
          quantity: { type: ["number", "null"] },
          unit: { type: ["string", "null"], enum: ["g", "kg", "ml", "l", "cucharada", "cucharadita", "taza", "unidad", "diente", "pizca", "al_gusto", null] },
          grams: { type: ["number", "null"] },
          optional: { type: "boolean" },
        },
      },
    },
    steps: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
}

const SYSTEM = `Lees recetas de cocina a partir de una foto, una captura de pantalla o un PDF, en español o en otro idioma, y las devuelves estructuradas EN ESPAÑOL.
Reglas:
- Extrae solo lo que aparece en el documento. No inventes ingredientes, cantidades, raciones ni pasos.
- "ingredients": un elemento por ingrediente. "name" es el ingrediente sin la cantidad (ej. "harina de trigo"). "quantity" y "unit" son lo que dice la receta; si no hay cantidad (sal "al gusto"), quantity null y unit "al_gusto".
- "grams": tu mejor estimación del peso en gramos de ese ingrediente para TODA la receta, usando una conversión razonable (ej. 1 taza de harina ≈ 120 g, 1 cucharada de aceite ≈ 12 g, 1 huevo ≈ 55 g). null si no hay cantidad.
- "servings": raciones o porciones que indica la receta, o null si no lo dice. "minutes": tiempo total, o null.
- "method": el método principal de cocción (horno, sarten, microondas, olla, plancha, sin_cocinar) o "no_indicado".
- "steps": pasos breves, uno por elemento.
- "notes": avisos sobre lo que no se pudo leer bien o falta (texto ilegible, cantidades que no aparecen). Cadena vacía si no hay nada que avisar.`

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } })
}

/** Correo del usuario según el JWT (la plataforma ya verificó su firma: verify_jwt está activado). */
function emailFromJwt(authHeader: string | null): string | null {
  try {
    const token = authHeader?.replace(/^Bearer\s+/i, "") ?? ""
    const payload = token.split(".")[1]
    if (!payload) return null
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const claims = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)))
    return typeof claims.email === "string" ? claims.email.toLowerCase() : null
  } catch {
    return null
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin")
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) })
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin)

  const email = emailFromJwt(req.headers.get("authorization"))
  if (!email || !ALLOWED_EMAILS.includes(email)) return json({ error: "forbidden", message: "Esta función es solo para el dueño de la cuenta." }, 403, origin)

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!apiKey) return json({ error: "not_configured", message: "Falta el secreto ANTHROPIC_API_KEY en Supabase." }, 503, origin)

  let body: { mediaType?: string; data?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: "bad_request", message: "Cuerpo no válido." }, 400, origin)
  }
  const mediaType = body.mediaType ?? ""
  const data = body.data ?? ""
  if (!MEDIA.has(mediaType)) return json({ error: "bad_request", message: "Formato no admitido: usa una foto (JPG, PNG, WebP) o un PDF." }, 400, origin)
  if (!data || data.length > MAX_BASE64_CHARS) return json({ error: "too_large", message: "El archivo está vacío o es demasiado grande." }, 413, origin)

  const client = new Anthropic({ apiKey })
  const source = { type: "base64" as const, media_type: mediaType, data }
  const fileBlock = mediaType === "application/pdf"
    ? { type: "document" as const, source: { ...source, media_type: "application/pdf" as const } }
    : { type: "image" as const, source: { ...source, media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" } }

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      // la lectura es sencilla: poco esfuerzo basta y abarata cada receta
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: [fileBlock, { type: "text", text: "Lee esta receta y devuélvela estructurada." }] }],
    } as Anthropic.MessageCreateParamsNonStreaming)

    if (res.stop_reason === "refusal") return json({ error: "refused", message: "No se pudo leer este archivo." }, 422, origin)
    if (res.stop_reason === "max_tokens") return json({ error: "too_long", message: "La receta es demasiado larga para leerla de una vez." }, 422, origin)

    const text = res.content.find((b) => b.type === "text")
    if (!text || text.type !== "text") return json({ error: "empty", message: "No se obtuvo ninguna receta." }, 422, origin)
    const recipe = JSON.parse(text.text)
    return json({ recipe, model: res.model, usage: res.usage }, 200, origin)
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "bad_key", message: "La clave de API no es válida." }, 502, origin)
    if (e instanceof Anthropic.RateLimitError) return json({ error: "rate_limited", message: "Demasiadas lecturas seguidas: espera un minuto." }, 429, origin)
    if (e instanceof Anthropic.APIError) return json({ error: "api_error", message: `Error del servicio (${e.status}).` }, 502, origin)
    return json({ error: "internal", message: "Error inesperado al leer la receta." }, 500, origin)
  }
})
