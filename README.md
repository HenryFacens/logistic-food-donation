# Hackathon BCG — PWA

PWA com Vite + React + TypeScript + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/).

## Comandos

```bash
npm install
npm run dev       # dev server (service worker habilitado em dev)
npm run build     # build de produção em dist/
npm run preview   # serve o build em http://localhost:4173
```

## O que já vem pronto

- **Manifest** (`vite.config.ts`): nome, cores, `display: standalone`.
- **Ícones** gerados automaticamente a partir de `public/logo.svg` (troque o SVG e rode o build).
- **Service worker** (Workbox) com precache de todo o app → funciona offline.
- **Aviso de atualização** (`src/pwa/ReloadPrompt.tsx`): avisa quando há nova versão.
- **Botão de instalar** (`src/pwa/useInstallPrompt.ts`) e indicador online/offline.

## Testando no celular

Service workers exigem HTTPS (exceto em `localhost`). Para testar no celular,
faça deploy (Vercel, Netlify, Cloudflare Pages) apontando para `dist/`,
ou use um túnel como `npx localtunnel --port 4173`.
