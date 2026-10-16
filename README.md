# Nutrición

App web instalable (PWA) para registrar la alimentación, el peso y la cintura. Pensada para un solo usuario y para usarse desde el celular. Es la compañera de **Entreno** (la app de entrenamiento): las dos comparten la misma cuenta y la misma base de datos en Supabase.

## Qué hace

- **Alimentación → Mi día:** barras de proteína y calorías contra tus metas, lo que te falta, y los registros agrupados por momento del día (desayuno, comida, cena y extras). Navegación por días para completar olvidos.
- **Recetas como plantillas:** al registrar ves cada ingrediente con su cantidad (gramos o medida casera: cucharadas, huevos, latas). Puedes cambiarla, quitar o añadir ingredientes y reescalar las raciones. Se puede guardar como receta propia.
- **Repetir** un registro reciente con las mismas cantidades.
- **Foto ahora, detalles después:** la foto crea un registro "por completar" que no cuenta en los totales hasta que indicas qué llevaba. Las fotos son privadas. La app no estima calorías desde la foto (las apps que lo hacen subestiman las cantidades).
- **Recetas y alimentos:** 16 recetas rápidas de Mercadona y 40 alimentos con valores por 100 g, editables con la etiqueta de tu marca. Cada registro guarda su propia copia de los valores.
- **Genéricos y etiqueta:** alimentos sin etiqueta (bollería, restaurante, bebidas) con peso típico por unidad y marca de estimado; productos con etiqueta se guardan una vez. Cada día indica cuántas kcal son estimadas.
- **Día sin registrar:** marca un día como no registrado, sin penalización.
- **Cuerpo:** peso y cintura con media de 7 días, variación semanal, cintura/altura (meta < 0,5) y veredicto del ritmo de pérdida. Metas diarias editables.

## Base de datos compartida

Usa el mismo proyecto de Supabase que Entreno (tablas `foods`, `recipes`, `recipe_items`, `meal_log`, `body_weight`, `settings`). El esquema completo está en el repositorio de Entreno (`supabase/schema.sql`). Nutrición solo escribe sus propias tablas y las columnas `height_cm`, `kcal_target` y `protein_target` de `settings`.

## Stack

React + TypeScript + Vite, PWA (`vite-plugin-pwa`), Supabase (Postgres con seguridad por filas, email + contraseña) y Vitest.

## Puesta en marcha

1. Crea `.env.local` con la URL y la clave pública de tu proyecto de Supabase:

   ```
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_KEY=tu_clave_publica
   ```

2. Instala y arranca:

   ```bash
   npm install
   npm run dev
   ```

3. Pruebas: `npm test` · Compilar: `npm run build`.

Publicación: la carpeta `dist` se sube a la rama `gh-pages` (GitHub Pages).
