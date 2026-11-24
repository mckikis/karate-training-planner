# Karate Training Planner

Webová aplikácia pre trénerov karate klubu **Katsudo Sabinov**. Tréneri si v nej vedú databázu cvikov s fotkami, GIFmi alebo videami a skladajú z nich tréningy. Appka vypočíta dĺžku tréningu a časový rozvrh, počas tréningu slúži ako časomiera.

**Aplikácia:** <https://mckikis.github.io/karate-training-planner/>

## Čo v nej tréneri robia

- **Cviky** – základná sada karate cvikov v kategóriách, vlastné cviky s fotkou, GIFom alebo videom, hľadanie, obľúbené, skrývanie a vlastné poradie.
- **Tréningy** – tréning s časťami Rozcvička, Hlavná časť a Záver. Pri každom cviku sa nastavia série, opakovania alebo čas a pauzy. Appka ukáže dĺžku tréningu aj rozvrh. Tréning sa dá skopírovať, filtrovať podľa typu a skupiny.
- **Časomiera** – odpočet na celú obrazovku: vlastné série a pauzy alebo celý tréning cvik po cviku a s pípaním.
- **Spoločné dáta** – tréner sa prihlási menom a prihlasovacím kľúčom od správcu. Cviky a tréningy sa zdieľajú medzi trénermi (súkromné vidí len autor), appka funguje aj bez internetu.

## Inštalácia do telefónu

- **iPhone:** otvor adresu v Safari → Zdieľať → **Pridať na plochu**.
- **Android:** otvor adresu v Chrome → ponuka ⋮ → **Inštalovať aplikáciu**.

## Dokumenty

| Súbor | Obsah |
| --- | --- |
| [PROJECT.md](PROJECT.md) | problém, používatelia, MVP, epiky a user stories |
| [SPEC.md](SPEC.md) | funkcie, akceptačné kritériá, obmedzenia, mimo rozsahu |
| [DESIGN.md](DESIGN.md) | architektúra, dátový model, rozhodnutia, riziká |
| [karate-training-planner-design.md](karate-training-planner-design.md) | implementačná špecifikácia verzie 1 pre AI agentov (`/implement`) |
| [FIREBASE.md](FIREBASE.md) | nastavenie Firebase a prihlasovacích kľúčov |
| [CLAUDE.md](CLAUDE.md) | pravidlá projektu pre AI agentov |

## Vývoj

```
npm ci
npm run dev
```

Kontrola pred odoslaním: `npm run typecheck`, `npm run lint`, `npm run build`. Každý push do vetvy `main` aplikáciu zostaví a zverejní na GitHub Pages.

© Kristína Šimčíková 2026
