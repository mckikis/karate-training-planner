# Obrázky a videá predvolených cvikov

Sem patria obrázky, GIF-y a krátke videá k cvikom zo súboru `src/starterData.ts`.

1. Súbor ulož do tohto priečinka. Povolené sú `.jpg`, `.png`, `.gif`, `.webp` a `.mp4`.
2. Názov súboru píš **bez diakritiky a bez medzier**, napr. `kizami-zuki.gif`, `mrazik.mp4`.
3. V `src/starterData.ts` pridaj názov súboru ako 4. položku cviku:

   ```ts
   ['Kizami zuki', 'Úder prednou rukou.', reps(3, 10, 1.5, 30), 'kizami-zuki.gif'],
   ```

4. Po nasadení (push do `main`) sa obrázok objaví v appke na všetkých telefónoch.

Videá drž krátke (pár sekúnd, ideálne do 5 MB). Súbory nad 30 MB sa neuložia na offline použitie.
