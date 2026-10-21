# Notas para seguir (tú o una sesión nueva de Claude)

Este archivo resume cómo se trabaja con la app y qué está pendiente, para no depender de un chat concreto.

## Cómo trabajar con el usuario
- Meta: bajar grasa (sobre todo abdominal) sin perder músculo. Metas diarias: ≈ 2.150 kcal y ≈ 148 g de proteína (carbohidratos 220-250 g, grasa 60-70 g). Están en Ajustes.
- Siempre con números (kcal, proteína). Sin tamaños S/M/L ni "buena fuente de proteína sí/no".
- Respuestas cortas y en pocos pasos; no enumerar más situaciones de las pedidas.
- Evidencia: citar y avisar cuando es débil o no está verificada.
- Preguntar antes de renombrar o cambiar textos visibles de la app.
- No mezclar con la app de entrenamiento (Entreno).
- No tiene báscula de cocina la mayoría de las veces: mide con cucharas, vasos o unidades; cuando pesa, el peso manda.
- Máximo 1-2 huevos al día. Cafeína: antes de las 15:30 si duerme a las 23:30 (el pre-entreno lleva 250 mg).
- Le gusta el dulce: dejar sitio para postres dentro de las metas.

## Las tres apps
- **Entreno** (`../app`), **Nutrición** (esta) y **Vértice** (`../vertice`, solo lectura: Hoy y Resumen). Vértice lee vistas `v_*` definidas en `app/supabase/schema.sql`; si cambia una tabla de aquí que usa una vista (meal_log, supplement_log, foods.caffeine_mg, body_weight, settings), hay que revisar la vista.

## Qué hace cada pestaña
- **Alimentación**: Mi día, Recetas, Alimentos, En casa.
- **Compra**: lista del súper de las recetas elegidas, sin lo que ya hay en casa.
- **Cuerpo** y **Ajustes**.
Detalle en `README.md`. Historial en `CHANGELOG.md`.

## Datos
- Una sola base de Supabase compartida con Entreno (esquema en `app/supabase/schema.sql`).
- `fridge_items` guarda lo que hay en casa: `kind` (nevera, congelador, despensa), `made_on` (desde cuándo, opcional), `food_id` (enlace al alimento, opcional), `low`, `note`.

## Decisiones (2026-10-21)
- **Sin plan de comidas.** Lo planificado no coincide con lo que apetece o hay ese día. Se decide qué comer en el momento, con lo que hay en casa y los macros restantes del día.
- **Una sola palabra: "alimento"** (melón, burrata Hacendado, avena). "Ingrediente" solo dentro de una receta. No usar "producto".
- **En casa** incluye nevera, congelador y despensa. Cada alimento que se usa debería descontarse de lo que hay; al agotarse, desaparece.
- **Ritmo de compra:** grande cada 15 días (despensa y congelables) y una a los 8 días (carne y proteína, fruta y verdura frescas). La carne y el pescado frescos aguantan 1-2 días en nevera: se congelan en porciones el día de la compra.
- **Compra:** qué comprar según lo que realmente se consume (historial) menos lo que hay; y "con lo que compraste puedes cocinar…" (qué receta se desbloquea con un alimento más).

## Pendiente
1. ~~Cantidades en lo que viene en paquete, con descuento al registrar~~ (hecho en 1.34, aceptado por el usuario). Limitación: crudo frente a cocido son alimentos distintos; si se compra pollo crudo y la receta usa pollo cocinado, no se descuenta. Pendiente: leer el peso del paquete al escanear el código de barras.
2. ~~Botón "¿Qué como ahora?"~~ (hecho en 1.36; en 1.38 también arma comidas con los alimentos de casa, sin recetas). Pendiente de mejorar: también valorar azúcar (no se registra) y evitar repetir lo comido en los últimos días.
3. ~~Compra por consumo y ritmo (8 y 15 días) + recetas que cubres~~ (hecho en 1.35). Limitaciones: el consumo se mide con los alimentos tal como se registran (p. ej. arroz cocido, no crudo); con pocos días de historial las cantidades son aproximadas.
   - Hecho en 1.37: botón "Guardar la compra en casa" (pasa el carro a En casa pidiendo el peso de lo que va en paquete). Pendiente: leer el peso del paquete al escanear el código de barras.
4. Retirar la página de Claude "Recetas y compra" cuando lo anterior esté en la app (pedir confirmación).
5. Etiquetas pendientes: tomate frito, tortillas integrales, taquitos de cerdo.
6. **Botón "Pídele a Claude"** dentro de la app (acordado): Edge Function que llama a la API de Anthropic con lo que hay en casa, lo que falta del día, el historial y los votos Me gusta / No me apetece, y devuelve 2-3 platos con nombre y gramos; los macros los calcula el código y solo se aceptan alimentos de casa. Necesita que el usuario cree la clave `ANTHROPIC_API_KEY` (cuenta de API con saldo) y la ponga él en Supabase. Con la misma clave funcionaría la importación de recetas por foto (`read-recipe`). Sin clave, la app sigue con la versión sin IA.
7. ~~Suplementos y medicación~~ (hecho en 1.42). La cafeína de café, cola y chocolate se suma sola (`foods.caffeine_mg`, valores aproximados; el café de máquina ≈ 90 mg por taza de 200 ml). Pendiente: hora de dormir editable (hoy fija a las 23:30) y **control del sueño** en la app (pedido por el usuario).
8. Seguir añadiendo recetas (el usuario autorizó investigarlas y añadirlas, en tandas pequeñas para revisarlas).

## Recetas del post (Iona Fit), estimaciones sin cantidades
| Receta | kcal | Proteína | Productos |
|---|---|---|---|
| Tortitas de avena con yogur y chocolate | ≈ 430 | ≈ 37 g | harina de avena, claras, yogur +proteínas 0 %, gotas de chocolate negro |
| Bol de queso batido con frutos rojos y avena crunchy | ≈ 310 | ≈ 25 g | queso fresco batido 0 %, frutos rojos congelados, avena crunchy |
| Tostadas de espelta con revueltos y cottage | ≈ 330 | ≈ 24 g | pan 100 % espelta, 2 huevos, cottage |
| Wrap de pavo con havarti light y guacamole | ≈ 330 | ≈ 22 g | tortilla de trigo, pavo, havarti light, guacamole |
| Bagel con salmón y queso crema light | ≈ 350 | ≈ 20 g | bagel, queso de untar light, salmón ahumado |
| Porridge de avena con kéfir, fresas y cacahuete | ≈ 370 | ≈ 16 g | copos de avena, kéfir 0 %, crema de cacahuete, fresas |
