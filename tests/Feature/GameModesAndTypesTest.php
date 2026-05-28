<?php

namespace Tests\Feature;

use App\Models\Carta;
use App\Models\Juego;
use App\Models\Participante;
use App\Models\Pregunta;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GameModesAndTypesTest extends TestCase
{
    use RefreshDatabase;

    private $user;
    private $anilloId;
    private $cartaOptions;
    private $cartaSlider;
    private $cartaFree;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Crear usuario de prueba
        $this->user = User::factory()->create([
            'username' => 'testhost',
            'role' => 'jugador'
        ]);

        // 2. Crear un rol
        DB::table('roles')->insert([
            ['rol_id' => 1, 'nombre' => 'Sector Residencial', 'slug' => 'residencial', 'created_at' => now(), 'updated_at' => now()],
            ['rol_id' => 2, 'nombre' => 'Sector Industrial', 'slug' => 'industrial', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 3. Crear Anillo
        $this->anilloId = DB::table('anillos')->insertGetId([
            'nombre' => 'Test Ring',
            'orden' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 4. Pregunta 1: Opciones (Multiple Choice)
        $this->cartaOptions = Carta::create([
            'anillo_id' => $this->anilloId,
            'tipo' => 'pregunta',
            'texto' => '¿Cuál ahorra más agua?',
            'puntos' => 2,
            'penalizacion' => 1,
            'tiempo' => 30,
        ]);

        $preguntaOptions = Pregunta::create([
            'carta_id' => $this->cartaOptions->carta_id,
            'texto' => '¿Cuál ahorra más agua?',
            'tipo_pregunta' => 'options',
        ]);

        DB::table('opciones_respuesta')->insert([
            ['pregunta_id' => $preguntaOptions->pregunta_id, 'texto' => 'Bañarse', 'correcta' => false, 'created_at' => now(), 'updated_at' => now()],
            ['pregunta_id' => $preguntaOptions->pregunta_id, 'texto' => 'Ducharse rápido', 'correcta' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 5. Pregunta 2: Slider (Estimación)
        $this->cartaSlider = Carta::create([
            'anillo_id' => $this->anilloId,
            'tipo' => 'pregunta',
            'texto' => '¿Qué porcentaje es agua dulce?',
            'puntos' => 2,
            'penalizacion' => 1,
            'tiempo' => 30,
        ]);

        $preguntaSlider = Pregunta::create([
            'carta_id' => $this->cartaSlider->carta_id,
            'texto' => '¿Qué porcentaje es agua dulce?',
            'tipo_pregunta' => 'slider',
            'rango_min' => 0,
            'rango_max' => 100,
        ]);

        DB::table('opciones_respuesta')->insert([
            ['pregunta_id' => $preguntaSlider->pregunta_id, 'texto' => '69', 'correcta' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // 6. Pregunta 3: Free (Consenso / Abierta)
        $this->cartaFree = Carta::create([
            'anillo_id' => $this->anilloId,
            'tipo' => 'pregunta',
            'texto' => 'Explica un hábito cotidiano.',
            'puntos' => 2,
            'penalizacion' => 1,
            'tiempo' => 30,
        ]);

        Pregunta::create([
            'carta_id' => $this->cartaFree->carta_id,
            'texto' => 'Explica un hábito cotidiano.',
            'tipo_pregunta' => 'free',
        ]);
    }

    /**
     * Test para verificar que el flujo de juego local y online puede
     * procesar correctamente preguntas de opción múltiple (options).
     */
    public function test_options_question_flow()
    {
        // Crear un juego local/online
        $response = $this->actingAs($this->user)->postJson('/juego/crear', [
            'modo' => 'grupal',
            'is_local' => false,
            'anillo_id' => $this->anilloId,
            'usuario' => 'HostPlayer',
        ]);

        $response->assertStatus(201);
        $juegoId = $response->json('juego.juego_id');
        $roomCode = $response->json('juego.room_code');

        $juego = Juego::find($juegoId);
        $this->assertEquals('lobby', $juego->estado);

        // Unir a un segundo jugador
        $joinResponse = $this->postJson('/api/juegos/join', [
            'room_code' => $roomCode,
            'usuario' => 'GuestPlayer',
            'rol_id' => 2,
        ]);
        $joinResponse->assertStatus(200);

        // Forzar cambio a playing
        $juego->update(['estado' => 'playing', 'current_turn' => 1, 'current_carta_id' => $this->cartaOptions->carta_id]);

        // Asegurar que el participante tiene un rol para poder votar
        $participante = Participante::where('usuario', 'GuestPlayer')->first();
        DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $participante->participante_id)
            ->update(['rol_id' => 1]);

        $juego->current_rol_id = 1;
        $juego->save();

        // 1. Votación incorrecta
        $voteResponse = $this->postJson("/api/game/{$roomCode}/vote", [
            'participant_id' => $participante->participante_id,
            'player_name' => 'GuestPlayer',
            'sector_id' => 'residencial',
            'type' => 'options',
            'answer' => 'Bañarse',
        ]);
        $voteResponse->assertStatus(200);

        // Procesar turno
        $advanceResponse = $this->postJson("/api/game/{$roomCode}/advance");
        $advanceResponse->assertStatus(200);

        // Verificar penalización
        $fichas = DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $participante->participante_id)
            ->value('eco_fichas');
        
        $this->assertEquals(11, $fichas); // 12 - 1 = 11

        // 2. Votación correcta
        $juego->refresh();
        $juego->estado = 'playing';
        $juego->current_turn = 2;
        $juego->current_carta_id = $this->cartaOptions->carta_id;
        $juego->current_rol_id = 1;
        $juego->save();
        
        $voteResponse2 = $this->postJson("/api/game/{$roomCode}/vote", [
            'participant_id' => $participante->participante_id,
            'player_name' => 'GuestPlayer',
            'sector_id' => 'residencial',
            'type' => 'options',
            'answer' => 'Ducharse rápido',
        ]);
        $voteResponse2->assertStatus(200);

        // Procesar turno
        $advanceResponse2 = $this->postJson("/api/game/{$roomCode}/advance");
        $advanceResponse2->assertStatus(200);

        // Verificar recompensa de puntos
        $puntuacion = DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $participante->participante_id)
            ->value('puntuacion');
        
        $this->assertEquals(1, $puntuacion);
    }

    /**
     * Test para verificar que el flujo de juego local y online puede
     * procesar correctamente preguntas de tipo slider (estimación).
     */
    public function test_slider_question_flow()
    {
        $response = $this->actingAs($this->user)->postJson('/juego/crear', [
            'modo' => 'grupal',
            'is_local' => false,
            'anillo_id' => $this->anilloId,
            'usuario' => 'HostPlayer',
        ]);

        $roomCode = $response->json('juego.room_code');
        $juego = Juego::find($response->json('juego.juego_id'));

        // Unir jugador
        $this->postJson('/api/juegos/join', [
            'room_code' => $roomCode,
            'usuario' => 'SliderPlayer',
            'rol_id' => 1,
        ]);

        $participante = Participante::where('usuario', 'SliderPlayer')->first();
        DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $participante->participante_id)
            ->update(['rol_id' => 1]);

        $juego->update(['estado' => 'playing', 'current_turn' => 1, 'current_carta_id' => $this->cartaSlider->carta_id]);
        $juego->current_rol_id = 1;
        $juego->save();

        // 1. Estimación exitosa (dentro del margen de +-5)
        // La respuesta correcta sembrada es 69. Enviamos 67 (diferencia de 2).
        $voteResponse = $this->postJson("/api/game/{$roomCode}/vote", [
            'participant_id' => $participante->participante_id,
            'player_name' => 'SliderPlayer',
            'sector_id' => 'residencial',
            'type' => 'slider',
            'answer' => '67',
        ]);
        $voteResponse->assertStatus(200);

        $advanceResponse = $this->postJson("/api/game/{$roomCode}/advance");
        $advanceResponse->assertStatus(200);

        // Debería ganar EcoFichas y puntuar
        $fichasCorrecto = DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $participante->participante_id)
            ->value('eco_fichas');
        
        $this->assertEquals(14, $fichasCorrecto); // 12 + 2 = 14

        // 2. Estimación errónea (fuera del margen)
        $juego->refresh();
        $juego->estado = 'playing';
        $juego->current_turn = 2;
        $juego->current_carta_id = $this->cartaSlider->carta_id;
        $juego->current_rol_id = 1;
        $juego->save();

        $voteResponse2 = $this->postJson("/api/game/{$roomCode}/vote", [
            'participant_id' => $participante->participante_id,
            'player_name' => 'SliderPlayer',
            'sector_id' => 'residencial',
            'type' => 'slider',
            'answer' => '80',
        ]);
        $voteResponse2->assertStatus(200);

        $advanceResponse2 = $this->postJson("/api/game/{$roomCode}/advance");
        $advanceResponse2->assertStatus(200);

        // Debería penalizar
        $fichasIncorrecto = DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $participante->participante_id)
            ->value('eco_fichas');
        
        $this->assertEquals(13, $fichasIncorrecto); // 14 - 1 = 13
    }

    /**
     * Test para verificar que el flujo de juego local y online puede
     * procesar correctamente preguntas abiertas/libres (free) a través
     * de propuesta y votación de consenso.
     */
    public function test_free_question_flow()
    {
        $response = $this->actingAs($this->user)->postJson('/juego/crear', [
            'modo' => 'grupal',
            'is_local' => false,
            'anillo_id' => $this->anilloId,
            'usuario' => 'HostPlayer',
        ]);

        $roomCode = $response->json('juego.room_code');
        $juego = Juego::find($response->json('juego.juego_id'));

        // Unir jugador 1 (Proponente)
        $this->postJson('/api/juegos/join', [
            'room_code' => $roomCode,
            'usuario' => 'ProponentPlayer',
            'rol_id' => 1,
        ]);
        $pProponente = Participante::where('usuario', 'ProponentPlayer')->first();
        DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $pProponente->participante_id)
            ->update(['rol_id' => 1]);

        // Unir jugador 2 (Validador)
        $this->postJson('/api/juegos/join', [
            'room_code' => $roomCode,
            'usuario' => 'ValidatorPlayer',
            'rol_id' => 2,
        ]);
        $pValidador = Participante::where('usuario', 'ValidatorPlayer')->first();
        DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $pValidador->participante_id)
            ->update(['rol_id' => 2]);

        $juego->update(['estado' => 'playing', 'current_turn' => 1, 'current_carta_id' => $this->cartaFree->carta_id]);
        $juego->current_rol_id = 1;
        $juego->save();

        // 1. El proponente envía la propuesta abierta
        $proposalResponse = $this->postJson("/api/game/{$roomCode}/proposal", [
            'participant_id' => $pProponente->participante_id,
            'player_name' => 'ProponentPlayer',
            'sector_id' => 'residencial',
            'proposal_text' => 'Usar bombillas LED en casa',
        ]);
        $proposalResponse->assertStatus(200);

        // El juego debería seguir en 'playing' pero la carta ahora requiere validación
        $juego->refresh();
        $this->assertEquals('playing', $juego->estado);

        // 2. El otro jugador vota para validar (Voto correcto/positivo)
        $voteResponse = $this->postJson("/api/game/{$roomCode}/vote", [
            'participant_id' => $pValidador->participante_id,
            'player_name' => 'ValidatorPlayer',
            'sector_id' => 'industrial',
            'type' => 'validate',
            'answer' => 'valid',
        ]);
        $voteResponse->assertStatus(200);

        // Avanzar el turno debería procesar el consenso
        $advanceResponse = $this->postJson("/api/game/{$roomCode}/advance");
        $advanceResponse->assertStatus(200);

        // Verificar que el proponente recibió puntos por propuesta validada
        $puntuacion = DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('participante_id', $pProponente->participante_id)
            ->value('puntuacion');
        
        $this->assertEquals(1, $puntuacion);
    }
}
