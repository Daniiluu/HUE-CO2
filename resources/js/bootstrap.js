import axios from 'axios';
window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
// Laravel SPA CSRF: usar cookies en lugar de leer meta tag
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Determinar qué driver de transmisión usar (pusher o reverb)
const broadcastConnection = import.meta.env.VITE_BROADCAST_CONNECTION || 'reverb';
const reverbKey = import.meta.env.VITE_REVERB_APP_KEY;
const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;

if (broadcastConnection === 'pusher' && pusherKey) {
    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: pusherKey,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'eu',
        forceTLS: true,
        enabledTransports: ['ws', 'wss'],
        activityTimeout: 10000,
        pongTimeout: 5000,
        unavailable_timeout: 2000,
    });
    console.log('[HUE-CO2] Echo inicializado con Pusher en la nube.');
} else if (reverbKey) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocal) {
        window.Echo = new Echo({
            broadcaster: 'reverb',
            key: reverbKey,
            wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
            wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
            wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
            forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
            enabledTransports: ['ws', 'wss'],
            activityTimeout: 10000,
            pongTimeout: 5000,
            unavailable_timeout: 2000,
        });
        console.log('[HUE-CO2] Echo inicializado con Reverb local.');
    } else {
        // En túneles locales (como Ngrok) sin HTTPS real o en hosts no locales sin clave
        window.Echo = null;
        console.info('[HUE-CO2] Entorno de desarrollo no local detected. Echo desactivado, se usará polling.');
    }
} else {
    console.info('[HUE-CO2] Transmisión no configurada o claves ausentes — modo offline/local.');
}

// Silenciar logs de Pusher en producción/desarrollo para no saturar la consola
Pusher.logToConsole = false;

