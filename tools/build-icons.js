/**
 * Bina web/vendor/lucide-subset.js daripada pakej lucide penuh.
 *
 * KENAPA FAIL INI WUJUD
 *
 * Lucide penuh melebihi 700KB. Portal ini hanya menggunakan ~55 ikon, jadi
 * kita hantar subset kira-kira 12KB supaya versi luar talian (vendor/) tidak
 * bergantung kepada CDN.
 *
 * PERANGKAP YANG PERNAH MEMATAHKANNYA
 *
 * Format eksport Lucide ialah TIGA elemen: ["svg", attributes, [children]].
 * Versi pertama penjana ini menganggap keseluruhan array itu senarai anak,
 * jadi setiap SVG dihasilkan KOSONG — ikon "hilang" sepenuhnya di telefon
 * walaupun tiada ralat dalam konsol. Ambil d[2] sahaja.
 *
 * Nama ikon dikutip daripada HTML DAN daripada rentetan di dalam JavaScript
 * (ikon yang dijana secara dinamik seperti data-lucide="x" di dalam templat
 * literal). Melangkau yang kedua ialah sebab "x" dan "home" pernah tertinggal.
 *
 * Guna:  node tools/build-icons.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = [
  'web/index.html',
  'web/index.cdn.html',
  'web/admin/index.html',
  'web/admin/index.cdn.html',
  'web/juri/index.html',
  'web/juri/index.cdn.html'
];

// Ikon yang sentiasa disertakan walaupun tidak dijumpai oleh pengimbas —
// jaring keselamatan untuk nama yang dibina secara dinamik.
const ALWAYS = [
  'x', 'home', 'check', 'check-circle', 'alert-triangle', 'info',
  'loader-2', 'chevron-right', 'chevron-down', 'arrow-right', 'arrow-left'
];

function collectNames() {
  const found = new Set(ALWAYS);
  PAGES.forEach(rel => {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) return;
    const html = fs.readFileSync(file, 'utf8');

    // 1. Atribut dalam markup: data-lucide="nama"  atau  data-lucide=\'nama\'
    for (const m of html.matchAll(/data-lucide\s*=\s*["'\\]*([a-z0-9-]+)/g)) found.add(m[1]);
    // 2. setAttribute('data-lucide', 'nama')
    for (const m of html.matchAll(/setAttribute\(\s*['"]data-lucide['"]\s*,\s*['"]([a-z0-9-]+)['"]/g)) found.add(m[1]);
    // 3. Ternary di dalam JS:  dark ? 'sun' : 'moon'
    for (const m of html.matchAll(/data-lucide['"]?\s*,\s*[^;\n]*?\?\s*['"]([a-z0-9-]+)['"]\s*:\s*['"]([a-z0-9-]+)['"]/g)) {
      found.add(m[1]); found.add(m[2]);
    }
    // 4. Hujah ikon kepada pembantu alert/emptyCard: app.alert(t, m, 'nama')
    for (const m of html.matchAll(/(?:alert|emptyCard)\([^)]*?['"]([a-z][a-z0-9-]{2,})['"]\s*\)/g)) found.add(m[1]);
  });
  return found;
}

function build() {
  const lucide = require('/tmp/lucidedl/node_modules/lucide/dist/cjs/lucide.js');
  const wanted = collectNames();

  // Lucide mengeksport PascalCase (ArrowRight); markup guna kebab (arrow-right).
  const byKebab = {};
  Object.keys(lucide).forEach(k => {
    // PascalCase -> kebab. Digit di hujung mesti jadi segmennya sendiri:
    // CheckCircle2 -> check-circle-2, bukan check-circle2. Terlepas peraturan
    // ini bermakna check-circle-2, contact-2, edit-2 dan file-bar-chart-2
    // semuanya senyap-senyap hilang daripada subset.
    const kebab = k.replace(/([a-z])([A-Z])/g, '$1-$2')
                   .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
                   .replace(/([A-Za-z])(\d)/g, '$1-$2')
                   .toLowerCase();
    byKebab[kebab] = lucide[k];
  });

  const out = {};
  const missing = [];
  Array.from(wanted).sort().forEach(name => {
    const d = byKebab[name];
    if (!Array.isArray(d)) { missing.push(name); return; }
    // ["svg", attrs, [children]] -> kita mahu children SAHAJA.
    out[name] = (d[0] === 'svg' && Array.isArray(d[2])) ? d[2] : d;
  });

  const js =
`/* Subset ikon Lucide untuk CSC2026 — dijana oleh tools/build-icons.js.
   JANGAN edit dengan tangan; jalankan semula penjana selepas menambah ikon.
   Ikon: ${Object.keys(out).length} */
(function (root) {
  var ICONS = ${JSON.stringify(out)};
  var NS = 'http://www.w3.org/2000/svg';
  var BASE = {
    xmlns: NS, width: 24, height: 24, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round'
  };

  function build(name, srcEl) {
    var def = ICONS[name];
    var svg = document.createElementNS(NS, 'svg');
    Object.keys(BASE).forEach(function (k) { svg.setAttribute(k, BASE[k]); });

    // Bawa kelas/gaya daripada elemen <i> supaya saiz Tailwind (w-4 h-4) kekal.
    for (var i = 0; i < srcEl.attributes.length; i++) {
      var a = srcEl.attributes[i];
      if (a.name === 'data-lucide') continue;
      svg.setAttribute(a.name, a.value);
    }
    // Kelas yang sama seperti Lucide penuh, supaya CSS dan ujian yang
    // memilih "svg.lucide" berfungsi sama pada kedua-dua varian.
    var cls = (srcEl.getAttribute('class') || '').split(/\\s+/).filter(Boolean);
    cls.push('lucide', 'lucide-' + name);
    svg.setAttribute('class', cls.join(' '));
    svg.setAttribute('data-lucide-name', name);

    (def || []).forEach(function (child) {
      if (!Array.isArray(child)) return;
      var el = document.createElementNS(NS, child[0]);
      var attrs = child[1] || {};
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function createIcons() {
    var nodes = document.querySelectorAll('[data-lucide]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var name = el.getAttribute('data-lucide');
      if (!ICONS[name]) {
        // Ikon tidak dikenali: buang atribut supaya ia tidak dicuba berulang
        // kali pada setiap refreshIcons(), dan beritahu pembangun sekali.
        if (root.console) console.warn('[lucide-subset] ikon tiada: ' + name);
        el.removeAttribute('data-lucide');
        continue;
      }
      el.parentNode.replaceChild(build(name, el), el);
    }
  }

  root.lucide = { createIcons: createIcons, icons: ICONS };
})(window);
`;

  const dest = path.join(ROOT, 'web/vendor/lucide-subset.js');
  fs.writeFileSync(dest, js);
  console.log('ikon disertakan :', Object.keys(out).length);
  console.log('saiz            :', (js.length / 1024).toFixed(1) + ' KB');
  if (missing.length) console.log('TIADA DALAM LUCIDE:', missing.join(', '));
}

build();
