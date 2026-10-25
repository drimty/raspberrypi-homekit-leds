const gpio = require('pigpio').Gpio;
const hap = require("hap-nodejs");
const fs = require("fs");
const path = require("path");
const dgram = require("dgram");
var showLogging = false;

// Wake-on-LAN settings for the PC switch
const pcMacAddress = "AA:BB:CC:DD:EE:FF"; // MAC address of the PC network card
const wolBroadcastAddress = "255.255.255.255"; // or your subnet broadcast, e.g. "192.168.1.255"
const wolPort = 9;

// settings.json lives in the project root, independent of the current working directory
const settingsPath = path.join(__dirname, "..", "settings.json");
const settingsTmpPath = settingsPath + ".tmp";

const defaultSettings = {
  red: 100,
  green: 100,
  blue: 100,
  hue: 250,
  saturation: 1,
  brightnessRGB: 50,
  brightnessWhite: 50,
};

// reading a JSON file, falling back to defaults if it is missing or broken
var restoredSettings = Object.assign({}, defaultSettings);
try {
  Object.assign(restoredSettings, JSON.parse(fs.readFileSync(settingsPath)));
} catch (error) {
  console.error("Can't read settings.json, using defaults: " + error.message);
}
if (showLogging) {console.log(restoredSettings);}

const Accessory = hap.Accessory;
const Bridge = hap.Bridge;
const Characteristic = hap.Characteristic;
const CharacteristicEventTypes = hap.CharacteristicEventTypes;
const Service = hap.Service;

// optionally set a different storage location with code below
// hap.HAPStorage.setCustomStoragePath("...");

const accessoryUuid = hap.uuid.generate("hap.project.rgb.strip");
const accessory = new Accessory("RGB LED Strip", accessoryUuid);

const lightService = new Service.Lightbulb("RGBLS");

// let currentLightState = false; // on or off
// let currentBrightnessLevel = 100;


// 'On' characteristic is required for the light service
const onCharacteristic = lightService.getCharacteristic(Characteristic.On);
// 'Brightness' characteristic is optional for the light service; 'getCharacteristic' will automatically add it to the service!
const brightnessCharacteristic = lightService.getCharacteristic(Characteristic.Brightness);
const hueCharacteristic = lightService.getCharacteristic(Characteristic.Hue);
const saturationCharacteristic = lightService.getCharacteristic(Characteristic.Saturation);

var LEDstripStatusIsOn = false;
var currentLEDbrightness = restoredSettings["brightnessRGB"];
var hue = restoredSettings["hue"];
var saturation = restoredSettings["saturation"];
var redLED = new gpio(27, {mode: gpio.OUTPUT});
var greenLED = new gpio(17, {mode: gpio.OUTPUT});
var blueLED = new gpio(23, {mode: gpio.OUTPUT});
const pincode = "111-12-222";

redLED.pwmWrite(0);
greenLED.pwmWrite(0);
blueLED.pwmWrite(0);

var redValue = restoredSettings["red"];
var greenValue = restoredSettings["green"];
var blueValue = restoredSettings["blue"];


var brightnessChanged = false;
var hueChanged = false;
var saturationChanged = false;

var saveTimer = null;

// HomeKit sends many values while a slider is dragged, so write the file once things settle
const saveSettings = function () {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeSettings, 1000);
}

const writeSettings = function () {
  // initializing a JavaScript object
  const settings = {
    red: redValue,
    green: greenValue,
    blue: blueValue,
    hue: hue,
    saturation: saturation,
    brightnessRGB: currentLEDbrightness,
    brightnessWhite: currentLEDbrightness_2,
  };

  if (showLogging) {console.log(settings);}

  // converting the JSON object to a string
  const data = JSON.stringify(settings);

  // writing to a temp file first and renaming it, so a power loss can't leave a half-written settings.json
  fs.writeFile(settingsTmpPath, data, (error) => {
    if (error) {
      console.error("Can't write settings: " + error.message);
      return;
    }

    fs.rename(settingsTmpPath, settingsPath, (error) => {
      if (error) {
        console.error("Can't write settings: " + error.message);
        return;
      }

      if (showLogging) {console.log("settings.json written correctly");}
    });
  });
}

