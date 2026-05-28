<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot()
    {
        $host = request()->header('host', '') . ' ' . request()->header('x-forwarded-host', '');
        $isNgrok = str_contains($host, 'ngrok') || str_contains($host, 'loca.lt');

        // Forzar HTTPS si estamos en producción o accediendo por ngrok
        if (config('app.env') !== 'local' || $isNgrok) {
            URL::forceScheme('https');
        }

        // Si accedemos por tunnel (ngrok, localtunnel), obligamos a Vite a ignorar el servidor de desarrollo (npm run dev)
        // Esto hace que cargue los archivos compilados en public/build, evitando la pantalla en blanco
        if ($isNgrok) {
            Vite::useHotFile(storage_path('vite.hot.fake'));
        }
    }
}
