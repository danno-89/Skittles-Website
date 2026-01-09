import { defineConfig } from 'vite';
import { glob } from 'glob';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: '*.png',
                    dest: '.'
                },
                // Removed jpg/jpeg/svg as they appear missing and cause build errors
                {
                    src: '*.css',
                    dest: '.'
                }
            ]
        })
    ],
    // Serve files from the 'public' directory
    root: 'public',

    // Load .env files from the project root
    envDir: '../',

    // Disable the default 'public' directory copy behavior since we serve directly from it
    publicDir: false,

    server: {
        open: true
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: Object.fromEntries(
                glob.sync('public/**/*.html').filter(file => {
                    // Only include actual HTML pages (containing <html or <!DOCTYPE), not partials
                    try {
                        const content = fs.readFileSync(file, 'utf-8');
                        const isPage = /<html/i.test(content) || /<!DOCTYPE/i.test(content);
                        return isPage;
                    } catch (e) {
                        return false;
                    }
                }).map(file => [
                    // This remove `public/` as well as the file extension from each
                    // file, so e.g. public/nested/foo.js becomes nested/foo
                    path.relative(
                        'public',
                        file.slice(0, file.length - path.extname(file).length)
                    ),
                    // This expands the relative paths to absolute paths, which would otherwise
                    // not match the files in the src/ directory.
                    fileURLToPath(new URL(file, import.meta.url))
                ])
            ),
        }
    }
});
