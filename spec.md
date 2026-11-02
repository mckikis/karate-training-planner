# SPEC – Karate Training Planner

Špecifikácia požiadaviek. Popisuje, **čo** má aplikácia robiť a podľa čoho overím, že to robí. Ako je to postavené, je v [DESIGN.md](DESIGN.md).

Stav: verzia 1 (MVP) · Autor: Kristína Simčíková · Karate klub Katsudo Sabinov

## 1. Problém

Trénerom karate v našom klube chýba nástroj, v ktorom by mali cviky aj s obrázkami alebo videami a z ktorého by rýchlo poskladali tréning. Tréningy sa plánujú od oka, takže sa často nestihnú: pauzy sú dlhé alebo deti robia cvik príliš dlho a na koniec tréningu nezostane čas.

## 2. Používatelia a roly

| Rola | Kto | Čo robí v aplikácii |
| --- | --- | --- |
| **Tréner** | tréneri klubu, každý vo svojom telefóne (iPhone) | spravuje cviky a kategórie, zostavuje a upravuje tréningy, vidí ich časový rozvrh, označuje odtrénované tréningy |
| **Správca obsahu** | ja ako autorka aplikácie | v repozitári upravuje predvolené cviky, kategórie a ich obrázky/videá; zmeny sa dostanú ku všetkým trénerom s ďalšou verziou aplikácie |

Aplikácia nemá prihlasovanie. Všetci tréneri majú v aplikácii rovnaké práva, rozlišuje ich iba meno trénera pri tréningu.

## 3. Funkcie

Každá funkcia je jedna veta z pohľadu trénera.

### 1. Cviky

- **1.1** Pri prvom spustení mám v aplikácii predvolené kategórie a cviky karate, aby som nemusela všetko zadávať ručne.
- **1.2** Môžem pridať vlastný cvik s názvom, kategóriou, popisom a fotkou, GIFom alebo krátkym videom z telefónu.
- **1.3** Môžem upraviť ktorýkoľvek cvik, aj predvolený, vrátane obrázka a predvolených časov.
- **1.4** Môžem pridať vlastnú kategóriu cvikov.
- **1.5** Môžem cviky vyhľadať podľa názvu a filtrovať podľa kategórie.
- **1.6** V zozname vidím z každej kategórie najviac 7 cvikov a ďalšie si zobrazím tlačidlom „Zobraziť viac“.
- **1.7** Môžem cvik označiť hviezdičkou ako obľúbený a obľúbené cviky sú vždy na vrchu svojej kategórie, aj pri výbere cvikov do tréningu.
- **1.8** Cvik, ktorý nepoužívam, môžem skryť namiesto vymazania a neskôr ho zo zoznamu skrytých cvikov vrátiť.
- **1.9** Môžem zmeniť poradie cvikov v kategórii potiahnutím.
- **1.10** Môžem zmeniť poradie kategórií potiahnutím a pri kategórii nastaviť, že sa jej cviky zadávajú len na čas.
- **1.11** GIF alebo video cviku sa prehráva stále dokola bez zvuku, aby som videla, ako sa cvik robí.

### 2. Tréningy

- **2.1** Môžem vytvoriť tréning s názvom, dátumom, časom začiatku, typom tréningu, menom trénera a popisom.
- **2.2** Cviky do tréningu vyberám zaškrtávaním zo zoznamu s obrázkami a vybrané cviky sa zoradia v poradí, v akom som ich zaškrtla.
- **2.3** Pri každom cviku v tréningu nastavím počet sérií, čas série alebo počet opakovaní × sekundy na opakovanie, oddych medzi sériami a prestávku pred ďalším cvikom.
- **2.4** Aplikácia mi priebežne ukazuje čas každého cviku aj celkovú dĺžku tréningu.
- **2.5** Pri každom cviku vidím, od kedy do kedy sa má cvičiť podľa času začiatku tréningu (napr. 17:17 – 17:20), aby som tréning stihla načas.
- **2.6** Poradie cvikov v tréningu môžem zmeniť potiahnutím.
- **2.7** V detaile tréningu vidím rozvrh s obrázkami cvikov, prestávkami a celkovým časom.
- **2.8** Po tréningu ho môžem označiť ako odtrénovaný aj s menom trénera, ktorý ho viedol.
- **2.9** Tréning môžem upraviť, skryť (a neskôr vrátiť) alebo natrvalo vymazať.
- **2.10** Poradie tréningov v zozname môžem zmeniť potiahnutím.

### 3. Aplikácia

- **3.1** Aplikáciu si nainštalujem na plochu iPhonu bez App Store a otvára sa na celú obrazovku ako bežná aplikácia.
- **3.2** Aplikácia funguje aj bez internetu, napríklad v telocvični bez signálu.
- **3.3** Moje cviky, fotky a tréningy ostanú uložené v telefóne aj po zatvorení aplikácie.
- **3.4** Môžem vymazať všetky dáta a začať odznova s predvolenými cvikmi.
- **3.5** Aplikácia je po slovensky, má logo klubu Katsudo Sabinov a podpis autorky.

## 4. Akceptačné kritériá

Testovací plán pre krok „overenie“. Každé kritérium sa dá vyskúšať v telefóne a výsledok je áno/nie.

