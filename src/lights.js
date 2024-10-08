const gpio = require('pigpio').Gpio;
const hap = require("hap-nodejs");

const Accessory = hap.Accessory;
const Characteristic = hap.Characteristic;
const CharacteristicEventTypes = hap.CharacteristicEventTypes;
const Service = hap.Service;

// optionally set a different storage location with code below
// hap.HAPStorage.setCustomStoragePath("...");

const accessoryUuid = hap.uuid.generate("hap.project.rgb.strip");
const accessory = new Accessory("RGB LED Strip Accesssory", accessoryUuid);

const lightService = new Service.Lightbulb("RGBLS");

// let currentLightState = false; // on or off
// let currentBrightnessLevel = 100;


// 'On' characteristic is required for the light service
const onCharacteristic = lightService.getCharacteristic(Characteristic.On);
// 'Brightness' characteristic is optional for the light service; 'getCharacteristic' will automatically add it to the service!
const brightnessCharacteristic = lightService.getCharacteristic(Characteristic.Brightness);
const hueCharacteristic = lightService.getCharacteristic(Characteristic.Hue);
const saturationCharacteristic = lightService.getCharacteristic(Characteristic.Saturation);

var showLogging = true;
var LEDstripStatusIsOn = false;
var currentLEDbrightness = 0;
var hue = 0;
var saturation = 0;
var redLED = new gpio(27, {mode: gpio.OUTPUT});
var greenLED = new gpio(17, {mode: gpio.OUTPUT});
var blueLED = new gpio(23, {mode: gpio.OUTPUT});
const pincode = "111-12-222";

redLED.pwmWrite(0);
greenLED.pwmWrite(0);
blueLED.pwmWrite(0);

var redValue = 0;
var greenValue = 0;
var blueValue = 0;

var brightnessChanged = false;
var hueChanged = false;
var saturationChanged = false;

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

    if ( r < 25 ) { r = 0 } // helper for poor performing rgb leds, they are too bright at low values. comment out line if needed
    if ( g < 25 ) { g = 0 } // same as ^
    if ( b < 25 ) { b = 0 } // same as ^

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
  callback(undefined, currentLEDbrightness);
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
  callback(undefined, currentLEDbrightness);
});

saturationCharacteristic.on(CharacteristicEventTypes.SET, (value, callback) => {
  if (showLogging) { console.log("Setting Saturation to: " + value); }
  saturation = value;
  saturationChanged = true;
  changeColor();
  callback();
});

accessory.addService(lightService); // adding the service to the accessory

// once everything is set up, we publish the accessory. Publish should always be the last step!
accessory.publish({
  username: "17:51:07:F4:BC:8A",
  pincode: pincode,
  port: 47129,
  category: hap.Categories.LIGHTBULB, // value here defines the symbol shown in the pairing screen
});


// Second Accessory (white strip)
const hap_2 = require("hap-nodejs");

const Accessory_2 = hap_2.Accessory;
const Characteristic_2 = hap_2.Characteristic;
const CharacteristicEventTypes_2 = hap_2.CharacteristicEventTypes;
const Service_2 = hap_2.Service;

const accessoryUuid_2 = hap_2.uuid.generate("hap.project.white.strip");
const accessory_2 = new Accessory_2("White LED Strip Accesssory", accessoryUuid_2);

const lightService_2 = new Service_2.Lightbulb("WLS");

const onCharacteristic_2 = lightService_2.getCharacteristic(Characteristic_2.On);
const brightnessCharacteristic_2 = lightService_2.getCharacteristic(Characteristic_2.Brightness);

var showLogging_2 = false;
var LEDstripStatusIsOn_2 = false;
var currentLEDbrightness_2 = 0;
var ledStripGPIOpin_2 = new gpio(22, {mode: gpio.OUTPUT});

ledStripGPIOpin_2.pwmWrite(0);

onCharacteristic_2.on(CharacteristicEventTypes_2.GET, callback => {
  if (showLogging) { console.log("Is LED Strip On?: " + LEDstripStatusIsOn_2); }
  callback(undefined, LEDstripStatusIsOn_2);
});

onCharacteristic_2.on(CharacteristicEventTypes_2.SET, (value, callback) => {
  if (showLogging) { console.log("Setting LED Strip On: " + value); }
  if ( value == true && LEDstripStatusIsOn_2 == false) {
    if ( currentLEDbrightness_2 == 0 ) {
      ledStripGPIOpin_2.pwmWrite(255);
    } else {
      ledStripGPIOpin_2.pwmWrite(currentLEDbrightness_2);
    }
  } else if ( value == false ) {
    ledStripGPIOpin_2.pwmWrite(0);
  } else {
    // do nothing
  }
  LEDstripStatusIsOn_2 = value;
  callback();
});

brightnessCharacteristic_2.on(CharacteristicEventTypes_2.GET, (callback) => {
  if (showLogging) { console.log("Current Strip brightness level?: " + currentLEDbrightness_2); }
  callback(undefined, currentLEDbrightness_2);
});

brightnessCharacteristic_2.on(CharacteristicEventTypes_2.SET, (value, callback) => {
  if (showLogging) { console.log("Setting Strip brightness level to: " + value); }
  var val = parseInt(255*(value/100), 10);
  ledStripGPIOpin_2.pwmWrite(val);
  currentLEDbrightness_2 = Math.ceil((val/255)*100);
  callback();
});

accessory_2.addService(lightService_2);

accessory_2.publish({
  username: "BB:00:00:00:00:01",
  pincode: pincode,
  port: 47130,
  category: hap_2.Categories.LIGHTBULB
});

console.log("Accessory(2) setup finished!");
console.log("Device Pin Code: " + pincode);
