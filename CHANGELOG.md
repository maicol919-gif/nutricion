# Historial de versiones

Formato: `mayor.menor`. Para publicar una versión: sube `version` en `package.json`, añade una entrada aquí, compila y sube `dist` a `gh-pages`.

## 1.29 · 2026-10-21
- **Alimentación → En casa:** lo que tienes en nevera, congelador y despensa (sin cantidades). Marca "Queda poco" o "Se acabó" y añade con "Añadir a casa". Usa la misma tabla que "Nevera y congelador" de Mi día, que ahora solo muestra lo que tiene fecha.

## 1.28 · 2026-10-18
- Lo guardado puede estar en la **nevera** (aviso a los 3 días) o en el **congelador** (aviso a los ~2 meses por calidad). El recuadro pasa a llamarse "Nevera y congelador".

## 1.27 · 2026-10-18
- **En la nevera** (en Mi día, hoy): anota qué guardaste y desde cuándo. Avisa a los 3 días ("cómelo hoy o congélalo") y al pasar de 4 ("mejor no comerlo"). Botón **Terminado** para quitarlo. Tabla nueva `fridge_items`.

## 1.26 · 2026-10-22
- Al registrar, la lista se abre en **Alimentos** y esa pestaña va primero; **Recetas** pasa a ser la segunda (después, Etiqueta y Rápido).

## 1.25 · 2026-10-22
- **Menos ruido en "Ya tienes alimentos parecidos":** las marcas (Hacendado, Mercadona) y "congelado" ya no cuentan, y un nombre largo (por ejemplo, un producto con varias frutas) necesita dos palabras en común. Los nombres cortos (banano, muslo) siguen avisando con una.

## 1.24 · 2026-10-22
- **Alimentación → Alimentos → Nuevo** usa ahora el mismo formulario que el resto de la app: con **Buscar producto** (por nombre o código de barras), medida casera y aviso de parecidos. Antes abría un formulario antiguo sin buscador.
- El formulario de alimento nuevo incluye el campo **Otros nombres**.

## 1.23 · 2026-10-22
- Al buscar un producto, la app avisa si todos los valores vienen a cero (un dato vacío o mal cargado en la base colaborativa; ocurre, por ejemplo, con el código de barras de una mermelada de Mercadona).

## 1.22 · 2026-10-22
- **Medida casera al crear un alimento por 100 g** (por ejemplo, un producto encontrado en Open Food Facts, que solo trae valores por 100 g): campo opcional "¿Cómo lo cuentas?" con cuánto pesa una rebanada, un puñado o una unidad, para poder registrar "2 rebanadas" en vez de gramos.

## 1.21 · 2026-10-21
- **Buscar producto:** al crear un alimento nuevo (Etiqueta, registro o receta) puedes buscar por **nombre** (ej. "gotas chocolate hacendado") o por **código de barras** en Open Food Facts, una base de datos abierta con muchos productos de supermercado. Eliges el producto y se rellena el formulario; tú confirmas antes de guardar. Se guarda en tu lista de alimentos.
- **Escáner de código de barras** con la cámara, en los navegadores que lo permiten; si no, se escribe el número.
- **Avisos de calidad:** al ser una base colaborativa, la app avisa si faltan datos, si hay valores imposibles (por ejemplo, más de 100 g por 100 g) o si las calorías no cuadran con los macros.
- La búsqueda pasa por una Edge Function de Supabase (`find-product`), no necesita ninguna clave y solo funciona con tu cuenta. Datos: Open Food Facts (ODbL).

## 1.20 · 2026-10-21
- La pantalla de registro queda más corta: **foto y nota** pasan a un enlace plegable "+ Más opciones (foto, nota)" (se abre solo si ya tienen contenido), y se **quita la casilla "Guardar como mi receta"** (para eso están "Repetir algo reciente" y "Crear receta nueva").

## 1.19 · 2026-10-20
- **Sinónimos en la búsqueda:** escribes "banano" y aparece "Plátano"; "papa" encuentra "Patata", "maní" encuentra "Cacahuete", "durazno" el "Melocotón", "frijoles" las "Alubias", "jugo" el "Zumo", "torta" el "Bizcocho", etc. Funciona al buscar alimentos, ingredientes y recetas, y también en el aviso de alimentos parecidos y al importar recetas.
- **Otros nombres:** en la ficha de cada alimento (Alimentación → Alimentos) hay un campo para añadir los nombres con los que tú lo buscas (por ejemplo "guineo").
- La búsqueda ignora palabras descriptivas como "maduro": "banano maduro" encuentra el plátano.

