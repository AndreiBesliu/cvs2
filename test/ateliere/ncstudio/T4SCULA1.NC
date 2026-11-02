'CNC Vector Studio
'post NcStudio
'controler: N4063 = 1
'controler: N4034 = 0
'controler: N4035 = 0
'origine stanga-jos, Z0 sus, foaia 250.000 x 150.000 x 18.000 mm
'scula T1 freza plata D6.000
G90 G17 G21
G40 G49 G80
G54
G0 Z5.000
M3 S18000
G4 P2000
G0 X20.000 Y20.000
G1 Z-2.000 F300.0
G1 X40.000 Y20.000 F1000.0
G1 X40.000 Y40.000
G1 X20.000 Y40.000
G1 X20.000 Y20.000
G0 Z5.000
M5
M30
