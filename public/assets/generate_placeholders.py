"""
Скрипт генерации SVG-заглушек для всех ассетов.
Запусти: python3 generate_placeholders.py
Потом просто замени нужный файл своим — движок подхватит автоматически.
"""

import os

def make_bg(filename, label, w=1920, h=1080):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">
  <rect width="100%" height="100%" fill="#0a0a14"/>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a0a0a" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0a0a1a" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <line x1="0" y1="0" x2="{w}" y2="{h}" stroke="#8b1a1a" stroke-width="0.5" opacity="0.2"/>
  <line x1="{w}" y1="0" x2="0" y2="{h}" stroke="#8b1a1a" stroke-width="0.5" opacity="0.2"/>
  <text x="{w//2}" y="{h//2 - 20}" font-family="monospace" font-size="28" fill="#8b1a1a" text-anchor="middle" opacity="0.6">ФОНОВОЕ ИЗОБРАЖЕНИЕ</text>
  <text x="{w//2}" y="{h//2 + 20}" font-family="monospace" font-size="18" fill="#6b6660" text-anchor="middle">{label}</text>
  <text x="{w//2}" y="{h//2 + 56}" font-family="monospace" font-size="13" fill="#3d3a36" text-anchor="middle">{w}×{h} // замените этот файл своим</text>
  <rect x="10" y="10" width="{w-20}" height="{h-20}" fill="none" stroke="#8b1a1a" stroke-width="1" opacity="0.15"/>
</svg>'''
    return svg

def make_sprite(filename, label, character, w=400, h=800):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">
  <rect width="100%" height="100%" fill="none"/>
  <ellipse cx="{w//2}" cy="{h//3}" rx="80" ry="80" fill="#1a1a2a" stroke="#8b1a1a" stroke-width="1" opacity="0.6"/>
  <rect x="{w//2 - 70}" y="{h//3 + 70}" width="140" height="220" rx="8" fill="#1a1a2a" stroke="#8b1a1a" stroke-width="1" opacity="0.6"/>
  <text x="{w//2}" y="{h//3 - 10}" font-family="monospace" font-size="13" fill="#8b1a1a" text-anchor="middle" opacity="0.8">{character.upper()}</text>
  <text x="{w//2}" y="{h - 60}" font-family="monospace" font-size="12" fill="#6b6660" text-anchor="middle">{label}</text>
  <text x="{w//2}" y="{h - 40}" font-family="monospace" font-size="10" fill="#3d3a36" text-anchor="middle">замените файл своим PNG</text>
</svg>'''
    return svg

# ─── ФОНЫ ────────────────────────────────────────────────────
backgrounds = [
    ("corridor.jpg",     "bg/corridor.jpg",     "КОРИДОР — жилой блок, 03:40"),
    ("lab_b.jpg",        "bg/lab_b.jpg",         "СЕКТОР Б — биохимическая лаборатория"),
    ("sector_a.jpg",     "bg/sector_a.jpg",      "СЕКТОР А — административный"),
    ("sector_v.jpg",     "bg/sector_v.jpg",      "СЕКТОР В — вивариум"),
    ("sector_g.jpg",     "bg/sector_g.jpg",      "СЕКТОР Г — засекреченный"),
    ("airlock.jpg",      "bg/airlock.jpg",       "ШЛЮЗ — между блоками"),
    ("cell_402.jpg",     "bg/cell_402.jpg",      "КАМЕРА №402 — изолятор Михаила"),
    ("server_room.jpg",  "bg/server_room.jpg",   "СЕРВЕРНАЯ — сектор А"),
    ("black.jpg",        "bg/black.jpg",         "ЧЁРНЫЙ ЭКРАН — монолог / пролог"),
]

for fname, path, label in backgrounds:
    svg = make_bg(fname, label)
    # Сохраняем как SVG (заглушка), игрок заменит на JPG
    out = f"images/bg/{fname.replace('.jpg', '_placeholder.svg')}"
    with open(out, 'w', encoding='utf-8') as f:
        f.write(svg)
    print(f"✓ {out}")

# ─── СПРАЙТЫ ─────────────────────────────────────────────────
sprites = {
    "alex":    ["neutral", "tired", "tense", "angry", "shocked"],
    "lena":    ["neutral", "focused", "scared", "sad", "smile", "crying"],
    "vlasov":  ["neutral", "cold", "angry", "suspicious"],
    "aris":    ["neutral", "smile", "curious", "cold"],
    "mikhail": ["neutral", "distant", "lucid", "singing"],
}

for char, expressions in sprites.items():
    for expr in expressions:
        svg = make_sprite(f"{char}_{expr}.png", expr, char)
        out = f"images/sprites/{char}/{expr}_placeholder.svg"
        with open(out, 'w', encoding='utf-8') as f:
            f.write(svg)
        print(f"✓ {out}")

print("\nГотово. Замените *_placeholder.svg своими файлами (PNG для спрайтов, JPG для фонов).")
print("Имя файла без '_placeholder' — именно это имя использует движок.")
