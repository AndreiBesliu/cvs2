'CNC Vector Studio
'post NcStudio
'controler: N4063 = 1
'controler: N4034 = 0
'controler: N4035 = 0
'origine stanga-jos, Z0 sus, foaia 250.000 x 150.000 x 18.000 mm
'scula T2 freza plata D3.175
G90 G17 G21
G40 G49 G80
G54
G0 Z5.000
M3 S18000
G4 P2000
G0 X60.000 Y20.000
G1 Z-2.000 F300.0
G1 X80.000 Y20.000 F600.0
G1 X80.000 Y40.000
G1 X60.000 Y40.000
G1 X60.000 Y20.000
G0 Z5.000
M5
M30
