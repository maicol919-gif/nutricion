# Historial de versiones

Formato: `mayor.menor`. Para publicar una versión: sube `version` en `package.json`, añade una entrada aquí, compila y sube `dist` a `gh-pages`.

## 1.8 · 2026-10-18
- La app pasa a llamarse **Nutrición** (nueva dirección: https://maicol919-gif.github.io/nutricion/) y su pestaña principal, antes Diario, se llama **Alimentación**. La dirección anterior (`/alimentacion/`) deja de funcionar.

## 1.7 · 2026-10-18
- Los momentos del día quedan: **Desayuno · Comida · Cena · Extras**. "Comida" vuelve a llamarse así (no Almuerzo) y **Extras** sustituye a Merienda, va al final y nunca se sugiere por hora: es para snacks, cafés y dulces a cualquier momento. Lo ya registrado como merienda aparece en Extras.
- La hora sugerida al abrir Añadir comida: antes de las 11 Desayuno, hasta las 18 Comida, después Cena.

## 1.6 · 2026-10-18
- Nombres más claros: la pestaña **Comida** pasa a llamarse **Diario** y el momento del día **Comida** pasa a llamarse **Almuerzo** (en España "comida" es el almuerzo y se confundía con la comida en general).
- Al cerrar la ventana de Añadir comida con ingredientes sin registrar, pregunta antes de descartarlos.

## 1.5 · 2026-10-18
- Cada ingrediente muestra sus calorías al registrar, para ver qué pesa en el día y qué no.
- Consejo en pantalla: lo que suma menos de ~20 kcal (ajo, especias, sal, limón) no hace falta apuntarlo.
- Alimentos nuevos: ajo (por diente), limón (por chorrito) y especias/sal/hierbas (por pizca).

## 1.4 · 2026-10-18
- 34 alimentos habituales más: muslo de pollo crudo **con hueso** (se registra "1 muslo" o los gramos crudos de la pieza, sin separar el hueso), carnes y pescados, fruta (plátano, manzana…), verduras, legumbres, lácteos, frutos secos, miel y mantequilla.
- Los alimentos de un solo ingrediente usan valores de tablas y no se marcan como estimados; sí lo están los que dependen del hueso, la marca o la conserva.

## 1.3 · 2026-10-18
- Crear un alimento nuevo desde la misma ventana de Añadir comida: botón "Crear un alimento nuevo" en la lista de Alimentos (con el nombre buscado ya escrito) y la pestaña Etiqueta, que ahora permite marcar los valores como aproximados.

## 1.2 · 2026-10-17
- **37 alimentos genéricos** de bollería, postres, comida de restaurante, salsas y bebidas (croissant, bizcocho, pizza, paella, cerveza, café con leche…), con su peso típico por unidad. Se marcan como **estimados** y puedes corregir el peso de la unidad pesando una pieza una sola vez.
- **Etiqueta:** copia los valores de un producto (por 100 g o por unidad) una sola vez; queda guardado y listo para repetir.
- **Estimados:** cada comida y cada día indican cuántas kcal vienen de valores estimados.
- El registro rápido ahora pregunta si los valores son estimados.
- **Día sin registrar:** un botón marca el día como no registrado, sin fallo ni penalización. Si luego registras algo, la marca se quita sola.
- Los alimentos iniciales de las versiones anteriores quedan marcados como estimados cuando dependen de la marca (yogures griegos, tortitas de chocolate).

## 1.1 · 2026-10-17
- La app pasa a llamarse **Alimentación** (nuevo nombre, nueva dirección: https://maicol919-gif.github.io/alimentacion/). La pestaña de registro de comidas conserva el nombre Comida.

## 1.0 · 2026-10-17
- Primera versión como app independiente. Nace de las pestañas Comida y Cuerpo de Entreno 2.7 (que pasan a vivir aquí) con la misma cuenta y los mismos datos.
- Mi día, recetas como plantillas editables, repetir comidas, foto con detalles después, alimentos editables y recetas rápidas de Mercadona.
- Cuerpo: peso y cintura, cintura/altura, ritmo de pérdida y metas diarias.
- Ajustes: respaldo de datos, búsqueda de actualización y cierre de sesión.
