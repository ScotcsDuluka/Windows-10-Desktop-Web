from PIL import Image

img = Image.open('/home/z/my-project/upload/Screenshot 2026-07-15 095021.png')
print(f'Image size: {img.size}')

# ตัดทั้ง sidebar มาดูก่อน
sidebar = img.crop((0, 0, 280, 600))
sidebar.save('/home/z/my-project/download/sidebar-full-debug.png')

# ตัดเป็นช่วง ๆ ละ 50px เพื่อหาตำแหน่ง icon จริง
for y in range(0, 600, 40):
    crop = img.crop((0, y, 280, y + 40))
    crop.save(f'/home/z/my-project/download/sidebar-row-{y}.png')

print('Saved debug rows')
