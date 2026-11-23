# Aset template undangan

## Ilustrasi Sunset Bloom

- File proyek: `public/assets/sunset-bloom.webp` (sekitar 470 KB).
- Dibuat menggunakan tool bawaan `image_gen` dengan latar transparan; dikonversi dari PNG ke WebP menggunakan FFmpeg dengan alpha dipertahankan.
- Aset merupakan file bawaan template dan ikut build. Foto/dekorasi milik pasangan tetap dapat diunggah melalui admin ke Cloudinary.
- Prompt final:

> Use case: stylized-concept. Asset type: transparent decorative watercolor botanical illustration for the Sunset Bloom wedding invitation website. Primary request: a joyful lush garden floral spray in terracotta orange, apricot, golden yellow and buttery cream. Include orange cosmos, yellow and peach dahlias, cream garden roses, tiny golden wildflowers and flowing olive green leaves. Fine art hand-painted watercolor and gouache on transparent background with rich warm pigments, elegant detailed botanical wedding stationery. Portrait composition, flowers concentrated in lower left and middle, a few long leafy stems extend upward and outward, organic airy silhouette with transparent gaps. Entire arrangement within frame with generous clear margins, no cropped tips. Celebratory and warm, sophisticated not cartoonish. Actual transparent background; no paper rectangle, no backdrop, no pot or vase, no ribbon, no text or lettering, no border, no shadows, no people. Suitable for mirroring at corners and framing a cream wedding invitation.

## Ilustrasi bunga

- File proyek: `public/assets/floral-watercolor.png`.
- Dibuat dengan tool bawaan `image_gen`, bukan CLI/API fallback.
- Latar transparan asli dipertahankan. Aset disalin ke workspace dari hasil generator; tidak bergantung pada folder gambar hasil generasi.
- Prompt final:

> Use case: stylized-concept. Asset type: decorative botanical illustration for a sophisticated Indonesian wedding invitation website called Floral Reverie. Create a fine-art watercolor floral arrangement isolated on a truly transparent background, portrait composition. An airy asymmetrical bouquet with creamy white garden roses, dusty pale blush peonies, a few tiny ivory blossoms, long flowing sage and olive eucalyptus branches and delicate wispy stems. The arrangement flows diagonally from the lower-left, with graceful tall branches extending upward and toward the right. Generous gaps of transparency between leaves. Subtle hand-painted paper and pigment texture in petals, detailed botanical leaves, soft natural muted colors, refined antique botanical stationery aesthetic. Flowers concentrated in lower left and middle left; avoid a solid dense mass, leave the right edge very airy. Organic silhouettes, entire arrangement in frame with margin, no clipped leaves. No vase, no ribbon, no text, no letters, no border, no shadows, no background color, no mockup, no people. One single exquisite ornamental floral spray, suitable to mirror and rotate around a clean ivory invitation.

## Foto contoh

Foto stok dari Unsplash, disimpan lokal untuk pratinjau:

- `wedding-garden.jpg`: https://images.unsplash.com/photo-1519741497674-611481863552
- `wedding-moment.jpg`: https://images.unsplash.com/photo-1523438885200-e635ba2c371e
- `wedding-details.jpg`: https://images.unsplash.com/photo-1511285560929-80b456fea0bc

Ketentuan sumber: https://unsplash.com/license. Foto-foto ini adalah referensi suasana, tidak menunjukkan identitas Nadine atau Arga. Ganti dengan foto milik pelanggan ketika membuat undangan sungguhan.

## Font

Cormorant Garamond dan DM Sans dari Google Fonts, disimpan sebagai TTF lokal. Berlisensi SIL Open Font License; salinan lisensi berada di `public/assets/fonts/`.

- https://github.com/google/fonts/tree/main/ofl/cormorantgaramond
- https://github.com/google/fonts/tree/main/ofl/dmsans

## Ikon dan musik

Ikon SVG garis sederhana ditulis di dalam proyek. Musik berupa arpeggio original yang disintesis dengan Web Audio; tidak memakai rekaman komersial.
## Potret contoh Monochrome Vows

Dibuat menggunakan tool bawaan image_gen. Kedua orang adalah model fiktif untuk preview, bukan pelanggan atau orang dalam gambar referensi pengguna. PNG sumber dikonversi ke WebP 800 × 1200 dengan FFmpeg; gabungan aset sekitar 96 KB.

- public/assets/monochrome-groom.webp
- public/assets/monochrome-bride.webp

Prompt final pria:

> Use case: photorealistic-natural. Asset type: fictional sample portrait for an Indonesian black and white wedding invitation website, not an actual client. Fine art fashion editorial portrait, vertical 2:3 composition, chest-up, face centered and facing camera with a gentle composed expression, entire head visible with 10 percent headroom, realistic natural skin texture, soft directional studio lighting, rich true black and white photography, seamless light gray background. No text, no letters, no watermark, no frame, no props, no flowers. Subject: a fictional Indonesian man around 28, short neatly styled dark hair, wearing a white formal mandarin-collar wedding shirt.

Prompt final wanita:

> Use case: photorealistic-natural. Asset type: fictional sample portrait for an Indonesian black and white wedding invitation website, not an actual client. Fine art fashion editorial portrait, vertical 2:3 composition, chest-up, face centered and facing camera with a gentle composed expression, entire head visible with 10 percent headroom, realistic natural skin texture, soft directional studio lighting, rich true black and white photography, seamless light gray background. No text, no letters, no watermark, no frame, no props, no flowers. Subject: a fictional Indonesian woman around 27, wearing a neat white hijab and a simple white long sleeve wedding blouse.
