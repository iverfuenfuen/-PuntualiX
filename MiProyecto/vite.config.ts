import { fileURLToPath, URL } from 'node:url'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/**
 * Carpeta raíz del proyecto calculada desde este archivo.
 * IMPORTANTE (Windows): la terminal puede abrir la carpeta como "c:\..." o "C:\...".
 * Si la raíz sale de la terminal y el alias "@" de este archivo, Vite ve dos rutas distintas
 * para los mismos archivos y empaqueta React DOS veces ("Cannot read properties of null
 * (reading 'useContext')"). Usar una sola raíz para ambos evita el problema.
 */
const raiz = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  root: raiz,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Permite importar con "@/components/..." en lugar de rutas relativas largas
      '@': join(raiz, 'src'),
    },
    // Defensa adicional: nunca empaquetar más de una copia de estas librerías
    dedupe: ['react', 'react-dom', 'react-router'],
  },
})
