# Windows 10 Settings UI Research Summary

แหล่งทางการ: Microsoft Learn — "Launch Windows Settings" (ms-settings: URI scheme reference)
URL: https://learn.microsoft.com/en-us/windows/apps/develop/launch/launch-settings

## หมวดทั้งหมด (12 หมวด — ตามทางการ Microsoft)

1. System
2. Devices
3. Phone
4. Network & Internet
5. Personalization
6. Apps
7. Accounts
8. Time & Language
9. Gaming
10. Ease of Access
11. Privacy
12. Update & Security

---

## 1. System (ms-settings:display, ms-settings:about, etc.)

หน้าย่อยที่ทางการระบุ:
- **About** — Device specifications, Windows specifications
- **Display** — Monitors, brightness, night light, scale, resolution
- **Sound** — Volume, output, input devices
- **Notifications & actions** — Notifications, quick actions
- **Power & sleep** — Sleep, screen timeout, power mode
- **Storage** — Storage Sense, drives, save locations
- **Multitasking** — Snap windows, virtual desktops, Task view
- **Tablet mode** — Make Windows touch-friendly
- **Clipboard** — Clipboard history, sync
- **Battery** — Battery saver, battery use (mobile devices only)
- **Focus assist** — Quiet hours, automatic rules
- **Graphics Settings** — GPU preference, advanced graphics

## 2. Devices (ms-settings:bluetooth, ms-settings:printers, etc.)

หน้าย่อยที่ทางการระบุ:
- **Bluetooth & other devices** (ms-settings:bluetooth) — Mouse, keyboard, pen, audio
- **Printers & scanners** (ms-settings:printers)
- **Mouse & touchpad** (ms-settings:mousetouchpad) — Buttons, wheel, pointer
- **Touchpad** (ms-settings:devices-touchpad) — Gestures, sensitivity
- **Typing** (ms-settings:typing) — Autocorrect, suggestions, hardware keyboard
- **Pen & Windows Ink** (ms-settings:pen) — Pen shortcuts
- **AutoPlay** (ms-settings:autoplay)
- **USB** (ms-settings:usb)
- **Touch** (ms-settings:devices-touch)
- **Wheel** (ms-settings:wheel) — Surface Dial only

## 3. Phone (ms-settings:mobile-devices)

หน้าย่อย:
- **Your Phone** — Link Android/iPhone
- **Calls** — Make/receive calls from PC
- **Messages** — Send/receive SMS
- **Photos** — View phone photos on PC

## 4. Network & Internet (ms-settings:network)

หน้าย่อยที่ทางการระบุ:
- **Wi-Fi** (ms-settings:network-wifi) — Connect, manage networks
- **Ethernet** (ms-settings:network-ethernet) — IP, DNS, authentication
- **VPN** (ms-settings:network-vpn) — Add, connect
- **Mobile hotspot** (ms-settings:network-mobilehotspot) — Share connection
- **Airplane mode** (ms-settings:network-airplanemode) — Stop wireless
- **Proxy** (ms-settings:network-proxy)
- **Data usage** (ms-settings:datausage)
- **Dial-up** (ms-settings:network-dialup)
- **Wi-Fi calling** (ms-settings:network-wificalling)

## 5. Personalization (ms-settings:personalization)

หน้าย่อยที่ทางการระบุ:
- **Background** (ms-settings:personalization-background) — Picture, solid color, slideshow
- **Colors** (ms-settings:personalization-colors) — Light/Dark, accent color
- **Lock screen** (ms-settings:lockscreen) — Background, status, timeout
- **Themes** (ms-settings:themes) — Install, save, switch
- **Fonts** (ms-settings:fonts)
- **Start** (ms-settings:personalization-start) — Layout, folders, recent apps
- **Taskbar** (ms-settings:taskbar)

## 6. Apps (ms-settings:appsfeatures)

หน้าย่อย:
- **Apps & features** (ms-settings:appsfeatures) — Uninstall, change, repair
- **Default apps** (ms-settings:defaultapps) — Defaults for email, maps, music
- **Optional features** (ms-settings:optionalfeatures) — Install/uninstall
- **Apps for websites** (ms-settings:appsforwebsites)
- **Offline Maps** (ms-settings:maps)
- **Startup** (ms-settings:startupapps) — Apps that start automatically

## 7. Accounts (ms-settings:yourinfo)

หน้าย่อยที่ทางการระบุ:
- **Your info** (ms-settings:yourinfo) — Account name, picture
- **Email & app accounts** (ms-settings:emailandaccounts)
- **Sign-in options** (ms-settings:signinoptions) — Windows Hello, password, PIN
  - Windows Hello face: ms-settings:signinoptions-launchfaceenrollment
  - Windows Hello fingerprint: ms-settings:signinoptions-launchfingerprintenrollment
  - Dynamic lock: ms-settings:signinoptions-dynamiclock
- **Family & other people** (ms-settings:otherusers) — Add, remove accounts
- **Sync your settings** (ms-settings:sync) — Sync across devices
- **Access work or school** (ms-settings:workplace)
- **Set up a kiosk** (ms-settings:assignedaccess)

