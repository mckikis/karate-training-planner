# SPEC – Karate Training Planner

Dokument popisuje **verziu 1** (MVP, kap. 1–8). Funkcie, ktoré vo verzii 1 úmyselne neboli a pribudli v ďalšej verzii, sú v kap. 6 (mimo rozsahu verzie 1) a podrobne v kap. 9 (verzia 2).

## 1. Problém

Trénerom karate v našom klube chýba nástroj, v ktorom by mali cviky aj s obrázkami alebo videami a z ktorého by rýchlo poskladali tréning. Tréningy sa plánujú od oka, takže sa často nestihnú: pauzy sú dlhé alebo deti robia cvik príliš dlho a na koniec tréningu nezostane čas.

## 2. Používatelia a roly

| Rola | Kto | Čo robí v aplikácii |
| --- | --- | --- |
| **Tréner** | tréneri klubu, každý vo svojom telefóne | spravuje cviky a kategórie, zostavuje a upravuje tréningy, vidí ich časový rozvrh, označuje odtrénované tréningy |
| **Správca obsahu** | ja ako autorka aplikácie | v repozitári upravuje predvolené cviky, kategórie a ich obrázky/videá; zmeny sa dostanú ku všetkým trénerom s ďalšou verziou aplikácie |

Vo verzii 1 aplikácia nemá prihlasovanie a všetci tréneri majú rovnaké práva. Prihlasovanie a rola správcu v aplikácii pribudli vo verzii 2 (kap. 9).

## 3. Funkcie

### 1. Cviky

- **1.1** Pri prvom spustení mám v aplikácii predvolené kategórie a cviky karate, aby som nemusela všetko zadávať ručne.
- **1.2** Môžem pridať vlastný cvik s názvom, kategóriou, popisom a fotkou, GIFom alebo krátkym videom z telefónu.
- **1.3** Môžem upraviť cvik vrátane obrázka a predvolených časov. *(Vo verzii 2: tréner upravuje svoje cviky, správca všetky, aj predvolené.)*
- **1.4** Môžem pridať vlastnú kategóriu cvikov.
- **1.5** Môžem cviky vyhľadať podľa názvu a filtrovať podľa kategórie.
- **1.6** V zozname vidím z každej kategórie najviac 7 cvikov a ďalšie si zobrazím tlačidlom „Zobraziť viac“.
- **1.7** Môžem cvik označiť hviezdičkou ako obľúbený a obľúbené cviky sú vždy na vrchu svojej kategórie, aj pri výbere cvikov do tréningu.
- **1.8** Cvik, ktorý nepoužívam, môžem skryť namiesto vymazania a neskôr ho zo zoznamu skrytých cvikov vrátiť.
- **1.9** Môžem zmeniť poradie cvikov v kategórii potiahnutím.
- **1.10** Môžem zmeniť poradie kategórií potiahnutím a pri kategórii nastaviť, že sa jej cviky zadávajú len na čas.
- **1.11** GIF alebo video cviku sa prehráva stále dokola bez zvuku, aby som videla, ako sa cvik robí. Automatické prehrávanie videí sa dá vypnúť v Nastaveniach.

### 2. Tréningy

- **2.1** Môžem vytvoriť tréning s názvom, dátumom, časom začiatku, typom tréningu a popisom. *(Vo verzii 2 pribudla skupina „Pre koho“ a autor tréningu.)*
- **2.2** Cviky do tréningu vyberám zaškrtávaním zo zoznamu s obrázkami a vybrané cviky sa zoradia v poradí, v akom som ich zaškrtla.
- **2.3** Pri každom cviku v tréningu nastavím počet sérií, čas série alebo počet opakovaní × sekundy na opakovanie, oddych medzi sériami a prestávku pred ďalším cvikom.
- **2.4** Aplikácia mi priebežne ukazuje čas každého cviku aj celkovú dĺžku tréningu.
- **2.5** Pri každom cviku vidím, od kedy do kedy sa má cvičiť podľa času začiatku tréningu (napr. 17:17 – 17:20), aby som tréning stihla načas.
- **2.6** Poradie cvikov v tréningu môžem zmeniť potiahnutím.
- **2.7** V detaile tréningu vidím rozvrh s obrázkami cvikov, prestávkami a celkovým časom. Obrázky si môžem zväčšiť a zmenšiť a cvik otvoriť v detaile.
- **2.8** Po tréningu ho môžem označiť ako odtrénovaný aj s menom trénera, ktorý ho viedol.
- **2.9** Tréning môžem upraviť, skryť (a neskôr vrátiť) alebo natrvalo vymazať.
- **2.10** Poradie tréningov v zozname môžem zmeniť potiahnutím, tréningy filtrovať podľa názvu a typu a zoradiť podľa dátumu.