const changeColor = function () {
  if ( (hueChanged && saturationChanged) || brightnessChanged ) {
    if (showLogging) { console.log("changing color ..."); }
    var h, s, v;
    var r, g, b;

    h = hue/360;
    s = saturation/100;
    v = currentLEDbrightness/100;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }

    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);

    // if ( r < 25 ) { r = 0 } // helper for poor performing rgb leds, they are too bright at low values. comment out line if needed
    // if ( g < 25 ) { g = 0 } // same as ^
    // if ( b < 25 ) { b = 0 } // same as ^

    redValue = r;
    greenValue = g;
    blueValue = b;

    if (showLogging) { console.log("Red: "+r); }
    if (showLogging) { console.log("Green: "+g); }
    if (showLogging) { console.log("Blue: "+b); }

    if ( LEDstripStatusIsOn ) {
      redLED.pwmWrite(r);
      greenLED.pwmWrite(g);
      blueLED.pwmWrite(b);
    }

    brightnessChanged = false;
    hueChanged = false;
    saturationChanged = false;

    saveSettings();
  }
}


// with the 'on' function we can add event handlers for different events, mainly the 'get' and 'set' event
onCharacteristic.on(CharacteristicEventTypes.GET, callback => {
  // console.log("Queried current light state: " + currentLightState);
  // callback(undefined, currentLightState);

  if (showLogging) { console.log("Is RGB LED Strip On?: " + LEDstripStatusIsOn); }
  callback(undefined, LEDstripStatusIsOn);
});
onCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
  // console.log("Setting light state to: " + value);
  // currentLightState = value;
  // callback();

  if (showLogging) { console.log("Setting RGB LED Strip On: " + value); }
  if (showLogging) { console.log("LEDstripStatusIsOn: " + LEDstripStatusIsOn); }
  if ( value == true && LEDstripStatusIsOn == false) {
    if ( currentLEDbrightness == 0 ) {
      currentLEDbrightness = 100;
      hue = 251;
      saturation = 5;
      brightnessChanged = true;
      hueChanged = true;
      saturationChanged = true;
      changeColor();
    } else {
      redLED.pwmWrite(redValue);
      greenLED.pwmWrite(greenValue);
      blueLED.pwmWrite(blueValue);
    }
  } else if ( value == false ) {
    redLED.pwmWrite(0);
    greenLED.pwmWrite(0);
    blueLED.pwmWrite(0);
  } else {
    // do nothing
  }
  LEDstripStatusIsOn = value;
  callback();
});


brightnessCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
  // console.log("Queried current brightness level: " + currentBrightnessLevel);
  // callback(undefined, currentBrightnessLevel);

  if (showLogging) { console.log("Current Strip brightness level?: " + currentLEDbrightness); }
  callback(undefined, currentLEDbrightness);
});
brightnessCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
  // console.log("Setting brightness level to: " + value);
  // currentBrightnessLevel = value;
  // callback();

  if (showLogging) { console.log("Setting Strip brightness level to: " + value); }
  var val = parseInt(255*(value/100), 10);
  currentLEDbrightness = Math.ceil((val/255)*100);
  brightnessChanged = true;
	changeColor();
  callback();
});

hueCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
  if (showLogging) { console.log("Current Hue level?: " + hue); }
  callback(undefined, hue);
});

hueCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
  if (showLogging) { console.log("Setting Hue to: " + value); }
  hue = value;
	hueChanged = true;
	changeColor();
  callback();
});

saturationCharacteristic.on(CharacteristicEventTypes.GET, (callback) => {
  if (showLogging) { console.log("Current Saturation?: " + saturation); }
  callback(undefined, saturation);
});

saturationCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
  if (showLogging) { console.log("Setting Saturation to: " + value); }
  saturation = value;
  saturationChanged = true;
  changeColor();
  callback();
});

accessory.addService(lightService); // adding the service to the accessory


// Second Accessory (white strip)
const accessoryUuid_2 = hap.uuid.generate("hap.project.white.strip");
const accessory_2 = new Accessory("White LED Strip", accessoryUuid_2);

const lightService_2 = new Service.Lightbulb("WLS");

const onCharacteristic_2 = lightService_2.getCharacteristic(Characteristic.On);
const brightnessCharacteristic_2 = lightService_2.getCharacteristic(Characteristic.Brightness);

var LEDstripStatusIsOn_2 = false;
var currentLEDbrightness_2 = restoredSettings["brightnessWhite"];
var ledStripGPIOpin_2 = new gpio(22, {mode: gpio.OUTPUT});

ledStripGPIOpin_2.pwmWrite(0);

onCharacteristic_2.on(CharacteristicEventTypes.GET, callback => {
  if (showLogging) { console.log("Is LED Strip On?: " + LEDstripStatusIsOn_2); }
  callback(undefined, LEDstripStatusIsOn_2);
});

