# Millores pendents

Llista de millores detectades a la revisió general del codi (octubre de 2026) que encara no s'han fet. Cada punt indica el problema, la proposta, la prioritat i una estimació d'esforç (S: unes hores, M: un o dos dies, L: més).

Quan en facis una, treu-la d'aquí al mateix commit.

## Diàlegs propis en lloc de `alert()` i `confirm()`

**Problema.** Les confirmacions (esborrar, sortir del grup, tancar sessió…) fan servir els diàlegs natius del navegador, que no segueixen l'estil de l'app i en algunes PWA instal·lades queden poc integrats.

**Proposta.** Un component `ConfirmDialog` basat en `src/components/Modal.tsx` i una funció `useConfirm()` que retorni una promesa, per substituir `confirm()` sense haver de reescriure la lògica de cada botó.

**Prioritat:** baixa · **Esforç:** S

## Versions majors de dependències

**Problema.** Hi ha versions majors noves de `lucide-react` (1.x) i `vite-plugin-pwa` (2.x). `npm audit` no troba vulnerabilitats, però quedar-se enrere fa més difícils les actualitzacions futures.

**Proposta.** Actualitzar-les en una branca a part, revisar les notes de canvis (noms d'icones a `lucide-react`, configuració del Service Worker a `vite-plugin-pwa`) i comprovar el build i la PWA amb `npm run build && npm run preview`.

**Prioritat:** baixa · **Esforç:** S
