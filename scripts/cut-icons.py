from PIL import Image
import os

img = Image.open('/home/z/my-project/upload/Screenshot 2026-07-15 095021.png')
print(f'Image size: {img.size}')

# Sidebar icons อยู่ทางซ้าย — แต่ละ row มี icon ก่อน text
# จาก VLM: sub-items เริ่มที่ ~130px จาก top, แต่ละ row ~40px
# Icon อยู่ที่ x~24-48, y ตามแต่ละ row

# ตัด icon column จาก sidebar (x: 20-52)
# แต่ต้องรู้ตำแหน่ง y ของแต่ละ sub-item ก่อน
# ลองตัดทั้ง icon column แล้วดู

# Search bar: y ~12-44
# Home: y ~50-85
# System: y ~85-120
# Display: y ~120-155
# Sound: y ~155-190
# Notifications: y ~190-225
# Focus assist: y ~225-260
# Power & sleep: y ~260-295
# Storage: y ~295-330
# Multitasking: y ~330-365
# Projecting: y ~365-400
# Clipboard: y ~400-435
# About: y ~435-470

icons = {
    'display': (20, 125, 52, 155),
    'sound': (20, 160, 52, 190),
    'notifications': (20, 195, 52, 225),
    'focus': (20, 230, 52, 260),
    'power': (20, 265, 52, 295),
    'storage': (20, 300, 52, 330),
    'multitasking': (20, 335, 52, 365),
    'projecting': (20, 370, 52, 400),
    'clipboard': (20, 405, 52, 435),
    'about': (20, 440, 52, 470),
}

os.makedirs('/home/z/my-project/public/win10-icons', exist_ok=True)

for name, (x1, y1, x2, y2) in icons.items():
    crop = img.crop((x1, y1, x2, y2))
    # ขยาย 2x เพื่อความคม
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    crop.save(f'/home/z/my-project/public/win10-icons/{name}.png')
    print(f'Saved {name}.png ({crop.size})')

print('Done!')
