# App Lembretes

MVP mobile local-first para lembretes pontuais e recorrentes, criado a partir do planejamento em `planejamento-app-lembretes.md`.

## Stack

- React Native com Expo
- TypeScript
- SQLite local
- Drizzle ORM
- Expo Notifications
- Luxon para datas e timezones

## Rodando o projeto

Instale as dependencias, alinhe os pacotes nativos com o SDK do Expo e inicie o app:

```bash
npm install
npx expo install --fix
npm run start
```

Quando usar outro gerenciador, mantenha os scripts equivalentes para `start`, `android`, `ios`, `web` e `typecheck`.

## Estado atual

A Fase 1 do planejamento foi iniciada:

- projeto Expo configurado manualmente;
- navegacao com abas;
- telas basicas de Hoje, Proximos, Calendario e Novo lembrete;
- criacao/listagem em memoria para validar o fluxo inicial;
- schema Drizzle para as entidades principais;
- migration SQL inicial;
- services e repositories iniciais para evoluir a persistencia.
