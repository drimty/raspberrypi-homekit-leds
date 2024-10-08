# Raspberry Pi - HAP-NodeJS LED Strips

Based on [Raspberry Pi - Homekit RGB LED Strip](https://github.com/basementmaker/raspberrypi-homekit-rgb-led-strip/tree/master) and [HAP-NodeJS Examples](https://github.com/homebridge/HAP-NodeJS-examples).

Added 2 accessories (RGB strip and white strip).

Accessories exposing a `Lightbulb` service with `On`, `Brightness`, `Hue` and `Saturation`  characteristics.  

The default pairing code is set to `111-12-222`.

## Fresh install on Raspberry Pi

After all updates...

Install NodeJS:  
```
sudo apt install nodejs
```

Install npm:  
```
sudo apt install npm
```

and then these commands:
```console
git clone https://github.com/drimty/raspberrypi-homekit-leds.git
cd raspberrypi-homekit-leds
npm install
sudo npm start
```

If needed:  
```
npm audit fix --force
```

