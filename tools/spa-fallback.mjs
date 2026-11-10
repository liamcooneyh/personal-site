// GitHub Pages serves static files only. Copy the app shell to /art/ so that URL loads
// directly, and to 404.html so any other unknown path still boots the app.
import { copyFileSync, mkdirSync } from 'node:fs';

const shell = new URL('../dist/index.html', import.meta.url);
mkdirSync(new URL('../dist/art/', import.meta.url), { recursive: true });
copyFileSync(shell, new URL('../dist/art/index.html', import.meta.url));
copyFileSync(shell, new URL('../dist/404.html', import.meta.url));
