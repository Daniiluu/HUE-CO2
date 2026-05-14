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
     * Procesa los resultados del turno y transiciona a 'results'.
     * Llamado SOLO desde el endpoint /vote cuando llega el voto determinante.
     * Solo actúa si el estado es 'playing' o 'challenge' (idempotente).
     */
    public function transitionToResults(Juego $juego): void
    {
        if (!in_array($juego->estado, ['playing', 'challenge'])) return;

        DB::transaction(function () use ($juego) {
            $turnResults = $this->processTurnResults($juego);
            \Log::info('Turn results in transitionToResults', ['turnResults' => $turnResults]);

            $acierto = collect($turnResults)->where('correct', true)->count() > 0;
            \Illuminate\Support\Facades\Cache::put('juego_'.$juego->juego_id.'_last_correct', $acierto, 3600);

            $juego->estado = 'results';
            
            // Verificación de límite de temperatura (GameOver crítico)
            if ($juego->temperatura >= 1.0) {
                $juego->estado = 'ended';
                $juego->save();
                $this->broadcastState($juego, $turnResults, 'defeat');
                return;
            }

            $juego->save();
            $this->broadcastState($juego, $turnResults);
        });
    }

    /**
     * Avanza el estado del juego al siguiente reto (results -> playing).
     * Llamado SOLO desde el botón "Siguiente Reto" del tablero.
     * Si por algún motivo se llama en estado playing/challenge, hace FASE A primero.
     */
    public function advanceTurn(Juego $juego)
    {
        return DB::transaction(function () use ($juego) {
            // Si el juego ya terminó (por límite de temperatura o turnos), no permitir avanzar
            if ($juego->estado === 'ended') {
                return $juego;
            }

            $turnResults = [];

            // ── FASE A: Fallback si aún no se procesaron resultados ──────────
            if ($juego->estado === 'playing' || $juego->estado === 'challenge') {
                $turnResults = $this->processTurnResults($juego);

                $juego->estado = 'results';

                // Verificación de límite de temperatura (GameOver crítico)
                if ($juego->temperatura >= 1.0) {
                    $juego->estado = 'ended';
                    $juego->save();
                    $this->broadcastState($juego, $turnResults, 'defeat');
                    return $juego;
                }

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
            
            // --- ORDEN DE ANILLOS: leer de la BD para no hardcodear IDs ---
            $order = DB::table('anillos')->orderBy('orden')->pluck('anillo_id')->toArray();
            $phaseIndex = (int)floor(($juego->current_turn - 1) / 6);
            
            \Log::info("[HUE-CO2] Avanzando Turno: {$juego->current_turn} | Fase (anillo): " . ($phaseIndex + 1) . " de " . count($order));

            if ($phaseIndex >= count($order)) {
                \Log::info("[HUE-CO2] Juego finalizado tras " . $juego->current_turn . " turnos.");
                $juego->estado = 'ended';
                
                // Calcular resultado final basado en la temperatura
                $outcome = 'victory';
                if ($juego->temperatura >= 1.0) {
                    $outcome = 'defeat';
                } elseif ($juego->temperatura >= 0.5) {
                    $outcome = 'neutral';
                }
                
                $juego->save();
                $juego->load('anillo');
                $this->broadcastState($juego, [], $outcome);
                return $juego;
            }

            $nuevoAnilloId = $order[$phaseIndex];
            if ($juego->anillo_id !== $nuevoAnilloId) {
                \Log::info("[HUE-CO2] ¡Cambio de anillo! {$juego->anillo_id} → {$nuevoAnilloId}");
            }
            $juego->anillo_id = $nuevoAnilloId;
            $juego->load('anillo');
            \Log::info("[HUE-CO2] Anillo activo: {$juego->anillo_id} (" . ($juego->anillo->nombre ?? 'N/A') . ")");

            // Rotar al siguiente sector activo
            $this->selectNextActiveSector($juego);

            // Seleccionar nueva carta del anillo CALCULADO, sin repetir cartas previas
            $nuevaCarta = $this->pickRandomCard($juego, $juego->anillo_id);
            
            if ($nuevaCarta) {
                $juego->current_carta_id = $nuevaCarta->carta_id;
                $juego->estado = 'playing';
                \Log::info("[HUE-CO2] Carta elegida: ID {$juego->current_carta_id} | Título: " . ($nuevaCarta->texto ?? 'S/T'));
            } else {
                $juego->estado = 'ended';
            }

            $juego->last_turn_at = now();
            $juego->load('anillo'); // Forzar carga del nuevo nombre del anillo
            $juego->save();
            $juego->load('anillo');
            
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

        // Obtener los 6 sectores únicos de la base de datos y mezclarlos
        $rolesIds = DB::table('roles')->pluck('rol_id')->shuffle()->values();
        
        if (count($rolesIds) === 0) return;

        // Limpiar absolutamente todas las asignaciones previas de este juego
        // (Esto elimina los registros de 'espera' sin rol asignado)
        DB::table('juego_participante')->where('juego_id', $juego->juego_id)->delete();

        $inserts = [];

        // Reparto equitativo y único de los 6 roles entre los participantes conectados
        foreach ($rolesIds as $i => $rol_id) {
            $p = $participantes[$i % $numParticipantes];
            $inserts[] = [
                'juego_id'        => $juego->juego_id,
                'participante_id' => $p->participante_id,
                'rol_id'          => $rol_id,
                'eco_fichas'      => 12,
                'puntuacion'      => 0,
                'last_seen_at'    => now(),
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
        // Orden real del tablero (Empezando desde arriba en sentido horario)
        // Público (Top) -> Ciudadanía (Right) -> Textil (Bottom-Right) -> Ciencia (Bottom-Left) -> Tech (Left) -> Primario (Top-Left)
        $clockwiseOrder = ['publico', 'ciudadania', 'textil', 'ciencia', 'tech', 'primario'];
        
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
    protected function broadcastState(Juego $juego, array $turnResults = [], ?string $outcome = null)
    {
        $activeRol = DB::table('roles')->where('rol_id', $juego->current_rol_id)->first();
        $activeSectorSlug = $activeRol ? $activeRol->slug : null;

        $sectorsData = DB::table('juego_participante')
            ->join('participantes', 'juego_participante.participante_id', '=', 'participantes.participante_id')
            ->leftJoin('roles', 'juego_participante.rol_id', '=', 'roles.rol_id')
            ->where('juego_participante.juego_id', $juego->juego_id)
            ->select('participantes.usuario', 'juego_participante.participante_id', 'roles.slug', 'juego_participante.eco_fichas', 'juego_participante.puntuacion')
            ->get()
            ->map(function ($row) use ($juego) {
                // Calcular qué anillos ha completado este participante
                $turns = DB::table('turnos')
                    ->join('cartas', 'turnos.carta_id', '=', 'cartas.carta_id')
                    ->where('turnos.juego_id', $juego->juego_id)
                    ->where('turnos.participante_id', $row->participante_id)
                    ->pluck('turnos.is_correct', 'cartas.anillo_id')
                    ->toArray();

                $ringResults = [];
                for ($i = 1; $i <= 5; $i++) {
                    $ringResults[] = isset($turns[$i]) ? (bool)$turns[$i] : false;
                }

                return [
                    'id' => $row->slug ?: 'ciudadania',
                    'playerName' => $row->usuario,
                    'participanteId' => (int) $row->participante_id,
                    'tokens' => $row->eco_fichas,
                    'points' => $row->puntuacion,
                    'ringResults' => $ringResults,
                ];
            })->toArray();

        $carta = Carta::find($juego->current_carta_id);
        $challengeData = $this->formatChallenge($carta, $juego);
        $challengeData['activeSectorId'] = $activeSectorSlug;
        $challengeData['anillo_id']      = $juego->anillo_id;
        $challengeData['visual_phase']   = (int)ceil($juego->current_turn / 6);

        try {
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
                $juego->total_calentamiento,
                $juego->total_reduccion,
                \Illuminate\Support\Facades\Cache::get('juego_'.$juego->juego_id.'_last_correct', false),
                $outcome
            );
        } catch (\Exception $e) {
            \Log::warning('[HUE-CO2] Error en broadcast: ' . $e->getMessage());
        }
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

            // Fallback: En preguntas 'free' o 'validate', el resultado puede venir de otros registros de turno
            if (!$voto && $pregunta && in_array($pregunta->tipo_pregunta, ['free', 'validate'])) {
                $votoValidador = Turno::where([
                    'juego_id' => $juego->juego_id,
                    'carta_id' => $juego->current_carta_id
                ])->whereNotNull('resultado')->first();
                
                if ($votoValidador) {
                    $voto = $votoValidador;
                }
            }

            $tokensGanados = 0; $puntosGanados = 0; $penalizacion = 0; $esCorrecto = false; $resultado = null; $isPartial = false;

            // Verificamos si realmente no hay voto (ni directo ni por validación) o si el resultado está vacío
            if (!$voto || (isset($voto->resultado) && ($voto->resultado === null || $voto->resultado === ''))) {
                \Log::info("[HUE-CO2] Time Over detectado para el sector activo. Aplicando penalización.");
                $penalizacion = 2;
                $mensaje = '¡Tiempo agotado! -2 EcoFichas';
                $esCorrecto = false; // Aseguramos que se cuente como fallo para subir temperatura
            } elseif ($pregunta) {
                if (in_array($pregunta->tipo_pregunta, ['free', 'validate'])) {
                    // Lógica de Consenso: votos de los DEMÁS participantes
                    $votosConsenso = Turno::where([
                        'juego_id' => $juego->juego_id,
                        'carta_id' => $juego->current_carta_id
                    ])->where('participante_id', '!=', $participacion->participante_id)->get();

                    if ($votosConsenso->isEmpty()) {
                        $penalizacion = 1;
                        $mensaje = 'Nadie ha evaluado la respuesta.';
                    } else {
                        $puntosTotales = 0;
                        foreach ($votosConsenso as $v) {
                            if ($v->resultado === 'valid')   $puntosTotales += 1;
                            elseif ($v->resultado === 'partial') $puntosTotales += 0.5;
                        }
                        $totalVotos = $votosConsenso->count();
                        $media = $puntosTotales / ($totalVotos ?: 1);

                        if ($media >= 0.5) {
                            $esCorrecto  = true;
                            $tokensGanados = ($media >= 0.8) ? ($carta->puntos ?: 2) : (int)ceil(($carta->puntos ?: 2) / 2);
                            $puntosGanados = 1;
                            $isPartial = ($media < 0.8);
                            $mensaje = $media >= 0.8
                                ? "¡Aprobado por mayoría! +{$tokensGanados} ET"
                                : "Aprobado parcial. +{$tokensGanados} ET";
                        } else {
                            $penalizacion = $carta->penalizacion > 0 ? $carta->penalizacion : 1;
                            $mensaje = 'Respuesta rechazada por el grupo.';
                        }
                    }
                } elseif ($pregunta->tipo_pregunta === 'slider') {
                    // Lógica para Slider: comprobar si el valor está cerca de la respuesta correcta
                    $valorElegido = (float) $voto->resultado;
                    $valorCorrecto = (float) ($pregunta->respuesta_correcta ?? 50);
                    
                    // Margen de error del 10%
                    $margen = 5; 
                    $esCorrecto = abs($valorElegido - $valorCorrecto) <= $margen;

                    if ($esCorrecto) {
                        $tokensGanados = $carta->puntos > 0 ? $carta->puntos : 2;
                        $puntosGanados = 1;
                        $mensaje = "¡Excelente estimación! +{$tokensGanados} ET";
                    } else {
                        $penalizacion = $carta->penalizacion > 0 ? $carta->penalizacion : 1;
                        $mensaje = "Cerca, pero no. El valor era {$valorCorrecto}.";
                    }
                } else {
                    // Preguntas de tipo 'options': comparar con la opción correcta
                    $opcionCorrecta = $pregunta->opciones->where('correcta', 1)->first()
                                   ?? $pregunta->opciones->where('correcta', true)->first();

                    $valRecibida = trim((string) $voto->resultado);
                    $valEsperada = trim((string) ($opcionCorrecta->texto ?? ''));
                    $sonIguales  = (strcasecmp($valRecibida, $valEsperada) === 0);

                    \Log::info('Evaluando options', [
                        'valRecibida' => $valRecibida,
                        'valEsperada' => $valEsperada,
                        'sonIguales' => $sonIguales,
                        'opcionCorrecta' => $opcionCorrecta ? $opcionCorrecta->toArray() : null
                    ]);

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

            // Actualizar temperatura global y contadores
            if ($carta->tipo === 'evento') {
                $cambio = ($carta->cambio_temp ?? 0);
                $juego->temperatura += $cambio;
                if ($cambio > 0) $juego->total_calentamiento += $cambio;
                if ($cambio < 0) $juego->total_reduccion += abs($cambio);
                \Log::info("[HUE-CO2] Cambio Temp (Evento): {$cambio} | Total: {$juego->temperatura}");
            } else {
                if ($esCorrecto && !$isPartial) {
                    $juego->temperatura -= 0.1;
                    $juego->total_reduccion += 0.1;
                    \Log::info("[HUE-CO2] Cambio Temp (Acierto/Evento OK): -0.1 | Total: {$juego->temperatura}");
                } elseif ($isPartial) {
                    // Parcial: Neutral, no cambia la temperatura
                    \Log::info("[HUE-CO2] Cambio Temp (Parcial): 0 | Total: {$juego->temperatura}");
                } else {
                    $juego->temperatura += 0.1;
                    $juego->total_calentamiento += 0.1;
                    \Log::info("[HUE-CO2] Cambio Temp (Fallo/Timeout): +0.1 | Total: {$juego->temperatura}");
                }
            }

            $feedbackMap[$participacion->participante_id] = [
                'correct' => $esCorrecto,
                'message' => $mensaje,
                'tokens'  => $nuevasFichas,
                'points'  => $nuevaPuntuacion,
            ];

            // ACTUALIZAR EL TURNO CON EL RESULTADO FINAL
            if ($voto) {
                $voto->update(['is_correct' => $esCorrecto]);
            }
        }

        $juego->save();
        return $feedbackMap;
    }

    protected function pickRandomCard(Juego $juego, $anilloId)
    {
        // Obtener los IDs de las cartas que ya se han jugado en este juego
        $cartasJugadas = DB::table('turnos')
            ->where('juego_id', $juego->juego_id)
            ->whereNotNull('carta_id')
            ->pluck('carta_id')
            ->toArray();

        // Elegir una carta del anillo que no se haya jugado y que sea de tipo 'pregunta'
        $carta = Carta::where('anillo_id', $anilloId)
            ->where('tipo', 'pregunta')
            ->whereHas('preguntas')
            ->whereNotIn('carta_id', $cartasJugadas)
            ->inRandomOrder()
            ->first();

        // Si por alguna razón nos quedamos sin cartas, repetimos de las que hay en el anillo (solo preguntas)
        if (!$carta) {
            $carta = Carta::where('anillo_id', $anilloId)
                ->where('tipo', 'pregunta')
                ->whereHas('preguntas')
                ->inRandomOrder()
                ->first();
        }

        return $carta;
    }

    protected function formatChallenge(?Carta $carta, Juego $juego)
    {
        if (!$carta) return [];
        $pregunta = $carta->preguntas->first();
        $activeRol = \Illuminate\Support\Facades\DB::table('roles')->where('rol_id', $juego->current_rol_id)->first();
        
        $tipoBase = $pregunta ? $pregunta->tipo_pregunta : 'options';
        $opciones = $pregunta ? $pregunta->opciones->pluck('texto')->toArray() : [];

        // Autocorrección de tipo
        if ($tipoBase === 'options' && $pregunta && empty($opciones)) {
            $tipoBase = 'free';
        }

        // Buscar propuesta activa solo si es pregunta abierta
        $propuestaActiva = null;
        if ($tipoBase === 'free') {
            $propuestaActiva = Turno::where([
                'juego_id' => $juego->juego_id,
                'carta_id' => $carta->carta_id,
                'participante_id' => DB::table('juego_participante')
                    ->where('juego_id', $juego->juego_id)
                    ->where('rol_id', $juego->current_rol_id)
                    ->value('participante_id')
            ])->value('resultado');
        }

        return [
            'id' => $carta->carta_id,
            'type' => $propuestaActiva ? 'validate' : $tipoBase,
            'title' => $pregunta ? $pregunta->texto : $carta->texto,
            'description' => $pregunta ? '' : $carta->texto,
            'ring' => $juego->anillo ? $juego->anillo->nombre : 'General',
            'anillo_id' => $juego->anillo_id,
            'options' => $opciones,
            'proposal' => $propuestaActiva,
            'time' => $carta->tiempo ?? 20,
            'puntos' => $carta->puntos,
            'penalizacion' => $carta->penalizacion,
            'activeSectorId' => $activeRol ? $activeRol->slug : null,
            'turn' => (($juego->current_turn - 1) % 6) + 1,
        ];
    }

    /**
     * Redistribuye los roles de los jugadores inactivos entre los que siguen conectados.
     */
    public function redistributeInactiveRoles(Juego $juego)
    {
        // 1. Identificar participantes inactivos (más de 25 segundos sin señales)
        $threshold = now()->subSeconds(25);
        
        $inactivosIds = DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where(function($query) use ($threshold) {
                $query->where('last_seen_at', '<', $threshold)
                      ->orWhereNull('last_seen_at');
            })
            ->pluck('participante_id')
            ->unique()
            ->toArray();

        if (empty($inactivosIds)) return;

        // 2. Identificar participantes ACTIVOS
        $activosIds = DB::table('juego_participante')
            ->where('juego_id', $juego->juego_id)
            ->where('last_seen_at', '>=', $threshold)
            ->pluck('participante_id')
            ->unique()
            ->toArray();

        // Si no hay nadie activo, no podemos redistribuir
        if (empty($activosIds)) return;

        \Log::info("[HUE-CO2] Reasignando sectores de " . count($inactivosIds) . " jugadores inactivos en sala {$juego->room_code}");

        // 3. Reasignar cada sector del inactivo a un activo al azar
        foreach ($inactivosIds as $inactivoId) {
             $roles = DB::table('juego_participante')
                ->where('juego_id', $juego->juego_id)
                ->where('participante_id', $inactivoId)
                ->whereNotNull('rol_id')
                ->pluck('rol_id');

             if ($roles->isEmpty()) {
                 DB::table('juego_participante')
                    ->where('juego_id', $juego->juego_id)
                    ->where('participante_id', $inactivoId)
                    ->delete();
                 continue;
             }

             foreach($roles as $rolId) {
                $nuevoDuenioId = $activosIds[array_rand($activosIds)];
                
                \Log::info("[HUE-CO2] Trasladando rol {$rolId} de participante {$inactivoId} a {$nuevoDuenioId}");
                
                DB::table('juego_participante')
                    ->where('juego_id', $juego->juego_id)
                    ->where('participante_id', $inactivoId)
                    ->where('rol_id', $rolId)
                    ->update(['participante_id' => $nuevoDuenioId]);
             }

             // Notificar en el chat antes de borrar definitivamente
             $nombreInactivo = DB::table('participantes')->where('participante_id', $inactivoId)->value('usuario') ?? 'Un jugador';
             try {
                 event(new \App\Events\ChatMessageReceived($juego->room_code, 'Sistema', "El jugador {$nombreInactivo} se ha desconectado. Sus sectores han sido reasignados."));
             } catch (\Exception $e) {
                 \Log::error("[HUE-CO2] Error enviando mensaje de desconexión: " . $e->getMessage());
             }
             
             DB::table('juego_participante')
                ->where('juego_id', $juego->juego_id)
                ->where('participante_id', $inactivoId)
                ->delete();
        }
        
        $juego->load('participantes');
    }
}
