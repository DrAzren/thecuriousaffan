// Caption chunks for Episode 007, using the narration's own words (emotion tags
// are never shown) and timed to audio/narration.mp3 (word start times measured
// from the recording). Each chunk: [endTime, [word, start], ...].
export const CAPTIONS = [
  [0.74, ['Yeay!', 0.0]],
  [1.6, ['Affan', 0.8], ['baru', 1.32]],
  [2.95, ['habis', 1.62], ['main', 2.06], ['di', 2.22], ['taman.', 2.34]],
  [3.48, ['Eh,', 3.04]],
  [4.85, ['badan', 3.56], ['melekit.', 4.18]],
  [6.18, ['Kenapa', 4.94], ['ada', 5.5], ['bau', 5.64], ['ni?', 5.92]],
  [7.9, ['Kenapa', 6.3], ['kita', 6.9], ['kena', 7.14], ['mandi?', 7.4]],
  [9.46, ['Jom', 7.96], ['masuk', 8.4], ['dunia', 8.6], ['kulit.', 9.02]],
  [10.44, ['Wah,', 9.56]],
  [11.7, ['ada', 10.54], ['peluh,', 11.0]],
  [13.26, ['minyak', 11.76], ['dan', 12.26], ['kotoran.', 12.42]],
  [14.46, ['Kulit', 13.34], ['kita', 13.82], ['memang', 14.1]],
  [15.56, ['ada', 14.5], ['bakteria.', 14.92]],
  [16.98, ['Bila', 15.62], ['peluh', 16.14], ['bercampur', 16.54]],
  [18.3, ['dengan', 17.0], ['bakteria', 17.18], ['tertentu,', 17.68]],
  [19.8, ['badan', 18.34], ['boleh', 19.04], ['berbau.', 19.22]],
  [20.76, ['Habis', 19.9], ['tu,', 20.54]],
  [22.06, ['apa', 20.82], ['sabun', 21.22], ['buat?', 21.74]],
  [23.66, ['Sabun', 22.18], ['bantu', 22.86], ['tanggalkan', 23.18]],
  [24.2, ['minyak,', 23.68]],
  [25.58, ['kotoran', 24.24], ['dan', 24.94], ['kuman.', 25.1]],
  [26.56, ['Air', 25.66], ['pula', 26.2]],
  [27.52, ['bilas', 26.6], ['semuanya.', 27.12]],
  [29.16, ['Tapi', 27.6], ['bukan', 28.24], ['semua', 28.84]],
  [30.48, ['bakteria', 29.2], ['jahat', 29.78], ['tau.', 30.2]],
  [31.16, ['Jadi,', 30.54]],
  [32.64, ['bila', 31.22], ['badan', 31.72], ['kotor', 32.08], ['atau', 32.54]],
  [33.32, ['berpeluh,', 32.68]],
  [34.92, ['mandilah', 33.36], ['dengan', 34.02], ['lembut.', 34.24]],
  [35.72, ['Bilas,', 34.98]],
  [36.72, ['lap', 35.76], ['kering', 36.08], ['dan', 36.58]],
  [37.98, ['pakai', 36.74], ['baju', 37.14], ['bersih.', 37.56]],
  [38.62, ['Haa,', 38.04]],
  [39.74, ['sekarang', 38.68], ['Affan', 39.14]],
  [40.42, ['dah', 39.76], ['segar.', 39.86]],
  [41.42, ['Apa', 40.52], ['lagi', 40.9], ['kita', 41.16]],
  [42.3, ['nak', 41.44], ['siasat?', 41.6]],
];

// Keyword highlights (brand cyan / yellow / peach). Lower-case, punctuation stripped.
const CYAN = '#6fe3ff', YELLOW = '#ffd84a', PEACH = '#ffb48a';
export const KEYWORDS = {
  peluh: CYAN, berpeluh: CYAN, bakteria: CYAN, kuman: CYAN, bau: CYAN, berbau: CYAN,
  minyak: PEACH, kotoran: PEACH, kotor: PEACH,
  sabun: YELLOW, air: YELLOW, bilas: YELLOW, mandi: YELLOW, mandilah: YELLOW, bersih: YELLOW, segar: YELLOW, kering: YELLOW, kulit: YELLOW,
};
