<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Juego;
use App\Models\Carta;
use App\Models\Anillo;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class RoleAbilitiesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->artisan('db:seed', ['--class' => 'RolesSeeder']);
        
        $anillo = Anillo::create([
            'nombre' => 'General',
            'orden' => 1
        ]);
        
        $c1 = Carta::create([
            'anillo_id' => $anillo->anillo_id,
            'texto' => 'Evento de Prueba',
            'tipo' => 'evento',
            'puntos' => 0,
            'penalizacion' => 2,
            'cambio_temp' => 0.1
        ]);
        
        $c2 = Carta::create([
            'anillo_id' => $anillo->anillo_id,
            'texto' => 'Pregunta de Prueba 1',
            'tipo' => 'pregunta',
            'puntos' => 2,
            'penalizacion' => 1,
            'cambio_temp' => 0.0
        ]);

        $c3 = Carta::create([
            'anillo_id' => $anillo->anillo_id,
            'texto' => 'Pregunta de Prueba 2',
            'tipo' => 'pregunta',
            'puntos' => 2,
            'penalizacion' => 1,
            'cambio_temp' => 0.0
        ]);
    }

    public function test_primario_baja_temperatura_y_gasta_tokens()
    {
        $primarioRol = DB::table('roles')->where('slug', 'primario')->first();

        $juego = Juego::create([
            'room_code' => 'TEST000',
            'estado' => 'playing',
            'is_local' => true,
            'current_turn' => 1,
            'temperatura' => 0.5,
            'anillo_id' => Anillo::first()->anillo_id
        ]);
        $juego->current_rol_id = $primarioRol->rol_id;
        $juego->save();
        
        $part1 = \App\Models\Participante::create(['usuario' => 'p1']);
        
        DB::table('juego_participante')->insert([
            'juego_id' => $juego->juego_id,
            'participante_id' => $part1->participante_id,
            'rol_id' => $primarioRol->rol_id,
            'eco_fichas' => 10,
            'puntuacion' => 0
        ]);

        $response = $this->postJson("/api/game/TEST000/habilidad", [
            'participante_id' => $part1->participante_id,
            'slug' => 'primario'
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $juego->refresh();
        $this->assertEquals(0.3, round($juego->temperatura, 1));
        
        $participacion = DB::table('juego_participante')->where('participante_id', $part1->participante_id)->first();
        $this->assertEquals(7, $participacion->eco_fichas); // Tenía 10, gasta 3
    }
    
    public function test_legislativo_bloquea_evento()
    {
        $legislativoRol = DB::table('roles')->where('slug', 'legislativo')->first();

        $juego = Juego::create([
            'room_code' => 'TEST001',
            'estado' => 'playing',
            'is_local' => true,
            'current_turn' => 1,
            'temperatura' => 0.5,
            'anillo_id' => Anillo::first()->anillo_id,
            'current_carta_id' => Carta::where('tipo', 'evento')->first()->carta_id
        ]);
        $juego->current_rol_id = $legislativoRol->rol_id;
        $juego->save();
        
        $part2 = \App\Models\Participante::create(['usuario' => 'p2']);
        
        DB::table('juego_participante')->insert([
            'juego_id' => $juego->juego_id,
            'participante_id' => $part2->participante_id,
            'rol_id' => $legislativoRol->rol_id,
            'eco_fichas' => 10,
            'puntuacion' => 0
        ]);

        $response = $this->postJson("/api/game/TEST001/habilidad", [
            'participante_id' => $part2->participante_id,
            'slug' => 'legislativo'
        ]);

        $response->assertStatus(200);
        
        // El flag debería estar en caché
        $isBlocked = Cache::has("juego_{$juego->juego_id}_event_blocked_t1");
        $this->assertTrue($isBlocked);
    }

    public function test_tech_mitiga_evento_a_la_mitad()
    {
        $techRol = DB::table('roles')->where('slug', 'tech')->first();

        $juego = Juego::create([
            'room_code' => 'TEST002',
            'estado' => 'playing',
            'is_local' => true,
            'current_turn' => 1,
            'temperatura' => 0.5,
            'anillo_id' => Anillo::first()->anillo_id,
            'current_carta_id' => Carta::where('tipo', 'evento')->first()->carta_id
        ]);
        $juego->current_rol_id = $techRol->rol_id;
        $juego->save();
        
        $part3 = \App\Models\Participante::create(['usuario' => 'p3']);
        
        DB::table('juego_participante')->insert([
            'juego_id' => $juego->juego_id,
            'participante_id' => $part3->participante_id,
            'rol_id' => $techRol->rol_id,
            'eco_fichas' => 10,
            'puntuacion' => 0
        ]);

        $response = $this->postJson("/api/game/TEST002/habilidad", [
            'participante_id' => $part3->participante_id,
            'slug' => 'tech'
        ]);

        $response->assertStatus(200);
        
        // El flag de mitigado (halved) debería estar en caché
        $isHalved = Cache::has("juego_{$juego->juego_id}_event_halved_t1");
        $this->assertTrue($isHalved);
    }

    public function test_ciudadania_activa_5050()
    {
        $ciudadaniaRol = DB::table('roles')->where('slug', 'ciudadania')->first();

        $juego = Juego::create([
            'room_code' => 'TEST003',
            'estado' => 'playing',
            'is_local' => true,
            'current_turn' => 1,
            'temperatura' => 0.5,
            'anillo_id' => Anillo::first()->anillo_id,
            'current_carta_id' => Carta::where('tipo', 'pregunta')->first()->carta_id
        ]);
        $juego->current_rol_id = $ciudadaniaRol->rol_id;
        $juego->save();
        
        $part4 = \App\Models\Participante::create(['usuario' => 'p4']);
        
        DB::table('juego_participante')->insert([
            'juego_id' => $juego->juego_id,
            'participante_id' => $part4->participante_id,
            'rol_id' => $ciudadaniaRol->rol_id,
            'eco_fichas' => 10,
            'puntuacion' => 0
        ]);

        $response = $this->postJson("/api/game/TEST003/habilidad", [
            'participante_id' => $part4->participante_id,
            'slug' => 'ciudadania'
        ]);

        $response->assertStatus(200);
        
        // El flag de 50/50 debería estar en caché
        $is5050 = Cache::has("juego_{$juego->juego_id}_5050_t1");
        $this->assertTrue($is5050);
    }

    public function test_ciencia_auto_completa_reto()
    {
        $cienciaRol = DB::table('roles')->where('slug', 'ciencia')->first();
        $cartaPregunta = Carta::where('tipo', 'pregunta')->first();

        $juego = Juego::create([
            'room_code' => 'TEST004',
            'estado' => 'playing',
            'is_local' => true,
            'current_turn' => 1,
            'temperatura' => 0.5,
            'anillo_id' => Anillo::first()->anillo_id,
            'current_carta_id' => $cartaPregunta->carta_id
        ]);
        $juego->current_rol_id = $cienciaRol->rol_id;
        $juego->save();
        
        $part5 = \App\Models\Participante::create(['usuario' => 'p5']);
        
        DB::table('juego_participante')->insert([
            'juego_id' => $juego->juego_id,
            'participante_id' => $part5->participante_id,
            'rol_id' => $cienciaRol->rol_id,
            'eco_fichas' => 10,
            'puntuacion' => 0
        ]);

        $response = $this->postJson("/api/game/TEST004/habilidad", [
            'participante_id' => $part5->participante_id,
            'slug' => 'ciencia'
        ]);

        $response->assertStatus(200);
        
        // Debería haberse creado una respuesta correcta en el turno actual
        $turno = \App\Models\Turno::where([
            'juego_id' => $juego->juego_id,
            'carta_id' => $cartaPregunta->carta_id,
            'participante_id' => $part5->participante_id
        ])->first();
        
        $this->assertNotNull($turno);
        $this->assertTrue((bool)$turno->is_correct);
    }

    public function test_textil_cambia_carta_de_pregunta()
    {
        $textilRol = DB::table('roles')->where('slug', 'textil')->first();
        $cartaOriginal = Carta::where('tipo', 'pregunta')->first();

        $juego = Juego::create([
            'room_code' => 'TEST005',
            'estado' => 'playing',
            'is_local' => true,
            'current_turn' => 1,
            'temperatura' => 0.5,
            'anillo_id' => Anillo::first()->anillo_id,
            'current_carta_id' => $cartaOriginal->carta_id
        ]);
        $juego->current_rol_id = $textilRol->rol_id;
        $juego->save();
        
        $part6 = \App\Models\Participante::create(['usuario' => 'p6']);
        
        DB::table('juego_participante')->insert([
            'juego_id' => $juego->juego_id,
            'participante_id' => $part6->participante_id,
            'rol_id' => $textilRol->rol_id,
            'eco_fichas' => 10,
            'puntuacion' => 0
        ]);

        $response = $this->postJson("/api/game/TEST005/habilidad", [
            'participante_id' => $part6->participante_id,
            'slug' => 'textil'
        ]);

        $response->assertStatus(200);
        
        $juego->refresh();
        // La carta actual del juego debería haber cambiado a otra de tipo pregunta
        $this->assertNotEquals($cartaOriginal->carta_id, $juego->current_carta_id);
    }
}
