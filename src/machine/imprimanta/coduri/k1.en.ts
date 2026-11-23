/** Textele codurilor K1 (în engleză), felia 3.6v: ce s-a întâmplat (titlul) și ce faci; cheile, ca în `k1.ts`. */
import type { TextCodImprimanta } from '../../../../shared/coduriImprimanta.ts';

export const textK1En: Readonly<Record<number, TextCodImprimanta>> = {
  1: {
    titlu: 'A motor driver fault',
    faci: 'Turn the printer off, check that the axes move freely and the motor cables are seated, then turn it on again.',
  },
  2: {
    titlu: 'An internal printer error',
    faci: 'Restart the printer. If it comes back, note the code and contact Creality support.',
  },
  3: {
    titlu: 'Communication between the printer\'s boards was lost',
    faci: 'Turn the printer off, check the print head cable connectors, then turn it on again.',
  },
  4: {
    titlu: 'Heating does not work as expected',
    faci: 'Look in the window at which temperature doesn\'t rise (nozzle or bed) and check its connectors and cable, then restart.',
  },
  6: {
    titlu: 'An extruder problem',
    faci: 'Check that the filament feeds freely and the nozzle isn\'t clogged, then try again.',
  },
  7: {
    titlu: 'The file\'s coordinates are wrong',
    faci: 'Re-slice the file for your printer (with its profile) and send it again.',
  },
  9: {
    titlu: 'The print head\'s vibration sensor doesn\'t respond',
    faci: 'Restart the printer. If it comes back, check the print head cable connectors.',
  },
  10: {
    titlu: 'A fan problem',
    faci: 'Check that the print head fans spin and that no wires or filament bits block them; check their connectors.',
  },
  100: {
    titlu: 'The file on the USB stick could not be copied to the printer',
    faci: 'The print didn\'t start. Try another stick, or send the file from cvs2.',
  },
  101: {
    titlu: 'The camera saw a quality problem and paused the print',
    faci: 'Look at the part. If it\'s fine, resume; otherwise stop the print and clear the bed.',
  },
  102: {
    titlu: 'The file name is too long',
    faci: 'Give the file a shorter name and send it again.',
  },
  103: {
    titlu: 'The first layer doesn\'t look right: the print is paused',
    faci: 'Look at the first layer. If it\'s good, resume; otherwise stop, clean the bed and check the levelling.',
  },
  104: {
    titlu: 'Something is on the bed: the print is paused',
    faci: 'Take off the bed whatever shouldn\'t be there, then resume.',
  },
  108: {
    titlu: 'The LiDAR offset correction failed',
    faci: 'Clean the LiDAR window and redo the calibration from the printer\'s menu.',
  },
  109: {
    titlu: 'The hotend heatsink fan isn\'t working: the print stopped',
    faci: 'Check that the fan spins freely and its connector is seated; without it, the filament can clog.',
  },
  110: {
    titlu: 'The mainboard doesn\'t respond',
    faci: 'Turn the printer off, check the mainboard\'s cable connectors, then turn it on again.',
  },
  111: {
    titlu: 'The print head board doesn\'t respond',
    faci: 'Turn the printer off and check the print head cable connectors, at both ends.',
  },
  112: {
    titlu: 'The bed board doesn\'t respond',
    faci: 'Turn the printer off and check the bed cable\'s connectors.',
  },
  115: {
    titlu: 'A print was left unfinished (a power cut)',
    faci: 'On the printer\'s screen, choose whether to resume where it stopped or to cancel.',
  },
  116: {
    titlu: 'The filament ran out: the print is paused',
    faci: 'Load new filament, then resume.',
  },
  117: {
    titlu: 'The part is warping off the bed: the print is paused',
    faci: 'Look at the part\'s corners. If it\'s fine, resume; otherwise stop, clean the bed and try a brim or a warmer bed.',
  },
  201: {
    titlu: 'The chamber temperature is abnormal',
    faci: 'Let the printer cool down, lift the lid and check the chamber fan.',
  },
  204: {
    titlu: 'A fan problem',
    faci: 'Check that the fans spin and nothing blocks them; check their connectors.',
  },
  205: {
    titlu: 'A network problem',
    faci: 'Check the printer\'s WiFi (signal, password) and the router.',
  },
  206: {
    titlu: 'The camera saw a quality problem',
    faci: 'Look at the part; if it isn\'t right, stop the print.',
  },
  207: {
    titlu: 'The levelling sensor isn\'t working properly',
    faci: 'Clean the nozzle and the bed, make sure nothing is under the nozzle or the bed, then redo the levelling.',
  },
  208: {
    titlu: 'The file has a problem',
    faci: 'Re-slice the file for your printer (with its profile) and send it again.',
  },
  209: {
    titlu: 'The bed temperature is abnormal',
    faci: 'Let the bed cool down and check its connector and cable.',
  },
  500: {
    titlu: 'The camera saw “spaghetti” (a warning only)',
    faci: 'The print carries on. Look at the part; if it isn\'t right, stop.',
  },
  501: {
    titlu: 'The hotend heatsink fan spins too slowly',
    faci: 'Take off the print head cover and check the fan (wires, dust, filament bits) and its connector.',
  },
  502: {
    titlu: 'A mainboard fan problem',
    faci: 'Check that the mainboard fan spins and its connector is seated.',
  },
  503: {
    titlu: 'The first layer doesn\'t look right (a warning only)',
    faci: 'The print carries on. Look at the first layer; if it doesn\'t stick, stop and clean the bed.',
  },
  504: {
    titlu: 'This file doesn\'t allow the flow check (a warning only)',
    faci: 'The print goes on without the check. For the check, slice the file in Creality Print.',
  },
  505: {
    titlu: 'The LiDAR isn\'t detected',
    faci: 'Check the LiDAR\'s cable and connectors, then restart the printer.',
  },
  506: {
    titlu: 'The LiDAR calibration failed',
    faci: 'Clean the LiDAR window and the bed, then redo the calibration.',
  },
  507: {
    titlu: 'The LiDAR alignment failed',
    faci: 'Clean the LiDAR window and redo the calibration from the printer\'s menu.',
  },
  508: {
    titlu: 'The printer\'s storage is almost full',
    faci: 'Delete old files or videos from the printer\'s screen.',
  },
  509: {
    titlu: 'The chamber is too hot: the camera turned off',
    faci: 'The camera turns back on by itself when the temperature drops. For PLA, lift the lid.',
  },
  510: {
    titlu: 'The camera didn\'t start',
    faci: 'Restart the printer. If it comes back, check the camera cable.',
  },
  523: {
    titlu: 'The part is warping (a warning only)',
    faci: 'Look at the part\'s corners; if they lift, stop and try a brim.',
  },
  800: {
    titlu: 'An axis movement error',
    faci: 'Make sure nothing blocks the head or the bed, then home the axes.',
  },
  801: {
    titlu: 'The printer is getting ready',
    faci: 'Wait: it\'s heating up or running its checks before printing.',
  },
  2000: {
    titlu: 'A system error: one of the printer\'s boards stopped',
    faci: 'Restart the printer. If it comes back, check the boards\' cable connectors.',
  },
  2001: {
    titlu: 'The extruder driver doesn\'t respond',
    faci: 'Turn the printer off and reseat the print head cable, at both ends.',
  },
  2002: {
    titlu: 'The mainboard doesn\'t connect',
    faci: 'Turn the printer off, check the mainboard\'s cable connectors and turn it on again.',
  },
  2014: {
    titlu: 'The file asks for a move longer than the printer\'s travel',
    faci: 'Re-slice the file for your printer (with its profile) and send it again.',
  },
  2016: {
    titlu: 'Resume without a pause',
    faci: 'The print wasn\'t paused: there\'s nothing to resume.',
  },
  2019: {
    titlu: 'The requested temperature is outside the printer\'s range',
    faci: 'Check the temperatures asked for in the file or in the window: they are beyond what the printer allows.',
  },
  2020: {
    titlu: 'Homing failed',
    faci: 'Make sure nothing blocks the head or the bed, then home the axes again.',
  },
  2021: {
    titlu: 'Homing took too long',
    faci: 'Check that the axes move freely and the belts are tight, then home the axes again.',
  },
  2056: {
    titlu: 'The accelerometer doesn\'t measure',
    faci: 'Restart the printer and redo the calibration. If it comes back, check the print head cable connectors.',
  },
  2060: {
    titlu: 'A system error at the print head',
    faci: 'Turn the printer off, reseat the print head cable and turn it on. If it comes back, the cable may need replacing.',
  },
  2065: {
    titlu: 'The print head\'s accelerometer doesn\'t respond correctly',
    faci: 'Check the print head cable connectors. If it comes back, the print head board may need replacing.',
  },
  2069: {
    titlu: 'The file has a fan command the printer doesn\'t know (M107 P3)',
    faci: 'Re-slice the file with an up-to-date slicer.',
  },
  2090: {
    titlu: 'The mainboard couldn\'t keep up',
    faci: 'Restart the printer. If it keeps coming back, try a file with fewer fine details or contact Creality support.',
  },
  2091: {
    titlu: 'Communication between the boards dropped for a moment',
    faci: 'Restart the printer and check the boards\' cable connectors.',
  },
  2093: {
    titlu: 'A system error',
    faci: 'Restart the printer. If it comes back, note the code and contact Creality support.',
  },
  2095: {
    titlu: 'The axes must be homed first',
    faci: 'Home the axes from the Printer window or from the screen, then try again.',
  },
  2111: {
    titlu: 'The nozzle is too cold to extrude',
    faci: 'Heat the nozzle to the material\'s temperature and try again. If it happens when a file starts, re-slice it.',
  },
  2112: {
    titlu: 'The file asks for more filament than the printer can extrude',
    faci: 'Re-slice with the printer\'s profile; check the flow, the line width and the layer height.',
  },
  2113: {
    titlu: 'The extruder couldn\'t be set up',
    faci: 'Restart the printer. If it comes back, note the code and contact Creality support.',
  },
  2114: {
    titlu: 'An extrude command without an extruder',
    faci: 'Restart the printer. If it comes back, re-slice the file with the printer\'s profile.',
  },
  2115: {
    titlu: 'A firmware configuration error',
    faci: 'Restart the printer. If it comes back, update the firmware or contact Creality support.',
  },
  2116: {
    titlu: 'An internal firmware error',
    faci: 'Restart the printer. If it comes back, note the code and contact Creality support.',
  },
  2117: {
    titlu: 'A garbled message between the printer\'s boards',
    faci: 'Restart the printer and check the boards\' cable connectors.',
  },
  2118: {
    titlu: 'The accelerometer can\'t be read',
    faci: 'Restart the printer and redo the calibration. If it comes back, check the print head cable connectors.',
  },
  2119: {
    titlu: 'The accelerometer isn\'t recognised',
    faci: 'Check the print head cable connectors: usually it is a loose connector.',
  },
  2210: {
    titlu: 'The filament can\'t be loaded: the nozzle is too cold',
    faci: 'Heat the nozzle first, then load the filament.',
  },
  2211: {
    titlu: 'The print is paused',
    faci: 'Resume from the Printer window or from the screen when you\'re ready.',
  },
  2242: {
    titlu: 'The axes must be homed first',
    faci: 'Home the axes from the Printer window or from the screen, then try again.',
  },
  2243: {
    titlu: 'A move goes beyond the printer\'s travel',
    faci: 'Re-slice the file for your printer and check that the parts fit on the bed.',
  },
  2252: {
    titlu: 'A value in a command is too small',
    faci: 'If it comes from a file, re-slice it; otherwise restart the printer.',
  },
  2253: {
    titlu: 'A value in a command is too large',
    faci: 'If it comes from a file, re-slice it; otherwise restart the printer.',
  },
  2283: {
    titlu: 'The printer isn\'t ready',
    faci: 'Wait for it to finish starting up, or restart it: an earlier error can keep it stopped.',
  },
  2294: {
    titlu: 'The printer didn\'t answer in time',
    faci: 'Restart the printer. If it comes back, export its log and contact Creality support.',
  },
  2295: {
    titlu: 'One of the printer\'s boards didn\'t restart',
    faci: 'Switch the printer off, wait a few seconds and switch it on again.',
  },
  2298: {
    titlu: 'One of the printer\'s boards lost power',
    faci: 'Turn the printer off, check the boards\' power connectors and turn it on again.',
  },
  2299: {
    titlu: 'One of the printer\'s boards couldn\'t be set up',
    faci: 'Restart the printer. If it comes back, update the firmware or contact Creality support.',
  },
  2300: {
    titlu: 'An error while setting up one of the printer\'s boards',
    faci: 'Restart the printer. If it comes back, update the firmware or contact Creality support.',
  },
  2308: {
    titlu: 'The accelerometer gives no data',
    faci: 'Restart the printer and redo the calibration. If it comes back, check the print head cable connectors.',
  },
  2313: {
    titlu: 'An error reading the accelerometer',
    faci: 'Redo the calibration. If it comes back, restart the printer.',
  },
  2340: {
    titlu: 'The temperature asked of a heater is out of range',
    faci: 'Check the temperatures asked for in the file or in the window: they are beyond what the printer allows.',
  },
  2343: {
    titlu: 'The mainboard stopped responding',
    faci: 'Turn the printer off, check the mainboard\'s cable connectors, then turn it on again.',
  },
  2344: {
    titlu: 'The print head board stopped responding',
    faci: 'Turn the printer off and check the print head cable connectors, at both ends.',
  },
  2345: {
    titlu: 'The bed board stopped responding',
    faci: 'Turn the printer off and check the bed cable\'s connectors.',
  },
  2503: {
    titlu: 'The levelling sensor can\'t be read',
    faci: 'Restart the printer. If it comes back, check the sensor cables under the bed.',
  },
  2504: {
    titlu: 'Z homing failed',
    faci: 'Clean the nozzle and the bed, make sure nothing is under the nozzle or the bed, then redo the levelling.',
  },
  2505: {
    titlu: 'A motor driver shut itself down (overheating or voltage)',
    faci: 'Turn the printer off, let it cool down and check the mainboard fan.',
  },
  2506: {
    titlu: 'Communication with the print head was lost',
    faci: 'Turn the printer off and check the print head cable connectors.',
  },
  2509: {
    titlu: 'The nozzle temperature can\'t be read (the thermistor seems disconnected)',
    faci: 'Turn the printer off and check the thermistor connector in the print head.',
  },
  2510: {
    titlu: 'The bed temperature can\'t be read (the thermistor seems disconnected)',
    faci: 'Turn the printer off and check the bed thermistor\'s connector.',
  },
  2511: {
    titlu: 'The chamber temperature sensor seems disconnected',
    faci: 'Turn the printer off and check the chamber temperature sensor\'s connector.',
  },
  2512: {
    titlu: 'The mainboard is too hot',
    faci: 'Turn the printer off, let it cool down and check the mainboard fan.',
  },
  2513: {
    titlu: 'A command has the wrong format',
    faci: 'If it comes from a file, re-slice it; otherwise restart the printer.',
  },
  2514: {
    titlu: 'A command parameter has the wrong format',
    faci: 'If it comes from a file, re-slice it; otherwise restart the printer.',
  },
  2515: {
    titlu: 'The nozzle temperature is over the limit (the thermistor may be shorted)',
    faci: 'Turn the printer off and check the nozzle thermistor and its cable.',
  },
  2516: {
    titlu: 'The bed thermistor seems shorted',
    faci: 'Turn the printer off and check the bed thermistor and its cable.',
  },
  2517: {
    titlu: 'The chamber temperature sensor seems shorted',
    faci: 'Turn the printer off and check the chamber sensor and its cable.',
  },
  2520: {
    titlu: 'The levelling sensor answers too slowly',
    faci: 'Restart the printer. If it keeps coming back, contact Creality support.',
  },
  2521: {
    titlu: 'The levelling sensor always reads the same value',
    faci: 'Restart the printer. If it comes back, check the sensor cables under the bed.',
  },
  2522: {
    titlu: 'The levelling sensor doesn\'t feel the nozzle touching',
    faci: 'Clean the nozzle and the bed, make sure nothing is under the nozzle or the bed, then redo the levelling.',
  },
  2523: {
    titlu: 'The levelling measurement was cut short',
    faci: 'Check that the Z axis moves freely, then redo the levelling.',
  },
  2524: {
    titlu: 'The levelling sensor is too noisy',
    faci: 'Put the printer on a steady surface with no vibration and redo the levelling.',
  },
  2526: {
    titlu: 'The Z motor lost steps while levelling',
    faci: 'Check that the Z axis moves freely and nothing presses on the bed, then redo the levelling.',
  },
  2527: {
    titlu: 'The levelling measurement was left incomplete',
    faci: 'Restart the printer and redo the levelling.',
  },
  2529: {
    titlu: 'Z homing failed after too many attempts',
    faci: 'Clean any stuck filament off the nozzle and clean the bed, then home the axes again.',
  },
  2532: {
    titlu: 'The sync link between the boards is not working',
    faci: 'Turn the printer off and check the cable connectors between the boards. If it comes back, contact Creality support.',
  },
  2533: {
    titlu: 'The saved levelling doesn\'t match the bed',
    faci: 'Redo the levelling from the printer\'s menu before printing.',
  },
  2560: {
    titlu: 'Communication with the mainboard was lost',
    faci: 'Check the cable connectors and restart the printer.',
  },
  2561: {
    titlu: 'Communication with the print head board was lost',
    faci: 'Check the print head cable connectors and restart the printer.',
  },
  2562: {
    titlu: 'Communication with the bed board was lost',
    faci: 'Check the bed cable\'s connectors and restart the printer.',
  },
  2563: {
    titlu: 'Communication between the printer\'s computer and its boards was lost',
    faci: 'Check the cable connectors and restart the printer.',
  },
  2564: {
    titlu: 'The nozzle doesn\'t heat up as it should',
    faci: 'Turn the printer off and check the nozzle\'s heater block and its connectors.',
  },
  2565: {
    titlu: 'The bed doesn\'t heat up as it should',
    faci: 'Turn the printer off and check the bed\'s connector and its cable.',
  },
  2571: {
    titlu: 'The print file is corrupted',
    faci: 'Send the file again; if it comes back, re-slice it.',
  },
  2573: {
    titlu: 'X homing failed',
    faci: 'Make sure nothing blocks the head and the belt is tight, then home the axes again.',
  },
  2577: {
    titlu: 'Y homing failed',
    faci: 'Make sure nothing blocks the head and the belt is tight, then home the axes again.',
  },
  2581: {
    titlu: 'Z homing failed',
    faci: 'Make sure nothing is under the bed or the nozzle, then home the axes again.',
  },
  2585: {
    titlu: 'The X coordinates go beyond the travel',
    faci: 'The file asks for an X move beyond the bed. Re-slice it for your printer or move the parts towards the middle of the bed.',
  },
  2586: {
    titlu: 'The Y coordinates go beyond the travel',
    faci: 'The file asks for a Y move beyond the bed. Re-slice it for your printer or move the parts towards the middle of the bed.',
  },
  2587: {
    titlu: 'The Z coordinates go beyond the travel',
    faci: 'The file asks for more height than the printer has. Re-slice it for your printer or make the part smaller.',
  },
  2588: {
    titlu: 'The Z offset is beyond its limit',
    faci: 'Redo the levelling and the Z offset calibration from the printer\'s menu.',
  },
  3000: {
    titlu: 'A system error',
    faci: 'Restart the printer. If it comes back, note the code and contact Creality support.',
  },
  3001: {
    titlu: 'A system error',
    faci: 'Restart the printer. If it comes back, note the code and contact Creality support.',
  },
  3002: {
    titlu: 'Communication with the print head was lost while idle',
    faci: 'Turn the printer off and check the print head cable\'s connector on the mainboard.',
  },
  5000: {
    titlu: 'The file\'s coordinates go beyond the travel',
    faci: 'The file asks for moves outside the bed. Re-slice it for your printer and check that the parts fit on the bed.',
  },
};
