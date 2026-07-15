from PIL import Image
import os

img = Image.open('/home/z/my-project/upload/Screenshot 2026-07-15 095021.png')

# VLM positions (Y from top of image):
# Home: 84, System: 234, Display: 300, Sound: 366, 
# Notifications: 432, Focus: 498, Power: 564
# Battery: 630, Storage: 696, Tablet: 762

# Icon is at x~20-50, each icon ~30px tall
# Only cut sub-items (Display onwards) — Home/System have no icon in real Win10

icons = {
    'display':       (20, 295, 52, 325),
    'sound':         (20, 361, 52, 391),
    'notifications': (20, 427, 52, 457),
    'focus':         (20, 493, 52, 523),
    'power':         (20, 559, 52, 589),
    'storage':       (20, 625, 52, 655),
    'multitasking':  (20, 691, 52, 721),
    'projecting':    (20, 757, 52, 787),
}

# For clipboard and about — they're below 768 (off screen)
# Use power icon as placeholder for now
icons['clipboard'] = (20, 559, 52, 589)  # placeholder
icons['about'] = (20, 559, 52, 589)  # placeholder

os.makedirs('/home/z/my-project/public/win10-icons', exist_ok=True)

for name, (x1, y1, x2, y2) in icons.items():
    crop = img.crop((x1, y1, x2, y2))
    crop = crop.resize((32, 30), Image.LANCZOS)
    crop.save(f'/home/z/my-project/public/win10-icons/{name}.png')
    print(f'Saved {name}.png ({crop.size}) — src Y: {y1}-{y2}')

print('Done!')
