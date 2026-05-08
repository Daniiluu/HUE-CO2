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
            ['nombre' => 'Agua',      'orden' => 1],
            ['nombre' => 'Energía',   'orden' => 2],
            ['nombre' => 'Plástico',  'orden' => 3],
            ['nombre' => 'Pantallas', 'orden' => 4],
            ['nombre' => 'Ropa',      'orden' => 5],
        ];
        foreach ($anillosData as $a) {
            DB::table('anillos')->insert(array_merge($a, ['created_at' => now(), 'updated_at' => now()]));
        }

        // Leer los IDs reales recién insertados, en orden
        $anilloIds = DB::table('anillos')->orderBy('orden')->pluck('anillo_id')->toArray();

        // ─── PREGUNTAS POR ANILLO ──────────────────────────────────────────────
        // Cada anillo tiene 6 preguntas (una por sector/turno)
        $contenido = [
            // ANILLO 1 – AGUA
            [
                ['texto' => '¿Qué porcentaje aproximado del agua del planeta es agua dulce disponible?',
                 'opciones' => [['50%', false], ['25%', false], ['10%', false], ['1%', true]]],
                ['texto' => '¿Cuál de estas prácticas ahorra más agua en el hogar?',
                 'opciones' => [['Bañarse en vez de ducharse', false], ['Cerrar el grifo al cepillarse', true], ['Regar el jardín de día', false], ['Lavar a máquina a 90°C', false]]],
                ['texto' => '¿Qué actividad humana consume más agua dulce a nivel global?',
                 'opciones' => [['Industria', false], ['Uso doméstico', false], ['Agricultura', true], ['Generación eléctrica', false]]],
                ['texto' => '¿Cuántos litros de agua se necesitan para producir 1 kg de carne de vacuno?',
                 'opciones' => [['200 L', false], ['1.500 L', false], ['15.000 L', true], ['500 L', false]]],
                ['texto' => '¿Qué tecnología de riego es más eficiente en el uso de agua?',
                 'opciones' => [['Aspersión', false], ['Inundación', false], ['Goteo', true], ['Pulverización aérea', false]]],
                ['texto' => '¿Cuál es la principal causa de contaminación del agua dulce?',
                 'opciones' => [['Lluvia ácida', false], ['Residuos industriales y agrícolas', true], ['Turismo', false], ['Pesca excesiva', false]]],
            ],
            // ANILLO 2 – ENERGÍA
            [
                ['texto' => '¿Cuál de estas fuentes produce menos CO₂ en su ciclo de vida?',
                 'opciones' => [['Carbón', false], ['Gas natural', false], ['Nuclear', false], ['Solar fotovoltaica', true]]],
                ['texto' => '¿Qué país genera más electricidad a partir de energía eólica en proporción?',
                 'opciones' => [['China', false], ['Alemania', false], ['Dinamarca', true], ['EE.UU.', false]]],
                ['texto' => '¿Cuánto CO₂ emite una central de carbón por kWh producido (aprox.)?',
                 'opciones' => [['50 g', false], ['200 g', false], ['820 g', true], ['1.500 g', false]]],
                ['texto' => '¿Qué porcentaje de la energía mundial proviene de renovables (2023)?',
                 'opciones' => [['5%', false], ['15%', false], ['30%', true], ['60%', false]]],
                ['texto' => '¿Cuál es la principal ventaja de la energía mareomotriz?',
                 'opciones' => [['Es barata', false], ['Es predecible y constante', true], ['No necesita infraestructura', false], ['Funciona en cualquier lugar', false]]],
                ['texto' => '¿Qué significa "eficiencia energética"?',
                 'opciones' => [['Usar más energía', false], ['Producir la misma tarea con menos energía', true], ['Cambiar de proveedor', false], ['Pagar menos luz', false]]],
            ],
            // ANILLO 3 – PLÁSTICO
            [
                ['texto' => '¿Cuál de estos plásticos es más fácil de reciclar habitualmente?',
                 'opciones' => [['PVC', false], ['LDPE', false], ['Poliestireno', false], ['PET', true]]],
                ['texto' => '¿Cuánto tiempo tarda en degradarse una bolsa de plástico convencional?',
                 'opciones' => [['1 año', false], ['10 años', false], ['150-400 años', true], ['10.000 años', false]]],
                ['texto' => '¿Qué son los microplásticos?',
                 'opciones' => [['Plásticos blandos', false], ['Partículas menores de 5 mm', true], ['Plásticos biodegradables', false], ['Envases pequeños', false]]],
                ['texto' => '¿Cuántos millones de toneladas de plástico acaban en el océano cada año?',
                 'opciones' => [['1 Mt', false], ['8 Mt', true], ['50 Mt', false], ['200 Mt', false]]],
                ['texto' => '¿Qué símbolo de reciclaje indica que el plástico es PET?',
                 'opciones' => [['3', false], ['5', false], ['1', true], ['7', false]]],
                ['texto' => '¿Cuál es el principal reto para reciclar plástico negro?',
                 'opciones' => [['Es muy caro', false], ['Los sensores ópticos no lo detectan', true], ['No se puede fundir', false], ['Es tóxico', false]]],
            ],
            // ANILLO 4 – PANTALLAS
            [
                ['texto' => '¿Por qué los centros de datos consumen tanta energía?',
                 'opciones' => [['Están lejos de las ciudades', false], ['Sus monitores son grandes', false], ['Refrigeración y operación de servidores', true], ['Tienen muchos trabajadores', false]]],
                ['texto' => '¿Qué es la "obsolescencia programada"?',
                 'opciones' => [['Un tipo de software', false], ['Diseñar productos para que fallen pronto', true], ['Un sistema de reciclaje', false], ['Una norma de seguridad', false]]],
                ['texto' => '¿Cuál es la huella de carbono aproximada de fabricar un smartphone?',
                 'opciones' => [['5 kg CO₂', false], ['30 kg CO₂', false], ['70 kg CO₂', true], ['200 kg CO₂', false]]],
                ['texto' => '¿Qué mineral crítico se usa en baterías de litio y genera conflictos mineros?',
                 'opciones' => [['Hierro', false], ['Cobre', false], ['Cobalto', true], ['Plata', false]]],
                ['texto' => '¿Cuántos residuos electrónicos (e-waste) se generan al año a nivel global?',
                 'opciones' => [['10 Mt', false], ['53 Mt', true], ['200 Mt', false], ['5 Mt', false]]],
                ['texto' => '¿Qué acción alarga más la vida de un ordenador?',
                 'opciones' => [['Apagarlo siempre', false], ['Ampliarlo con más RAM o SSD', true], ['Actualizarlo de sistema operativo', false], ['Limpiar la pantalla', false]]],
            ],
            // ANILLO 5 – ROPA
            [
                ['texto' => '¿Por qué la moda rápida ("fast fashion") es tan contaminante?',
                 'opciones' => [['Produce poca ropa', false], ['Usa energía solar', false], ['Genera residuos y consume recursos masivamente', true], ['Emplea mucha mano de obra local', false]]],
                ['texto' => '¿Cuántos litros de agua se necesitan para fabricar un par de vaqueros?',
                 'opciones' => [['100 L', false], ['1.000 L', false], ['7.500 L', true], ['50.000 L', false]]],
                ['texto' => '¿Cuál es la fibra natural con menor huella hídrica?',
                 'opciones' => [['Algodón convencional', false], ['Lana', false], ['Lino', true], ['Seda', false]]],
                ['texto' => '¿Qué porcentaje de las emisiones globales de CO₂ proviene de la industria textil?',
                 'opciones' => [['1%', false], ['10%', true], ['25%', false], ['40%', false]]],
                ['texto' => '¿Qué significa "upcycling" en moda sostenible?',
                 'opciones' => [['Comprar ropa cara', false], ['Transformar ropa usada en algo de mayor valor', true], ['Reciclar hilos', false], ['Donar ropa', false]]],
                ['texto' => '¿Cuál es el país que más ropa exporta al mundo?',
                 'opciones' => [['Bangladesh', false], ['India', false], ['China', true], ['Vietnam', false]]],
            ],
        ];

        foreach ($contenido as $anilloIndex => $preguntas) {
            $anilloId = $anilloIds[$anilloIndex];

            foreach ($preguntas as $p) {
                $cartaId = DB::table('cartas')->insertGetId([
                    'anillo_id'   => $anilloId,
                    'tipo'        => 'pregunta',
                    'texto'       => $p['texto'],
                    'tiempo'      => 30,
                    'puntos'      => 2,
                    'penalizacion'=> 1,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);

                $preguntaId = DB::table('preguntas')->insertGetId([
                    'carta_id'     => $cartaId,
                    'texto'        => $p['texto'],
                    'tipo_pregunta'=> 'options',
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);

                foreach ($p['opciones'] as [$texto, $correcta]) {
                    DB::table('opciones_respuesta')->insert([
                        'pregunta_id' => $preguntaId,
                        'texto'       => $texto,
                        'correcta'    => $correcta,
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ]);
                }
            }
        }
    }
}