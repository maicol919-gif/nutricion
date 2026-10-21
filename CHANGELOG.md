# Historial de versiones

Formato: `mayor.menor`. Para publicar una versión: sube `version` en `package.json`, añade una entrada aquí, compila y sube `dist` a `gh-pages`.

## 1.46 · 2026-10-21
- **Sueño** (Mi día): anota la **noche** y las **siestas** con hora de dormir, hora de despertar y cómo descansaste (1-5, opcional). Se guarda en el día en que te despiertas; una noche que cruza la medianoche empieza el día anterior. Muestra el total de 24 h (noche más siestas). Tabla `sleep_log` y vista `v_sleep_daily` para Vértice.

## 1.45.1 · 2026-10-21
- **«Me quedan…» selecciona el número al abrirse:** el campo traía la cantidad anterior y lo que escribías se pegaba a ella (de ahí cifras absurdas como 133.210 g de huevos).

## 1.45 · 2026-10-21
- **En casa cuenta por piezas lo que se cuenta por piezas:** los huevos (y todo alimento con peso de unidad) se muestran, se añaden y se corrigen en unidades («2 huevos (110 g)»); la app lo pasa a gramos por dentro. Antes «Me quedan 4» se tomaba como 4 g y al añadir se sumaba en vez de sustituir.

## 1.44 · 2026-10-21
- **Nevera y congelador muestra cuánto queda:** si el producto lleva cantidad, sale junto al nombre (ej. «Arroz cocido · 325 g»). Los nombres ya no llevan cantidades escritas (se limpiaron los existentes).

## 1.43 · 2026-10-21
- **Cafeína de todo:** los alimentos pueden llevar cafeína (`caffeine_mg` por 100 g, aproximada) y la suma del día incluye lo que comes: el café con leche (≈ 45 mg por 100 g, unos 90 mg la taza), la cola, el chocolate. Sale en la tarjeta de Suplementos como "en tus comidas", a la hora en que registraste la comida, sin anotarla dos veces.

## 1.42 · 2026-10-21
- **Suplementos y medicación** (Mi día): anota lo que no es comida (pre-entreno, antigripales…) con dosis, **cafeína en mg** y hora. Muestra la cafeína del día frente al límite orientativo de la EFSA (400 mg al día, 200 mg de una vez) y cuánta quedaría a las 23:30 (vida media de 5 h, aproximado). "Repetir" vuelve a anotar con un toque lo último que tomaste. Tabla `supplement_log`.

## 1.41 · 2026-10-21
- **¿Qué como ahora? reparte mejor lo que falta del día:** cada comida tiene un **tope de 800 kcal y 45 g de proteína** (antes la cena podía tocar 67 g si solo quedaba ella), y se cuentan solo las comidas que **aún no has registrado hoy**. Lo que sobra queda para lo siguiente y para los extras.
- **Extras** ya no propone comidas normales: es para lo que se sale de las comidas (postres, antojos, comer fuera). Enseña **tus extras de siempre** (los que registraste) y cuántas calorías te caben después de lo que te queda por comer.

## 1.40 · 2026-10-21
- **¿Qué como ahora? con tus platos de siempre:** arriba salen los platos que ya has comido (de tus registros de los últimos 28 días, en un momento parecido), repetibles con lo que hay en casa y escalados a lo que te toca (entre la mitad y una vez y media de la última vez). Después, las recetas y lo armado.
- **Me gusta / No me apetece** en cada propuesta (tabla `dish_feedback`): lo que no te apetece deja de salir y lo que te gusta sube. Tocar otra vez quita el voto.
- Al registrar un plato de siempre, se abre con su nombre y gramos ya puestos.

## 1.39 · 2026-10-21
- Comidas armadas con más sentido: los **fiambres** (york, pavo, jamón) solo acompañan, **máximo 60 g**, y no hacen de proteína principal si hay otra; la **avena** solo en desayuno o extras (no en comida ni cena) y el desayuno no lleva arroz ni verdura.