## 8. Time & Language (ms-settings:dateandtime)

หน้าย่อย:
- **Date & time** (ms-settings:dateandtime) — Time zone, automatic time
- **Region** (ms-settings:regionformatting) — Country, regional format
- **Language** (ms-settings:regionlanguage) — Display, preferred languages
- **Speech** (ms-settings:speech) — Microphone, voice packages
- **Typing** (ms-settings:typing) — Typing insights, autocorrect

## 9. Gaming (ms-settings:gaming-game)

หน้าย่อย:
- **Game bar** (ms-settings:gaming-gamebar) — Open, capture, broadcast
- **Captures** (ms-settings:gaming-gamedvr) — Recording, audio quality
- **Game Mode** (ms-settings:gaming-gamemode) — Optimize PC for play
- **Xbox Game Bar** — Customization

## 10. Ease of Access (ms-settings:easeofaccess)

หน้าย่อยที่ทางการระบุ:
- **Display** (ms-settings:easeofaccess-display) — Text size, zoom
- **Cursor & pointer** (ms-settings:easeofaccess-cursorandpointersize) — Size, color
- **Magnifier** (ms-settings:easeofaccess-magnifier) — Zoom part/all of screen
- **Narrator** (ms-settings:easeofaccess-narrator) — Screen reader
- **High contrast** (ms-settings:easeofaccess-highcontrast) — Theme for readability
- **Audio** (ms-settings:easeofaccess-audio) — Closed captions, mono
- **Speech recognition** (ms-settings:easeofaccess-speechrecognition)
- **Eye control** (ms-settings:easeofaccess-eyecontrol)

## 11. Privacy (ms-settings:privacy)

หน้าย่อยที่ทางการระบุ:
- **General** (ms-settings:privacy-general) — General privacy settings
- **Location** (ms-settings:privacy-location) — App access to location
- **Camera** (ms-settings:privacy-webcam) — App access to camera
- **Microphone** (ms-settings:privacy-microphone) — App access to mic
- **Notifications** (ms-settings:privacy-notifications)
- **Account info** (ms-settings:privacy-accountinfo)
- **Contacts** (ms-settings:privacy-contacts)
- **Calendar** (ms-settings:privacy-calendar)
- **Call history** (ms-settings:privacy-callhistory)
- **Email** (ms-settings:privacy-email)
- **Tasks** (ms-settings:privacy-tasks)
- **Messaging** (ms-settings:privacy-messages)
- **Radios** (ms-settings:privacy-radios)
- **Background apps** (ms-settings:privacy-backgroundapps)
- **App diagnostics** (ms-settings:privacy-appdiagnostics)
- **Automatic file downloads** (ms-settings:privacy-automaticfiledownloads)

## 12. Update & Security (ms-settings:windowsupdate)

หน้าย่อยที่ทางการระบุ:
- **Windows Update** (ms-settings:windowsupdate) — Check for updates, history
- **Windows Security** (ms-settings:windowsdefender) — Antivirus, firewall
- **Backup** (ms-settings:backup) — File History, restore files
- **Troubleshoot** (ms-settings:troubleshoot) — Resolve problems
- **Recovery** (ms-settings:recovery) — Reset, restore, advanced startup
- **Activation** (ms-settings:activation) — Windows activation
- **Find my device** (ms-settings:findmydevice)
- **For developers** (ms-settings:developers)
- **Windows Insider Program** (ms-settings:windowsinsider)
- **Delivery Optimization** (ms-settings:delivery-optimization)

---

## 🔍 สิ่งที่โค้ดปัจจุบันยังขาด (เทียบกับทางการ)

### System
- ขาด: Clipboard, Battery, Focus assist, Graphics Settings

### Devices
- ขาด: AutoPlay, USB, Touch, Pen & Windows Ink, Wheel

### Network & Internet
- ขาด: Data usage, Wi-Fi calling

### Personalization
- ขาด: Fonts, Taskbar

### Apps
- ขาด: Apps for websites, Offline Maps

### Accounts
- ขาย: Access work or school, Set up a kiosk, Windows Hello setup

### Time & Language
- ครบแล้ว ✅

### Gaming
- ขาด: Xbox Game Bar settings

### Ease of Access
- ขาด: Narrator, Speech recognition, Eye control

### Privacy
- ขาด: Contacts, Calendar, Call history, Email, Tasks, Messaging, Radios, Background apps, App diagnostics

### Update & Security
- ขาด: Activation, Find my device, For developers, Windows Insider Program, Delivery Optimization

---

## 📐 UI Layout Pattern (Win10 Settings)

จากการดู Win10 จริง:
1. **Header** — User profile circle + name + search box (ขวา)
2. **Sidebar** (240px) — หมวดทั้งหมด พร้อม icon
3. **Main content** (ขวา) — Title (24px) + rows
4. **Row pattern**:
   - icon (32x32 gray box)
   - title (14px bold) + desc (12px gray)
   - action (right): toggle หรือ link "Configure" / "Add"
5. **Hover** — light gray background
6. **Selected category** — blue left border + light blue background

ที่มา: Microsoft Learn (ทางการ) + การสังเกต Win10 จริง
