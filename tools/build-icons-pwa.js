/**
 * Jana set ikon PWA + favicon daripada satu fail logo sumber.
 *
 * KENAPA IKON INI FAIL STATIK
 *
 * Ikon pemasangan PWA dibaca oleh sistem pengendalian daripada manifest
 * SEBELUM apa-apa JavaScript berjalan, dan ikon yang sudah dipasang di skrin
 * utama pengguna tidak berubah selepas itu. Jadi logo yang dimuat naik melalui
 * portal admin TIDAK boleh menjadi ikon pemasangan secara automatik — ia
 * mesti wujud sebagai fail sebelum halaman dihoskan.
 *
 * Skrip ini yang menjananya. Jalankan sekali apabila logo rasmi berubah, dan
 * push fail hasilnya.
 *
 *   node tools/build-icons-pwa.js <fail-logo.png>
 *
 * Yang dijana ke web/assets/:
 *   icon-192.png            ikon PWA biasa
 *   icon-512.png            ikon PWA besar / skrin splash
 *   icon-maskable-512.png   dengan zon selamat, untuk pelancar Android bulat
 *   apple-touch-icon.png    180px untuk iOS
 *   favicon-16.png / -32.png / favicon.ico
 *
 * Favicon menggunakan potongan monogram "CBP" sahaja. Logo penuh pada 16px
 * menjadi kotak kelabu yang tidak boleh dibaca — bahagian atas logo masih
 * dikenali pada saiz itu.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) {
  console.error('Guna: node tools/build-icons-pwa.js <fail-logo.png>');
  process.exit(1);
}

const OUT = path.join(__dirname, '..', 'web', 'assets');
const BG = '#0f172a';          // navy gelap — sepadan dengan tema gelap portal

function py(script) {
  execFileSync('python3', ['-c', script], { stdio: 'inherit' });
}

py(`
from PIL import Image
import os

SRC = ${JSON.stringify(SRC)}
OUT = ${JSON.stringify(OUT)}
BG  = (15, 23, 42, 255)          # ${BG}

src = Image.open(SRC).convert('RGBA')
src = src.crop(src.split()[3].getbbox())   # buang ruang telus di tepi

def place(canvas_size, logo_frac, source, bg=BG, radius_bg=True):
    """Letakkan 'source' di tengah kanvas segi empat sama."""
    c = Image.new('RGBA', (canvas_size, canvas_size), bg)
    w, h = source.size
    target_w = int(canvas_size * logo_frac)
    scale = target_w / w
    target_h = int(h * scale)
    if target_h > canvas_size * logo_frac:
        scale = (canvas_size * logo_frac) / h
        target_w, target_h = int(w * scale), int(h * scale)
    r = source.resize((max(1,target_w), max(1,target_h)), Image.LANCZOS)
    c.paste(r, ((canvas_size - target_w)//2, (canvas_size - target_h)//2), r)
    return c

# --- Ikon PWA biasa: 84% lebar, sedikit ruang lega -------------------------
place(512, 0.84, src).save(os.path.join(OUT, 'icon-512.png'))
place(192, 0.84, src).save(os.path.join(OUT, 'icon-192.png'))
place(180, 0.84, src).save(os.path.join(OUT, 'apple-touch-icon.png'))

# --- Maskable: kandungan mesti muat dalam bulatan zon selamat -------------
# Zon selamat = bulatan berdiameter 80% ikon. Untuk logo 1.53:1, lebar
# maksimum yang pepenjurunya masih muat dalam bulatan itu ialah ~68%.
place(512, 0.66, src).save(os.path.join(OUT, 'icon-maskable-512.png'))

# --- Favicon: monogram sahaja --------------------------------------------
w, h = src.size
mono = src.crop((int(w*0.12), 0, int(w*0.88), int(h*0.42)))
for size in (16, 32, 48):
    place(size, 0.92, mono).convert('RGB').save(os.path.join(OUT, 'favicon-%d.png' % size))

ico = place(48, 0.92, mono).convert('RGB')
ico.save(os.path.join(OUT, 'favicon.ico'), format='ICO',
         sizes=[(16,16),(32,32),(48,48)])

for f in ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png',
          'favicon-16.png','favicon-32.png','favicon-48.png','favicon.ico']:
    p = os.path.join(OUT, f)
    print('  %-26s %6.1f KB' % (f, os.path.getsize(p)/1024))
`);

console.log('\nSelesai. Push semula folder web/assets/ selepas ini.');
