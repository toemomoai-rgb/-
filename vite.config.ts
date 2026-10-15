import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative assets work on a GitHub Pages repository path as well as a local server.
export default defineConfig({ plugins: [react()], base: './' });
