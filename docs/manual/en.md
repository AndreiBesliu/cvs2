# CNC Vector Studio manual

## Getting started
%% capitol: pornire
%% acopera: vedere.paleta, vedere.lista, vedere.proprietati, vedere.tema, editare.manual

CNC Vector Studio draws parts for a CNC router and writes the program (G-code) the machine cuts. You work on a **sheet** (the
board of material), put shapes on it, each with its own cutting **operation**, then export the G-code.

**The screen.** The canvas fills the screen; floating above it are:
- the **top bar**: the drawing tools, Snap and Grid, Undo and Redo, import and “Export G-code”;
- the **bar extension** just below: alignment, mirroring, the 3D view and the manual;
- top right: “Search commands”, the language (RO / EN) and the theme;
- on the left, the **On the sheet** panel: the sheet's shapes, with the part and operations of each; on the right, the
  **Properties** panel;
- at the bottom: what is selected, the cursor on the sheet (in mm, from the sheet's bottom-left corner), the zoom, the error
  journal, “Show toolpath” and “Show the whole sheet”.

Each panel folds and opens from the button in its corner (“Sheet list panel”, “Properties panel”). The “Theme” button cycles
through light, dark and as the system.

**Search commands** (`Ctrl+K`): the command palette. Type a few letters, pick with the arrow keys and press Enter; Esc closes
it. The palette lists every command, with its key; for the ones done with the mouse it says how.

The **Manual** opens from the “?” button in the bar extension or with `F1`. With F1 it opens at the chapter for what you are
doing now (the chosen tool, the 3D view, the open window). You can search the manual by words, with or without diacritics.

**Where it is saved.** The project saves itself, in this browser, on every change. See [The project and
saving](#proiect).

## The canvas: zoom, panning, rulers and grid
%% capitol: panza
%% acopera: vedere.potriveste, foaie.ghidaje, editare.lipire, editare.grila

- **Zoom**: the mouse wheel, around the cursor.
- **Pan**: drag with the middle button, or hold Space and drag.
- **Show the whole sheet** (`Home`): fits the sheet in the space between the panels.

The **rulers**, in mm, sit on the sheet's edges: the top one above it, the left one to its left, as long as the sheet. When
you pan and zoom they move with the sheet, under the bars and panels too. If shapes go past the sheet, a **dimension line** continues the ruler and shows by how many mm, on each side.

**Sheet guides** are made by dragging out of a ruler: the top one gives a
horizontal guide, the left one a vertical guide. Drag a guide to move it and drop it back on the ruler to delete it;
double-click it to type its exact position. Guides are saved with the project.

**Grid**: the grid button in the top bar shows it on the sheet; its step (0.1 to 1000 mm) goes in the field next to it.

**Snap**: while it is on, whatever you drag (a shape, a handle, the end of a new shape, a guide) snaps to the guides, the
sheet's edges and centre, the other shapes and the grid; the alignment lines show what it snapped to. Hold `Alt` while
dragging to invert it: off when on, on when off.

## The sheet
%% capitol: foaia
%% acopera: foaie.stoc

The sheet is the board of material. When nothing is selected, the Properties panel shows the **Sheet size**: the width, the
height and the thickness, in mm (width and height up to 10,000 mm, thickness up to 1,000 mm). Type the value and press Enter
(or leave the field); Escape goes back to the old value.

All positions are measured from the sheet's **bottom-left corner**, with X to the right and Y up, as on the machine. The
thickness matters for cutting: an operation does not go below the sheet's bottom face, and the 3D view shows what goes
through it.

A shape that goes off the sheet is flagged in the On the sheet panel, at the bottom in the status bar, and on the ruler, with
the dimension line (by how many mm it goes past).

## Drawing
%% capitol: desen
%% acopera: unealta.dreptunghi, unealta.cerc, unealta.elipsa, unealta.linie, unealta.poligon, document.deseneaza, document.adauga-dreptunghi, document.adauga-cerc

The drawing tools are in the top bar; each has a key. Pick the tool, then drag on the canvas. **Draw** makes a new shape, with
its default operation; the tool stays chosen for the next shape.

| Tool | Key | How to drag | With Shift |
|---|---|---|---|
| Rectangle | `R` | corner to corner | square |
| Circle | `O` | from the centre; the drag gives the radius | — |
| Ellipse | `E` | corner to corner | circle |
| Line | `L` | end to end | 15° steps |
| Polygon | `P` | from the centre (a regular polygon) | 15° steps |

- With **Circle**, a click without dragging places a circle with the radius from the field next to the tool; a drag writes
  its radius in the field.
- With **Polygon**, the number of sides (3–64) goes in the field next to the tool.
- The ends of the shape snap like anything else (see Snap in [The canvas](#panza)).
- `Esc` cancels the shape you started; another Esc goes back to Select.

The **default operation** of a new shape: a circle is a hole (inside profile, 8 mm in two passes); a rectangle, an ellipse, a
polygon and a closed outline are islands (outside profile, 3 mm); a line is cut on the line, a groove of at most 1 mm. The
cutter is the sheet's (at first, a Ø6 flat cutter). Operations are changed at export: see [The operations](#operatii).

The command palette also has **Add rectangle** (100 × 60 mm) and **Add circle** (radius 15 mm), which put the shape in a
fixed place on the sheet.

## Selecting and editing
%% capitol: selectie
%% acopera: unealta.selectie, selectie.la-punct, selectie.din-lista, document.muta-selectia, document.duplica-selectia, document.sterge-selectia, istoric.anuleaza, istoric.reface, document.pozitioneaza, document.roteste, document.forma

With the **Select** tool (`V`), a click on a shape selects it; a click on a row of the On the sheet panel does the same. A
click on empty canvas clears the selection. A part imported from one file is one shape, with all its outlines.

**Several shapes** are picked with a rectangle dragged on the canvas, started from an empty spot, as in CAD programs:
- **left to right** (blue frame, solid line): only the shapes **entirely** inside the rectangle are picked;
- **right to left** (green frame, dashed): every shape the rectangle **touches** is picked (its outline, not its inside: a
  rectangle dragged in the middle of a circle, without touching its edge, does not pick it);
- **Shift + click** on a shape adds it to the selection or takes it out; **Shift + drag** adds the shapes caught to those
  already chosen;
- a click on a shape in a selection of several keeps them all, and the drag that follows moves them together;
- `Esc` drops the rectangle you started.

The rectangle also works with the Transform tool, outside the handles.

- **Move selection**: drag the shape on the canvas (it snaps, if Snap is on), or press the arrow keys: 1 mm, with Shift
  10 mm, with Alt 0.1 mm.
- **Duplicate** (`Ctrl+D`): a copy next to it (20 mm to the right and 20 mm lower), selected.
- **Delete selection** (`Delete`).
- **Undo** (`Ctrl+Z`) and **Redo** (`Ctrl+Y`, or `Ctrl+Shift+Z`): every change to the project can be undone.

Next to the selection, its own bar appears, with Duplicate, Delete and the properties panel.

**The Properties panel**, for the selected shape:
- **Position the selection**: X and Y of the bottom-left corner of its box;
- **Rotate**: the angle, in degrees (on a single shape);
- **Change the shape**: the shape's sizes, by kind: the rectangle (width, height, corner radius), the circle (radius), the
  regular polygon (radius, sides), the ellipse (radius on X, radius on Y). The shape is recognised even after it was scaled
  or rotated. A part used by several shapes is not changed from here.
- the shape's operations, read only: they are changed from the Export G-code window.

A value applies on Enter or when you leave the field; Escape goes back. A value that cannot be applied says why under the
field.

## Transforming and mirroring
%% capitol: transformari
%% acopera: unealta.transformare, document.transforma, oglindeste.orizontal, oglindeste.vertical

The **Transform** tool (`S`) shows the handles on the selection's box and transforms the shape exactly (arcs stay arcs):
- the **corners** scale proportionally, with the opposite corner fixed; with Shift, freely on both axes;
- the **sides** scale on one axis;
- the **round handle above** rotates around the centre; with Shift, in 15° steps.

The handles snap to guides, the sheet, the other shapes and the grid, only on the axis they scale (`Alt` inverts snapping).
Some scalings cannot be done exactly and are refused, with the reason: a circle, a path with arcs, a rectangle with rounded
corners or a shape rotated at an angle scale only proportionally; a part used by other shapes too is not changed.

**Mirroring** is in the bar extension: **Flip horizontally** (`Shift+H`, left ↔ right) and **Flip vertically** (`Shift+V`,
top ↔ bottom), about the centre of the selection's box. The mirror image is what gets cut, with the same cutting direction.

## Alignment
%% capitol: aliniere
%% acopera: editare.aliniere, document.muta-instantele, aliniaza.stanga, aliniaza.centru-x, aliniaza.dreapta, aliniaza.sus, aliniaza.centru-y, aliniaza.jos, aliniaza.distribuie-x, aliniaza.distribuie-y

The **Align** section of the bar extension is always there; its button folds it to the left and opens it again. The
buttons **align** the boxes of the chosen shapes:

| Button | What it does |
|---|---|
| Align left / Align right | the left / right edges, on one line |
| Align centres horizontally | the centres, on one vertical |
| Align top / Align bottom | the top / bottom edges, on one line |
| Align centres vertically | the centres, on one horizontal |
| Distribute horizontally / Distribute vertically | equal gaps between shapes (at least three) |

With a single shape chosen, alignment places it against the sheet (for example, “Align left” takes it to the sheet's left
edge). Several shapes are picked with the selection rectangle or with Shift + click (see [Selecting and editing](#selectie)).
Each alignment can be undone with `Ctrl+Z`.

## Importing SVG
%% capitol: import
%% acopera: import.svg, document.importa

The **Import SVG** button in the top bar opens the file window (you can pick several). Or drag SVG files straight onto the
canvas: each one lands centred where you drop it.

For each file a window opens that shows the drawing's size and how it will be cut:
- **closed outlines**: the outer ones on the outside, the holes in them on the inside (from nesting);
- **open paths**: on the line, a groove of at most 1 mm (half the sheet, if it is thinner), in one pass; the line width in the
  file does not matter, the groove has the cutter's diameter;
- **what a px means**: 1/96 inch (the CSS standard, Inkscape) or 1/72 inch (Illustrator); a file written by Illustrator is
  recognised;
- what is not imported or is read differently (texts, `<use>` clones, images, hidden shapes), with their count.

**Import** puts the drawing on the sheet as a single shape, selected; **Skip** moves on to the next file; **Cancel** and
**Cancel all** close the window. Only SVG files are imported, up to 16 MB, not compressed (no `.svgz`). Text has to be
converted to outlines in the drawing program before export.

## The cutting operations
%% capitol: operatii
%% acopera: document.aplica-operatii

Each shape has a **profile** operation: the cutter runs along the outline, in passes, down to the depth. Operations are
changed in the **Export G-code** window, one row per shape; on export, the window does **Apply the operations**: it writes
them into the project.

| Field | What it means |
|---|---|
| Profile | **outside** (the part stays inside), **inside** (a hole), **on the line** (the cutter on the outline); on an open path: on the line, **left** or **right** (the side the cutter runs on, looking along the arrow on the drawing) |
| Direction | **climb**: the material that stays is on the right of the travel (M3 spindle); **conventional**: the opposite. It does not matter on the line |
| Depth, Step down | how deep it cuts and how far one pass goes down (mm) |
| Tabs | bridges that hold the part in the sheet on the last passes: how many per loop, the length and the bridge thickness (from the bottom face) |
| Ramp | the cutter goes down along the loop, not straight into the material; the ramp length (at least 1 mm) |
| Leads | the cutter enters and leaves the outline on a quarter circle, through the waste, so the part's wall keeps no mark |
| Corners | relief for the corners the cutter cannot reach: **dog-bone** (on the diagonal) or **T-bone** (into the longer wall) |
| Split | an open path cut through the whole sheet, outside the parts: it is cut last, to split the sheet |

The cutter (Ø, flat) is one for the whole sheet: if shapes have different cutters, on export they all get the cutter written
at the top. The feeds and speeds are fixed for now: the spindle at 18,000 rpm (with a 3 s wait), feed 1,000 mm/min, plunge
300 mm/min, safe Z 5 mm; insides are cut first.

## The toolpath on the canvas
%% capitol: traseu
%% acopera: vedere.traseu

**Show toolpath** (`T`, or the button in the bottom bar) computes the document's program and draws the cutter's path on the
canvas: cuts in green, rapid moves in grey. Next to it the **job time** appears, estimated for the machine's settings (GRBL
1.1h's factory settings, or the `$$` settings pasted in the export window).

When you change the drawing, the old toolpath dims, with a note at the bottom; `T` computes it again. Another `T`, on an
up-to-date toolpath, hides it. If the program cannot be computed, the note says why. The toolpath needs WebGL2 in the
browser.

## Exporting G-code
%% capitol: export
%% acopera: export.gcode

**Export G-code** opens the export window (GRBL 1.1). Besides the [operations](#operatii), you choose:
- the sheet's **origin corner** (bottom left, bottom right, top right, top left): where X/Y zero is on the machine;
- **Z0**: the top of the material or the bottom of the material (the spoilboard);
- the **flat bit Ø** (mm), the cutter for the whole sheet.

The **Export** button downloads the file and shows how many lines it has and its SHA-256 fingerprint (with it you check that
exactly this file reaches the machine). If the cutter would leave the sheet, the window says by how much and where, and the
export asks you to confirm that nothing is in the way there (clamps, screws); the confirmation is written in the program's
header.

The **job summary** shows the estimated time, per operation and per tool. For your machine's times, paste the controller's
answer to `$$` (from the sender's console) under “Machine settings”; the program does not change.

After the download, the window **simulates** the program: the depth map of the sheet, the material removed, the deepest cut
and whether the cutter goes through the sheet. For the sheet seen in 3D, see [The 3D view](#vedere-3d).

## The 3D view
%% capitol: vedere-3d
%% acopera: editare.3d

The **3D** button in the bar extension puts the **3D view** of the cut sheet in place of the canvas. On opening, the current
document's program is simulated over the whole sheet (without exporting), at 0.25 mm; on a large sheet the drawing is in
blocks (the deepest point of each), and the status in the corner says so.

- **Drag** to rotate; the **right button** (or Shift + drag) pans the sheet; the **wheel** zooms towards the point under the
  cursor; a **double-click** or “Fit the sheet” puts it back in the window.
- From the keyboard: the arrow keys rotate, `+` and `-` zoom in and out, `0` fits.
- **0.1 mm when zoomed in**: when you get close enough, the area around the centre (at most 204.8 × 204.8 mm) is simulated
  again at 0.1 mm and drawn over the sheet; the rest stays at 0.25 mm.

The colours: the sheet's face, the cuts (darker with depth) and, in blue-grey, the spoilboard where the cutter went through
the sheet. If you change the document while the view is open, the status says so; “Simulate again” simulates it, with the
sheet left as you rotated it. `Esc`, the 3D button or a drawing tool go back to the canvas. The 3D view needs WebGL2.

## The project and saving
%% capitol: proiect

- The project **saves itself**, in this browser (local storage), on every change; no account is needed.
- Open in **two tabs**, the project is written from only one; the other shows it, read only, and says so at the bottom.
- If another tab saved in the meantime, this tab stops saving and asks you to reload the page.
- The app also works **offline** after the first load (the manual too). When a new version is out, “New version ready”
  appears at the bottom; it loads on your click, not in the middle of your work.
- **The error journal**: at the bottom, the chip says how many errors the browser's local journal holds. If something breaks,
  the app shows “Something went wrong”, with “Copy the report” (you can send it) and “Reload”.

## Keyboard shortcuts
%% capitol: scurtaturi

| Key | What it does |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Ctrl+Shift+Y` | Redo |
| `Ctrl+D` | Duplicate |
| `Delete` | Delete selection |
| `Ctrl+K` | Search commands |
| `Home` | Show the whole sheet |
| `T` | Show toolpath |
| `V` `S` `R` `O` `E` `L` `P` | the tools: Select, Transform, Rectangle, Circle, Ellipse, Line, Polygon |
| `Shift+H`, `Shift+V` | Flip horizontally, Flip vertically |
| the arrow keys | move the selection 1 mm (Shift: 10 mm, Alt: 0.1 mm); in the 3D view, rotate the sheet |
| `Shift` + click, `Shift` + drag | add to the selection (on a click, a shape already chosen leaves it) |
| `Alt`, while dragging | inverts snapping |
| `Esc` | cancels the shape you started, goes back to Select, closes the 3D view and the windows |
| `F1` | the manual, at the current chapter |

On a Mac, `Ctrl` is `⌘`.