| # | Funkcia | Postup | Očakávaný výsledok |
| --- | --- | --- | --- |
| K1 | 1.1 | Prvé spustenie aplikácie | Zobrazí sa 17 kategórií s predvolenými cvikmi v poradí podľa súboru predvolených dát. |
| K2 | 1.2, 1.11 | Pridám cvik s GIFom alebo videom | Cvik je v zvolenej kategórii, médium sa prehráva dokola bez zvuku. |
| K3 | 1.2 | Vyberiem súbor väčší ako 40 MB | Zobrazí sa chyba, cvik sa s takým súborom neuloží. |
| K4 | 1.6 | Kategória „Údery – karate“ má 13 cvikov | V zozname je 7 cvikov a tlačidlo „Zobraziť viac (6)“. |
| K5 | 1.7 | Označím hviezdičkou 13. cvik kategórie | Cvik je prvý v kategórii v zozname aj pri výbere cvikov do tréningu. |
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
| K17 | 3.4 | Dvakrát potvrdím „Vymazať všetky dáta“ | Ostanú iba predvolené kategórie a cviky, tréningy sú preč. |
| K18 | — | Mám dáta zo staršej verzie aplikácie a otvorím novú | Staré tréningy a cviky ostanú zachované. |

## 5. Obmedzenia

- **Platforma:** iPhone (Safari, inštalácia na plochu). Funguje aj v prehliadači na počítači a na Androide, tam ju ale netestujem.
- **Bez Macu a bez poplatkov:** vývoj na Windows, žiadny platený Apple Developer účet, žiadny platený server ani služba.
- **Technológie:** React + TypeScript, Vite, IndexedDB cez Dexie.js, hosting na GitHub Pages.
- **Jazyk rozhrania:** slovenčina, dátumy v slovenskom formáte (po 19. 10. 2026), časy v 24-hodinovom formáte.
- **Dáta:** iba v telefóne konkrétneho trénera. Žiadny server, žiadne účty.
- **Médiá:** fotka, GIF alebo video nahrané v aplikácii najviac 40 MB. Predvolené obrázky a videá patria do repozitára.
- **Offline:** po prvom otvorení musí aplikácia fungovať bez internetu.

## 6. Mimo rozsahu (verzia 1)

| Vo verzii 1 úmyselne nie | Dôvod |
| --- | --- |
| Časomiera na celú obrazovku počas tréningu | Verzia 1 rieši plánovanie. Časomiera je ďalší krok (Epic 6 v project.md). |
| Účty, prihlasovanie, synchronizácia medzi telefónmi | Potrebovali by server a prihlasovanie. Každý tréner zatiaľ pracuje vo svojom telefóne. |
| Zdieľanie tréningov medzi trénermi | Závisí od synchronizácie. Meno trénera pri tréningu je príprava na túto funkciu. |
| Záloha a export dát | Prídu spolu so zdieľaním. |
| Štatistiky a dochádzka detí | Nepomáhajú s hlavným problémom – stihnúť tréning načas. |
| Zverejnenie v App Store | Vyžaduje platený účet a kontrolu od Apple. Inštalácia cez Safari stačí. |
| Premenovanie a mazanie kategórií | Kategórie sa dajú pridať a usporiadať. Úpravy budú v ďalšej verzii. |

## 7. Rozhodnuté otázky

- **Natívna appka alebo webová?** Webová aplikácia nainštalovaná na plochu (PWA). Natívna iOS appka bez Macu a bez plateného účtu sa do iPhonu trvalo nainštalovať nedá.
- **Jazyk rozhrania?** Slovenčina, lebo tréneri používajú zaužívané slovenské pojmy.
- **Vymazať alebo skryť?** Cvik sa skrýva, aby sa omylom nestratil. Natrvalo sa dá vymazať iba vlastný cvik, ktorý je už skrytý. Tréning sa dá skryť aj natrvalo vymazať.
- **Počíta sa prestávka po poslednom cviku?** Nie.
- **Ako sa zadáva dlhší čas?** V minútach a sekundách, napr. `15:00` alebo `2:30`.
- **Ktoré kategórie sú len na čas?** Rozcvička, Dynamický strečing, Statický strečing a Hry. Tréner to môže zmeniť pri ľubovoľnej kategórii.
- **Odkiaľ sa vezme čas začiatku a tréner nového tréningu?** Z posledného uloženého tréningu, inak 17:00 a prázdne meno trénera.
- **Kde sú obľúbené cviky pri posúvaní?** V režime „Usporiadať“ sa cviky zobrazujú podľa poradia bez ohľadu na hviezdičku. Mimo neho sú obľúbené hore.

## 8. Otvorené otázky

- Ako budú tréneri zdieľať tréningy: exportom súboru, alebo spoločnou databázou na serveri?
- Má byť tréner voľný text, alebo výber zo zoznamu trénerov klubu?
- Majú sa dať natrvalo vymazať aj predvolené cviky, alebo stačí ich skryť?
- Aká je maximálna rozumná veľkosť videí, aby aplikácia nezaberala v telefóne priveľa miesta?
- Ako zabrániť strate dát, keď tréner zmaže aplikáciu z plochy alebo mení telefón?
