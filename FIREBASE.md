# Firebase – nastavenie (robí sa raz)

Appka ukladá cviky, tréningy, obrázky a videá do Firebase projektu **karatetrener-1555c**.
Do dát sa dostane len ten, komu dáš **prihlasovací kľúč**.

Všetko sa nastavuje na <https://console.firebase.google.com> → projekt **karatetrener**.

## 1. Zapnúť prihlasovanie

1. **Build → Authentication → Get started**.
2. Záložka **Sign-in method** → **Email/Password** → zapnúť prvý prepínač (*Email/Password*) → **Save**.
   (Tréneri žiadny e-mail nezadávajú, appka si ho vytvorí z kľúča.)
3. Záložka **Settings → Authorized domains** → **Add domain** → `mckikis.github.io`.

## 2. Vytvoriť databázu Firestore

Appka používa **Firestore**, nie *Realtime Database*. Realtime Database, ktorú v projekte máš, appka nepoužíva.

1. **Build → Firestore Database → Create database**.
2. Lokalita: `eur3 (europe-west)` → **Next**.
3. Režim: **Start in production mode** → **Create**.

## 3. Pravidlá (kto smie čo)

1. **Firestore Database → Rules**.
2. Celý text nahraď obsahom súboru [`firestore.rules`](firestore.rules) z tohto repozitára.
3. **Publish**.

## 4. Prihlasovacie kľúče

1. **Firestore Database → Data → + Start collection**.
2. Collection ID: `config` → **Next**.
3. Document ID: `access`.
4. Pridaj dve polia typu **array**:
   - `keys` – kľúče trénerov, každý tréner má **vlastný** kľúč (napr. `peter-7k2m9q`, `lucia-x4b8tw`).
   - `adminKeys` – tvoj kľúč (napr. `kristina-…`). Cviky, ktoré vytvoríš s týmto kľúčom, uvidí každý tréner hneď.
5. **Save**.

Pravidlá pre kľúče:

- aspoň **6 znakov**, ťažko uhádnuteľné (nie `karate1`);
- **jeden kľúč = jeden tréner**. S rovnakým kľúčom sa ten istý tréner prihlási aj na inom telefóne a vidí svoje cviky a tréningy;
- keď kľúč zo zoznamu vymažeš, ten tréner stratí prístup (jeho cviky a tréningy v databáze ostanú).

## Ako to funguje v appke

| Čo | Tréner | Správca (kľúč v `adminKeys`) |
| --- | --- | --- |
| vidieť predvolené cviky a cviky správcu | áno | áno |
| vidieť cudzie cviky a tréningy | po zapnutí „Zobraziť aj … iných trénerov“ | rovnako |
| súkromný cvik, kategória alebo tréning (🔒) | vidí len autor | vidí len autor |
| upraviť / vymazať cvik, kategóriu alebo tréning | len svoje | všetky |
| vymazať predvolený cvik (zo `starterData.ts`) | nie, môže ho skryť | áno, appka ho už znova nepridá |
| poradie cvikov a kategórií, „Len na čas“ | len pre seba | pre všetkých |
| obľúbené, skryté cviky a tréningy | pre seba | pre seba |
| nový typ tréningu | pridá, používajú ho všetci | rovnako |

**Po každej zmene súboru `firestore.rules` ho treba znova vložiť do Firebase (krok 3) a dať Publish.**

Meno autora je v detaile cviku a tréningu. Meno sa dá zmeniť v **Nastavenia → Účet**.

Pri prvom prihlásení na telefóne, kde už boli dáta zo staršej verzie appky, sa vlastné cviky (aj s obrázkami) a tréningy z telefónu nahrajú do Firebase pod prihláseného trénera.

## Ako pridať obsah pre všetkých

- **Kategórie a cviky:** správca ich pridá priamo v appke. Cviky správcu vidí každý tréner.
- **Fotka alebo video k predvolenému cviku:** správca otvorí cvik → *Upraviť cvik* → vyberie súbor z telefónu.
- **Predvolené cviky v kóde:** `src/starterData.ts` (+ súbory v `public/exercises/`), dostanú sa ku všetkým po push do `main`.

## Limity zadarmo (plán Spark)

Obrázky a videá sa ukladajú priamo do Firestore (Firebase Storage by vyžadoval platobnú kartu).
Zadarmo je 1 GB dát a 50 000 čítaní za deň. Každý telefón si obrázok stiahne len raz.
Videá preto drž krátke (ideálne do 5 MB, najviac 40 MB).
