#!/usr/bin/env python3
"""
Запуск: python3 crop_sprites.py
Обрезает все PNG/JPG спрайты в папке public/assets/images/sprites/
убирая чёрные/пустые поля вокруг персонажей.
Требует: pip install Pillow numpy
"""
from PIL import Image
import numpy as np
import os, sys

SPRITE_DIR = os.path.join(os.path.dirname(__file__), 'public/assets/images/sprites')
PADDING = 8   # пикселей отступа вокруг персонажа
THRESHOLD = 15  # порог яркости — пиксели темнее считаются фоном

processed = 0
skipped = 0
errors = 0

for root, dirs, files in os.walk(SPRITE_DIR):
    for fname in sorted(files):
        if not fname.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue

        path = os.path.join(root, fname)
        rel  = os.path.relpath(path, SPRITE_DIR)

        try:
            img  = Image.open(path).convert('RGBA')
            w, h = img.size
            data = np.array(img)

            # Маска контента — не чёрные пиксели
            mask = (data[:,:,0] > THRESHOLD) | \
                   (data[:,:,1] > THRESHOLD) | \
                   (data[:,:,2] > THRESHOLD)

            if not mask.any():
                print(f'SKIP (пустой): {rel}')
                skipped += 1
                continue

            rows = np.any(mask, axis=1)
            cols = np.any(mask, axis=0)
            rmin, rmax = np.where(rows)[0][[0, -1]]
            cmin, cmax = np.where(cols)[0][[0, -1]]

            # Проверяем — есть ли смысл обрезать (хотя бы 5% отступ с любой стороны)
            if (cmin/w < 0.05 and (w-cmax)/w < 0.05 and
                rmin/h < 0.05 and (h-rmax)/h < 0.05):
                print(f'SKIP (уже обрезан): {rel}')
                skipped += 1
                continue

            # Обрезаем с отступом
            rmin = max(0,   rmin - PADDING)
            rmax = min(h-1, rmax + PADDING)
            cmin = max(0,   cmin - PADDING)
            cmax = min(w-1, cmax + PADDING)

            cropped  = img.crop((cmin, rmin, cmax, rmax))
            out_path = os.path.splitext(path)[0] + '.png'
            cropped.save(out_path, 'PNG')

            # Удаляем оригинал если изменилось расширение
            if path != out_path and os.path.exists(path):
                os.remove(path)

            new_w, new_h = cmax - cmin, rmax - rmin
            saved_pct = 100 * (1 - (new_w * new_h) / (w * h))
            print(f'OK: {rel}  {w}x{h} → {new_w}x{new_h}  (-{saved_pct:.0f}%)')
            processed += 1

        except Exception as e:
            print(f'ERROR: {rel}: {e}')
            errors += 1

print(f'\nГотово: {processed} обрезано, {skipped} пропущено, {errors} ошибок')
