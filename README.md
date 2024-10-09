# Raspberry Pi - HAP-NodeJS LED Strips

Based on [Raspberry Pi - Homekit RGB LED Strip](https://github.com/basementmaker/raspberrypi-homekit-rgb-led-strip/tree/master) and [HAP-NodeJS Examples](https://github.com/homebridge/HAP-NodeJS-examples).

Added 2 accessories (RGB strip and white strip).

Accessories exposing a `Lightbulb` service with `On`, `Brightness`, `Hue` and `Saturation`  characteristics.  

The default pairing code is set to `111-12-222`.

## GPIO

[GPIO](https://www.raspberrypi.com/documentation/computers/images/GPIO-Pinout-Diagram-2.png)

## Circuit Diagram

From this [project](https://github.com/basementmaker/raspberrypi-homekit-rgb-led-strip/tree/master)

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
```

If needed:  
```
npm audit fix --force
```

Start:
```
sudo npm start
```
If things get messed delete accessory from home and remove persist folder from raspbery
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

## disable GUI

```
sudo raspi-config
```
`System Options -> Boot / Auto Login`

## Testing connections without script

```
sudo pigpiod
```

```
pigs p 17 255
```