### 3. Aplikácia

- **3.1** Aplikáciu si nainštalujem na plochu iPhonu bez App Store a otvára sa na celú obrazovku ako bežná aplikácia.
- **3.2** Aplikácia funguje aj bez internetu, napríklad v telocvični bez signálu.
- **3.3** Moje cviky, fotky a tréningy ostanú uložené aj po zatvorení aplikácie.
- **3.4** ~~Môžem vymazať všetky dáta a začať odznova s predvolenými cvikmi.~~ *Vo verzii 2 odstránené: dáta sú spoločné pre všetkých trénerov, preto ich jeden tréner nemôže vymazať všetky. Odhlásenie vymaže iba kópiu dát v telefóne.*
- **3.5** Aplikácia je po slovensky, má logo klubu Katsudo Sabinov a podpis autorky.

## 4. Akceptačné kritériá

Testovací plán pre krok „overenie“. Každé kritérium sa dá vyskúšať v telefóne a výsledok je áno/nie.

| # | Funkcia | Postup | Očakávaný výsledok |
| --- | --- | --- | --- |
| K1 | 1.1 | Prvé spustenie aplikácie | Zobrazí sa 17 kategórií s predvolenými cvikmi v poradí podľa súboru predvolených dát. |
| K2 | 1.2, 1.11 | Pridám cvik s GIFom alebo videom | Cvik je v zvolenej kategórii, médium sa prehráva dokola bez zvuku. |
| K3 | 1.2 | Vyberiem súbor väčší ako 40 MB | Zobrazí sa chyba, cvik sa s takým súborom neuloží. |
| K4 | 1.6 | Kategória „Údery - karate“ má 12 cvikov | V zozname je 7 cvikov a tlačidlo „Zobraziť viac (5)“. |
| K5 | 1.7 | Označím hviezdičkou posledný cvik kategórie | Cvik je prvý v kategórii v zozname aj pri výbere cvikov do tréningu. |
| K6 | 1.8 | Skryjem cvik | Zmizne zo zoznamu aj z výberu do tréningu, je v „Skryté cviky“ a dá sa vrátiť. Tréningy, ktoré ho obsahujú, ostanú nezmenené. |
| K7 | 1.9, 1.10, 2.10 | Potiahnem cvik, kategóriu alebo tréning na iné miesto | Nové poradie ostane aj po zatvorení a znovuotvorení aplikácie. |
| K8 | 1.10 | Otvorím cvik v kategórii „Rozcvička“ | Nie je tam prepínač Opakovania/Čas, zadáva sa iba čas. |
| K9 | 2.3, 2.4 | Cvik 3 série × 10 opak. × 2 s, oddych 30 s, prestávka 60 s, nasleduje ďalší cvik | Čas cviku je 2:00, s prestávkou pred ďalším cvikom 3:00. |
| K10 | 2.5 | Začiatok 17:00, cvik 1 = 1 × 15:00, prestávka 2:00, cvik 2 = 1 × 3:00 | Cvik 1: 17:00 – 17:15, cvik 2: 17:17 – 17:20. |
| K11 | 2.4 | Posledný cvik tréningu má nastavenú prestávku | Prestávka po poslednom cviku sa do celkového času nepočíta. |
| K12 | 2.6 | Potiahnem 3. cvik tréningu na 1. miesto | Časy začiatku a konca všetkých cvikov sa prepočítajú. |
| K13 | 2.8 | Označím tréning ako odtrénovaný s trénerom „Kristína“ | V detaile aj v zozname je „✓ Odtrénovaný“, dátum a meno trénera. Označenie sa dá zrušiť. |
| K14 | 2.9 | Vymažem tréning | Aplikácia sa najprv opýta na potvrdenie, po potvrdení tréning zmizne. |
| K15 | 3.1 | Otvorím adresu v Safari → Zdieľať → Pridať na plochu | Na ploche je ikona, aplikácia sa otvára bez lišty prehliadača. |
| K16 | 3.2, 3.3 | Zapnem letový režim a otvorím aplikáciu z plochy | Aplikácia sa načíta so všetkými cvikmi, obrázkami a tréningami. Nový tréning sa dá vytvoriť a uložiť. |
| K17 | 3.4 | ~~Dvakrát potvrdím „Vymazať všetky dáta“~~ | *Vo verzii 2 zrušené spolu s funkciou 3.4.* |
| K18 | — | Mám dáta zo staršej verzie aplikácie a otvorím novú | Staré tréningy a cviky ostanú zachované (vo verzii 2 sa po prihlásení presunú do Firebase). |

