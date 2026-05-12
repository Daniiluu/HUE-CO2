<?php

use Illuminate\Support\Facades\DB;

$anillos = [
    3 => ['nombre' => 'Plástico', 'cards' => [
        ['tipo' => 'pregunta', 'texto' => '¿Qué porcentaje de plástico se recicla realmente a nivel mundial?', 'puntos' => 2, 'penalizacion' => 1],
        ['tipo' => 'evento', 'texto' => 'Invento de bioplástico a base de algas reduce la demanda de petróleo.', 'puntos' => 2, 'penalizacion' => 0, 'cambio_temp' => -0.1],
        ['tipo' => 'pregunta', 'texto' => '¿Cuántos años tarda una botella de plástico en degradarse?', 'puntos' => 2, 'penalizacion' => 1],
        ['tipo' => 'evento', 'texto' => 'Microplásticos detectados en el 80% del agua potable global.', 'puntos' => 0, 'penalizacion' => 2, 'cambio_temp' => 0.15],
        ['tipo' => 'pregunta', 'texto' => '¿Cuál es el mayor vertedero de plástico del mundo?', 'puntos' => 2, 'penalizacion' => 1],
        ['tipo' => 'evento', 'texto' => 'Nueva tecnología de filtrado en ríos detiene el flujo de plástico al mar.', 'puntos' => 3, 'penalizacion' => 0, 'cambio_temp' => -0.05],
    ]],
    4 => ['nombre' => 'Pantallas', 'cards' => [
        ['tipo' => 'pregunta', 'texto' => '¿Cuánta energía consume un centro de datos promedio al año?', 'puntos' => 2, 'penalizacion' => 1],
        ['tipo' => 'evento', 'texto' => 'Fiebre de las criptomonedas aumenta el consumo eléctrico global.', 'puntos' => 0, 'penalizacion' => 2, 'cambio_temp' => 0.2],
        ['tipo' => 'pregunta', 'texto' => '¿Qué mineral es esencial para las baterías de los smartphones?', 'puntos' => 2, 'penalizacion' => 1],
        ['tipo' => 'evento', 'texto' => 'Descubrimiento de baterías de estado sólido duplica la eficiencia energética.', 'puntos' => 3, 'penalizacion' => 0, 'cambio_temp' => -0.1],
        ['tipo' => 'pregunta', 'texto' => '¿Qué porcentaje de la basura electrónica se recicla correctamente?', 'puntos' => 2, 'penalizacion' => 1],
        ['tipo' => 'evento', 'texto' => 'Programa global de "Derecho a Reparar" reduce la basura electrónica.', 'puntos' => 2, 'penalizacion' => 0, 'cambio_temp' => -0.05],
    ]],
    5 => ['nombre' => 'Ropa', 'cards' => [
        ['tipo' => 'pregunta', 'texto' => '¿Cuántos litros de agua se necesitan para fabricar unos vaqueros?', 'puntos' => 2, 'penalizacion' => 1],
        ['tipo' => 'evento', 'texto' => 'Auge del "Fast Fashion" duplica las emisiones del sector textil.', 'puntos' => 0, 'penalizacion' => 3, 'cambio_temp' => 0.2],
        ['tipo' => 'pregunta', 'texto' => '¿Cuál es la fibra textil natural más contaminante por el uso de pesticidas?', 'puntos' => 2, 'penalizacion' => 1],
        ['tipo' => 'evento', 'texto' => 'Cierre de grandes vertederos textiles en el desierto mejora el suelo.', 'puntos' => 2, 'penalizacion' => 0, 'cambio_temp' => -0.05],
        ['tipo' => 'pregunta', 'texto' => '¿Qué material sintético libera microfibras al lavarse?', 'puntos' => 2, 'penalizacion' => 1],
        ['tipo' => 'evento', 'texto' => 'Impuesto global al carbono para el transporte marítimo de ropa.', 'puntos' => 2, 'penalizacion' => 0, 'cambio_temp' => -0.1],
    ]]
];

foreach ($anillos as $anilloId => $data) {
    foreach ($data['cards'] as $card) {
        $id = DB::table('cartas')->insertGetId([
            'anillo_id' => $anilloId,
            'tipo' => $card['tipo'],
            'texto' => $card['texto'],
            'puntos' => $card['puntos'],
            'penalizacion' => $card['penalizacion'],
            'tiempo' => 25,
            'cambio_temp' => $card['cambio_temp'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($card['tipo'] === 'pregunta') {
            // Añadir una pregunta y opciones genéricas para que no falle el sistema
            $preguntaId = DB::table('preguntas')->insertGetId([
                'carta_id' => $id,
                'texto' => $card['texto'],
                'tipo_pregunta' => 'options',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('opciones_respuesta')->insert([
                ['pregunta_id' => $preguntaId, 'texto' => 'Opción Correcta', 'correcta' => true, 'created_at' => now(), 'updated_at' => now()],
                ['pregunta_id' => $preguntaId, 'texto' => 'Opción Incorrecta A', 'correcta' => false, 'created_at' => now(), 'updated_at' => now()],
                ['pregunta_id' => $preguntaId, 'texto' => 'Opción Incorrecta B', 'correcta' => false, 'created_at' => now(), 'updated_at' => now()],
                ['pregunta_id' => $preguntaId, 'texto' => 'Opción Incorrecta C', 'correcta' => false, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }
}

echo "Se han añadido 18 nuevas cartas para los anillos de Plástico, Pantallas y Ropa.\n";