## 1.18 · 2026-10-20
- **Crear una receta desde el registro:** en la pestaña Recetas de "Nuevo registro" hay un botón "+ Crear receta nueva" (con lo que buscaste como nombre). Al guardarla vuelves al registro con esa receta ya elegida.
- **Crear un ingrediente que falta al crear una receta:** al añadir un ingrediente, "+ Crear alimento nuevo" abre el mismo formulario que Etiqueta; el alimento se guarda y se añade a la receta.
- El formulario de alimento nuevo es el mismo en todos los sitios (registro, receta y Etiqueta).

## 1.17 · 2026-10-19
- **Importar receta desde una foto o PDF** (Alimentación → Recetas → "Importar receta desde foto o PDF"): la app lee los ingredientes, las raciones, el método y los pasos, los enlaza con tus alimentos, convierte las cantidades a tus medidas (huevos, cucharadas…) y abre el editor para que **revises y confirmes** antes de guardar. Lo que no encuentra en tus alimentos o no tiene cantidad se lista aparte.
- La lectura usa una Edge Function de Supabase (`read-recipe`) con la API de Claude. Requiere el secreto `ANTHROPIC_API_KEY` en Supabase y solo funciona con tu cuenta. El archivo no se guarda.

## 1.16 · 2026-10-19
- **Registrar por fracción:** una receta con 1 ración se trata como "el total". Al registrarla aparecen botones ⅛ · ¼ · ⅓ · ½ · 1 · 1,5 · 2 (y el campo libre) para decir qué parte comiste, sin tener que decidir en cuántas raciones se corta.
- El editor de recetas explica que, si no sabes cuántas raciones salen, dejes 1.

## 1.15 · 2026-10-19
- **Editar y duplicar recetas** (Alimentación → Recetas → abrir una receta). Al guardar como nueva o duplicar, avisa de las recetas parecidas que ya tienes para evitar tener varias casi iguales. Editar no cambia tus registros anteriores.
- **Método de cocción** en cada receta (horno, sartén, microondas, olla, plancha, sin cocinar) y **peso total de lo preparado** (opcional).
- **Registrar por peso:** en una receta puedes elegir "Por peso" y escribir cuánto pesó lo que comiste; la app calcula las raciones. Si no pesaste el total, lo estima solo en horno (−10 % por el agua que pierde al hornear), microondas (−15 %) y sin cocinar, y lo marca como estimado.
- Al registrar, las líneas se llaman **"Lo que comiste"** y **"+ Añadir alimento"**; "Ingredientes" queda solo para las recetas.

## 1.14 · 2026-10-19
- **Raciones a medida:** junto a los botones 0,5 · 1 · 1,5 · 2 hay un campo para escribir cualquier cantidad (por ejemplo 0,25 o 3).

## 1.13 · 2026-10-18
- **Nueva receta** (Alimentación → Recetas → "+ Nueva"): escribes los ingredientes de **toda** la preparación (por ejemplo, el pastel entero) y cuántas raciones salen; la app calcula calorías y proteína de toda la receta y de cada ración. Después, al registrar, eliges 0,5, 1, 1,5 o 2 raciones.
- Las recetas indican cuántas raciones rinden y sus ingredientes se muestran por ración.
- El editor de ingredientes se comparte entre registrar y crear receta.

## 1.12 · 2026-10-18
- **Un solo significado para "Comida":** queda únicamente como momento del día (Desayuno · Comida · Cena · Extras). Para cualquier cosa que apuntas se usa **registro**: el botón principal es "Registrar lo que comí", la ventana se llama "Nuevo registro" / "Editar registro" / "Completar registro", y los avisos hablan de "tus registros anteriores".

## 1.11 · 2026-10-18
- **Deshabilitar desde la lista de Añadir comida:** cada alimento tiene un botón "Deshabilitar" a su derecha (con confirmación), para quitar un duplicado justo donde lo ves, sin salir de la ventana.

## 1.10 · 2026-10-18
- **Deshabilitar alimentos:** un alimento deshabilitado deja de salir en las búsquedas y en el aviso de parecidos, pero tus comidas anteriores y tus recetas siguen igual y se puede volver a habilitar (sección "Deshabilitados" en Alimentos). Antes, borrar un alimento hacía que al editar una comida antigua ese ingrediente desapareciera.
- **Borrar definitivamente** solo aparece si el alimento nunca se usó en una comida ni en una receta. La ficha indica en cuántas se usó.

## 1.9 · 2026-10-18
- **Aviso de alimentos parecidos:** al crear un alimento nuevo (desde Añadir comida o desde Alimentos), si ya existe uno con una palabra clave en común (por ejemplo "muslo"), te los enseña con sus valores para que uses el que ya tienes. Evita tener el mismo alimento dos veces con números distintos.
- El botón pasa a decir "Crear de todos modos" cuando hay parecidos.

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
