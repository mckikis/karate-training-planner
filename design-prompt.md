# Prompt used to create the design document

> Podľa šablóny od profesora. Tento prompt (spolu s `SPEC.md`, `project.md` a prístupom k repozitáru) sa dá poslať LLM; výsledkom je `karate-training-planner-design.md`.

---

Create a design document md file that I can pass to an LLM for implementation. If there are any questions, ask before creating the document.

The document must contain: goal and scope, decisions, current codebase baseline, data model and interfaces, business rules, UI (routes, screens, Slovak vocabulary), affected files, acceptance criteria → verification matrix, authoritative test commands, implementation order (each step = one run of `/implement <doc> <step>`), risks, out of scope.

**Application:** Karate Training Planner – an iPhone app for karate coaches of the club Katsudo Sabinov. Coaches keep a library of exercises in categories and build trainings; the app calculates the duration and the time schedule of a training.

**Technology:**
- PWA: React 19 + TypeScript + Vite 8, vite-plugin-pwa, installed on iPhone via Safari "Add to Home Screen" (no Mac, no App Store, free)
- Data only on the phone: IndexedDB via Dexie 4 (+ dexie-react-hooks); no backend, no accounts, works offline
- react-router with HashRouter, hosting on GitHub Pages via GitHub Actions
- Drag-and-drop: @dnd-kit
- Tests: Vitest + fake-indexeddb; lint: oxlint
- UI in Slovak, code in English

**Acceptance criteria:**

<vase_akceptacne_kriteria>
- K1: Pri prvom spustení appka obsahuje 17 predvolených kategórií s cvikmi (napr. „Údery - karate" má 13 cvikov); opakované spustenie nevytvorí duplikáty.
- K2: Ku cviku sa dá nahrať fotka, GIF alebo krátke video; video sa prehráva dookola bez zvuku.
- K3: Súbor väčší ako 40 MB sa neuloží a zobrazí sa chyba.
- K4: V zozname „Všetky" sa z kategórie ukáže max. 7 cvikov a tlačidlo „Zobraziť viac (6)" pri 13 cvikoch.
- K5: Obľúbený cvik (hviezdička) je v zozname aj vo výbere cvikov navrchu.
- K6: Cvik sa dá skryť a znova zobraziť; skrytie nezmení uložené tréningy.
- K7: Poradie kategórií, cvikov a tréningov sa dá zmeniť ťahaním a zostane uložené po reštarte.
- K8: Kategórie Rozcvička, Dynamický strečing, Statický strečing a Hry sú len na čas (bez prepínača opakovania/čas).
- K9: Cvik 3 série × 10 opak. × 2 s, oddych 30 s trvá 2:00 min; s prestávkou 60 s pred ďalším cvikom 3:00 min.
- K10: Tréning so začiatkom 17:00, cvik 15:00 min, prestávka 2:00, cvik 3:00 → druhý cvik 17:17 – 17:20.
- K11: Prestávka po poslednom cviku sa do celkového času nepočíta.
- K12: Po zmene poradia cvikov v tréningu sa časy prepočítajú.
- K13: Tréning sa dá označiť ako odtrénovaný s menom trénera a označenie sa dá zrušiť.
- K14: Vymazanie tréningu vyžaduje potvrdenie.
- K15: Appka sa dá pridať na plochu iPhonu a otvára sa bez lišty Safari.
- K16: V režime lietadlo appka funguje vrátane obrázkov a ukladania.
- K17: „Vymazať všetky dáta" (s dvojitým potvrdením) vráti appku do stavu po inštalácii.
- K18: Po aktualizácii appky zostanú všetky staré tréningy a cviky zachované.
</vase_akceptacne_kriteria>
