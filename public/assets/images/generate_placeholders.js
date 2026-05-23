// Запусти этот файл один раз: node generate_placeholders.js
// Он создаст SVG-пустышки для всех ассетов

const fs = require('fs');
const path = require('path');

function bgSVG(label, w=1920, h=1080) {
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a0a12"/>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d0d20"/>
      <stop offset="100%" stop-color="#050508"/>
    </linearGradient>
  </defs>
  <line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="#1a1a2e" stroke-width="1"/>
  <line x1="${w/2}" y1="0" x2="${w/2}" y2="${h}" stroke="#1a1a2e" stroke-width="1"/>
  <rect x="${w/2-200}" y="${h/2-60}" width="400" height="120" fill="none" stroke="#8b1a1a" stroke-width="1" opacity="0.5"/>
  <text x="${w/2}" y="${h/2-10}" text-anchor="middle" font-family="monospace" font-size="18" fill="#8b1a1a" opacity="0.8">ФОНОВЫЙ АРТ</text>
  <text x="${w/2}" y="${h/2+20}" text-anchor="middle" font-family="monospace" font-size="14" fill="#6b1a1a" opacity="0.6">${label}</text>
  <text x="${w/2}" y="${h/2+48}" text-anchor="middle" font-family="monospace" font-size="11" fill="#3d3a36" opacity="0.5">Замените этот файл на ваш арт (JPG/PNG/GIF/MP4)</text>
</svg>`;
}

function spriteSVG(character, emotion, w=600, h=900) {
  const colors = {
    alex: '#2a3a4a', lena: '#2a3a2a', vlasov: '#3a2a2a', aris: '#2a2a3a', mikhail: '#3a3a2a'
  };
  const color = colors[character] || '#2a2a2a';
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="none"/>
  <rect x="10" y="10" width="${w-20}" height="${h-20}" fill="${color}" opacity="0.3" stroke="#8b1a1a" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="${w/2}" y="${h/2-20}" text-anchor="middle" font-family="monospace" font-size="14" fill="#8b1a1a" opacity="0.8">${character.toUpperCase()}</text>
  <text x="${w/2}" y="${h/2+10}" text-anchor="middle" font-family="monospace" font-size="12" fill="#6b1a1a" opacity="0.6">${emotion}</text>
  <text x="${w/2}" y="${h-30}" text-anchor="middle" font-family="monospace" font-size="10" fill="#3d3a36" opacity="0.5">PNG с прозрачным фоном</text>
</svg>`;
}

// Фоны
const bgs = [
  'corridor',      // Главный коридор
  'room_alex',     // Комната Алекса
  'lab_b',         // Лаборатория Б
  'sector_a',      // Сектор А (административный)
  'sector_v',      // Сектор В (вивариум)
  'sector_g',      // Сектор Г (секретный)
  'airlock',       // Шлюз
  'chamber_402',   // Камера Михаила
  'server_room',   // Серверная
  'black',         // Чёрный экран (для монологов)
];

bgs.forEach(name => {
  fs.writeFileSync(path.join(__dirname, 'bg', `${name}.svg`), bgSVG(name));
  console.log(`✓ bg/${name}.svg`);
});

// Спрайты
const sprites = {
  alex:    ['neutral', 'tired', 'angry', 'determined', 'shocked'],
  lena:    ['neutral', 'focused', 'scared', 'sad', 'smile'],
  vlasov:  ['neutral', 'cold', 'angry', 'contempt'],
  aris:    ['neutral', 'smile', 'curious', 'cold'],
  mikhail: ['neutral', 'lucid', 'singing', 'broken'],
};

Object.entries(sprites).forEach(([char, emotions]) => {
  emotions.forEach(emotion => {
    fs.writeFileSync(
      path.join(__dirname, 'sprites', char, `${emotion}.svg`),
      spriteSVG(char, emotion)
    );
    console.log(`✓ sprites/${char}/${emotion}.svg`);
  });
});

console.log('\nГотово! Замените SVG файлы на ваши PNG/JPG ассеты с теми же именами.');
