import { defineConfig } from 'vite';

export default defineConfig({
    // Serve files from the 'public' directory
    // This makes http://localhost:5173/ map to public/index.html
    root: 'public',

    // Load .env files from the project root (one level up from 'public')
    envDir: '../',

    // Disable the default 'public' directory copy behavior since we serve directly from it
    publicDir: false,

    server: {
        // Open the browser automatically
        open: true
    }
});
