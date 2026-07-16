from PIL import Image
import os

# Open real Win10 screenshot (Display page — has sidebar with icons)
img = Image.open('/home/z/my-project/upload/Screenshot 2026-07-15 095021.png')
print(f'Image size: {img.size}')

# Sidebar is on the left, ~280px wide
# Icons are at ~24px from left, each row ~40px tall
# Search bar is at top (~50px), Home at ~90px, System at ~130px
# Sub-items start at ~170px, each ~36px tall

# Let's crop the sidebar icon area to see what we're working with
sidebar = img.crop((0, 0, 280, img.size[1]))
sidebar.save('/home/z/my-project/download/sidebar-crop.png')
print('Saved sidebar crop')

# Now crop individual icons from sidebar
# Based on Win10 layout: icons are at x=20-44, each row ~36px
# Home icon: y~85-115
# System icon: y~120-155
# Display (no icon, just text, but selected)
# Let's crop the top section to see
top_section = img.crop((0, 60, 280, 400))
top_section.save('/home/z/my-project/download/sidebar-top.png')
print('Saved sidebar top section')

# Crop just the icon column (x: 20-50)
icon_column = img.crop((20, 60, 50, 600))
icon_column.save('/home/z/my-project/download/icon-column.png')
print('Saved icon column')
