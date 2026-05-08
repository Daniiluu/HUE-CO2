<?php

namespace App\Services;

use App\Models\Juego;
use App\Models\Carta;
use App\Models\Turno;
use App\Events\GameStateChanged;
use App\Events\TurnResultBroadcast;
use Illuminate\Support\Facades\DB;

class GameFlowService
{
    /**
     * Avanza el estado del juego al siguiente paso (Reto -> Resultados -> Siguiente Reto)
     */
    public function advanceTurn(Juego $juego)
    {
        return DB::transaction(function () use ($juego) {
            $turnResults = [];

            // ── FASE A: Mostrar Resultados del turno actual ──────────────────
            if ($juego->estado === 'playing' || $juego->estado === 'challenge') {
                $turnResults = $this->processTurnResults($juego);
                
                // Calcular impacto en temperatura
                // Si el sector activo acertó, la temperatura baja un poco; si falló o no respondió, sube.
                $acierto = collect($turnResults)->where('correct', true)->count() > 0;
                if ($acierto) {
                    $juego->temperatura = max(-1.0, $juego->temperatura - 0.05);
                } else {
                    $juego->temperatura = min(1.0, $juego->temperatura + 0.15);
                }

                $juego->estado = 'results';
                $juego->save();

                $this->broadcastState($juego, $turnResults);
                return $juego;
            }

            // ── FASE B: Preparar el Siguiente Reto ───────────────────────────
            
            // Inicializar roles si es el primer turno (todos los modos)
            if ($juego->current_turn === 0) {
                $this->initializeParticipantRoles($juego);
            }

            $juego->current_turn += 1;
            
            // --- CAMBIO DE ANILLO CADA 6 TURNOS ---
            if ($juego->current_turn > 1 && ($juego->current_turn - 1) % 6 === 0) {
                $juego->anillo_id = ($juego->anillo_id ?? 1) + 1;
                // Verificar si el anillo existe, si no, terminar el juego
                $maxAnillo = DB::table('anillos')->max('anillo_id') ?: 3;
                if ($juego->anillo_id > $maxAnillo) {
                    $juego->estado = 'ended';
                    $juego->save();
                    $this->broadcastState($juego);
                    return $juego;
                }
            }

            // Rotar al siguiente sector activo (vuelve al inicio automáticamente por el módulo 6)
            $this->selectNextActiveSector($juego);

            // Seleccionar nueva carta del anillo correspondiente
            $nuevaCarta = $this->pickRandomCard($juego->anillo_id);
            
            if ($nuevaCarta) {
                $juego->current_carta_id = $nuevaCarta->carta_id;
                $juego->estado = 'playing';
            } else {
                $juego->estado = 'ended';
            }

            $juego->last_turn_at = now();
            $juego->save();

            $this->broadcastState($juego);

            return $juego;
        });
    }

    /**
     * Distribuye los 6 roles de forma aleatoria y equitativa entre los participantes conectados.
     */
    protected function initializeParticipantRoles(Juego $juego)
    {
        // Recargar participantes frescos desde la BD
        $participantes = $juego->participantes()->distinct()->get();
        $numParticipantes = $participantes->count();

        if ($numParticipantes === 0) return;

        // Obtener los 6 sectores de la base de datos y mezclarlos
        $rolesIds = DB::table('roles')->pluck('rol_id')->shuffle()->values();
        $numRoles = $rolesIds->count();

        // Limpiar asignaciones previas para evitar duplicados
        DB::table('juego_participante')->where('juego_id', $juego->juego_id)->delete();

        $inserts = [];

        // Reparto equitativo: repartimos los 6 roles entre los N participantes usando el operador modulo
        foreach ($rolesIds as $i => $rol_id) {
            $p = $participantes[$i % $numParticipantes];
            $inserts[] = [
                'juego_id'        => $juego->juego_id,
                'participante_id' => $p->participante_id,
                'rol_id'          => $rol_id,
                'eco_fichas'      => 12,
                'puntuacion'      => 0,
                'created_at'      => now(),
                'updated_at'      => now(),
            ];
        }

        DB::table('juego_participante')->insert($inserts);
        $juego->load('participantes');
    }

