// Edge Function "find-product": busca un producto en Open Food Facts (base abierta y colaborativa) por nombre o por código de barras
// y devuelve sus valores por 100 g. No necesita claves. La app los muestra y el usuario confirma antes de guardar.
// Datos: Open Food Facts (ODbL) · https://world.openfoodfacts.org
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ALLOWED_EMAILS = ["maycolmartinezc@gmail.com"]
const ALLOWED_ORIGINS = ["https://maicol919-gif.github.io", "http://localhost:5173", "http://127.0.0.1:5173"]
// Open Food Facts pide identificar la aplicación en el User-Agent.
const UA = "Nutricion/1.0 (+https://maicol919-gif.github.io/nutricion; maycolmartinezc@gmail.com)"
const FIELDS = "code,product_name,brands,quantity,nutriments,serving_size"

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

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null)

// deno-lint-ignore no-explicit-any
function pick(p: any) {
  const n = p?.nutriments ?? {}
  const brands = Array.isArray(p?.brands) ? p.brands[0] : typeof p?.brands === "string" ? p.brands.split(",")[0].trim() : null
  return {
    code: String(p?.code ?? ""),
    name: String(p?.product_name ?? "").trim(),
    brand: brands || null,
    quantity: typeof p?.quantity === "string" ? p.quantity : null,
    serving: typeof p?.serving_size === "string" ? p.serving_size : null,
    kcal: num(n["energy-kcal_100g"]),
    protein: num(n["proteins_100g"]),
    carbs: num(n["carbohydrates_100g"]),
    fat: num(n["fat_100g"]),
    sugars: num(n["sugars_100g"]),
    fiber: num(n["fiber_100g"]),
  }
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`status ${res.status}`)
  const type = res.headers.get("content-type") ?? ""
  if (!type.includes("json")) throw new Error("not json")
  return await res.json()
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin")
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) })
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin)

  const email = emailFromJwt(req.headers.get("authorization"))
  if (!email || !ALLOWED_EMAILS.includes(email)) return json({ error: "forbidden", message: "Esta función es solo para el dueño de la cuenta." }, 403, origin)

  let body: { query?: string; barcode?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: "bad_request", message: "Cuerpo no válido." }, 400, origin)
  }

  const barcode = (body.barcode ?? "").replace(/\s+/g, "")
  const query = (body.query ?? "").trim().slice(0, 120)

  try {
    if (barcode) {
      if (!/^\d{8,14}$/.test(barcode)) return json({ error: "bad_request", message: "El código de barras debe tener entre 8 y 14 cifras." }, 400, origin)
      // deno-lint-ignore no-explicit-any
      const d = (await getJson(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS}`)) as any
      const products = d?.status === 1 && d.product ? [pick({ ...d.product, code: d.product.code ?? barcode })] : []
      return json({ products: products.filter((p) => p.name && p.kcal != null), source: "Open Food Facts" }, 200, origin)
    }
    if (query.length < 2) return json({ error: "bad_request", message: "Escribe al menos 2 letras o un código de barras." }, 400, origin)
    // deno-lint-ignore no-explicit-any
    const d = (await getJson(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=12&fields=${FIELDS}`)) as any
    const hits: unknown[] = Array.isArray(d?.hits) ? d.hits : []
    const products = hits.map(pick).filter((p) => p.name && p.kcal != null).slice(0, 8)
    return json({ products, source: "Open Food Facts" }, 200, origin)
  } catch {
    return json({ error: "unavailable", message: "La base de productos no responde ahora mismo. Inténtalo en un rato o crea el alimento a mano." }, 502, origin)
  }
})
