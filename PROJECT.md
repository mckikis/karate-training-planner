# PROJECT – Karate Training Planner

## Problém
- Trénerom karate chýba digitálny nástroj na zapisovanie karate cvikov s vizuálnymi referenciami (obrázkami alebo GIFmi) a na ich jednoduché zostavenie do štruktúrovaných tréningových plánov.

## Používatelia
- Tréneri karate v našom klube.

## MVP
- Databáza cvikov
V aplikácii je od začiatku základná sada cvikov, ktoré pridám pri implementácii.
Môžem pridať vlastný cvik: názov, kategória, krátky popis a fotka, GIF alebo krátke video z telefónu.
Cviky sú rozdelené do kategórií: karate údery, karate kopy, reakcia, pohyb, rozcvička, hry, plyometria, silový tréning – vrch, silový tréning – nohy, mobilita, statický strečing, dynamický strečing, taktika.
Môžem pridať vlastnú kategóriu.
- Vytvorenie tréningu
Zaškrtnem cviky, ktoré chcem, a dajú sa do prehľadného zoznamu.
Tréning má názov, dátum, popis a značku typu tréningu (údery, kopy, taktika, kondícia, prípravka, plyometria…).
- Dĺžka tréningu
Pri každom cviku nastavím počet sérií, čas jednej série (alebo počet opakovaní × sekundy na opakovanie) a pauzu.
Aplikácia ukáže čas každého cviku aj celkovú dĺžku tréningu: čas cviku = série × čas série + pauzy medzi sériami + pauza pred ďalším cvikom
- Uložené tréningy – zoznam tréningov, ktoré môžem otvoriť, upraviť alebo zmazať.

## Non-goals (MVP)
Tieto veci nie sú súčasťou MVP. Prídu v ďalšej verzii (verzia 2), časť z nich je v aplikácii už doplnená – pozri kapitolu *Verzia 2* nižšie.

| Nie v MVP | Dôvod | Ďalšia verzia |
| --- | --- | --- |
| Časomiera na celú obrazovku počas tréningu (aktuálny cvik, séria, ďalší cvik, pauza) | Prvá verzia rieši plánovanie. | Verzia 2 – záložka **Časomiera** (Epic 6). |
| Účty, synchronizácia, zdieľanie tréningov s inými trénermi | Pribudol by server a prihlasovanie. | Verzia 2 – prihlásenie menom a kľúčom, spoločné dáta vo Firebase (Epic 7). |
| Záloha a prenos dát do iného telefónu | Dáta sú v MVP len v jednom telefóne. | Verzia 2 – dáta sú vo Firebase, tréner sa prihlási na hocijakom telefóne (Epic 7). |
| Zmena poradia cvikov ťahaním | Na prvú verziu stačí poradie zaškrtnutia. | Doplnené – poradie cvikov, kategórií a tréningov sa mení ťahaním. |
| Zverejnenie v App Store | Aplikácia je pre tréningy nášho klubu, inštalácia cez Safari stačí. | Neplánuje sa. |
| História tréningov, štatistiky, dochádzka | Nepomáhajú s hlavným problémom. | Neplánuje sa. |

## Technológie
- Rozhranie: React + TypeScript (obrazovky aplikácie)
- Zostavenie projektu: Vite (spustenie počas vývoja a zostavenie appky), PWA – inštalácia na plochu telefónu
- Databáza v MVP: IndexedDB cez knižnicu Dexie.js (cviky, tréningy, fotky a videá uložené v telefóne)
- Databáza vo verzii 2: Firebase (Authentication + Firestore) s offline kópiou v telefóne, zadarmo (plán Spark)
- Fotky a videá: výber súboru z telefónu (médiá k cvikom)
- Hosting: GitHub Pages cez GitHub Actions
- Nástroje: VS Code, Node.js, Git + GitHub, Claude Code (písanie kódu a verzie projektu)


## Initiative
**Zjednodušiť a zrýchliť prípravu tréningov v našom karate klube.**
Čas potrebný na prípravu jedného tréningu skrátiť z približne 30 minút na 10 minút a do konca semestra (december 2026) plánovať všetky tréningy klubu v aplikácii.

## Epics a user stories
### Epic 1: Databáza cvikov s obrázkami a videami
- **User story:** Ako tréner chcem mať v aplikácii hneď od začiatku základné karate cviky rozdelené do kategórií, aby som nemusela všetko zadávať ručne.
  - Tasky: zoznam predvolených kategórií a cvikov, uloženie do lokálnej databázy pri prvom spustení, obrazovka so zoznamom cvikov
- **User story:** Ako tréner chcem pridať vlastný cvik s fotkou, GIFom alebo krátkym videom, aby som si pamätala, ako sa cvik robí.
  - Tasky: formulár na nový cvik, výber fotky/videa z telefónu, uloženie média do databázy, prehrávanie GIFu/videa v slučke
- **User story:** Ako tréner chcem pridať vlastnú kategóriu cvikov, aby som si cviky mohla triediť podľa seba.
  - Tasky: tlačidlo „+ Kategória“, uloženie kategórie, filter cvikov podľa kategórie
- **User story:** Ako tréner chcem cvik vyhľadať podľa názvu, aby som ho rýchlo našla aj vo veľkej databáze.
  - Tasky: vyhľadávacie pole, filtrovanie zoznamu