    /**
     * Selecciona el rol ID que debe responder en este turno (Sentido Horario)
     */
    protected function selectNextActiveSector(Juego $juego)
    {
        $clockwiseOrder = ['textil', 'ciencia', 'tech', 'primario', 'publico', 'ciudadania'];
        
        $rolesAsignadosSlugs = DB::table('juego_participante')
            ->join('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
            ->where('juego_id', $juego->juego_id)
            ->pluck('roles.slug')
            ->unique()
            ->toArray();

        $ordenPartida = array_values(array_filter($clockwiseOrder, function($slug) use ($rolesAsignadosSlugs) {
            return in_array($slug, $rolesAsignadosSlugs);
        }));

        if (!empty($ordenPartida)) {
            $index = ($juego->current_turn - 1) % count($ordenPartida);
            $activeSlug = $ordenPartida[$index];
            $activeRol = DB::table('roles')->where('slug', $activeSlug)->first();
            $juego->current_rol_id = $activeRol ? $activeRol->rol_id : null;
        }
    }

    /**
     * Centraliza el envío de información a los clientes
     */
    protected function broadcastState(Juego $juego, array $turnResults = [])
    {
        $activeRol = DB::table('roles')->where('rol_id', $juego->current_rol_id)->first();
        $activeSectorSlug = $activeRol ? $activeRol->slug : null;

        $sectorsData = DB::table('juego_participante')
            ->join('participantes', 'juego_participante.participante_id', '=', 'participantes.participante_id')
            ->leftJoin('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
            ->where('juego_participante.juego_id', $juego->juego_id)
            ->get()
            ->map(function ($row) {
                return [
                    'id' => $row->slug ?: 'ciudadania',
                    'playerName' => $row->usuario,
                    'tokens' => $row->eco_fichas,
                    'points' => $row->puntuacion,
                ];
            })->toArray();

        $carta = Carta::find($juego->current_carta_id);
        $challengeData = $this->formatChallenge($carta, $juego);
        $challengeData['activeSectorId'] = $activeSectorSlug;

        if (!empty($turnResults)) {
            TurnResultBroadcast::dispatch($juego->room_code, $turnResults);
        }

        GameStateChanged::dispatch(
            $juego->room_code,
            $juego->estado === 'ended' ? 'ended' : ($juego->estado === 'results' ? 'results' : 'challenge'),
            $challengeData,
            $sectorsData,
            $carta ? ($carta->tiempo ?? 90) : 0,
            $juego->current_turn,
            $juego->temperatura,
            collect($turnResults)->where('correct', true)->count() > 0 // lastTurnCorrect
        );
    }

    protected function processTurnResults(Juego $juego)
    {
        $carta = Carta::with('preguntas.opciones')->find($juego->current_carta_id);
        if (!$carta) return [];

        // Obtener la pregunta aquí para que esté disponible en todo el scope
        $pregunta = $carta->preguntas->first();

        $participaciones = DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->get();
        $feedbackMap = [];

        foreach ($participaciones as $participacion) {
            // Solo procesar el turno del sector activo
            $esSuTurno = ($participacion->rol_id == $juego->current_rol_id);
            if (!$esSuTurno) continue;

            $voto = Turno::where([
                'juego_id'        => $juego->juego_id,
                'participante_id' => $participacion->participante_id,
                'carta_id'        => $juego->current_carta_id
            ])->first();

            $tokensGanados = 0; $puntosGanados = 0; $penalizacion = 0; $esCorrecto = false;

            if (!$voto) {
                $penalizacion = 2;
                $mensaje = '¡Tiempo agotado! -2 EcoFichas';
            } elseif ($pregunta) {
                if ($pregunta->tipo_pregunta === 'free') {
                    // El propio sector activo registra el resultado acordado por el grupo
                    $resultado = trim((string) $voto->resultado);
                    if ($resultado === 'valid') {
                        $esCorrecto  = true;
                        $tokensGanados = $carta->puntos ?: 2;
                        $puntosGanados = 1;
                        $mensaje = "¡Respuesta Correcta! +{$tokensGanados} ET";
                    } elseif ($resultado === 'partial') {
                        $esCorrecto  = true;
                        $tokensGanados = (int)ceil(($carta->puntos ?: 2) / 2);
                        $puntosGanados = 1;
                        $mensaje = "Respuesta Parcial. +{$tokensGanados} ET";
                    } else {
                        $penalizacion = $carta->penalizacion > 0 ? $carta->penalizacion : 1;
                        $mensaje = "Respuesta Incorrecta. -{$penalizacion} ET";
                    }
                } elseif ($pregunta->tipo_pregunta === 'validate') {
                    // Lógica de Consenso: votos de los DEMÁS participantes
                    $votosConsenso = Turno::where([
                        'juego_id' => $juego->juego_id,
                        'carta_id' => $juego->current_carta_id
                    ])->where('participante_id', '!=', $participacion->participante_id)->get();

                    if ($votosConsenso->isEmpty()) {
                        $penalizacion = 1;
                        $mensaje = 'Nadie ha votado la propuesta.';
                    } else {
                        $puntosTotales = 0;
                        foreach ($votosConsenso as $v) {
                            if ($v->resultado === 'valid')   $puntosTotales += 1;
                            elseif ($v->resultado === 'partial') $puntosTotales += 0.5;
                        }
                        $media = $puntosTotales / $votosConsenso->count();

                        if ($media >= 0.5) {
                            $esCorrecto  = true;
                            $tokensGanados = ($media >= 0.8) ? ($carta->puntos ?: 2) : (int)ceil(($carta->puntos ?: 2) / 2);
                            $puntosGanados = 1;
                            $mensaje = $media >= 0.8
                                ? "¡Aprobado por mayoría! +{$tokensGanados} ET"
                                : "Aprobado parcial. +{$tokensGanados} ET";
                        } else {
                            $penalizacion = $carta->penalizacion > 0 ? $carta->penalizacion : 1;
                            $mensaje = 'Propuesta rechazada por el grupo.';
                        }
                    }
                } else {
                    // Preguntas de tipo 'options': comparar con la opción correcta
                    $opcionCorrecta = $pregunta->opciones->where('correcta', 1)->first()
                                   ?? $pregunta->opciones->where('correcta', true)->first();

                    $valRecibida = trim((string) $voto->resultado);
                    $valEsperada = trim((string) ($opcionCorrecta->texto ?? ''));
                    $sonIguales  = (strcasecmp($valRecibida, $valEsperada) === 0);

                    if ($opcionCorrecta && $sonIguales) {
                        $tokensGanados = $carta->puntos > 0 ? $carta->puntos : 2;
                        $puntosGanados = 1;
                        $mensaje       = "¡Correcto! +{$tokensGanados} EcoFichas";
                        $esCorrecto    = true;
                    } else {
                        $penalizacion = $carta->penalizacion > 0 ? $carta->penalizacion : 1;
                        $mensaje      = "¡Incorrecto! -{$penalizacion} EcoFichas";
                    }
                }
            } else {
                // Carta sin pregunta (evento): siempre correcto
                $mensaje       = 'Evento procesado.';
                $esCorrecto    = true;
                $puntosGanados = 1;
            }

            $nuevasFichas   = max(0, $participacion->eco_fichas - $penalizacion + $tokensGanados);
            $nuevaPuntuacion = $participacion->puntuacion + $puntosGanados;

            DB::table('juego_participante')
                ->where('juego_id',        $juego->juego_id)
                ->where('participante_id', $participacion->participante_id)
                ->where('rol_id',          $participacion->rol_id)
                ->update(['eco_fichas' => $nuevasFichas, 'puntuacion' => $nuevaPuntuacion]);

            $feedbackMap[$participacion->participante_id] = [
                'correct' => $esCorrecto,
                'message' => $mensaje,
                'tokens'  => $nuevasFichas,
                'points'  => $nuevaPuntuacion,
            ];
        }

        return $feedbackMap;
    }

    protected function pickRandomCard($anilloId)
    {
        return Carta::where('anillo_id', $anilloId)->inRandomOrder()->first();
    }

    protected function formatChallenge(?Carta $carta, Juego $juego)
    {
        if (!$carta) return [];
        $pregunta = $carta->preguntas->first();
        return [
            'id' => "T{$juego->current_turn}-C" . ($carta->carta_id ?? 0),
            'type' => $pregunta ? $pregunta->tipo_pregunta : 'options',
            'title' => $pregunta ? $pregunta->texto : $carta->texto,
            'description' => $pregunta ? '' : $carta->texto, // Si hay pregunta, el título ya la muestra.
            'ring' => $juego->anillo ? $juego->anillo->nombre : 'General',
            'options' => $pregunta ? $pregunta->opciones->pluck('texto')->toArray() : [],
            'time' => $carta->tiempo ?? 20,
            'puntos' => $carta->puntos,
            'penalizacion' => $carta->penalizacion,
        ];
    }
}