## 5. Obmedzenia

- **Platforma:** iPhone (Safari, inštalácia na plochu). Funguje aj v prehliadači na počítači a na Androide, tam ju ale netestujem.
- **Bez Macu a bez poplatkov:** vývoj na Windows, žiadny platený Apple Developer účet, žiadny platený server ani služba (Firebase vo verzii 2 len v bezplatnom pláne Spark).
- **Technológie:** React + TypeScript, Vite, hosting na GitHub Pages. Dáta vo verzii 1 v IndexedDB cez Dexie.js, vo verzii 2 vo Firebase (Firestore s offline kópiou v telefóne).
- **Jazyk rozhrania:** slovenčina, dátumy v slovenskom formáte, časy v 24-hodinovom formáte.
- **Dáta:** vo verzii 1 iba v telefóne konkrétneho trénera, bez servera a účtov.
- **Médiá:** fotka, GIF alebo video nahrané v aplikácii najviac 40 MB. Predvolené obrázky a videá patria do repozitára.
- **Offline:** po prvom otvorení musí aplikácia fungovať bez internetu.

## 6. Mimo rozsahu (verzia 1)

| Vo verzii 1 úmyselne nie | Dôvod | Ďalšia verzia |
| --- | --- | --- |
| Časomiera na celú obrazovku počas tréningu | Verzia 1 rieši plánovanie. | Verzia 2 – funkcie 5.1–5.6 |
| Účty, prihlasovanie, synchronizácia medzi telefónmi | Potrebovali by server a prihlasovanie. | Verzia 2 – funkcie 4.1–4.3 |
| Zdieľanie cvikov a tréningov medzi trénermi | Závisí od synchronizácie. Meno trénera pri tréningu je príprava na túto funkciu. | Verzia 2 – funkcie 4.4–4.7 |
| Záloha a export dát | Prídu spolu so zdieľaním. | Verzia 2 – dáta sú vo Firebase, nie iba v telefóne |
| Rozdelenie tréningu na časti, šablóna a kópia tréningu | Verzia 1 má jeden zoznam cvikov. | Verzia 2 – funkcie 6.1–6.3 |
| Skupiny (Prípravka, Starší) a vlastné typy tréningov | Stačí typ tréningu. | Verzia 2 – funkcie 6.4–6.5 |
| Premenovanie a mazanie kategórií | Kategórie sa dajú pridať a usporiadať. | Verzia 2 – mazanie vlastných kategórií, správca všetkých |
| Štatistiky a dochádzka detí | Nepomáhajú s hlavným problémom. | Neplánuje sa |
| Zverejnenie v App Store | Vyžaduje platený účet a kontrolu od Apple. Inštalácia cez Safari stačí. | Neplánuje sa |

