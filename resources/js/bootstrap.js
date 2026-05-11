import axios from 'axios';
window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
// Laravel SPA CSRF: usar cookies en lugar de leer meta tag
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Solo inicializar Echo/Reverb si la clave está configurada.
const reverbKey = import.meta.env.VITE_REVERB_APP_KEY;
if (reverbKey) {
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
    } else {
        // En Ngrok desactivamos Echo para evitar errores rojos en consola.
        // useGameChannel.js usará polling automáticamente.
        window.Echo = null;
    }
    
    // Silenciar logs de Pusher en producción/desarrollo para no saturar la consola
    Pusher.logToConsole = false; 
} else {
    console.info('[HUE-CO2] Reverb no configurado — modo offline/local.');
}
