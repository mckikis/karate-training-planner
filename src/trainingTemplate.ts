// =====================================================================
// PREDVOLENÝ TRÉNING
// Toto appka vyplní pri novom tréningu a pri tlačidle „Vygenerovať tréning“.
// Vygenerovaný tréning sa potom dá ľubovoľne upraviť.
//
// - Časy sú v minútach.
// - Cviky sa hľadajú podľa názvu, presne tak, ako sú napísané v appke (aj s diakritikou).
//   Cvik, ktorý v appke nie je alebo si ho skryla, sa preskočí.
// - Rozcvička a záver: pridajú sa všetky uvedené cviky, čas je spolu za celú časť.
// - Hlavná časť: cviky sa pridávajú v tomto poradí s ich predvolenými sériami a opakovaniami,
//   kým sa nenaplní mainMinutes. Ďalšie cviky v zozname sa použijú len vtedy, keď sa čas ešte nenaplnil.
// =====================================================================

export const TRAINING_TEMPLATE = {
  warmupMinutes: 20,
  mainMinutes: 60,
  cooldownMinutes: 10,

  warmup: [
    'Rozklus a atletická abeceda',
    'Rozkopanie',
  ],

  main: [
  ],

  cooldown: ['Výklus', 'Špagát'],
}
