# Episode 070: Kenapa Remote Boleh On TV dari Jauh?

Suara: **Affan Clone** (ElevenLabs, model `eleven_v4`), 1 take (jimat kredit).
Narasi: `audio/narration.mp3` (50.3 s)
Masa perkataan: `audio/narration_words.json` (faster-whisper, tempatan, tanpa kredit; masa "Papa!" diperbetulkan dengan tenaga audio)
Video: `output/TheCuriousAffan_E070_Kenapa_Remote_Boleh_On_TV.mp4` (53.75 s, 1080×1920)
Bina semula: `episodes/070-remote-tv/make.sh`

Struktur: hook (Affan tekan butang remote, TV jauh di sana terus menyala; ada sihir ke?) → di hujung
remote ada lampu kecil yang memancarkan cahaya inframerah, yang mata kita tak nampak → setiap butang
hantar kelipan berbeza, macam kod rahsia (kelip pendek, kelip panjang) → TV ada "mata kecil"
(penerima) yang baca kod: buka, kuat, tukar saluran → tip: kamera telefon boleh nampak lampu itu
berkelip → penutup (remote bercakap dengan TV guna cahaya; jangan tengok TV lama-lama).

## Narasi
> [curious] Affan selalu tanya papa. [surprised] Papa! Affan tekan butang remote, TV jauh di sana
> terus menyala! [curious] Remote ni ada sihir ke? [excited] Jom ikut Affan cari jawapan!
>
> [curious] Di hujung remote, ada lampu kecil. Lampu ni pancarkan cahaya inframerah, cahaya yang
> mata kita tak boleh nampak.
>
> [excited] Setiap butang hantar kelipan cahaya yang berbeza, macam kod rahsia! Kelip pendek, kelip
> panjang.
>
> [surprised] TV pula ada mata kecil yang baca kod tu. Kod buka, kod kuat, kod tukar saluran!
>
> [whispers] Tahu tak? Kalau kita halakan remote ke kamera telefon dan tekan butang, kamera boleh
> nampak lampu tu berkelip!
>
> [excited] Waaah, rupanya remote bercakap dengan TV guna cahaya! [softly] Tapi jangan tengok TV
> lama-lama, ya. [curious] Apa lagi kita nak belajar lepas ni?

## Visual
- Ruang tamu: Affan di sofa memegang remote; TV di atas kabinet di seberang bilik. Dari belakang
  sofa, TV menyala selepas Affan tekan butang.
- Pentas cahaya: remote gergasi menghala ke TV gergasi; kelipan inframerah dilukis ungu supaya
  kita nampak, kemudian dipudarkan (ikon mata berpangkah: mata kita tak nampak).
- Kod: jalur kelipan pendek/panjang untuk BUKA, KUAT dan SALURAN; penerima TV dapat "mata"
  kartun; TV menyala, bar volum naik, saluran bertukar.
- Telefon: skrin kamera menunjukkan LED remote berkelip ungu, sedangkan LED sebenar nampak gelap.
- Penutup: remote "bercakap" dengan TV (kelipan ungu dalam bilik); Mama ingatkan jangan tengok TV
  lama-lama; Affan tutup TV.

## Nota fakta
- Kebanyakan remote TV menggunakan LED inframerah (biasanya sekitar 940 nm), cahaya yang di luar
  julat penglihatan manusia.
- Setiap butang menghantar kod digital: LED berkelip mengikut corak denyut pendek dan panjang
  (contohnya protokol NEC/RC-5), dimodulasi pada kira-kira 38 kHz.
- Penerima inframerah di panel depan TV menyahkod corak itu menjadi arahan (buka, volum, saluran).
- Sensor kamera digital boleh mengesan sebahagian cahaya inframerah dekat, jadi LED kelihatan
  berkelip pada skrin telefon (kamera depan biasanya lebih jelas kerana kurang penapis IR).

## Kredit ElevenLabs
- Dicaj: **783 kredit**, 1 generation
