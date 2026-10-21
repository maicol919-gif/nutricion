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

## Qué hace cada pestaña
- **Alimentación**: Mi día, Recetas, Alimentos, En casa.
- **Compra**: lista del súper de las recetas elegidas, sin lo que ya hay en casa.
- **Cuerpo** y **Ajustes**.
Detalle en `README.md`. Historial en `CHANGELOG.md`.

## Datos
- Una sola base de Supabase compartida con Entreno (esquema en `app/supabase/schema.sql`).
- `fridge_items` guarda lo que hay en casa: `kind` (nevera, congelador, despensa), `made_on` (desde cuándo, opcional), `food_id` (enlace al alimento, opcional), `low`, `note`.

## Pendiente (acordado)
1. **Plan automático de 2 semanas.** El usuario no quiere elegir recetas en el mercado: quiere que se planifiquen las próximas dos semanas de comidas y, con eso y lo que hay en casa (despensa, nevera, congelador), salga qué comprar. Reglas pedidas: no repetir una misma receta ni una misma combinación de alimentos más de 2 veces en las 2 semanas. Consideraciones:
   - La compra se divide por caducidad: lo perecedero de la semana 2 se compra en una segunda visita; lo que aguanta (despensa, congelable) se compra de una vez.
   - Hacen falta más recetas de comida (hay pocas) para poder cumplir la regla de repetición.
   - El plan debe ser flexible (días de malestar, comer fuera) y recalcularse.
   - Guardar el plan en una tabla propia y mostrarlo en Mi día ("hoy toca").
2. **Pasar las recetas del post** (abajo) a la pestaña Recetas como "idea", con cantidades estimadas.
3. **Retirar la página de Claude "Recetas y compra"** cuando 2 y el plan estén dentro de la app (hasta entonces es la única copia de las recetas del post).
4. Etiquetas pendientes: tomate frito, tortillas integrales, taquitos de cerdo.

## Recetas del post (Iona Fit), estimaciones sin cantidades
| Receta | kcal | Proteína | Productos |
|---|---|---|---|
| Tortitas de avena con yogur y chocolate | ≈ 430 | ≈ 37 g | harina de avena, claras, yogur +proteínas 0 %, gotas de chocolate negro |
| Bol de queso batido con frutos rojos y avena crunchy | ≈ 310 | ≈ 25 g | queso fresco batido 0 %, frutos rojos congelados, avena crunchy |
| Tostadas de espelta con revueltos y cottage | ≈ 330 | ≈ 24 g | pan 100 % espelta, 2 huevos, cottage |
| Wrap de pavo con havarti light y guacamole | ≈ 330 | ≈ 22 g | tortilla de trigo, pavo, havarti light, guacamole |
| Bagel con salmón y queso crema light | ≈ 350 | ≈ 20 g | bagel, queso de untar light, salmón ahumado |
| Porridge de avena con kéfir, fresas y cacahuete | ≈ 370 | ≈ 16 g | copos de avena, kéfir 0 %, crema de cacahuete, fresas |
