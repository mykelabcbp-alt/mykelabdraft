/**
 * Salin fon yang digunakan ke web/vendor/fonts/ dan jana fonts.css.
 *
 * KENAPA FAIL INI WUJUD
 *
 * Portal asalnya memuatkan fon dari fonts.googleapis.com. Itu bermakna
 * setiap kali halaman dibuka, pelayar staf menghubungi domain Google yang
 * KETIGA (selain API dan gambar) — dan setiap domain tambahan ialah satu
 * lagi baris dalam permohonan whitelist kepada IT Security, serta satu lagi
 * titik kegagalan kalau rangkaian venue menyekatnya.
 *
 * Fon di-hos sendiri. Berat tambahan kecil (subset latin sahaja, woff2),
 * dan rupa taip kekal 100% sama kerana ia fail fon yang sama.
 *
 * Guna:
 *   cd /tmp/fontpkg && npm i @fontsource/inter @fontsource/rajdhani @fontsource/jetbrains-mono
 *   node tools/build-fonts.js /tmp/fontpkg/node_modules/@fontsource
 */
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) {
  console.error('Guna: node tools/build-fonts.js <folder @fontsource>');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'web', 'vendor', 'fonts');
fs.mkdirSync(OUT, { recursive: true });

// Hanya berat yang benar-benar digunakan oleh markup — bukan 252 fail.
const WANT = [
  { pkg: 'inter', family: 'Inter', weights: [300, 400, 500, 600, 700] },
  { pkg: 'rajdhani', family: 'Rajdhani', weights: [500, 600, 700] },
  { pkg: 'jetbrains-mono', family: 'JetBrains Mono', weights: [400, 600, 700] }
];

let css = `/* Fon di-hos sendiri untuk CSC2026 — dijana oleh tools/build-fonts.js.
   Subset latin, format woff2. Menggantikan fonts.googleapis.com supaya
   portal tidak bergantung pada domain luar tambahan. */\n`;
let total = 0;

WANT.forEach(f => {
  f.weights.forEach(w => {
    const file = `${f.pkg}-latin-${w}-normal.woff2`;
    const from = path.join(SRC, f.pkg, 'files', file);
    if (!fs.existsSync(from)) { console.error('TIADA: ' + file); return; }
    fs.copyFileSync(from, path.join(OUT, file));
    total += fs.statSync(from).size;
    css += `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${w};` +
           `font-display:swap;src:url('fonts/${file}') format('woff2');}\n`;
  });
});

fs.writeFileSync(path.join(ROOT, 'web', 'vendor', 'fonts.css'), css);
console.log('fail fon  :', fs.readdirSync(OUT).length);
console.log('jumlah    :', (total / 1024).toFixed(0) + ' KB');
console.log('fonts.css :', (css.length / 1024).toFixed(1) + ' KB');
