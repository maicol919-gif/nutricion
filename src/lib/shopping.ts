export type Zone = 'Fruta y verdura' | 'Pan y masas' | 'Nevera' | 'Congelados' | 'Despensa'
export const ZONES: Zone[] = ['Fruta y verdura', 'Pan y masas', 'Nevera', 'Congelados', 'Despensa']

/** Zona del súper donde se suele encontrar un alimento (por su nombre). */
export function zoneOf(name: string): Zone {
  const n = name.toLowerCase()
  if (/congelad/.test(n)) return 'Congelados'
  if (/^pan( |$)|tortilla de trigo|masa fresca|bagel|wrap/.test(n)) return 'Pan y masas'
  if (/tomate|plátano|platano|patata|boniato|espinaca|champiñon|brócoli|brocoli|piña|fresa|cherry|melón|melon|lechuga|zanahoria|calabac|pimiento|aguacate/.test(n)) return 'Fruta y verdura'
  if (/huevo|clara|yogur|skyr|queso|cottage|mozzarella|burrata|jamón|jamon|york|pavo|pollo|salmón|salmon|gambas|tofu|mantequilla|leche entera|guacamole|bacon|kéfir|kefir/.test(n)) return 'Nevera'
  return 'Despensa'
}