onCharacteristic_2.on(CharacteristicEventTypes.SET, (value, callback) => {
  if (showLogging) { console.log("Setting LED Strip On: " + value); }
  if ( value == true && LEDstripStatusIsOn_2 == false) {
    if ( currentLEDbrightness_2 == 0 ) {
      currentLEDbrightness_2 = 100;
      ledStripGPIOpin_2.pwmWrite(255);
      saveSettings();
    } else {
      var val = parseInt(255*(currentLEDbrightness_2/100), 10);
      ledStripGPIOpin_2.pwmWrite(val);
    }
  } else if ( value == false ) {
    ledStripGPIOpin_2.pwmWrite(0);
  } else {
    // do nothing
  }
  LEDstripStatusIsOn_2 = value;
  callback();
});

brightnessCharacteristic_2.on(CharacteristicEventTypes.GET, (callback) => {
  if (showLogging) { console.log("Current Strip brightness level?: " + currentLEDbrightness_2); }
  callback(undefined, currentLEDbrightness_2);
});

brightnessCharacteristic_2.on(CharacteristicEventTypes.SET, (value, callback) => {
  if (showLogging) { console.log("Setting Strip brightness level to: " + value); }
  var val = parseInt(255*(value/100), 10);
  if ( LEDstripStatusIsOn_2 ) {
    ledStripGPIOpin_2.pwmWrite(val);
  }
  currentLEDbrightness_2 = Math.ceil((val/255)*100);
  saveSettings();
  callback();
});

accessory_2.addService(lightService_2);


// Third Accessory (PC Wake-on-LAN button)
const sendWakeOnLan = function (mac, callback) {
  const macBytes = Buffer.from(mac.replace(/[:-]/g, ""), "hex");
  if ( macBytes.length != 6 ) {
    callback(new Error("Invalid MAC address: " + mac));
    return;
  }

  // magic packet: 6 x 0xFF followed by the MAC address repeated 16 times
  const packet = Buffer.alloc(6 + 16 * 6, 0xff);
  for (var i = 0; i < 16; i++) {
    macBytes.copy(packet, 6 + i * 6);
  }

  const socket = dgram.createSocket("udp4");
  socket.once("error", (error) => {
    socket.close();
    callback(error);
  });
  socket.bind(() => {
    socket.setBroadcast(true);
    socket.send(packet, wolPort, wolBroadcastAddress, (error) => {
      socket.close();
      callback(error);
    });
  });
}

const accessoryUuid_3 = hap.uuid.generate("hap.project.pc.wol");
const accessory_3 = new Accessory("PC", accessoryUuid_3);

const switchService_3 = new Service.Switch("PC");
const onCharacteristic_3 = switchService_3.getCharacteristic(Characteristic.On);

// HomeKit has no plain button, so this is a switch that turns itself off again after a second
var wolSwitchIsOn = false;

onCharacteristic_3.on(CharacteristicEventTypes.GET, callback => {
  callback(undefined, wolSwitchIsOn);
});

onCharacteristic_3.on(CharacteristicEventTypes.SET, (value, callback) => {
  wolSwitchIsOn = value;
  if ( value == true ) {
    if (showLogging) { console.log("Sending Wake-on-LAN to " + pcMacAddress); }
    sendWakeOnLan(pcMacAddress, (error) => {
      if (error) {
        console.error("Wake-on-LAN failed: " + error.message);
      } else if (showLogging) {
        console.log("Wake-on-LAN packet sent");
      }
    });
    setTimeout(() => {
      wolSwitchIsOn = false;
      onCharacteristic_3.updateValue(false);
    }, 1000);
  }
  callback();
});

accessory_3.addService(switchService_3);


// Bridge: all accessories are added to Apple Home at once with a single pairing
const bridgeUuid = hap.uuid.generate("hap.project.leds.bridge");
const bridge = new Bridge("Raspberry Pi Bridge", bridgeUuid);

bridge.addBridgedAccessory(accessory);
bridge.addBridgedAccessory(accessory_2);
bridge.addBridgedAccessory(accessory_3);

// once everything is set up, we publish the bridge. Publish should always be the last step!
bridge.publish({
  username: "17:51:07:F4:BC:8B",
  pincode: pincode,
  port: 47129,
  category: hap.Categories.BRIDGE, // value here defines the symbol shown in the pairing screen
});

console.log("Bridge setup finished!");
console.log("Device Pin Code: " + pincode);
