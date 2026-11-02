// Caption chunks for Episode 008, written with the script's spelling (emotion
// tags removed) and timed to audio/narration.flac. Word starts were measured
// on the source recording (Whisper word timestamps + ffmpeg silencedetect) and
// mapped onto the final timeline with prep_narration.py's src_to_final().
// Each chunk: [endTime, [word, start], ...]. Keyword colours: see KEYWORDS.
export const CAPTIONS = [
  [1.25, ['EHHH!', 0.22]],
  [3.35, ['Cicak', 1.34], ['tu', 1.60], ['jalan', 1.78], ['terbalik', 2.00], ['atas', 2.62], ['siling!', 2.90]],
  [5.05, ['Kenapa', 3.78], ['dia', 4.22], ['tak', 4.38], ['jatuh?', 4.54]],
  [6.82, ['Kaki', 5.44], ['dia', 5.82], ['ada', 5.96], ['gam', 6.20], ['ke?', 6.42]],
  [8.18, ['Jom', 7.15], ['Affan', 7.48], ['siasat!', 7.80]],
  [10.85, ['Waaaah!', 9.73]],
  [12.72, ['Tapak', 11.02], ['kaki', 11.32], ['cicak', 11.54], ['ada', 11.96], ['banyak', 12.26]],
  [14.02, ['struktur', 12.72], ['macam', 13.30], ['bulu', 13.64]],
  [15.40, ['yang', 14.04], ['sangat', 14.36], ['halus!', 14.84]],
  [16.60, ['Hujungnya', 15.57], ['pula', 16.20]],
  [18.50, ['bercabang', 16.60], ['jadi', 17.36], ['lebih', 17.66], ['kecil.', 17.96]],
  [21.50, ['Bila', 19.57], ['semua', 19.90], ['tu', 20.22], ['sentuh', 20.46], ['dinding,', 20.82]],
  [23.55, ['terhasil', 21.65], ['daya', 22.18], ['tarikan', 22.52], ['yang', 22.86], ['kecil.', 23.16]],
  [26.30, ['Tapi', 23.80], ['bila', 24.24], ['banyak-banyak', 24.74], ['bergabung...', 25.52]],
  [27.86, ['cengkamannya', 26.40], ['jadi', 27.06], ['kuat!', 27.36]],
  [30.22, ['Eh,', 28.77], ['macam', 29.40], ['mana', 29.62], ['cicak', 29.90]],
  [31.60, ['nak', 30.22], ['lepaskan', 30.38], ['kaki', 30.94], ['pula?', 31.28]],
  [33.14, ['Dia', 31.93], ['angkat', 32.20], ['jarinya', 32.52]],
  [34.80, ['macam', 33.14], ['kita', 33.44], ['mengupas', 33.84], ['pelekat!', 34.32]],
  [36.50, ['Haaa!', 35.60]],
  [38.22, ['Bukan', 36.54], ['gam,', 36.86], ['bukan', 37.50], ['magnet!', 37.76]],
  [40.28, ['Hebatnya', 38.50], ['kaki', 39.36], ['cicak!', 39.66]],
  [41.30, ['Apa', 40.55], ['pula', 40.82], ['Affan', 41.08]],
  [42.60, ['nak', 41.40], ['siasat', 41.56], ['lepas', 41.92], ['ni?', 42.22]],
];

// Words (lower-case, punctuation stripped) that get a keyword colour.
export const KEYWORDS = {
  cicak: '#ffb48a',
  siling: '#7fe3ff',
  bulu: '#7fe3ff',
  halus: '#7fe3ff',
  bercabang: '#ffd84a',
  kecil: '#ffd84a',
  daya: '#ffd84a',
  tarikan: '#ffd84a',
  cengkamannya: '#ff9d6b',
  kuat: '#ff9d6b',
  lepaskan: '#9cf0b0',
  mengupas: '#9cf0b0',
  pelekat: '#9cf0b0',
  gam: '#ff7a8a',
  magnet: '#ff7a8a',
};