### Epic 2: Zostavenie tréningu
- **User story:** Ako tréner chcem zaškrtnúť cviky z databázy, aby som rýchlo poskladala tréning bez písania.
  - Tasky: obrazovka výberu cvikov s obrázkami, zaškrtávanie s poradím, prenos vybraných cvikov do tréningu
- **User story:** Ako tréner chcem tréningu dať názov, dátum, popis a typ (údery, kopy, prípravka…), aby som tréningy vedela od seba odlíšiť.
  - Tasky: formulár tréningu, zoznam typov tréningu, uloženie tréningu do databázy

### Epic 3: Dĺžka a časový rozvrh tréningu
- **User story:** Ako tréner chcem pri každom cviku nastaviť počet sérií, čas alebo opakovania a pauzy, aby aplikácia vypočítala dĺžku celého tréningu.
  - Tasky: polia pre série, opakovania, čas a pauzy, funkcia na výpočet času cviku a celkového času, zobrazenie súčtu počas zostavovania
- **User story:** Ako tréner chcem zadať, o koľkej tréning začína, aby som pri každom cviku videla, od kedy do kedy sa má cvičiť (napr. 17:17 – 17:20), a tréning som stihla načas.
  - Tasky: pole „Začiatok“, výpočet časov začiatku a konca cvikov, zobrazenie prestávok medzi cvikmi

### Epic 4: Správa uložených tréningov
- **User story:** Ako tréner chcem vidieť zoznam svojich tréningov podľa dátumu, aby som rýchlo našla tréning na najbližšiu hodinu.
  - Tasky: obrazovka so zoznamom tréningov, zoradenie podľa dátumu, zobrazenie celkového času
- **User story:** Ako tréner chcem uložený tréning otvoriť, upraviť alebo zmazať, aby som ho vedela prispôsobiť skupine.
  - Tasky: detail tréningu s obrázkami cvikov, úprava tréningu, mazanie s potvrdením

### Epic 5: Používanie v telefóne bez internetu
- **User story:** Ako tréner chcem mať aplikáciu na ploche iPhonu a používať ju v telocvični aj bez internetu, aby som počas tréningu nebola závislá od signálu ani notebooku.
  - Tasky: nastavenie PWA (ikona, režim na celú obrazovku), offline režim, zverejnenie cez GitHub Pages
- **User story:** Ako tréner chcem, aby moje cviky, fotky a tréningy ostali uložené v telefóne aj po zatvorení aplikácie, aby som o ne neprišla.
  - Tasky: lokálna databáza IndexedDB (Dexie.js), požiadavka na trvalé uloženie dát

## Verzia 2 (ďalšia verzia, mimo MVP)
Funkcie, ktoré v MVP neboli (pozri *Non-goals*). V aplikácii sú už doplnené.

### Epic 6: Časomiera počas tréningu
- **User story:** Ako tréner chcem mať počas tréningu na celej obrazovke odpočet s aktuálnym cvikom, sériou a ďalším cvikom, aby som nemusela sledovať hodinky.
  - Tasky: záložka Časomiera, vlastný odpočet (série, čas, pauza, odpočet pred začiatkom) alebo časomiera podľa tréningu, pípanie 3-2-1 a dlhé pípnutie na začiatku a konci, pauza, posun o 10 s, ďalšia/predchádzajúca časť, veľký čas na výšku aj na šírku
- **User story:** Ako tréner chcem, aby si dvojice počas série vymenili úlohy a aby appka pípla pred koncom kola (atoshi baraku), aby deti vedeli, kedy zabrať.
  - Tasky: výmena počas série (výmena po N s, čas na výmenu), atoshi baraku 15 s pred koncom, nastavenie pri každom cviku tréningu

### Epic 7: Spoločné dáta trénerov
- **User story:** Ako tréner sa chcem prihlásiť menom a prihlasovacím kľúčom od správcu, aby som mala svoje cviky a tréningy na každom telefóne.
  - Tasky: Firebase Authentication, kľúče v databáze, zapamätanie prihlásenia, offline kópia dát, presun dát zo staršej verzie do Firebase
- **User story:** Ako tréner chcem vidieť cviky a tréningy ostatných trénerov, ale meniť a mazať len svoje, aby si tréneri navzájom nič nepokazili.
  - Tasky: autor pri cviku a tréningu, prepínač „Zobraziť aj … iných trénerov“, súkromné cviky, kategórie a tréningy (🔒), pravidlá prístupu `firestore.rules`
- **User story:** Ako správca chcem upravovať a mazať všetky cviky vrátane predvolených a nastaviť poradie pre všetkých, aby mali tréneri rovnaký základ.
  - Tasky: správcovský kľúč, globálne poradie a „Len na čas“, mazanie predvolených cvikov

### Epic 8: Lepšie tréningy
- **User story:** Ako tréner chcem mať tréning rozdelený na Rozcvičku, Hlavnú časť a Záver a nový tréning vytvoriť zo šablóny alebo kópiou staršieho, aby som ho pripravila rýchlejšie.
  - Tasky: časti tréningu s farbami, šablóna `src/trainingTemplate.ts`, kopírovanie tréningu
- **User story:** Ako tréner chcem tréningy filtrovať podľa typu, skupiny (Prípravka, Starší) a názvu, aby som rýchlo našla správny tréning.
  - Tasky: nové typy tréningov s farbami, vlastné typy, skupina „Pre koho“ s predvoleným časom začiatku (Prípravka 16:30, Starší 17:00), filtre a zoradenie podľa dátumu