## 7. Rozhodnuté otázky

- **Natívna appka alebo webová?** Webová aplikácia nainštalovaná na plochu. Natívna iOS appka bez Macu a bez plateného účtu sa do iPhonu trvalo nainštalovať nedá.
- **Jazyk rozhrania?** Slovenčina, lebo tréneri používajú zaužívané slovenské pojmy.
- **Vymazať alebo skryť?** Cvik sa skrýva, aby sa omylom nestratil. Natrvalo vymazať cvik môže len jeho autor (vo verzii 2 aj správca); predvolený cvik vymaže iba správca. Tréning sa dá skryť aj natrvalo vymazať.
- **Počíta sa prestávka po poslednom cviku?** Nie.
- **Ako sa zadáva dlhší čas?** V minútach a sekundách, napr. `15:00` alebo `2:30`.
- **Ktoré kategórie sú len na čas?** Rozcvička, Dynamický strečing, Statický strečing a Hry. Tréner to môže zmeniť pri ľubovoľnej kategórii (vo verzii 2 len pre seba, správca pre všetkých).
- **Odkiaľ sa vezme čas začiatku nového tréningu?** Z posledného uloženého tréningu, inak 17:00. Vo verzii 2 podľa skupiny: Prípravka 16:30, Starší 17:00.
- **Kde sú obľúbené cviky pri posúvaní?** V režime usporiadania (ikona ⇅) sa cviky zobrazujú podľa poradia bez ohľadu na hviezdičku. Mimo neho sú obľúbené hore.

## 8. Otvorené otázky

Otázky z verzie 1 a ako ich rieši verzia 2:

- **Ako budú tréneri zdieľať tréningy?** Spoločnou databázou (Firebase Firestore), nie exportom súboru.
- **Má byť tréner voľný text, alebo výber zo zoznamu?** Autor je meno prihláseného trénera. Meno trénera, ktorý tréning viedol, ostáva voľný text.
- **Majú sa dať natrvalo vymazať aj predvolené cviky?** Áno, ale iba správcom. Ostatní tréneri ich môžu len skryť.
- **Aká je rozumná veľkosť videí?** Ideálne do 5 MB, najviac 40 MB. Bezplatný plán Firebase má 1 GB dát.
- **Ako zabrániť strate dát pri zmene telefónu?** Dáta sú vo Firebase; tréner sa prihlási rovnakým kľúčom na novom telefóne.

Stále otvorené:

- Treba export tréningu do PDF alebo na zdieľanie cez správu?
- Ako riešiť viac správcov a odovzdanie správy aplikácie ďalšiemu trénerovi?

## 9. Verzia 2 (ďalšia verzia)

Funkcie mimo rozsahu verzie 1 (kap. 6), ktoré sú už doplnené v aplikácii. Technické riešenie je v `DESIGN.md`, nastavenie Firebase v `FIREBASE.md`.

### 4. Prihlásenie a spoločné dáta

- **4.1** Prihlásim sa krstným menom a prihlasovacím kľúčom, ktorý mi dá správca. Prihlásenie si appka pamätá, kým sa neodhlásim.
- **4.2** S rovnakým kľúčom sa prihlásim na inom telefóne a mám tam svoje cviky a tréningy.
- **4.3** Dáta sú vo Firebase a appka má ich kópiu v telefóne, takže funguje aj bez internetu.
- **4.4** Pri cviku a tréningu je v detaile meno autora. Predvolene vidím predvolené cviky, cviky správcu a svoje; cviky a tréningy ostatných trénerov zobrazím prepínačom.
- **4.5** Cvik, kategóriu alebo tréning môžem označiť ako súkromný (🔒), vtedy ho vidím len ja.
- **4.6** Upraviť a vymazať môžem len svoje cviky, kategórie a tréningy. Obľúbené, skryté, poradie a „Len na čas“ sú moje vlastné nastavenia.
- **4.7** Správca môže upraviť a vymazať všetko, aj predvolené cviky. Jeho poradie a „Len na čas“ platia pre všetkých.