## 1.38 · 2026-10-21
- **¿Qué como ahora?** ya no depende solo de las recetas: si hay alimentos en casa, **arma comidas** con una proteína, una verdura y un hidrato (por ejemplo, solo arroz y huevo), con cantidades que acercan las calorías y la proteína a lo que te toca en ese momento. Respeta lo que queda en casa y un máximo de 2 huevos. Avisa si pasa de calorías o si le falta proteína. El botón **Registrar** abre el registro con esos alimentos y gramos ya puestos.

## 1.37 · 2026-10-21
- **Guardar la compra en casa** (Compra): con lo que llevas en el carro, pides el peso de lo que viene en paquete y el lugar (nevera, congelador o despensa, con uno por defecto según la zona) y se pasa a **En casa**. Si ya había ese alimento con cantidad, se suma; si quedaba poco o no llevaba cantidad, se repone. Después se vacía el carro.

## 1.36 · 2026-10-21
- **¿Qué como ahora?** (Mi día, solo hoy): enseña hasta 5 recetas que puedes hacer con lo que hay en casa (con cantidad: que alcance para una ración), ordenadas por lo que encajan con lo que te falta del día en el momento elegido. El reparto del día es orientativo: desayuno 25 %, comida 35 %, cena 30 %, extras 10 %. Avisa de las que traen mucha caloría de golpe (≥ 800 kcal), poca proteína para una comida principal (< 25 g) o más calorías de las que te tocan. Cada una tiene el botón **Registrar**.

## 1.35 · 2026-10-21
- **Compra, pensada para el mercado:** eliges **Fresca (8 días)** o **Grande (15 días)** y propone qué comprar según lo que consumes (tus comidas de los últimos 28 días, mínimo 7 días de periodo) menos lo que hay en casa. Marcas lo que metes al **carro** y puedes añadir cualquier otro alimento. Debajo, **Recetas que cubres** con lo que hay en casa y el carro: verde (ya puedes hacerla), amarillo (falta 1 o 2 alimentos, con botón para añadirlos) y gris (faltan varios).
- Se quita la selección manual de recetas de la versión anterior.

## 1.34 · 2026-10-21
- **En casa con cantidad:** lo que viene en paquete lleva gramos ("Cantidad en gramos" al añadir; "Me quedan…" para corregir). Al registrar una comida nueva, la app **descuenta** lo usado; cuando queda el 25 % o menos marca "Queda poco" y cuando llega a 0 desaparece. Lo que no lleva cantidad sigue con "Queda poco / Se acabó" y la pregunta "¿Se acabó algo?".
- **Compra** compra solo lo que falta: si necesitas 165 g y tienes 100 g, la lista pide 65 g.

## 1.33 · 2026-10-21
- Se quita el **plan de comidas** (tabla `meal_plan`, "Hoy toca" y la compra por plan): se decide qué comer en el momento, con lo que hay en casa y los macros del día. **Compra** vuelve a funcionar por recetas elegidas, sin lo que hay en casa y no queda poco.
- Las recetas del post pasan a la pestaña **Recetas** (marcadas "idea") y las recetas con 3 huevos bajan a 2.

## 1.32 · 2026-10-21
- **Plan de comidas** (tabla `meal_plan`): lo que está planificado para el día sale en **Mi día** como "Hoy toca", con un botón para registrarlo en su momento.
- **Compra** ahora sale del plan de las próximas 2 semanas, en **dos compras** (ahora, y lo fresco de la segunda semana a mitad de ciclo), sin lo que hay en casa y no queda poco. Avisa si una receta se repite más de 2 veces. Se pueden añadir recetas sueltas aparte.

## 1.31 · 2026-10-21
- Al guardar una comida, si usaste algo que tienes anotado en **En casa**, aparece **"¿Se acabó algo?"** con "Queda poco", "Se acabó" y "No, nada".

## 1.30 · 2026-10-21
- **Compra** (pestaña nueva): eliges recetas y sale la lista del súper con los gramos sumados por producto y agrupada por zona. Lo que ya tienes en **En casa** va aparte, en "Ya en casa". Las marcas de comprado se guardan en el móvil.

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
