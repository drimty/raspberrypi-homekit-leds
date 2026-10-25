# Raspberry Pi - HAP-NodeJS LED Strips

Based on [Raspberry Pi - Homekit RGB LED Strip](https://github.com/basementmaker/raspberrypi-homekit-rgb-led-strip/tree/master) and [HAP-NodeJS Examples](https://github.com/homebridge/HAP-NodeJS-examples).

One HomeKit bridge `Raspberry Pi Bridge` with 3 accessories:
* `RGB LED Strip` - `Lightbulb` with `On`, `Brightness`, `Hue` and `Saturation` characteristics
* `White LED Strip` - `Lightbulb` with `On` and `Brightness` characteristics
* `PC` - `Switch` that sends a Wake-on-LAN magic packet from the Raspberry Pi and turns itself off after a second (works like a button)

Last color and brightness are saved to `settings.json` and restored on start.

The default pairing code is set to `111-12-222`. Only the bridge is added to Apple Home, all accessories come with it.

## Wake-on-LAN

Set the PC MAC address at the top of `src/lights.js`:
```js
const pcMacAddress = "AA:BB:CC:DD:EE:FF";
```
If the packet doesn't reach the PC, set `wolBroadcastAddress` to your subnet broadcast (e.g. `192.168.1.255`).

On the PC: enable Wake-on-LAN in BIOS/UEFI and in the network adapter settings (Windows: Device Manager → adapter → Power Management / Advanced → `Wake on Magic Packet`). WoL usually works only over a wired connection, and on Windows it may help to disable Fast Startup.

## GPIO

[![GPIO](https://www.raspberrypi.com/documentation/computers/images/GPIO-Pinout-Diagram-2.png)](https://www.raspberrypi.com/documentation/computers/images/GPIO-Pinout-Diagram-2.png)

| Strip | Channel | GPIO |
|-------|---------|------|
| RGB   | Red     | 27   |
| RGB   | Green   | 17   |
| RGB   | Blue    | 23   |
| White | -       | 22   |

## Circuit Diagram

From this [project](https://github.com/basementmaker/raspberrypi-homekit-rgb-led-strip/tree/master)

## Flashing the SD card (Raspberry Pi Imager, headless)

Use **Raspberry Pi OS Lite** - it has no desktop (GUI) at all, so there is nothing to disable and the Pi 2 has more free memory and CPU.

1. Install [Raspberry Pi Imager](https://www.raspberrypi.com/software/) on your PC.
2. **Device:** `Raspberry Pi 2`.
3. **OS:** `Raspberry Pi OS (other)` → `Raspberry Pi OS Lite (32-bit)`.
4. **Storage:** your SD card.
5. When Imager offers to customise the OS (`Edit settings` / customisation step), set:
   * **Hostname:** e.g. `homekit` (then the Pi is reachable as `homekit.local`)
   * **Username and password** - write them down, there is no way to recover them later
   * **Locale / time zone / keyboard layout**
   * **Wi-Fi** - only if you use a USB Wi-Fi adapter, the Pi 2 has no built-in Wi-Fi. Ethernet cable is recommended (also needed for reliable Wake-on-LAN)
   * **SSH:** enable it (Services / Remote access tab). Password authentication is fine, or paste your public key for key-only login
6. Write the card, put it into the Pi, connect Ethernet and power. The first boot takes a few minutes.

Connect from the PC (replace `dk` and `homekit` with your username and hostname):
```bash
ssh dk@homekit.local
```
If `homekit.local` is not found, look up the Pi IP address in your router and use `ssh dk@192.168.x.x`.

If SSH says `REMOTE HOST IDENTIFICATION HAS CHANGED` after reflashing, remove the old key on the PC:
```bash
ssh-keygen -R homekit.local
```

## Fresh install on Raspberry Pi

Update the system:
```
sudo apt update
sudo apt full-upgrade -y
```

Install only what the project needs (git, NodeJS, npm, compiler for the native `pigpio` module and the pigpio C library):
```
sudo apt install -y git nodejs npm build-essential pigpio
```

If `pigpio` is not found in apt, build the C library from source:
```
git clone https://github.com/joan2937/pigpio.git
cd pigpio
make
sudo make install
cd ..
```

Don't enable the `pigpiod` service - the script uses the pigpio library directly and fails to start while `pigpiod` is running.

Then clone and install the project (`npm install` takes a while on the Pi 2):
```console
git clone https://github.com/drimty/raspberrypi-homekit-leds.git
cd raspberrypi-homekit-leds
npm install
```

Set the PC MAC address (see [Wake-on-LAN](#wake-on-lan)):
```
nano src/lights.js
```

Start:
```
sudo npm start
```

Add to Apple Home: `+` → `Add Accessory` → `More options...` → `Raspberry Pi Bridge` → code `111-12-222`. If old accessories from a previous install are still in Home, remove them first.

If things get messed delete the bridge from Home and remove persist folder from raspberry
```
sudo rm -r persist/
```

## Auto Starting Script

Original [video](https://www.youtube.com/watch?v=f9SwYNRWSLg)

Install PM2:  
```
sudo npm install pm2@latest -g
```

```
pm2 startup
```
From terminal find... 
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u dk --hp /home/dk

then:
```console
cd raspberrypi-homekit-leds
pm2 start npm -- start
pm2 save
```
Other PM2 commands:
* pm2 logs
* pm2 list
* pm2 stop
* pm2 start
* pm2 delete

## Disable GUI

Not needed with Raspberry Pi OS Lite. On the full (Desktop) image switch boot to console:
```
sudo raspi-config
```
`System Options -> Boot / Auto Login -> Console` (or `Console Autologin`), then reboot.

Or the same without menus:
```
sudo systemctl set-default multi-user.target
sudo reboot
```

## Testing connections without script

Stop the script first (`pm2 stop all`), then:
```
sudo pigpiod
```

```
pigs p 17 255
```

When done, stop the daemon, otherwise the script won't start:
```
sudo killall pigpiod
```