### 5. Časomiera

- **5.1** V záložke Časomiera spustím vlastný odpočet (série, čas série, pauza, odpočet pred začiatkom) alebo časomieru podľa tréningu.
- **5.2** Čas je veľký na výšku aj na šírku, hore je „Séria x / y“. Farba ukazuje cvičenie (modrá), pauzu (sivá), výmenu (oranžová) a pozastavenie (tmavosivá).
- **5.3** Pred koncom každej časti zapípa 3-2-1, začiatok a koniec ohlási dlhé pípnutie. Počas výmeny je iba dlhé pípnutie na začiatku a na konci.
- **5.4** Časomieru môžem pozastaviť, posunúť o 10 s, preskočiť na ďalšiu alebo predchádzajúcu časť, upraviť a ukončiť.
- **5.5** Pri časomiere tréningu vidím dole aktuálny a ďalší cvik.
- **5.6** Výmena počas série (dvojice si vymenia úlohy, napr. po 45 s s 5 s na výmenu) a atoshi baraku (pípnutie a iná modrá 15 s pred koncom) sa nastavujú pri vlastnej časomiere aj pri každom cviku tréningu.

### 6. Tréningy

- **6.1** Tréning má časti Rozcvička, Hlavná časť a Záver, farebne odlíšené.
- **6.2** Nový tréning sa vyplní zo šablóny (`src/trainingTemplate.ts`: rozcvička 20 min, hlavná časť 60 min, záver 10 min).
- **6.3** Nový tréning môžem vytvoriť kópiou existujúceho.
- **6.4** Tréning má skupinu „Pre koho“ (Prípravka, Starší, Ja). Skupina nastaví čas začiatku: Prípravka 16:30, Starší 17:00.
- **6.5** Typy tréningov (Kumite - údery, Kumite - kopy, Kumite - zmiešaný, Kumite - taktika, Kata, Kondícia, Silový, Plyometria, Prípravka) majú pastelové farby, tréner môže pridať vlastný typ. Tréningy sa dajú filtrovať podľa typu, skupiny, názvu a autora.

### Akceptačné kritériá verzie 2

| # | Funkcia | Postup | Očakávaný výsledok |
| --- | --- | --- | --- |
| K19 | 4.1 | Prihlásim sa menom a neplatným kľúčom | Zobrazí sa chyba, appka sa neotvorí. |
| K20 | 4.2 | Prihlásim sa rovnakým kľúčom na druhom telefóne | Vidím rovnaké vlastné cviky a tréningy. |
| K21 | 4.5 | Tréner A označí tréning ako súkromný | Tréner B ho nevidí ani po zapnutí „Zobraziť aj tréningy iných trénerov“. |
| K22 | 4.6 | Tréner B otvorí cvik trénera A | Nie je tam tlačidlo Upraviť ani Vymazať, cvik si môže len skryť alebo označiť hviezdičkou. |
| K23 | 4.7 | Správca vymaže predvolený cvik | Cvik zmizne všetkým trénerom a po reštarte sa znova nepridá. |
| K24 | 5.1, 5.3 | Vlastná časomiera 2 série × 0:20, pauza 0:10, odpočet 0:05 | Priebeh: príprava 5 s, cvik 20 s, pauza 10 s, cvik 20 s; pred koncom každej časti 3-2-1, na začiatku a konci dlhé pípnutie. |
| K25 | 5.6 | Séria 1:30, výmena po 0:45, čas na výmenu 0:05, atoshi zapnuté | Cvik 45 s → výmena 5 s (bez 3-2-1) → cvik 45 s; atoshi pípne 15 s pred koncom oboch častí. |
| K26 | 6.4 | Nový tréning, skupina Prípravka | Čas začiatku je 16:30. |
| K27 | 6.3 | Kopírovať tréning → vyberiem starší tréning | Skopíruje sa názov, typ, skupina, popis a cviky; dátum ostane dnešný. |
