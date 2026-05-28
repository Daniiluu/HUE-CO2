<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CartasSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('opciones_respuesta')->truncate();
        DB::table('preguntas')->truncate();
        DB::table('cartas')->truncate();
        DB::table('anillos')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // ─── ANILLOS ───────────────────────────────────────────────────────────
        $anillosData = [
            ['nombre' => 'Agua', 'orden' => 1],
            ['nombre' => 'Energía', 'orden' => 2],
            ['nombre' => 'Plástico', 'orden' => 3],
            ['nombre' => 'Pantallas', 'orden' => 4],
            ['nombre' => 'Ropa', 'orden' => 5],
        ];
        foreach ($anillosData as $a) {
            DB::table('anillos')->insert(array_merge($a, ['created_at' => now(), 'updated_at' => now()]));
        }

        // Leer los IDs reales recién insertados, en orden
        $anilloIds = DB::table('anillos')->orderBy('orden')->pluck('anillo_id')->toArray();

        // ─── PREGUNTAS POR ANILLO ──────────────────────────────────────────────
        // Cada anillo tiene 12 preguntas de las cuales 5 son Crisis Climáticas Extremas
        $contenido = [
            // ANILLO 1 – AGUA
            [
                [
                    'texto' => 'Megasequía Histórica (Acuíferos al Límite)',
                    'texto_pregunta' => 'Una sequía persistente reduce las reservas subterráneas a mínimos críticos. Para valorar la gravedad, ¿qué porcentaje aproximado de toda el agua de la Tierra es agua dulce disponible para el consumo humano?',
                    'tipo_pregunta' => 'slider',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'rango_min' => 0,
                    'rango_max' => 100,
                    'unidad' => '%',
                    'opciones' => [['1', true]]
                ],
                [
                    'texto' => 'Alerta por Estrés Hídrico Urbano',
                    'texto_pregunta' => 'Las grandes metrópolis declaran el "Día Cero" y se preparan para cortar el suministro de agua corriente por falta de reservas. ¿Cuál de estas prácticas en el hogar tiene el mayor impacto directo para ahorrar agua dulce?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Bañarse en vez de ducharse', false], ['Cerrar el grifo al cepillarse los dientes', true], ['Regar el jardín a pleno mediodía', false], ['Lavar la ropa a máquina a 90°C', false]]
                ],
                [
                    'texto' => 'Colapso Alimentario por Sequía Agrícola',
                    'texto_pregunta' => 'La falta prolongada de lluvias destruye campos enteros de cultivo, amenazando la soberanía alimentaria del país. ¿Qué actividad humana es la responsable de consumir la mayor proporción de agua dulce a nivel global?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Industria pesada', false], ['Uso doméstico e higiene', false], ['Agricultura y riego', true], ['Generación y refrigeración eléctrica', false]]
                ],
                [
                    'texto' => 'Desierto en Zonas de Pastoreo',
                    'texto_pregunta' => 'La ganadería intensiva seca ríos completos para mantener la producción cárnica, acelerando la desertificación del suelo. ¿Cuántos litros de agua dulce se necesitan aproximadamente para producir tan solo 1 kg de carne de vacuno?',
                    'tipo_pregunta' => 'slider',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'rango_min' => 9000,
                    'rango_max' => 20000,
                    'unidad' => ' L',
                    'opciones' => [['15000', true]]
                ],
                [
                    'texto' => '¿Qué tecnología de riego es más eficiente en el uso de agua?',
                    'tipo_pregunta' => 'options',
                    'opciones' => [['Aspersión', false], ['Inundación', false], ['Goteo', true], ['Pulverización aérea', false]]
                ],
                [
                    'texto' => 'Contaminación Crítica de Cuencas Fluviales',
                    'texto_pregunta' => 'Vertidos industriales y agrícolas incontrolados contaminan el principal río de la región, dejándolo inservible. ¿Cuál es la principal fuente de contaminación química que destruye el agua dulce global?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Lluvia ácida natural', false], ['Residuos industriales y escorrentía agrícola', true], ['Turismo en ríos y lagos', false], ['Actividades de pesca excesiva', false]]
                ],
                [
                    'texto' => "¿Cuántos litros de agua ahorra al mes quien se ducha 5 minutos en vez de 15?",
                    'texto_pregunta' => 'Pones una canción de 5 minutos y cuando acaba, sales. Tu hermano se ducha 15 minutos cada día. La ducha gasta unos 10 litros por minuto.',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['1000 litros', false],
                        ['5000 litros', false],
                        ['3.000 litros', true],
                        ['4200 litros', false]
                    ],
                    'explicacion' => '10 minutos menos × 10 litros/min × 30 días = 3.000 litros al mes. Eso equivale a unas 15 bañeras llenas. Menos agua caliente también significa menos energía consumida para calentar el agua, reduciendo la huella de carbono. Un gesto simple con un impacto doble',
                    'dinamica_grupo' => 'Haced una encuesta rápida: ¿cuánto duráis en la ducha? Cada uno dice un número. Calculad la media del grupo y cuántos litros ahorraría todo el grupo si redujera 3 minutos su ducha diaria.',
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Cuántos litros de agua se necesitan aproximadamente para fabricar un par de vaqueros de algodón?",
                    'texto_pregunta' => 'Estás en una tienda y ves unos vaqueros nuevos muy baratos. El cartel dice \"OFERTA: 15 €\". Tu amigo te dice: \"¡Están tirados! Cómpralos.\" Tú recuerdas que has leído algo sobre el agua que gasta fabricar ropa.',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['50-100 litros', false],
                        ['500-1000 litros', false],
                        ['7.000–10.000 litros', true],
                        ['200-750 litros', false]
                    ],
                    'explicacion' => 'Producir un par de vaqueros consume entre 7.000 y 10.000 litros de agua, equivalente a lo que una persona bebe en 7 años. Esto se debe al cultivo del algodón, los tintes y el lavado industrial. Comprar menos ropa, ropa de segunda mano o intercambiarla reduce drásticamente este gasto hídrico',
                    'dinamica_grupo' => '¿Cuántos pares de vaqueros tiene cada uno? Multiplicad por 7.500 litros. ¿Cuánta agua "lleva" el guardarropa de todo el grupo? Reflexionad en voz alta.',
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Cuántos litros ahorra al año quien cierra el grifo al cepillarse los dientes (2 veces/día)?",
                    'texto_pregunta' => 'Te lavas los dientes con el grifo abierto durante 2 minutos, dos veces al día. Tu vecina lo cierra mientras se cepilla. El grifo típico suelta unos 6 litros por minuto. Al año suponen 8.760 L',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['4.380 litros', true],
                        ['1.420 litros', false],
                        ['3690 litros', false],
                        ['2524 litros', false]
                    ],
                    'explicacion' => '2 min × 6 L/min × 2 veces × 365 días = 8.760 litros/año que se gastan con el grifo abierto. Cerrándolo se ahorran esos 8.760 L (aquí redondeamos a los 4.380 L que corresponden a un solo cepillado). Además, si el agua era caliente, también se ahorra energía. Un gesto de 0 € con gran impacto.',
                    'dinamica_grupo' => '¿Quién cierra el grifo al lavarse los dientes? Levantad la mano. Los que no lo hacen: ¿a partir de hoy lo haréis? Haced un pacto de grupo visible en el chat o en la pizarra.',
                    'tiempo_dinamica' => 120, // 2 min
                ],
                [
                    'texto' => "¿Cuántos litros de agua se necesitan para producir 1 litro de agua embotellada (incluyendo la fabricación del plástico)?",
                    'texto_pregunta' => 'En casa de tu amigo solo beben agua embotellada "porque está más rica". En tu casa bebéis agua del grifo filtrada con un jarro. Alguien del grupo dice que el agua embotellada es más sostenible "porque viene en botellas pequeñas".',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['1 litro (lo mismo)', false],
                        ['hasta 2 litros', false],
                        ['menos de 1 litro', false],
                        ['hasta 7 litros', true]
                    ],
                    'explicacion' => 'Producir una botella de plástico PET de 1 litro consume hasta 7 litros de agua en total (extracción de petróleo, fabricación del plástico, transporte). El agua del grifo en España es apta para el consumo en la mayoría de localidades y su huella hídrica es hasta 100 veces menor. Un filtro de jarro cuesta unos 20 € al año.',
                    'dinamica_grupo' => '¿Quién bebe agua del grifo en casa? ¿Quién embotellada? Debatid: ¿qué necesitáis saber para cambiar el hábito? ¿Es un problema de sabor, de costumbre o de información?',
                    'tiempo_dinamica' => 120, // 2 min
                ],
                [
                    'texto' => "¿Por qué el streaming o el uso de internet consume agua indirectamente?",
                    'texto_pregunta' => 'Estás viendo una serie en streaming durante 3 horas seguidas. Un amigo te dice que eso también gasta agua, no solo electricidad.',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Porque los cables submarinos necesitan estar mojados', false],
                        ['Porque los centros de datos usan agua para refrigerarse', true],
                        ['Porque tu pantalla emite vapor de agua', false],
                        ['El streaming no tiene ninguna relación con el agua', false]
                    ],
                    'explicacion' => 'Los centros de datos que alojan series, redes sociales y aplicaciones consumen millones de litros de agua para mantener sus servidores fríos. Además, generar la electricidad que los alimenta requiere agua en centrales térmicas e hidroeléctricas. Ver contenido en calidad más baja, descargar en lugar de hacer streaming continuo o desconectar lo que no se usa reduce la huella digital.',
                    'dinamica_grupo' => '¿Cuántas horas al día consumís streaming (series, YouTube, TikTok, música)? Cada uno dice su número. Sumadlo y reflexionad: ¿podríais reducir 30 minutos? ¿En qué lo invertiríais?',
                    'tiempo_dinamica' => 180, // 3 min
                ],
                [
                    'texto' => "¿Qué combinación de hábitos matutinos tiene la menor huella ecológica?",
                    'texto_pregunta' => 'Imagina que tienes que diseñar el día más sostenible posible desde que te levantas hasta que te acuestas. Ducha, ropa, comida, móvil, estudio…',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Ducha de 15 min, ropa nueva de algodón, café en cápsula, móvil en carga toda la noche', false],
                        ['Ducha de 5 min, ropa de segunda mano o reutilizada, café en cafetera de émbolo, móvil desenchufado al 80 %', true],
                        ['No ducharse, llevar ropa sintética, café instantáneo en botella de plástico, móvil en modo avión', false],
                        ['Baño de bañera, ropa de lino nuevo, zumo en tetrabrik, móvil apagado', false]
                    ],
                    'explicacion' => "Cada micro-decisión del día suma: la ducha corta ahorra agua y energía; la ropa de segunda mano evita producción; la cafetera de émbolo no genera residuos de cápsulas; desconectar el cargador evita el vampiro eléctrico. Ninguna de estas acciones requiere dinero extra ni grandes sacrificios. La sostenibilidad no es heroísmo, es acumulación de decisiones inteligentes",
                    'dinamica_grupo' => "Cada participante diseña su 'mañana más sostenible posible' en 3 pasos concretos. Los comparten en el chat o en voz alta. El grupo vota cuál es el plan más original y realista a la vez.",
                    'tiempo_dinamica' => 120,
                ],
            ],
            // ANILLO 2 – ENERGÍA
            [
                [
                    'texto' => 'Tormentas Extremas por Calentamiento Atmosférico',
                    'texto_pregunta' => 'El exceso de CO₂ en la atmósfera calienta los océanos, desatando huracanes y ciclones de fuerza destructiva histórica en las costas. ¿Cuál de estas fuentes produce la menor cantidad de CO₂ equivalente en todo su ciclo de vida?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Carbón convencional', false], ['Gas natural de ciclo combinado', false], ['Energía nuclear', false], ['Energía solar fotovoltaica', true]]
                ],
                [
                    'texto' => '¿Qué país genera más electricidad a partir de energía eólica en proporción?',
                    'tipo_pregunta' => 'options',
                    'opciones' => [['China', false], ['Alemania', false], ['Dinamarca', true], ['EE.UU.', false]]
                ],
                [
                    'texto' => 'Sopa de Carbón (Emergencia Atmosférica)',
                    'texto_pregunta' => 'El desabastecimiento obliga a activar centrales de carbón obsoletas que cubren la ciudad con una espesa niebla altamente tóxica. ¿Cuánto CO₂ emite una central térmica de carbón por cada kWh de electricidad producido?',
                    'tipo_pregunta' => 'slider',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'rango_min' => 100,
                    'rango_max' => 1500,
                    'unidad' => ' g',
                    'opciones' => [['820', true]]
                ],
                [
                    'texto' => '¿Qué porcentaje de la energía mundial proviene de renovables (2023)?',
                    'tipo_pregunta' => 'options',
                    'opciones' => [['5%', false], ['15%', false], ['30%', true], ['60%', false]]
                ],
                [
                    'texto' => '¿Cuál es la principal ventaja de la energía mareomotriz?',
                    'tipo_pregunta' => 'options',
                    'opciones' => [['Es barata', false], ['Es predecible y constante', true], ['No necesita infraestructura', false], ['Funciona en cualquier lugar', false]]
                ],
                [
                    'texto' => 'Explica qué significa "eficiencia energética" y pon un ejemplo práctico de tu vida cotidiana.',
                    'tipo_pregunta' => 'free',
                    'opciones' => []
                ],
                [
                    'texto' => 'Apagón General (Sobrecarga de Red)',
                    'texto_pregunta' => "En tu salón hay 6 aparatos en modo standby: televisor, consola, router, cargador de móvil, microondas y altavoz. Tu padre dice que \"en standby no gastan\". Una ola de calor masiva dispara el uso de aire acondicionado y sobrecarga la red de distribución eléctrica nacional.\n\n¿Qué ocurre realmente cuando un aparato está en modo standby durante esta crisis?",
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [
                        ['No consume nada de electricidad si no se enciende la pantalla', false],
                        ['Consume una pequeña cantidad de energía de forma continua, sumando un gasto y una carga significativos al año', true],
                        ['Se recarga internamente para cuando decidas encenderlo', false],
                        ['Solo consume energía si se conecta a una red wifi', false]
                    ],
                    'explicacion' => 'El consumo en standby puede representar hasta el 10 % de la factura eléctrica de un hogar. 6 aparatos en standby durante un año equivalen a unos 50-100 kWh, lo que genera varios kilos de CO₂. Apagarlos de la regleta o desenchufarlos es gratis y reduce la huella energética al instante.',
                    'dinamica_grupo' => 'Cada participante cuenta cuántos aparatos tiene en standby en su habitación ahora mismo. ¿Quién tiene más? ¿Quién menos? Proponed una medida concreta para reducirlos esta semana.',
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => 'Degradación Acelerada de Dispositivos',
                    'texto_pregunta' => "Dejas el móvil cargando toda la noche, aunque se llena al 100 % en 2 horas. Tu amiga lo desenchufa cuando llega al máximo. Las altas temperaturas veraniegas degradan las celdas de litio de millones de teléfonos, acortando su vida útil.\n\n¿Qué consecuencias tiene cargar el móvil más horas de las necesarias?",
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [
                        ['Ninguna, los cargadores modernos desconectan totalmente el flujo', false],
                        ['Gasta energía en forma de calor y degrada la batería de forma prematura', true],
                        ['Optimiza el rendimiento del procesador de última generación', false],
                        ['Solo afecta de manera negativa si el cable no es oficial de la marca', false]
                    ],
                    'explicacion' => 'Aunque muchos cargadores modernos reducen el flujo, siguen consumiendo energía residual durante horas (el "vampiro eléctrico"). Además, las baterías de litio degradan su capacidad si se mantienen al 100 % durante mucho tiempo. Una batería deteriorada obliga a cambiar antes el dispositivo, generando más residuos electrónicos y más plástico.',
                    'dinamica_grupo' => '¿Quién carga el móvil por la noche? ¿Quién lo desenchufa cuando está lleno? Proponed una solución práctica: un temporizador, una alarma, un enchufe inteligente. ¿Cuál es más realista para vosotros?',
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => 'Ciclo Térmico Excesivo (Lavados Calientes)',
                    'texto_pregunta' => "Tu madre lava la ropa siempre a 60 °C \"para que quede limpia de verdad\". Tú lees que lavar a 30 °C ahorra mucha energía y que la mayoría de detergentes modernos funcionan bien en frío. El uso ineficiente de calentadores de agua domésticos satura la huella de carbono de los hogares.\n\n¿Cuánta energía se ahorra aproximadamente lavando la ropa a 30°C en vez de a 60°C?",
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [
                        ['Aproximadamente un 5 %', false],
                        ['Un 20 % de ahorro total', false],
                        ['Hasta un 60 % de energía de calentamiento', true],
                        ['No hay ninguna diferencia real en el consumo del electrodoméstico', false]
                    ],
                    'explicacion' => 'El 90 % de la energía que consume una lavadora se destina a calentar el agua. Bajar de 60 °C a 30 °C puede reducir el consumo energético hasta un 60 %. Además, el agua caliente desgasta más las fibras de la ropa, haciendo que se estropee antes y haya que comprar más. Lavar en frío es mejor para la ropa, el bolsillo y el planeta.',
                    'dinamica_grupo' => '¿A qué temperatura se lava en vuestras casas? Haced un sondeo rápido. Luego proponed cómo convencer a vuestros familiares de bajar la temperatura de lavado. ¿Qué argumento usaríais primero: el económico o el ecológico?',
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Qué afirmación es correcta sobre las bombillas LED encendidas innecesariamente?",
                    'texto_pregunta' => 'Sales de tu habitación y dejas la luz encendida. Son las 3 de la tarde y entra mucha luz natural. Tu compañero de piso dice que "una bombilla LED no gasta casi nada".',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Las LEDs no consumen nada si son de bajo consumo', false],
                        ['Aunque consumen poco individualmente, dejar muchas encendidas innecesariamente suma un gasto real de energía y emisiones', true],
                        ['La luz natural gasta más que una LED', false],
                        ['Da igual, porque en España la electricidad es renovable al 100 %', false]
                    ],
                    'explicacion' => 'Una bombilla LED consume unos 8-10 W, pero si 10 habitaciones de un edificio la dejan encendida 4 horas extra al día, suman más de 100 kWh al mes. La generación de electricidad, aunque avanza hacia las renovables, sigue implicando recursos naturales. Apagar lo que no se usa es el primer paso y el más sencillo de la eficiencia energética. Menos consumo también implica menos necesidad de infraestructuras de generación que consumen agua.',
                    'dinamica_grupo' => '¿Cuántas luces hay encendidas ahora mismo en vuestra casa o aula que no son necesarias? Haced el recuento mentalmente y compartidlo. ¿Cuánta energía colectiva se podría ahorrar?',
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Qué alternativa reduce más la huella energética al secar la ropa?",
                    'texto_pregunta' => 'En invierno, tu familia usa la secadora cada vez que lava la ropa porque "el tendedero en casa moja el ambiente". Usáis la secadora 4 veces por semana.',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Usar la secadora en modo rápido a baja temperatura', false],
                        ['Tender la ropa al aire libre o en un tendedero interior ventilado siempre que sea posible', true],
                        ['Secar la ropa en el radiador con la calefacción al máximo', false],
                        ['Comprar ropa de secado rápido sintético', false]
                    ],
                    'explicacion' => 'Una secadora consume entre 1,5 y 3 kWh por ciclo. Usarla 4 veces/semana puede sumar más de 500 kWh al año, equivalente a lo que consume un frigorífico durante un año entero. Tender al aire es gratuito y también alarga la vida de las prendas, ya que el calor de la secadora desgasta las fibras. La opción C es peor: calienta el radiador innecesariamente y también desgasta la ropa.',
                    'dinamica_grupo' => '¿En vuestra casa hay secadora? ¿La usáis siempre o solo a veces? Proponed tres momentos concretos del año en los que podríais sustituirla por el tendedero. ¿Hay algún impedimento real o es solo costumbre?',
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Cuántas categorías de recursos se han visto afectadas en este proceso?",
                    'texto_pregunta' => 'Decides comprar una prenda de fast fashion online, pagarla con el móvil, que te la envíen a casa en 24 horas y lavarla cuando llegue. Sin saberlo, has activado una cadena de impactos.',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Solo ropa y transporte', false],
                        ['Ropa, agua, energía y datos digitales', true],
                        ['Solo electricidad y agua', false],
                        ['Solo el transporte y el plástico del embalaje', false]
                    ],
                    'explicacion' => 'Producir la prenda consume agua y energía. El pago y la gestión del pedido usan servidores que gastan energía y agua. El envío rápido implica vehículos (energía). El embalaje genera plásticos. Lavar la prenda gasta agua y energía y libera microfibras. Cada decisión de consumo activa una cadena invisible de recursos. Visibilizar esa cadena es el primer paso para cambiarla.',
                    'dinamica_grupo' => 'Tomad una compra reciente que hayáis hecho (ropa, comida, tecnología) y trazad juntos su "cadena de impacto" en 60 segundos. ¿Cuántos recursos aparecen? ¿Os sorprende? Compartidlo con el grupo.',
                    'tiempo_dinamica' => 120,
                ],
            ],
            // ANILLO 3 – PLÁSTICO
            [
                [
                    'texto' => 'Incendio en Vertedero de Plásticos',
                    'texto_pregunta' => 'Un vertedero ilegal de plásticos industriales arde en llamas, liberando nubes de gases sumamente tóxicos y CO₂. ¿Cuál de estos plásticos habituales es, por su composición química, el más fácil y seguro de reciclar?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Policloruro de vinilo (PVC)', false], ['Polietileno de baja densidad (LDPE)', false], ['Poliestireno (PS)', false], ['Tereftalato de polietileno (PET)', true]]
                ],
                [
                    'texto' => 'Siglos de Basura (Degradación Infinita)',
                    'texto_pregunta' => 'La acumulación desmedida de plásticos sintéticos obstruye cursos fluviales e invade campos agrícolas. ¿Cuánto tiempo estimado tarda en degradarse por completo una bolsa de plástico convencional en la naturaleza?',
                    'tipo_pregunta' => 'slider',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'rango_min' => 50,
                    'rango_max' => 500,
                    'unidad' => ' años',
                    'opciones' => [['150', true]]
                ],
                [
                    'texto' => '¿Qué son los microplásticos? Explica de dónde provienen y cuál es su impacto ecológico.',
                    'tipo_pregunta' => 'free',
                    'opciones' => []
                ],
                [
                    'texto' => 'Colapso de Ecosistemas por Microplásticos',
                    'texto_pregunta' => 'Los océanos se asfixian con la marea plástica, diezmando la fauna y filtrándose en la fauna marina. ¿Cuántos millones de toneladas de plásticos terminan flotando en el mar cada año?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['1 millón de toneladas', false], ['8 millones de toneladas', true], ['50 millones de toneladas', false], ['200 millones de toneladas', false]]
                ],
                [
                    'texto' => 'Marea de Aditivos Químicos en Envases',
                    'texto_pregunta' => 'Envases no regulados filtran aditivos sintéticos al medio ambiente acuático. ¿Qué número o código de símbolo de reciclaje universal indica que un plástico es de tipo PET?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Código de reciclaje 3', false], ['Código de reciclaje 5', false], ['Código de reciclaje 1', true], ['Código de reciclaje 7', false]]
                ],
                [
                    'texto' => 'Colapso del Sistema de Clasificación Óptica',
                    'texto_pregunta' => 'Los sensores ópticos de las plantas de reciclaje fallan en su tarea, obligando a enterrar toneladas de materiales utilizables. ¿Cuál es el principal reto técnico para reciclar el plástico de color negro?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Su fundición resulta demasiado costosa', false], ['Los sensores ópticos de infrarrojos no lo detectan', true], ['Es incapaz de derretirse de nuevo', false], ['Es altamente tóxico por sí mismo', false]]
                ],
                [
                    'texto' => '¿Cuál es la mejor decisión en este momento?',
                    'texto_pregunta' => 'Quedas con tus amigos en el parque. Tienes sed y el único chiringuito cercano solo vende agua en botellas de plástico de un solo uso. Tu compañero dice: "Total, es solo una botella."',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Comprar la botella, total ya estás allí', false],
                        ['Aguantar la sed hasta llegar a casa', false],
                        ['Llevar siempre una botella reutilizable en la mochila', true],
                        ['Comprar la botella y prometer reciclarla', false]
                    ],
                    'explicacion' => 'Una botella reutilizable de acero o vidrio puede usarse más de 500 veces, evitando la producción de plástico (que consume petróleo y emite CO₂) y la gestión de residuos. Si 10 amigos hacen lo mismo durante un año, evitan más de 3.600 botellas de plástico. Además, producir una botella de plástico de un solo uso requiere hasta 3 litros de agua 💧.',
                    'dinamica_grupo' => 'Cada participante dice en voz alta cuántas botellas de plástico usa a la semana. El grupo suma el total y calcula cuántas se ahorrarían en un mes si todos usaran botella reutilizable. ¿Cabe ese número en vuestra clase?',
                    'tiempo_dinamica' => 120, // 2 min
                ],
                [
                    'texto' => "¿Qué afirmación es correcta?",
                    'texto_pregunta' => "En clase de ciencias ves que fabricar 1 kg de plástico virgen consume aproximadamente 2 litros de agua solo en el proceso de enfriamiento. Tu profesora os pregunta: ¿Qué conexión hay entre el plástico y el agua?",
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['El plástico no tiene ninguna relación con el consumo de agua', false],
                        ['Fabricar plástico consume agua, por lo que reducir plástico también ahorra agua', true],
                        ['Reciclar plástico gasta más agua que fabricarlo nuevo', false],
                        ['El plástico proviene del agua de los océanos', false]
                    ],
                    'explicacion' => 'La producción de plástico virgen consume agua en refrigeración, limpieza y procesos químicos. Usar menos plástico (llevando tu propia bolsa, botella o tupper) reduce simultáneamente el consumo de petróleo, la emisión de CO₂ y el gasto hídrico. Una decisión de consumo arrastra múltiples beneficios ambientales.',
                    'dinamica_grupo' => 'Dividid el grupo en dos equipos. Equipo A defiende "reducir plástico solo afecta a los residuos". Equipo B defiende "reducir plástico también ahorra agua y energía". Cada equipo tiene 40 segundos. ¿Quién convence más?',
                    'tiempo_dinamica' => 120, // 2 min
                ],
                [
                    'texto' => "¿Qué debes hacer con el envase del yogur antes de reciclarlo?",
                    'texto_pregunta' => 'Acabas de comer un yogur. El envase tiene restos de yogur. Tu hermano dice que tirarlo al amarillo así está bien. Tu madre dice que hay que lavarlo antes.',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Tirarlo directamente al contenedor amarillo sin limpiarlo', false],
                        ['Aclararlo brevemente con agua para retirar los restos y luego reciclarlo', true],
                        ['Tirarlo a la basura orgánica porque tiene restos de alimento', false],
                        ['Dejarlo en el fregadero indefinidamente', false]
                    ],
                    'explicacion' => 'Los restos de alimento contaminan lotes enteros de reciclaje, haciendo que el plástico acabe en el vertedero igualmente. Un aclarado rápido (sin derrochar agua) garantiza que el envase sea realmente reciclado, ahorrando hasta un 70 % de energía respecto a fabricar plástico nuevo.',
                    'dinamica_grupo' => '¿Cuántos de vosotros lava los envases antes de reciclarlos? Levantad la mano. Debatid: ¿es un hábito fácil de adoptar? ¿Qué os lo impide?',
                    'tiempo_dinamica' => 120, // 2 min
                ],
                [
                    'texto' => "¿Qué porcentaje aproximado de la ropa mundial está fabricada con fibras sintéticas (plástico)?",
                    'texto_pregunta' => 'Lees en una revista que muchas prendas de ropa deportiva están hechas de poliéster, que en realidad es plástico. Tu amiga dice: "Pensaba que la ropa no tenía nada que ver con el plástico."',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Menos del 10 %', false],
                        ['Alrededor del 20 %', false],
                        ['Más del 60 %', true],
                        ['Exactamente el 50 %', false]
                    ],
                    'explicacion' => 'Más del 60 % de las prendas contienen fibras sintéticas derivadas del petróleo (poliéster, nailon, acrílico). Cada lavado libera microfibras plásticas al agua que llegan a los océanos. Elegir ropa de fibras naturales o de segunda mano reduce tanto el plástico como la contaminación hídrica',
                    'dinamica_grupo' => 'Mirad la etiqueta de la ropa que lleváis puesta ahora mismo. ¿Cuántos llevan poliéster? ¿Alguno lleva algodón o lana? Compartid los datos y calculad el porcentaje del grupo.',
                    'tiempo_dinamica' => 180, // 3 min
                ],
                [
                    'texto' => "¿Qué decisión tiene menor huella ecológica?",
                    'texto_pregunta' => "Tu móvil se ha roto. La pantalla está agrietada pero funciona bien. La tienda de reparación te dice que puede arreglarlo por 60 €. Un modelo nuevo cuesta 300 €. Tu primo te dice: \"Cómprate uno nuevo, total los móviles llevan plástico de todos modos.\"",
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Comprar un móvil nuevo de última generación', false],
                        ['Reparar el móvil actual', true],
                        ['Tirar el móvil roto a la papelera y pedir otro prestado', false],
                        ['Comprar un móvil de segunda mano de alta gama', false]
                    ],
                    'explicacion' => 'Fabricar un smartphone nuevo requiere más de 70 materiales diferentes, muchos de ellos plásticos y metales escasos que consumen enormes cantidades de agua en su extracción. Repararlo evita toda esa cadena de producción. La opción D también es buena, pero reparar es siempre mejor que sustituir.',
                    'dinamica_grupo' => '¿Cuántos de vosotros ha reparado alguna vez un dispositivo electrónico? ¿Y cuántos han comprado uno nuevo por un problema pequeño? Contad y reflexionad: ¿qué os animaría a reparar más?',
                    'tiempo_dinamica' => 120, // 2 min
                ],
                [
                    'texto' => "¿Cuál de estos cambios tiene el mayor impacto acumulado en el largo plazo si lo mantiene un adolescente durante toda su vida?",
                    'texto_pregunta' => 'Llegas al final del juego. Has aprendido que plástico, agua, energía, pantallas y ropa están conectados. Ahora tienes que elegir UN solo cambio de hábito que adoptarías a partir de hoy.',
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Apagar la luz al salir de una habitación', false],
                        ['No comprar ropa nueva durante 6 meses al año y optar por intercambio o segunda mano', true],
                        ['Reducir el tiempo de pantalla 15 minutos al día', false],
                        ['Reciclar siempre el plástico correctamente', false]
                    ],
                    'explicacion' => 'No comprar ropa nueva durante 6 meses tiene un impacto multiplicador: ahorra miles de litros de agua, evita emisiones de CO₂ equivalentes a no conducir un coche durante semanas, reduce plásticos en microfibras y disminuye la demanda de centros de datos de plataformas de e-commerce. Además, cambia un patrón de consumo estructural, no solo un gesto puntual. Las otras opciones son también muy valiosas, pero ninguna tiene ese efecto acumulado y sistémico.',
                    'dinamica_grupo' => 'Momento de compromiso final. Cada participante escribe en el chat o en un papel su UN cambio de hábito personal para las próximas 4 semanas. Leedlos en voz alta. El grupo puede "votar" cuál será más fácil de mantener y cuál el más difícil. Haced una foto del listado o guardadlo: en 4 semanas, ¿cuántos lo habréis cumplido?',
                    'tiempo_dinamica' => 120,
                ],
            ],
            // ANILLO 4 – PANTALLAS
            [
                [
                    'texto' => 'Sequía en Centros de Datos Urbanos',
                    'texto_pregunta' => 'Los macrocomplejos de servidores evaporan a diario millones de litros de agua dulce urbana para su refrigeración, dejando secos los hogares locales. ¿Por qué el funcionamiento de internet consume tanta energía y recursos físicos de climatización?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Los centros de datos se ubican lejos de los núcleos urbanos', false], ['Sus pantallas administrativas son gigantescas', false], ['Operación ininterrumpida de servidores y sistemas de refrigeración', true], ['Requieren una plantilla de mantenimiento enorme', false]]
                ],
                [
                    'texto' => 'Basura Tecnológica en el Tercer Mundo',
                    'texto_pregunta' => 'Millones de toneladas de pantallas y componentes electrónicos obsoletos y altamente tóxicos saturan vertederos de países del tercer mundo. ¿Qué se entiende por "obsolescencia programada"?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Un software especial para optimizar el rendimiento', false], ['El diseño de productos planificado deliberadamente para fallar pronto', true], ['Un marco legislativo para fomentar el reciclaje electrónico', false], ['Un estándar técnico internacional de seguridad industrial', false]]
                ],
                [
                    'texto' => '¿Cuál es la huella de carbono aproximada de fabricar un smartphone?',
                    'tipo_pregunta' => 'slider',
                    'rango_min' => 10,
                    'rango_max' => 150,
                    'unidad' => ' kg CO₂',
                    'opciones' => [['70', true]]
                ],
                [
                    'texto' => 'Extracción de Minerales de Sangre',
                    'texto_pregunta' => 'La minería ilegal en zonas en conflicto explota a trabajadores e inhabilita ecosistemas selváticos enteros para alimentar nuestra demanda electrónica. ¿Qué mineral crítico es vital para las baterías y genera estas guerras mineras?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Mineral de hierro convencional', false], ['Cobre electrolítico', false], ['Cobalto y coltán', true], ['Plata purificada', false]]
                ],
                [
                    'texto' => '¿Cuántos residuos electrónicos (e-waste) se generan al año a nivel global?',
                    'tipo_pregunta' => 'options',
                    'opciones' => [['10 Mt', false], ['53 Mt', true], ['200 Mt', false], ['5 Mt', false]]
                ],
                [
                    'texto' => 'Explica detalladamente qué acciones cotidianas realizas para alargar la vida útil de tus ordenadores o dispositivos.',
                    'tipo_pregunta' => 'free',
                    'opciones' => []
                ],
                [
                    'texto' => 'Servidores Hirviendo (Ola de Calor Digital)',
                    'texto_pregunta' => "Tienes la bandeja de entrada del correo con 4.000 emails sin leer, muchos con adjuntos. Tu amiga tiene su bandeja siempre ordenada y borra lo que no necesita. Le dices que \"los emails no contaminan\". Los grandes centros de servidores globales operan a temperaturas límite por el uso ininterrumpido del streaming y la nube.\n\n¿Por qué los emails almacenados en la nube tienen una huella ecológica?",
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [
                        ['Provoca vibraciones de alta frecuencia en la infraestructura terrestre', false],
                        ['Obliga a mantener activos servidores físicos que consumen refrigeración y energía 24/7', true],
                        ['Los correos electrónicos se autodegradan liberando calor químico', false],
                        ['Solo ocurre si el email posee un archivo de más de 10 MB adjunto', false]
                    ],
                    'explicacion' => "Cada email almacenado ocupa espacio en servidores físicos que funcionan 24/7 consumiendo electricidad y agua de refrigeración. Se estima que el sector digital global emite tanto CO₂ como la aviación. Borrar correos antiguos, desuscribirse de boletines innecesarios y limpiar la nube son actos de higiene digital con impacto real.",
                    'dinamica_grupo' => "Que cada uno abra su email o galería de fotos ahora mismo (si tiene el móvil). ¿Cuántos emails sin leer o fotos duplicadas tienen? Proponed un reto: borrar 50 archivos innecesarios hoy. ¿Quién se compromete?",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => 'Colapso de Redes por Spam y Tráfico Inútil',
                    'texto_pregunta' => "Estás viendo una serie en tu móvil mientras vas en el autobús. La plataforma te pregunta si quieres ver en calidad 4K, HD o SD. Eliges 4K \"porque queda mejor\". La masiva transmisión de datos sin valor genera una demanda energética y térmica que pone en riesgo de colapso a las infraestructuras de internet.\n\n¿Cuánta más energía consume transmitir vídeo en 4K respecto a SD (baja resolución)?",
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [
                        ['Gasta lo mismo, la resolución no afecta en absoluto a los servidores', false],
                        ['Un 10 % extra en el peor de los casos', false],
                        ['Multiplica hasta por 4 los datos enviados, elevando exponencialmente el calor y energía en la red', true],
                        ['Solo afecta al consumo de los receptores finales, no a la red global', false]
                    ],
                    'explicacion' => "El 4K transmite aproximadamente 4 veces más datos que el HD. Más datos significa más trabajo para los servidores y la red, lo que se traduce en más consumo de energía y agua de refrigeración. En una pantalla de móvil de 6 pulgadas, la diferencia visual es casi inapreciable. Elegir SD o HD en pantallas pequeñas es una decisión inteligente sin pérdida de experiencia.",
                    'dinamica_grupo' => "¿En qué calidad veis vídeos habitualmente? ¿Alguien ha cambiado ya a una calidad menor? Probad ahora mismo a cambiar la calidad en una app: ¿notáis diferencia en una pantalla pequeña? Compartid vuestra experiencia.",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Cuál de estas opciones tiene la menor huella ecológica?",
                    'texto_pregunta' => "Necesitas un móvil nuevo. Un amigo te ofrece su antiguo iPhone en perfecto estado por 150 €. En la tienda hay uno nuevo de gama media por 300 €. Tus padres dicen que 'lo nuevo es más fiable'.",
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Comprar el móvil nuevo de gama media', false],
                        ['Pedir uno a tus padres como regalo de cumpleaños', false],
                        ['Comprar el móvil de segunda mano', true],
                        ['Comprar el más caro porque dura más', false]
                    ],
                    'explicacion' => "El 80 % de la huella ecológica de un smartphone se genera durante su fabricación: extracción de minerales raros, procesado de plásticos, consumo de agua y energía. Comprar de segunda mano evita toda esa fase productiva. Además, es más barato. Un móvil reacondicionado puede funcionar igual que uno nuevo.",
                    'dinamica_grupo' => "¿Alguien ha comprado alguna vez un dispositivo de segunda mano o reacondicionado? ¿Cómo fue la experiencia? ¿Qué prejuicios tenéis sobre los productos de segunda mano? Listadlos y debatidlos rápidamente.",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Qué ocurre cuando guardas datos en la nube?",
                    'texto_pregunta' => "Subes 50 fotos a Instagram en un día. Tu primo te dice que 'las fotos en la nube no pesan nada'. Tú has leído algo sobre centros de datos y no estás de acuerdo.",
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Los datos flotan en el aire y no consumen recursos físicos', false],
                        ['Se almacenan en servidores físicos que consumen energía y agua continuamente', true],
                        ['Se comprimen automáticamente para no consumir recursos', false],
                        ['Solo consumen recursos cuando los consultas, no cuando los almacenas', false]
                    ],
                    'explicacion' => "'La nube' son miles de servidores físicos en enormes edificios que consumen cantidades masivas de electricidad y agua de refrigeración. Google, Meta y otros gigantes tecnológicos ya son responsables del 2-4 % de las emisiones globales de CO₂. Subir menos fotos duplicadas, limpiar la nube y desactivar copias de seguridad automáticas de archivos innecesarios reduce tu huella digital.",
                    'dinamica_grupo' => "¿Cuántas fotos tenéis en el móvil ahora mismo? ¿Cuántas están duplicadas o son de mala calidad? Reto: en los próximos 5 minutos (fuera del juego), borrad al menos 20 fotos que no necesitáis. ¿Quién acepta el reto?",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Qué efecto tienen las plataformas digitales y las redes sociales en el consumo de moda?",
                    'texto_pregunta' => "Ves en TikTok un vídeo de un influencer con una camiseta nueva. La buscas online y la encuentras en una web de fast fashion por 4 €. La compras por impulso junto con otras 3 prendas.",
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Ninguno, la gente compra lo mismo que antes de internet', false],
                        ['Reducen el consumo porque permiten comparar precios', false],
                        ['Estimulan el consumo impulsivo y aceleran los ciclos de la moda, aumentando la generación de residuos textiles', true],
                        ['Solo afectan a adolescentes mayores de 18 años', false]
                    ],
                    'explicacion' => "Las redes sociales han multiplicado el ritmo de la moda (de 2 temporadas al año a hasta 52 'microtemporadas'). Esto dispara la producción textil, que consume agua, energía y genera plásticos microplásticos en cada lavado. Antes de comprar una prenda por impulso, esperar 48 horas reduce el arrepentimiento y el impacto ambiental. El simple acto de pausar cambia el resultado.",
                    'dinamica_grupo' => "¿Cuántos de vosotros ha comprado ropa online por impulso tras verla en redes? Levantad la mano. ¿Seguís usándola? Haced el ejercicio mental: si cada miembro del grupo esperara 48 horas antes de comprar, ¿cuántas compras impulsivas se evitarían al mes?",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Cuál de las siguientes afirmaciones describe mejor el impacto ambiental de un uso intensivo de pantallas?",
                    'texto_pregunta' => "Pasas 6 horas al día en pantallas (móvil, tablet, portátil). Un amigo te dice que 'lo digital no contamina como lo físico'. Pero tú has aprendido que hay conexiones ocultas.",
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['El uso digital es completamente neutro en carbono', false],
                        ['Solo contamina si usas un dispositivo antiguo', false],
                        ['El uso intensivo de dispositivos aumenta el consumo energético, acelera el reemplazo de aparatos (más plástico y residuos), y alimenta centros de datos que consumen agua y energía', true],
                        ['El impacto solo es relevante para empresas, no para usuarios individuales', false]
                    ],
                    'explicacion' => 'Cada hora de pantalla contribuye al consumo de energía (dispositivo + red + servidores), y el uso intensivo deteriora antes la batería, llevando a sustituir el dispositivo más pronto (más plásticos y residuos electrónicos). Los centros de datos consumen millones de litros de agua al año. Reducir el tiempo de pantalla no es solo bueno para la salud mental: también lo es para el planeta.',
                    'dinamica_grupo' => '¿Cuántas horas de pantalla lleváis hoy? Usad el tiempo de uso del móvil (en Ajustes) si lo tenéis. ¿Cuál es la app que más tiempo os roba? ¿Podríais reducirla 20 minutos al día? ¿Qué haríais con ese tiempo?',
                    'tiempo_dinamica' => 120,
                ],
            ],
            // ANILLO 5 – ROPA
            [
                [
                    'texto' => '¿Por qué la moda rápida ("fast fashion") es tan contaminante?',
                    'tipo_pregunta' => 'options',
                    'opciones' => [['Produce poca ropa', false], ['Usa energía solar', false], ['Genera residuos y consume recursos masivamente', true], ['Emplea mucha mano de obra local', false]]
                ],
                [
                    'texto' => 'Sequía de Vaqueros en Cuencas de Algodón',
                    'texto_pregunta' => 'El cultivo intensivo de algodón de baja calidad seca lagos e inunda regiones en una salinidad yerma. ¿Cuántos litros de agua potable se consumen en la cadena para confeccionar tan solo un par de pantalones vaqueros?',
                    'tipo_pregunta' => 'slider',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'rango_min' => 1000,
                    'rango_max' => 10000,
                    'unidad' => ' L',
                    'opciones' => [['7500', true]]
                ],
                [
                    'texto' => '¿Cuál es la fibra natural con menor huella hídrica?',
                    'tipo_pregunta' => 'options',
                    'opciones' => [['Algodón convencional', false], ['Lana', false], ['Lino', true], ['Seda', false]]
                ],
                [
                    'texto' => '¿Qué porcentaje de las emisiones globales de CO₂ proviene de la industria textil?',
                    'tipo_pregunta' => 'slider',
                    'rango_min' => 1,
                    'rango_max' => 50,
                    'unidad' => '%',
                    'opciones' => [['10', true]]
                ],
                [
                    'texto' => '¿Qué significa "upcycling" en moda sostenible?',
                    'tipo_pregunta' => 'options',
                    'opciones' => [['Comprar ropa cara', false], ['Transformar ropa usada en algo de mayor valor', true], ['Reciclar hilos', false], ['Donar ropa', false]]
                ],
                [
                    'texto' => 'La Huella Gigante del E-commerce Textil',
                    'texto_pregunta' => 'Millones de camiones y aviones distribuyen devoluciones gratuitas de ropa express, colapsando el tráfico y disparando emisiones globales. ¿Qué país exporta actualmente la mayor parte del flujo de moda rápida mundial?',
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [['Bangladesh', false], ['India', false], ['China', true], ['Vietnam', false]]
                ],
                [
                    'texto' => 'La Montaña Textil del Desierto de Atacama',
                    'texto_pregunta' => "Tienes 60 prendas en el armario pero sientes que \"no tienes nada que ponerte\". Cada temporada compras entre 5 y 10 prendas nuevas y donas o tiras las viejas. Tu abuela dice que ella tenía 10 prendas y \"se las arreglaba perfectamente\". Millones de prendas sintéticas baratas e inútiles se acumulan en montañas gigantescas a cielo abierto en desiertos sudamericanos, liberando plásticos al suelo.\n\n¿Qué estrategia reduce más la huella ecológica de tu armario ante esta crisis?",
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [
                        ['Adquirir moda express únicamente en periodos de rebajas oficiales', false],
                        ['Donar la totalidad de tu ropa antigua para limpiar tu armario', false],
                        ['Comprar menos ropa, elegir mayor durabilidad y remendar los pequeños desperfectos', true],
                        ['Disminuir la cantidad de lavados semanales de tu calzado y ropa', false]
                    ],
                    'explicacion' => "La mejor prenda es la que ya tienes. Comprar menos reduce el consumo de agua (miles de litros por prenda), energía y materiales plásticos. Reparar un botón, coser una costura o llevar un abrigo al zapatero para cambiarle las suelas alarga la vida del producto y evita todo el ciclo de producción de uno nuevo. La durabilidad es el lujo sostenible.",
                    'dinamica_grupo' => "Haced un 'armario en voz alta': cada uno nombra la prenda que lleva más tiempo sin usar. ¿Por qué la conserváis? ¿Podría alguien del grupo usarla? Proponed un intercambio entre vosotros ahora mismo.",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Con qué frecuencia recomiendan lavar los pantalones vaqueros tipo 'jeans'?",
                    'texto_pregunta' => "Lavas los vaqueros después de cada uso \"por higiene\". Tu amigo los lava cada 3-4 usos si no están visiblemente sucios.",
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Después de cada uso', false],
                        ['Una vez por semana como máximo', false],
                        ['Solo cuando están realmente sucios, lo menos posible (cada 10 usos o más)', true],
                        ['Nunca, los vaqueros son autolimpiantes', false]
                    ],
                    'explicacion' => "Levi's recomienda lavar los vaqueros lo mínimo posible para conservar el color, la forma y la tela. Cada lavado consume agua, energía y libera microfibras de plástico al agua si son de mezcla sintética. Airear la prenda, usar spray antiolor y lavar solo cuando sea necesario puede multiplicar por 3 la vida del vaquero y reduce enormemente el impacto ambiental.",
                    'dinamica_grupo' => "¿Con qué frecuencia laváis los vaqueros? Sondeo rápido. ¿Alguien se ha sentido incómodo lavándolos menos? Debatid: ¿es un problema real de higiene o una costumbre cultural? ¿Dónde está el límite razonable?",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => 'Microfibras Sintéticas en Agua Potable',
                    'texto_pregunta' => "Lavas un polar sintético que compraste en una tienda de fast fashion. Tu madre dice que los polares son ecológicos \"porque se fabrican con plástico reciclado\". Cada lavado de prendas acrílicas y sintéticas vierte billones de partículas plásticas a las cañerías que burlan los filtros y terminan en nuestra comida.\n\n¿Qué daño directo provoca lavar fibras de poliéster?",
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [
                        ['Generan electricidad estática en el agua de salida', false],
                        ['Liberan millones de microfibras de plástico que llegan a ríos y mares por su diminuto diámetro', true],
                        ['Aumentan drásticamente los depósitos de cal del electrodoméstico', false],
                        ['Solo resultan contaminantes en ciclos de temperaturas superiores a 40 °C', false]
                    ],
                    'explicacion' => "Cada lavado de una prenda sintética libera hasta 700.000 microfibras plásticas que son tan pequeñas que pasan los filtros de las depuradoras y terminan en ríos y océanos. Los peces y mariscos las ingieren y acaban en nuestra cadena alimentaria. Usar bolsas de lavado anti-microfibras (como Guppyfriend), lavar en frío y reducir el número de lavados mitiga este problema.",
                    'dinamica_grupo' => "¿Cuántos de vosotros tiene prendas de poliéster o forro polar? Casi todos, ¿verdad? Buscad rápidamente en internet 'bolsa Guppyfriend': ¿qué es? ¿Cuánto cuesta? ¿La compraríais? Compartid la respuesta.",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Cuál de estas opciones tiene menor impacto ambiental global?",
                    'texto_pregunta' => "Una plataforma de intercambio de ropa online te propone intercambiar 3 prendas que ya no usas por otras 3 de otro usuario. Tu amiga prefiere pedir ropa nueva con entrega al día siguiente porque 'es más cómodo'.",
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Pedir ropa nueva con entrega express en 24 horas', false],
                        ['Intercambiar ropa online con otro usuario a través de una plataforma de segunda mano', true],
                        ['Comprar en tienda física de fast fashion', false],
                        ['Todas tienen el mismo impacto si se usa el mismo transporte', false]
                    ],
                    'explicacion' => "El intercambio de ropa evita la producción de prendas nuevas (agua, energía, plásticos). La entrega express implica camiones o furgonetas a medio llenar que emiten más CO₂ por paquete. Plataformas digitales de intercambio usan servidores, pero su huella es mucho menor que la producción textil. La mejor compra es la que evita producir algo nuevo.",
                    'dinamica_grupo' => "¿Conocéis alguna plataforma de intercambio o segunda mano? ¿Habéis usado alguna? Haced una lista rápida en la pizarra virtual o en el chat. ¿Qué os frena para usarlas más: el tiempo, la confianza o el desconocimiento?",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => "¿Por qué una camiseta de 3 € puede ser más cara de lo que parece?",
                    'texto_pregunta' => "Encuentras una camiseta de algodón por 3 € en una cadena de fast fashion. Te parece un chollo. Pero un compañero del juego dice: 'Si cuesta 3 €, algo no cuadra.'",
                    'tipo_pregunta' => 'options',
                    'opciones' => [
                        ['Automáticamente se desintegra y contamina', false],
                        ['Porque el algodón siempre es muy caro de producir', false],
                        ['Porque incluye impuestos ocultos', false],
                        ['La respuesta A y además implica condiciones laborales precarias y alto consumo de agua y energía en su producción', true]
                    ],
                    'explicacion' => "Una camiseta de algodón convencional consume unos 2.700 litros de agua y requiere pesticidas y fertilizantes cuya producción es muy energética. Si cuesta 3 €, el margen para pagar bien a trabajadores, usar materiales de calidad y gestionar residuos es prácticamente nulo. Comprar menos, pero mejor: una prenda de 30 € que dura 5 años es más barata (y sostenible) que 10 camisetas de 3 € que duran una temporada.",
                    'dinamica_grupo' => "Calculad el coste por uso de una camiseta barata vs. una cara. Si la barata dura 10 lavados y la cara 100, ¿cuál sale más económica al final? Haced el cálculo juntos. ¿Cambia vuestra perspectiva?",
                    'tiempo_dinamica' => 120,
                ],
                [
                    'texto' => 'Tintes Venenosos en el Río Citarum',
                    'texto_pregunta' => "Tienes una camiseta favorita que tiene un agujero pequeño en la manga. Puedes tirarla, donarla, venderla online o remendarla tú mismo. Gigantescas fábricas textiles vierten metales pesados y tintes ácidos sin depurar a ríos, envenenando el agua potable del grupo.\n\n¿Cómo ordenarías estas opciones de mayor a menor impacto ambiental positivo ante esta crisis?",
                    'tipo_pregunta' => 'options',
                    'tipo_carta' => 'evento',
                    'cambio_temp' => 0.4,
                    'opciones' => [
                        ['Tirar la ropa en mal estado > Donarla > Venderla > Remendarla', false],
                        ['Remendar las prendas > Venderlas > Donarlas > Tirarlas (orden de mejor a peor)', true],
                        ['Donar la ropa vieja > Remendarla > Venderla > Tirarla al contenedor', false],
                        ['Vender lo usable > Tirar lo dañado > Donar lo sobrante > Remendar al final', false]
                    ],
                    'explicacion' => "La jerarquía de residuos textiles prioriza: 1) Reparar (no genera ningún nuevo impacto) → 2) Reutilizar/vender (alarga la vida sin producir nuevo) → 3) Donar (depende de si la ONG puede darle salida) → 4) Reciclar → 5) Tirar (el peor escenario: vertedero o incineración). Remendar una prenda evita fabricar una nueva, con todo su gasto de agua, energía y plásticos.",
                    'dinamica_grupo' => "¿Alguien ha remendado alguna vez ropa propia? ¿Os lo enseñaron en casa? Haced una lista rápida de prendas que tenéis en casa y podrían remendarse. ¿Cuántas son? ¿Quién se anima a aprender a coser un botón esta semana?",
                    'tiempo_dinamica' => 120,
                ],
            ],
        ];

        foreach ($contenido as $anilloIndex => $preguntas) {
            $anilloId = $anilloIds[$anilloIndex];

            foreach ($preguntas as $p) {
                $tipoCarta = $p['tipo_carta'] ?? 'pregunta';
                $tiempo = $p['tiempo'] ?? ($tipoCarta === 'evento' ? 60 : 45);
                $puntos = $p['puntos'] ?? ($tipoCarta === 'evento' ? 3 : 2);
                $penalizacion = $p['penalizacion'] ?? ($tipoCarta === 'evento' ? 2 : 1);
                $cambioTemp = $p['cambio_temp'] ?? null;

                $cartaId = DB::table('cartas')->insertGetId([
                    'anillo_id' => $anilloId,
                    'tipo' => $tipoCarta,
                    'texto' => $p['texto'],
                    'tiempo' => $tiempo,
                    'puntos' => $puntos,
                    'penalizacion' => $penalizacion,
                    'cambio_temp' => $cambioTemp,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $tipoPregunta = $p['tipo_pregunta'] ?? 'options';
                $rangoMin = $p['rango_min'] ?? null;
                $rangoMax = $p['rango_max'] ?? null;

                $preguntaId = DB::table('preguntas')->insertGetId([
                    'carta_id' => $cartaId,
                    'texto' => $p['texto_pregunta'] ?? $p['texto'],
                    'tipo_pregunta' => $tipoPregunta,
                    'rango_min' => $rangoMin,
                    'rango_max' => $rangoMax,
                    'explicacion' => $p['explicacion'] ?? null,
                    'dinamica_grupo' => $p['dinamica_grupo'] ?? null,
                    'tiempo_dinamica' => $p['tiempo_dinamica'] ?? 120,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if (isset($p['opciones'])) {
                    foreach ($p['opciones'] as [$texto, $correcta]) {
                        DB::table('opciones_respuesta')->insert([
                            'pregunta_id' => $preguntaId,
                            'texto' => $texto,
                            'correcta' => $correcta,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }
}