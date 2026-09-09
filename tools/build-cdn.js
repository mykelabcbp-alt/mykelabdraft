/**
 * Jana varian *.cdn.html daripada fail utama.
 *
 * Perbezaan antara kedua-dua varian hanya DUA baris: dari mana Tailwind dan
 * Lucide dimuatkan. Menyalinnya dengan tangan bermakna satu pembetulan
 * dilakukan pada satu fail dan terlupa pada satu lagi — itu memang pernah
 * berlaku. Jana sahaja.
 *
 *   index.html      -> vendor/  (luar talian, disyorkan)
 *   index.cdn.html  -> CDN awam (untuk ujian cepat / demo)
 *
 * Guna:  node tools/build-cdn.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['web/index.html', 'web/admin/index.html', 'web/juri/index.html'];

const RULES = [
  [/<link rel="stylesheet" href="(\.\.\/)?vendor\/tailwind\.css">/,
   '<script src="https://cdn.tailwindcss.com"></script>'],
  [/<script src="(\.\.\/)?vendor\/lucide-subset\.js"><\/script>/,
   '<script src="https://unpkg.com/lucide@latest"></script>']
];

let fail = 0;
FILES.forEach(rel => {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  let html = fs.readFileSync(src, 'utf8');

  RULES.forEach(([re, repl]) => {
    if (!re.test(html)) {
      console.error('AMARAN: corak tidak dijumpai dalam ' + rel + ' -> ' + re);
      fail++;
      return;
    }
    html = html.replace(re, repl);
  });

  const dest = src.replace(/\.html$/, '.cdn.html');
  fs.writeFileSync(dest, html);

  // Sahkan bahawa hanya baris yang dijangka berbeza.
  const a = fs.readFileSync(src, 'utf8').split('\n');
  const b = html.split('\n');
  let diff = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diff++;
  console.log(path.basename(dest).padEnd(20), diff + ' baris berbeza');
  if (diff !== 2) { console.error('  DIJANGKA 2 BARIS SAHAJA'); fail++; }
});

process.exit(fail ? 1 : 0);
