// Caption chunks for Episode 004, the spoken words only (no delivery tags),
// timed to the narration. Word start times are in seconds from the start of
// audio/narration.mp3 (word-level speech alignment, see audio/words_asr.json);
// episode.js shifts them by the narration offset.
// Each chunk: [endTime, [word, start], ...]. Keyword colours: see KEYWORDS.
export const CAPTIONS = [
  [0.98, ['Kruuukkk!', 0.0]],
  [2.92, ['Eh,', 1.08], ['bunyi', 1.74], ['apa', 2.3], ['tu?', 2.48]],
  [4.28, ['Ada', 3.0], ['monster', 3.5], ['ke', 3.98]],
  [5.6, ['dalam', 4.32], ['perut', 4.56], ['Affan', 4.88], ['ni?', 5.18]],
  [7.08, ['Jom,', 5.7], ['kita', 6.08], ['pergi', 6.38], ['tengok.', 6.6]],
  [8.1, ['Wah,', 7.18]],
  [9.9, ['Affan', 8.22], ['dah', 8.86], ['jadi', 8.96], ['kecil.', 9.16]],
  [11.6, ['Besarnya', 10.02], ['perut', 10.74], ['ni.', 11.14]],
  [13.8, ['Shhh,', 11.88], ['korang', 12.46], ['dengar', 12.94], ['tak?', 13.26]],
  [15.76, ['Kruuukkk,', 14.02], ['kruuukkk.', 14.74]],
  [17.8, ['Oh,', 15.86], ['rupa-rupanya', 16.74]],
  [19.26, ['otot', 17.86], ['dalam', 18.66], ['perut', 18.82]],
  [19.86, ['dan', 19.3], ['usus', 19.42], ['kita', 19.72]],
  [21.28, ['bergerak', 19.9], ['macam', 20.66], ['ombak.', 20.8]],
  [22.88, ['Bila', 21.32], ['otot', 21.94], ['bergerak,', 22.3]],
  [23.92, ['gas', 22.92], ['dan', 23.38], ['cecair', 23.56]],
  [25.32, ['dalam', 23.96], ['perut', 24.22], ['serta', 24.68], ['usus', 24.96]],
  [26.36, ['pun', 25.36], ['bergerak', 25.54], ['sekali.', 25.98]],
  [27.62, ['Sebab', 26.42], ['itulah', 27.1], ['keluar', 27.46]],
  [29.02, ['bunyi', 27.66], ['kruuukkk.', 28.18]],
  [29.98, ['Oh,', 29.08]],
  [32.6, ['jadi', 30.04], ['bukan', 31.08], ['monsterlah.', 31.58]],
  [33.96, ['Tapi', 32.68], ['tahu', 33.24], ['tak,', 33.68]],
  [35.06, ['perut', 34.02], ['berbunyi', 34.66]],
  [36.12, ['bukan', 35.1], ['semestinya', 35.38]],
  [37.1, ['sebab', 36.16], ['lapar', 36.36], ['tau.', 36.82]],
  [38.3, ['Lepas', 37.16], ['makan', 37.76], ['pun', 38.04]],
  [39.08, ['boleh', 38.36], ['jadi.', 38.66]],
  [40.08, ['Ha,', 39.16], ['sekarang', 39.68]],
  [41.12, ['korang', 40.14], ['dah', 40.64], ['tahu.', 40.72]],
  [42.3, ['Apa', 41.18], ['lagi', 41.7], ['Affan', 41.94]],
  [43.65, ['nak', 42.34], ['siasat', 42.42], ['lepas', 42.84], ['ni?', 43.06]],
];

// Words (lower-case, punctuation stripped) that get a keyword colour.
export const KEYWORDS = {
  kruuukkk: '#ffd84a',
  otot: '#ffb38a',
  ombak: '#7cd8ff',
  gas: '#c9f6ff',
  cecair: '#5fe0ff',
  bunyi: '#ffd84a',
  lapar: '#ffb38a',
  makan: '#ffb38a',
};
