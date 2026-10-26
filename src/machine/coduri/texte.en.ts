import type { TextCod } from '../../../shared/coduri.ts';

/**
 * The texts of the controller code dictionary (ADR 0085), in English: the keys of every text, which `texte.ro.ts` must match
 * exactly. Written in our own words from what each code means in the firmware sources (GRBL 1.1, grblHAL, FluidNC, all
 * GPL-3.0: read, not copied). A text is shared by several families only where the meaning is the same; the table that says
 * which code points to which text is `tabel.ts`. The buttons are named as the machine panel names them.
 */
export const textCoduriEn = {
  e1: {
    titlu: 'A G-code word is missing its letter',
    ce: 'The line has a number with no letter in front of it (a G-code word is a letter followed by a value, such as X10).',
    faci: 'The line is wrong, not the machine: look at the line shown. A program exported from this app should never do this; if the line is one of ours, it is our defect.',
  },
  e2: {
    titlu: 'A number is badly written',
    ce: 'A value is missing or is not a valid number (an X with no digits, 1.2.3, or a comma instead of a decimal point).',
    faci: 'Fix the line. For a file from another program, check that program’s decimal setting.',
  },
  e3: {
    titlu: 'Unknown $ command',
    ce: 'The controller does not know the “$…” command it was sent, or does not have it in its version.',
    faci: 'Check what you typed in the Command field: $$ (settings), $# (offsets), $G (state), $I (version), $X (unlock), $H (homing).',
  },
  e4: {
    titlu: 'Negative value',
    ce: 'A setting that must be positive was given a negative value.',
    faci: 'Write the setting again, without the minus sign.',
  },
  'homing-neconfigurat': {
    titlu: 'Homing is not set up',
    ce: 'Homing ($H) was asked for, but homing is not enabled or not configured on the controller.',
    faci: 'If the machine has no limit switches, do not use $H: set the zero by hand (jog, Zero XY, Probe Z). If it has them, homing is enabled in the controller settings (on GRBL, $22=1).',
  },
  e6: {
    titlu: 'Step pulse too short',
    ce: 'The step pulse length setting ($0 on GRBL) is below the controller’s minimum.',
    faci: 'Write a larger value (usually 10 µs). The old value was kept.',
  },
  e7: {
    titlu: 'The settings could not be read',
    ce: 'The controller could not read its settings from memory and restored the factory values.',
    faci: 'Do not cut yet: read the settings ($$), write your machine’s values back (steps per mm, speeds, travels), then set the zero again.',
  },
  e8: {
    titlu: 'The command needs the machine idle',
    ce: 'The $ commands (settings, offsets, homing) only work while the machine stands still (Idle, or Alarm), not while it moves or is paused.',
    faci: 'Wait for the move or the job to end, then send the command again.',
  },
  e9: {
    titlu: 'G-code locked: alarm or jog',
    ce: 'The controller refuses G-code while it is in alarm or while a jog is running.',
    faci: 'If the machine is in alarm (State: Alarm), read the alarm before it, then press Unlock ($X) or home it ($H). If a jog was running, wait for it to finish.',
  },
  e10: {
    titlu: 'Soft limits need homing',
    ce: 'Soft limits cannot be enabled without homing: without it, the controller does not know where the ends of travel are.',
    faci: 'Enable homing first (on GRBL, $22=1), then the soft limits ($20=1).',
  },
  e11: {
    titlu: 'The line is too long',
    ce: 'The line has more characters than the controller can hold, so it was not executed.',
    faci: 'Shorten the line (no long comments). Programs exported from this app have at most 70 bytes per line.',
  },
  e12: {
    titlu: 'Step rate over the limit',
    ce: 'The setting would ask for more steps per second than the controller can produce.',
    faci: 'Lower the axis maximum speed or the steps per mm. The setting was not written.',
  },
  e13: {
    titlu: 'The safety door is open',
    ce: 'The safety door input is active: the controller stopped the motion and the spindle.',
    faci: 'Close the door (or check its input), then press Resume. The spindle starts again before the motion does.',
  },
  e14: {
    titlu: 'The startup line is too long',
    ce: 'The startup line ($N) or the build info ($I=) is longer than the memory can hold, so it was not saved.',
    faci: 'Write a shorter line.',
  },
  e15: {
    titlu: 'The jog would leave the travel',
    ce: 'The jog target is outside the machine travel (the soft limits), so the jog was ignored.',
    faci: 'Choose a smaller step, or move the other way.',
  },
  e16: {
    titlu: 'Bad jog command',
    ce: 'The $J= line has no “=” or contains a code jogging does not accept (only G20/G21, G90/G91, G53 and the axes with F are allowed).',
    faci: 'Use the jog buttons. In the Command field, write for example $J=G91 X10 F1000.',
  },
  e17: {
    titlu: 'Laser mode needs PWM',
    ce: 'Laser mode ($32=1) needs a PWM spindle output, which the controller does not have.',
    faci: 'On a router, leave laser mode off ($32=0).',
  },
  e20: {
    titlu: 'Unknown G-code command',
    ce: 'The line has a command the controller does not know, or does not accept in its version.',
    faci: 'Export again with your machine’s post (GRBL 1.1, grblHAL or FluidNC). For a file from another program, remove the command or choose another post there.',
  },
  e21: {
    titlu: 'Two commands from the same group',
    ce: 'The line has two commands that exclude each other (from the same modal group), such as G0 and G1, or G90 and G91.',
    faci: 'Split them over two lines, or keep the right one.',
  },
  e22: {
    titlu: 'No feed rate given',
    ce: 'A feed move (G1, G2, G3) started before the program gave a feed rate F.',
    faci: 'Add an F (the feed rate, in mm/min) on the first line with G1, G2 or G3.',
  },
  e23: {
    titlu: 'The value must be a whole number',
    ce: 'A command got a fraction where it needs a whole number (the P of G10, a tool number).',
    faci: 'Write the value without decimals.',
  },
  e24: {
    titlu: 'Two commands using the axes',
    ce: 'The line has two commands that both use the axes (such as G1 and G28): the controller cannot tell whose X, Y, Z they are.',
    faci: 'Split them over two lines.',
  },
  e25: {
    titlu: 'Repeated word',
    ce: 'The same word appears twice on the line (two X, for example).',
    faci: 'Keep only one.',
  },
  e26: {
    titlu: 'The axes are missing',
    ce: 'The command (or the active motion mode) needs at least one axis (X, Y, Z), and the line has none.',
    faci: 'Add the target of the move, or remove the command.',
  },
  e27: {
    titlu: 'Bad line number',
    ce: 'The line number (N) is outside the accepted range.',
    faci: 'Remove the N line numbers, or use smaller values.',
  },
  e28: {
    titlu: 'A required value is missing',
    ce: 'The command needs a value the line does not have (usually the P or L of G10, or the P of G4).',
    faci: 'Add the missing value.',
  },
  e29: {
    titlu: 'Unsupported coordinate system',
    ce: 'The controller only accepts G54–G59: G59.1, G59.2 and G59.3 do not exist on it.',
    faci: 'Use one of G54–G59.',
  },
  e30: {
    titlu: 'G53 only with G0 or G1',
    ce: 'G53 (a move in machine coordinates) only works with G0 or G1; another motion mode was active.',
    faci: 'Put G0 or G1 on the same line as G53.',
  },
  e31: {
    titlu: 'Axes nothing uses',
    ce: 'The line has axes (X, Y, Z), but no command and no active mode uses them (usually after G80).',
    faci: 'Add the move command (G0, G1) or remove the axes.',
  },
  e32: {
    titlu: 'Arc with no axis in the plane',
    ce: 'A G2 / G3 arc has no axis of the working plane, so there is nothing to trace.',
    faci: 'Check the chosen plane (G17 = XY) and the end point of the arc.',
  },
  e33: {
    titlu: 'The target of the move is invalid',
    ce: 'The target cannot be reached as written: an I/J/K arc whose end is not at the same distance from the centre as its start, an R arc that ends where it starts, or a probe towards the point the bit is already at.',
    faci: 'For arcs, export again (for a file from another program, its arc tolerance is to blame). For probing, raise the bit first.',
  },
  e34: {
    titlu: 'The arc radius is invalid',
    ce: 'An arc given with R cannot be built: its ends are further apart than the diameter.',
    faci: 'Export again. For a file from another program, ask it for I/J arcs instead of R.',
  },
  e35: {
    titlu: 'Arc with no centre in the plane',
    ce: 'A G2 / G3 arc given by its centre has no I / J / K of the working plane.',
    faci: 'Check the plane (G17 = XY) and the centre of the arc.',
  },
  e36: {
    titlu: 'Unused values',
    ce: 'The line has values no command on it uses (a P without G4, for example).',
    faci: 'Remove the extra values.',
  },
  e37: {
    titlu: 'Tool length offset on another axis',
    ce: 'G43.1 (the dynamic tool length offset) was given on an axis other than the configured one (Z).',
    faci: 'Give the offset on Z only.',
  },
  e38: {
    titlu: 'Tool number too high',
    ce: 'The tool number (T) is above what the controller accepts, or the tool is not defined in its table.',
    faci: 'Use a smaller tool number. When exporting from this app, the number is chosen on the operation row (T, Ø).',
  },
  a1: {
    titlu: 'Limit switch hit (hard limit)',
    ce: 'A limit switch triggered during a move: the controller stopped everything at once, so the machine position is probably no longer the known one.',
    faci: 'Press Stop (the controller does nothing else until then), then home it ($H). Without homing switches: Unlock, jog the axis off the switch and set the X, Y and Z zero again. If nothing touched the switch, check the wiring (electrical noise).',
  },
  a2: {
    titlu: 'The target leaves the travel (soft limit)',
    ce: 'A move would have left the machine travel: the controller stopped it before it started. The position was kept.',
    faci: 'Press Stop, then Unlock. Check the program origin and the zero: from there, the program does not fit in the travel.',
  },
  a3: {
    titlu: 'Reset during a move',
    ce: 'The controller was reset (Stop, Ctrl-X or the emergency stop) while the machine was moving: the position is probably no longer the known one.',
    faci: 'Home it ($H), or Unlock and set the X, Y and Z zero again before cutting.',
  },
  a4: {
    titlu: 'Probe: the bit was already touching',
    ce: 'When probing started, the contact was already closed: the bit was resting on the plate, or the clip touches something else.',
    faci: 'Unlock, raise the bit with jog Z+, check the clip and the plate lead, then Probe Z again. If it stays closed, check the probe input inversion ($6 on GRBL).',
  },
  a5: {
    titlu: 'Probe: no touch',
    ce: 'The bit went down the whole search distance without touching the plate.',
    faci: 'Unlock, check the plate under the bit and the clip on the bit, then Probe Z again, with the bit closer or a longer search distance.',
  },
  a6: {
    titlu: 'Homing interrupted',
    ce: 'The homing cycle was stopped (a reset) before it finished.',
    faci: 'Make sure nothing blocks the axes, then home again ($H).',
  },
  a7: {
    titlu: 'Homing: the door opened',
    ce: 'The safety door opened during homing.',
    faci: 'Close the door and home again ($H).',
  },
  a8: {
    titlu: 'Homing: the switch does not release',
    ce: 'After the touch, the axis backed off, but the limit switch stayed pressed.',
    faci: 'Increase the pull-off distance ($27 on GRBL) or check the switch and its wiring, then home again.',
  },
  a9: {
    titlu: 'Homing: the switch was not found',
    ce: 'The axis travelled the whole search distance without reaching its limit switch.',
    faci: 'Check the switch, its wiring and the homing direction; increase the axis maximum travel or reduce the pull-off, then home again.',
  },
  a10: {
    titlu: 'Homing: the second switch does not answer',
    ce: 'On an axis with two motors (an auto-squared gantry), the second limit switch did not trigger in time after the first. It only exists on controllers with a dual axis configured.',
    faci: 'Check the second switch and its wiring, then home again; increase the allowed distance between them if the gantry is out of square.',
  },
  'hal.e18': {
    titlu: 'Command cut off by a reset',
    ce: 'The command was not executed: the controller was reset (Stop or the emergency stop) while it waited.',
    faci: 'Nothing to fix in the line: after the reset, send it again if it is still needed.',
  },
  'hal.e19': {
    titlu: 'The value must be positive',
    ce: 'A value that must be greater than zero got zero or less.',
    faci: 'Write a positive value.',
  },
  'hal.e39': {
    titlu: 'Value out of range',
    ce: 'A word of the line has a value the controller does not accept.',
    faci: 'Check the values of the line (feed, speed, tool or parameter numbers).',
  },
  'hal.e40': {
    titlu: 'Tool change pending',
    ce: 'A tool change (M6) has not been finished, and the controller refuses the command until it is.',
    faci: 'Finish the change the way the controller asks (usually cycle start), then send again. When exporting from this app, choose the tool change “stop in this app’s sender”, so the panel leads the change.',
  },
  'hal.e41': {
    titlu: 'The spindle is not turning',
    ce: 'A move needed the spindle on (constant surface speed or a move synchronised with the spindle), and the spindle was off.',
    faci: 'Start the spindle (M3 with S) before the move.',
  },
  'hal.e42': {
    titlu: 'Wrong plane for a lathe cycle',
    ce: 'Threading and lathe cycles need the ZX plane (G18).',
    faci: 'On a router, the program should not contain these cycles: check the post.',
  },
  'hal.e43': {
    titlu: 'Feed rate over the maximum',
    ce: 'The feed rate asked for is above the controller’s maximum.',
    faci: 'Lower the feed rate in the program, or check the maximum speeds in the settings.',
  },
  'hal.e44': {
    titlu: 'Spindle speed out of range',
    ce: 'The spindle speed asked for (S) is outside the spindle range in the settings.',
    faci: 'Use a speed between the spindle minimum and maximum, or fix the range in the settings.',
  },
  'hal.e45': {
    titlu: 'A limit switch is pressed',
    ce: 'A limit switch is pressed: the controller only accepts homing until it is released.',
    faci: 'Home it ($H), or release the switch (check the wiring too) and press Stop to reset.',
  },
  'hal.e46': {
    titlu: 'Homing required',
    ce: 'The controller asks for homing before any move.',
    faci: 'Home it ($H) from the Command field.',
  },
  'hal.e47': {
    titlu: 'The current tool is not known',
    ce: 'The tool changer does not know which tool is in the spindle.',
    faci: 'Tell it the mounted tool with M61 Q<n> (for example M61 Q1), then send again.',
  },
  'hal.e48': {
    titlu: 'Conflicting values',
    ce: 'The line has values that contradict each other (two ways of giving the same thing).',
    faci: 'Keep only one of them.',
  },
  autotest: {
    titlu: 'The power-on self test failed',
    ce: 'The controller’s start-up check failed.',
    faci: 'Switch the controller’s power off and on again; if it repeats, check the board and its settings.',
  },
  'hal.e50': {
    titlu: 'Emergency stop active',
    ce: 'The emergency stop button (or its input) is active.',
    faci: 'Release the emergency stop, then press Stop to reset.',
  },
  'defect-motor': {
    titlu: 'Motor fault',
    ce: 'A motor driver reported a fault.',
    faci: 'Check the driver and the motor (power, wiring, overheating), then press Stop to reset.',
  },
  'setare-valoare': {
    titlu: 'Setting value refused',
    ce: 'The value given to the setting is outside its range or not of the required type.',
    faci: 'Check the value; the setting stayed as it was.',
  },
  'hal.e53': {
    titlu: 'Setting not available',
    ce: 'The setting does not exist on this controller (the board driver does not support it).',
    faci: 'Nothing to fix: the setting is not used on your board.',
  },
  'hal.e54': {
    titlu: 'Retract below the hole depth',
    ce: 'In a drilling cycle, the retract plane (R) is below the depth of the hole.',
    faci: 'Put R above the material.',
  },
  'hal.e55': {
    titlu: 'Homing two squared axes at once',
    ce: 'Homing was asked for on two auto-squared axes at the same time.',
    faci: 'Home them one after the other (check the order of the homing cycles in the settings).',
  },
  'hal.e56': {
    titlu: 'Coordinate system locked',
    ce: 'The coordinate system cannot be changed right now.',
    faci: 'Check the controller settings that lock it.',
  },
  'hal.e57': {
    titlu: 'Unexpected file marker',
    ce: 'The controller got a start or end of file marker (%) where it did not expect one.',
    faci: 'Remove the lines with % from the program.',
  },
  'grup.port': {
    titlu: 'Auxiliary port not available',
    ce: 'The command uses an auxiliary input / output port the controller does not have or cannot use.',
    faci: 'Check the port number in the command (M62–M67) and the board configuration.',
  },
  'grup.fisiere': {
    titlu: 'Error in the controller’s files',
    ce: 'It concerns the controller’s own file system (its SD card or memory): mounting, reading, writing or deleting a file.',
    faci: 'This app’s sender sends the program line by line and does not use the controller’s files: the error comes from a command sent by hand or from another connected program.',
  },
  'hal.e70': {
    titlu: 'Bluetooth did not start',
    ce: 'The controller’s Bluetooth module did not initialise.',
    faci: 'It does not affect the USB connection; check the module if you use it.',
  },
  'grup.expresii': {
    titlu: 'Error in expressions or macros',
    ce: 'It concerns the controller’s expressions, parameters or macros (calculations in G-code, # variables, flow control statements).',
    faci: 'Programs exported from this app use no expressions: check the lines sent by hand or the controller’s macro.',
  },
  'grup.acces': {
    titlu: 'Access refused',
    ce: 'The controller asks for authentication for the command, or refused it.',
    faci: 'Log in on the controller (its password), then send again.',
  },
  'hal.e79': {
    titlu: 'Not allowed after a critical stop',
    ce: 'The controller is in a critical stop (a limit switch, the emergency stop) and refuses the command.',
    faci: 'Press Stop to reset, then unlock or home it.',
  },
  'grup.scula-ax': {
    titlu: 'The tool in the spindle does not match',
    ce: 'The tool changer refused the command: there is already a tool in the spindle, or there is none, and the command asks otherwise.',
    faci: 'Check the tool in the spindle and the state of the changer, then send again.',
  },
  'grup.compensare': {
    titlu: 'Cutter radius compensation',
    ce: 'It concerns cutter radius compensation (G41 / G42): already active, not allowed now, or impossible on this move.',
    faci: 'Programs exported from this app use no G41 / G42 (the toolpath is already computed with the radius): check the file from the other program.',
  },
  'hal.e253': {
    titlu: 'A plugin error',
    ce: 'An extension (plugin) of the controller reported an error of its own.',
    faci: 'Read the message before the error in the log, and the extension’s documentation.',
  },
  'hal.a10': {
    titlu: 'Emergency stop',
    ce: 'The emergency stop triggered: the controller stopped everything at once, so the position is probably no longer the known one.',
    faci: 'Remove the cause, release the emergency stop, press Stop to reset, then home it ($H), or Unlock and set the zero again.',
  },
  'homing-cerut': {
    titlu: 'Homing required',
    ce: 'The controller asks for homing before any move: the machine position is not established.',
    faci: 'Home it ($H) from the Command field. To work without it anyway, Unlock and set the X, Y and Z zero again.',
  },
  'hal.a12': {
    titlu: 'A limit switch is pressed',
    ce: 'A limit switch is pressed (usually at start-up): the controller accepts no moves.',
    faci: 'Home it ($H) if the machine has homing; otherwise Unlock and jog the axis off the switch. If no axis is on a switch, check the wiring.',
  },
  'hal.a13': {
    titlu: 'Probe protection',
    ce: 'The probe (the touch plate) closed outside of a probing move: the controller stopped the motion.',
    faci: 'Take the plate or the clip off the bit, Unlock, then set the zero again before cutting.',
  },
  'hal.a14': {
    titlu: 'The spindle did not reach its speed',
    ce: 'The spindle did not reach the speed asked for within the expected time.',
    faci: 'Check the spindle and its drive (power, connection, speed setting), then Unlock.',
  },
  'hal.a18': {
    titlu: 'Homing: bad configuration',
    ce: 'The homing cycle cannot start with the current settings.',
    faci: 'Check the homing settings (the axes of each cycle, the directions, the speeds), then home again.',
  },
  'hal.a19': {
    titlu: 'Modbus error',
    ce: 'A Modbus device (usually the spindle drive) did not answer in time, or answered wrongly.',
    faci: 'Check the RS-485 connection and the drive settings, then Unlock.',
  },
  'hal.a20': {
    titlu: 'The I/O expander does not answer',
    ce: 'The controller lost the connection to its input / output expander.',
    faci: 'Check the expander and its connection, then press Stop to reset.',
  },
  'hal.a21': {
    titlu: 'The settings memory failed',
    ce: 'The memory where the controller keeps its settings (EEPROM / flash) cannot be read or written.',
    faci: 'Do not cut: read the settings ($$) and check them; if the error repeats, the controller board needs service.',
  },
  'hal.a22': {
    titlu: 'The controller buffer overflowed',
    ce: 'The controller received more data than its buffer could hold.',
    faci: 'This app’s sender never sends past the buffer; if the alarm comes with it, it is our defect. Otherwise, look at the other connected program. Then Unlock and set the zero again.',
  },
  'fnc.e19': {
    titlu: 'Single axis homing not allowed',
    ce: 'The configuration does not allow homing a single axis ($H with one axis).',
    faci: 'Home all of it ($H).',
  },
  'fnc.e38': {
    titlu: 'G-code value over the maximum',
    ce: 'A value of the line is above the maximum the controller accepts (the tool number, for example).',
    faci: 'Use a smaller value.',
  },
  'fnc.e39': {
    titlu: 'The P parameter is too large',
    ce: 'The output number (P) of M62–M67 is above the outputs the controller has configured.',
    faci: 'Use an output that exists in the configuration (config.yaml).',
  },
  'fnc.e40': {
    titlu: 'Inputs active at start-up',
    ce: 'A control input or a limit switch was active at start-up, and the controller refuses the command until that is solved.',
    faci: 'See in the log which inputs are active (the start-up message), release them or check the wiring, then press Stop to reset.',
  },
  'fnc.intern': {
    titlu: 'Internal controller state',
    ce: 'An internal code of the controller (a message not sent, end of line or of file, a reset, a deferred command).',
    faci: 'It usually has nothing to do with the program: if it repeats, note what you were doing and check the FluidNC version.',
  },
  'fnc.nvs': {
    titlu: 'The setting could not be saved',
    ce: 'The controller could not write or read its settings memory.',
    faci: 'Try again; if it repeats, check the controller memory.',
  },
  'fnc.e120': {
    titlu: 'Another connection is busy',
    ce: 'Another connection of the controller (the web interface, for example) is running a job.',
    faci: 'Wait, or stop the job started from there, then send again.',
  },
  'fnc.e130': {
    titlu: 'Jog cancelled',
    ce: 'The jog was stopped before its end (with Stop the jog, for example).',
    faci: 'Nothing to fix: the machine stopped where it was.',
  },
  'fnc.config': {
    titlu: 'The controller configuration is wrong',
    ce: 'The FluidNC configuration (the pins or a runtime setting) is not valid.',
    faci: 'Read the start-up messages (in the log) and fix config.yaml.',
  },
  'fnc.e162': {
    titlu: 'Read-only setting',
    ce: 'The setting can be read but not changed.',
    faci: 'Nothing to fix: the value stays the controller’s.',
  },
  'fnc.e181': {
    titlu: 'Invalid G-code value',
    ce: 'A word of the line has a value the command does not accept.',
    faci: 'Fix the value.',
  },
  'fnc.e182': {
    titlu: 'M72 with no saved state',
    ce: 'M72 (restoring the modal state) came with no M70 before it.',
    faci: 'Put M70 before M72, or remove M72.',
  },
  'fnc.a10': {
    titlu: 'The spindle does not answer',
    ce: 'The spindle control (the drive) reported an error or did not answer.',
    faci: 'Check the spindle, the drive and their connection, then Unlock.',
  },
  'fnc.a11': {
    titlu: 'An input active at start-up',
    ce: 'A limit switch or a control input was active at start-up.',
    faci: 'See in the log which one (the start-up message), release it or check the wiring, then Unlock.',
  },
  'fnc.a12': {
    titlu: 'Homing: ambiguous switch',
    ce: 'During homing, a switch shared by several axes triggered and it cannot be told whose it is.',
    faci: 'Check the order of the homing cycles in config.yaml (axes with a shared switch in different cycles), then home again.',
  },
  'fnc.a13': {
    titlu: 'Hard stop',
    ce: 'The controller stopped the motors at once (a limit switch hit or a forced stop): the position is probably no longer the known one.',
    faci: 'Press Stop to reset, then home it ($H), or Unlock and set the X, Y and Z zero again.',
  },
  'fnc.a15': {
    titlu: 'Start-up alarm',
    ce: 'The controller is configured to start in alarm after power-up or a reset.',
    faci: 'Home it ($H), or Unlock and set the zero again.',
  },
  'fnc.a16': {
    titlu: 'The expander restarted',
    ce: 'The controller’s input / output expander restarted; the controller needs a restart too.',
    faci: 'Switch the controller’s power off and on again.',
  },
  'fnc.a17': {
    titlu: 'G-code error during the job',
    ce: 'A line of the job gave an error, and the controller stopped the job with an alarm.',
    faci: 'Read the error before the alarm (in the log and the Errors list), fix the program, then Unlock.',
  },
  'fnc.a18': {
    titlu: 'Limit switch hit while probing',
    ce: 'A limit switch triggered during probing.',
    faci: 'Unlock, raise the bit with jog Z+, check the search distance, then set the zero again.',
  },
  blocare: {
    titlu: 'The machine is locked (Alarm)',
    ce: 'The controller started locked: homing is enabled on it, or it was reset after an alarm. Until it is unlocked, it refuses every move.',
    faci: 'Home it ($H) if the machine has limit switches: the position becomes certain. Otherwise Unlock, then set the X, Y and Z zero again before cutting.',
  },
} as const satisfies Readonly<Record<string, TextCod>>;

export type CheieTextCod = keyof typeof textCoduriEn;
