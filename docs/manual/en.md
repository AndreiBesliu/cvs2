# CNC Vector Studio manual

## Getting started
%% capitol: pornire
%% acopera: vedere.paleta, vedere.lista, vedere.proprietati, vedere.tema, editare.manual

CNC Vector Studio draws parts for a CNC router and writes the program (G-code) the machine cuts. You work on a **sheet** (the
board of material), put shapes on it, each with its own cutting **operation**, then export the G-code.

**The screen.** The canvas fills the screen; floating above it are:
- the **top bar**: the drawing tools, Snap and Grid, Undo and Redo and, at its end, the files: import, “Export vectors”
  and “Export G-code”;
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
cutter is the sheet's (at first, a Ø6 flat cutter); each operation can have another, in the export window: see [The operations](#operatii).

The command palette also has **Add rectangle** (100 × 60 mm) and **Add circle** (radius 15 mm), which put the shape in a
fixed place on the sheet.

## The Pen tool
%% capitol: pen
%% acopera: unealta.pen

The **Pen** tool (`B`) draws a path node by node, with lines and curves. Each node is a **corner** or makes a **curve**, on both
sides or on one side only; the types are the same as in the [Nodes](#noduri) tool, where they can be changed at any time.
- **Click**: a corner (the segment up to it is straight, unless the node before has a handle towards it).
- **Drag**: a node with a **curve on both sides**; you drag the forward handle, and the backward one mirrors it (the node is
  smooth).
- **Shift + drag**: a **curve on one side**, forward only: the line coming in enters the node straight, the next segment curves.
- **Click on the last node**: removes its forward handle (the curve stays backward only); a drag from it gives it a new one.
- **Click on the first node** closes the path. A drag there sets the handles of the first node, with the closed path shown while
  you drag; with **Shift**, only the closing curve changes (the first segment stays as you drew it). A closed path has at least
  three nodes, or two with a curve between them.
- A **double-click** places the last node and closes the path on the first (with too few nodes to close, it finishes it open);
  **Enter** finishes the open path; **Backspace** (or Delete) removes the last node placed; **Esc** drops the path you started
  (another Esc goes back to Select).
- **Ctrl+Z** while you draw undoes the last step of the path (a node, a drag), not what was on the sheet before; **Ctrl+Y** (or
  Ctrl+Shift+Z) redoes it. Once you have finished, Ctrl+Z undoes on the sheet, as usual. **Ctrl+Shift+Z right after** you
  finish a path (with nothing to redo on the sheet) reopens it, with its steps: Ctrl+Z undoes them in turn, and finishing puts it
  back. Dropped with Esc, the reopened path comes back with Ctrl+Y.

Nodes snap like anything else (see Snap in [The canvas](#panza)); handles do not. The next segment shows dashed up to the
mouse. The finished shape is chosen, with the default operation of a path (see [Drawing](#desen)): closed, an island; open, cut
on the line. The Pen stays chosen for the next path.

## Text
%% capitol: text
%% acopera: unealta.text, document.text, editare.text.fonturi

The **Text** tool (`X`; `T` is “Show toolpath”) writes text to cut. With it chosen:
- a **click on the sheet** puts the anchor (a cross): there the baseline of the first line starts (left aligned), has its
  middle (centred) or its end (right aligned);
- a **click near a shape's outline** (a circle, an arc, a curve, a rectangle) puts the anchor on the outline, at the
  nearest point, and the text **follows the curve** (below);
- a **click on a text** chooses it, to edit it.

In the tool's panel you type the text (Enter: new line) and choose:
- the **font**: the **included** ones (Roboto, Droid Serif), **My fonts** (loaded by you or downloaded from Google Fonts)
  and, once you allow access, the **system fonts**; below the fields you see the text as it will be cut;
- the **capital height**, in mm: at “20 mm”, H, N or E are exactly 20 mm tall (round letters, like O or C, go slightly over
  the line, as in any font);
- the **space between letters** (in mm; negative, tighter), the **distance between lines** (a multiple of the font's line)
  and the **alignment** to the anchor.

**Add** puts the text on the sheet as a part: each letter is a group, with its holes, cut like an import (the outside
profile on the outer outlines, the inside one on the holes; you change them in the export window, to a V-carve for example).
**Apply** replaces the chosen text with the one in the panel, in a single undo step; its operations stay, moved onto the new
letters (the outside profile onto the outer outlines, the inside one onto the holes, the rest onto all). In the palette the
command is **Write the text**.

On a curve, the panel shows the **On the curve** section (with the curve's length), with:
- the **Position to the curve**: **Above** (the letters sit over the curve, their descenders on it), **On the baseline**,
  **Centred on the curve** (the middle of the capitals on the curve) or **Below** (the top of the capitals on the curve);
- the **Distance from the curve** (mm), extra, upwards (negative: towards the curve and past it);
- **On the other side**: the text moves to the other side of the curve (on a circle, inside);
- **Upright letters**: the letters stand upright instead of turning with the curve;
- **Stretched over the whole curve**: the space between letters grows until the text covers the curve (an open one from
  end to end, a closed one all the way round, with the same space between the last letter and the first too).

On a circle or another closed shape, the text sits outside and reads from left to right; the anchor stays where you clicked
and the text is aligned to it (left, centred or right). Longer than an open curve, the text continues straight past the
ends; on a closed one it wraps round. The letters move whole, they do not bend, so the outlines stay exact. **On a straight
line** writes the text straight, from the anchor (the curve stays chosen: **On the curve** puts it back). The curve is kept
in the text: if you change or delete the shape, the text stays as it was; to follow the new shape, click near it again.

**Add fonts…**, below the font, opens the fonts window. At the top, the **Sample text** (the panel's first line or, when
empty, a default sample) is shown written with every font in the list: in My fonts and in the system fonts, drawn from the
font's outlines, as it will be cut (the letters missing from the font are named); in Google Fonts, with each family, in the
chosen style, **before downloading** (the browser fetches from Google only the alphabets of the sample text, and what is cut
comes from the downloaded file). The tabs:
- **My fonts**: **Load fonts…** takes TTF, OTF (CFF outlines too, like Adobe fonts), TTC (all the faces) and WOFF; the
  fonts stay in this browser, work offline and go nowhere. **Use** chooses the font in the panel, **Delete** removes it (a
  text made with it stays, it just cannot be edited here until you load the font again);
- **Google Fonts**: you search a family (by name, by category, only with the Romanian diacritics), choose the style and
  **Download**: the font comes once and goes into My fonts. On another computer, a text in a Google font asks for it again
  in one click (**Download again**);
- **System fonts**: **Allow access to the system fonts** (Chrome and Edge, on a computer) puts the installed fonts in the
  panel's list and in the window, with a search, each one's sample and **Use**. They are copied nowhere: the text can be
  edited only where the font is installed.

The height in mm is measured on the font's letter **H** (its top is at “20 mm”); a font without an H uses the capital height
written in it. A variable font (like Bahnschrift) is read only in its default style for now, and a WOFF2 is loaded after
converting it to TTF or OTF.

The text stays editable after saving too, as long as its outlines are not changed some other way: moving, rotating,
mirroring and uniform scaling keep it (scaling also grows the height in the panel); a non-uniform scaling, a skew or a node
edit turn it into ordinary vectors. **Ungroup** takes it apart into letters, as vectors. Ș and Ț are written with a comma
(Ș ș Ț ț), as in Romanian. A character the font does not have is not drawn, and the panel says so.

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

## Transforming, mirroring, copying and offset
%% capitol: transformari
%% acopera: unealta.transformare, document.transforma, oglindeste.orizontal, oglindeste.vertical, editare.inclinare, document.copiaza-in-retea, editare.offset

The **Transform** tool (`S`) shows the handles on the selection's box and transforms the shape exactly (arcs stay arcs):
- the **corners** scale proportionally, with the opposite corner fixed; with Shift, freely on both axes;
- the **sides** scale on one axis;
- the **round handle above** rotates around the centre; with Shift, in 15° steps.

The handles snap to guides, the sheet, the other shapes and the grid, only on the axis they scale (`Alt` inverts snapping).
Some scalings cannot be done exactly and are refused, with the reason: a circle, a path with arcs, a rectangle with rounded
corners or a shape rotated at an angle scale only proportionally; a part used by other shapes too is not changed.

**Mirroring** is in the bar extension: **Flip horizontally** (`Shift+H`, left ↔ right) and **Flip vertically** (`Shift+V`,
top ↔ bottom), about the centre of the selection's box. The mirror image is what gets cut, with the same cutting direction.

**Skew** (next to mirroring, the button with a square and its parallelogram) opens a panel with two angles, in degrees,
between −75° and 75° (empty = 0): **Horizontal** moves points to the right the higher they are (a negative angle, to the
left), then **Vertical** raises them the further right they are, about the centre of the selection box. The area stays the
same. While the panel is open, the skewed box shows on the canvas, dashed. Skewing goes exactly into the geometry: lines and
curves stay lines and curves, and a rectangle becomes a path (a parallelogram). A shape with arcs (a circle, a rectangle with
rounded corners, a path with arcs) is skewed only with the tick **Arcs become curves (the circle becomes an ellipse)**, which
shows in the panel only then: the arcs become Bézier curves, within 0.001 mm of the skewed arc, and the circle comes out an
ellipse (a path). Without the tick, the panel says why not, and Skew stays inactive: a circle stays a circle unless you ask
otherwise. The tick starts cleared each time the panel opens. A single undo step.

**Copy in an array** (the Copy section of the bar extension, the button with four squares) makes copies of the selection, in
a single undo step. The copies are independent parts (as with Duplicate): each one can be changed or transformed on its own.
- **Rows and columns**: how many columns and rows (with the original in the bottom-left corner, at most 1000 shapes), and the
  gap between copies in each direction (mm, between their boxes). The copies go to the right and up.
- **On a circle**: how many shapes, with the original; the angle (360°: the full circle, at equal steps; less: from the
  original to the last copy); the circle's centre (empty: the sheet's centre); **Rotate the copies** turns them with their
  position, otherwise they only move.
- **On a curve**: choose the shapes to copy, then the curve (a line, a path, a circle, a rectangle), with Shift + click: the
  curve is the last shape chosen. **How many copies on the curve** (1–1000) are placed at equal distances along its length,
  with the centre of the shapes' box on the curve: on an open curve, from one end to the other; on a closed one, all around,
  from its first node. **Rotate the copies along the curve** turns them with the curve's direction at each place (a shape drawn
  "pointing right" follows it). **From the curve**: **On it** (the centre on the curve; a distance moves it to the left of the
  curve's direction, a negative one to the right), **On the left** or **On the right** (the shapes beside the curve, on that
  side, looking along it, with their nearest point at the distance written: 0 = touching). A drawn rectangle or circle runs
  counterclockwise, so "on the left" is inside. The originals and the curve stay in place; the curve is not copied. The curve
  must be a single shape (not a part with several outlines).

While the panel is open, the copies show on the canvas, dashed. If the array cannot be made (wrong values, nothing chosen,
the project at its cap, copies too far away), the panel says why and Copy stays inactive. After copying, the original and
the copies are chosen.

**Offset** (in the bar extension, next to Copy, the button with a square inside a dashed outline) draws a contour parallel to
each closed shape chosen, at the distance written (mm, between 0.01 and 1000), **outwards** or **inwards**. The contour comes
from the same engine as cutting, exact, made of lines and arcs. **Corners:**
- **Like the original** (the default): a sharp corner stays sharp, with the sides extended until they meet. A corner sharper
  than ~11° stays rounded (otherwise the tip would run far from the shape), as does one that would come close to another part
  of the shape.
- **Rounded**: every corner is rounded with a radius equal to the distance, in both directions. On a rectangle, inwards too.

Each shape is offset by its own inside (for a part with several outlines, each outline on its own), and a contour that breaks into pieces gives several shapes. The new shapes are independent paths, with their default
operation, chosen after Apply; the originals stay, and it is all a single undo step.
- While the panel is open, the new contours show on the canvas, dashed.
- Open shapes chosen are skipped (the panel says how many); with only open ones, the offset cannot be made.
- Inwards, a shape too small for the distance asked stops it all, with the reason: nothing is done halfway.

## The boolean: unite, subtract, intersect
%% capitol: boolean
%% acopera: boolean.uneste, boolean.scade, boolean.intersecteaza

The Boolean section of the bar extension works on **exactly two closed shapes**, chosen in order: first one, then the second
with Shift + click on the canvas. The result **replaces** both, in a single undo step, and stays chosen.
- **Unite**: the two shapes become one (their union). A rectangle and a circle centred on one of its corners give a single
  outline, with the circle's arc that stays outside.
- **Subtract**: the **last** shape chosen is taken out of the **first**. If the last is inside the first, the result is the first
  with a hole.
- **Intersect**: only the shared part remains.

The outlines are the ones the cutter would cut, and the result is exact: lines stay lines, arcs stay arcs of the same circles. A
curve (drawn with the Pen or imported) goes in as arcs, at the project tolerance (0.001 mm), as for cutting. A result with
holes stays a single part: the outline with an outside profile, the holes with an inside profile (as on import). If the result
has several separate pieces, each is a new shape.

The buttons are active only with two shapes chosen. The boolean is refused, with the reason shown next to the buttons, if a
shape is open (a line) or has several outlines (an imported part), if the shapes do not touch (uniting or subtracting would not
change them), if they have nothing in common (intersecting) or if nothing remains of the first (subtracting).

## Ungrouping
%% capitol: degrupare
%% acopera: document.degrupeaza

An import (SVG, DXF, PDF) is a single part, with all the outlines of the file; so is a shape with holes made by the boolean.
**Ungroup** (the button next to the boolean, the right-click menu, `Ctrl+Shift+G`) takes it apart: each outline becomes a part of
its own, which is chosen, moved, scaled and deleted on its own. It goes one level down: a subgroup (a letter with its hole)
stays whole.

Each part stays exactly where it was and keeps its operation (the side, the depth, the cutter): **what is cut stays the same**.
The cutting order keeps its classes (insides first, then lines, outsides last); a part with several operations on the same
outlines (roughing and finishing) cuts them, after ungrouping, outline by outline. After ungrouping, all the parts are chosen,
and a single `Ctrl+Z` puts them back together.

Ungrouping is refused, with the reason shown next to the buttons, if a **V-carve** cuts its outlines together (letters with
their holes: apart, the holes would be cut too), if the part is also used by other instances, or if none of the chosen shapes is
a group.

## The right-click menu
%% capitol: meniu
%% acopera: editare.meniu

A right click on the canvas opens the **right-click menu**, with what can be done to the selection: **Ungroup**, then **Unite**,
**Subtract** and **Intersect** (the boolean), then **Duplicate** and **Delete selection**, each with its key. On a shape that is
not chosen, the right click chooses it first; on empty space, the selection stays. A row is active only when it can run (the
boolean with two shapes, ungrouping with a group chosen); a refusal shows its reason in the menu.

The arrow keys move between rows, `Enter` runs the row, `Esc` closes the menu; it also closes on a click outside it, on the
wheel or after a command has run. In the 3D view, a right click does not open the menu.

## Nodes
%% capitol: noduri
%% acopera: unealta.noduri

The **Nodes** tool (`N`) shows the nodes (vertices) of the chosen shape and changes them:
- **drag a node** to move it; it snaps like anything else (see Snap in [The canvas](#panza)), and the control points of the
  neighbouring curves move with it;
- **double-click on a side** to add a node there, without changing the shape (a line, an arc or a curve is split exactly);
- a **click on a node** chooses it; **Delete** (or Backspace) removes it, `Esc` lets it go. For now only the nodes between two
  lines can be removed; a closed shape keeps at least three nodes.

**The node type.** A node is a corner (square on the canvas) or makes a curve (round), on both sides or on one side only, as in
the [Pen](#pen) tool. The chosen node shows its handles; the buttons in the top bar, next to the tools, change its type:
- **Corner**: removes the handles (a curve left without handles becomes a line again);
- **Curve on both sides**: puts the handles on one line, on the bisector of the directions at the node, and with the same length
  (the node becomes smooth): the average of the two, the length of the one there is, or, with none, a third of each segment. On
  a node with split handles, it joins them again;
- **Curve on one side**: keeps the forward handle (or puts one in line with the incoming line, so the line flows into the
  curve) and removes the other; another click moves the curve to the other side.

**Drag a handle** to change the curve; on a smooth node, the handle on the other side turns with it (keeping its length). With
`Alt`, the handles split (the node stays a curve on both sides, but with a corner); on split handles, `Alt` joins them again:
the other becomes the mirror of the one dragged, on one line and with the same length. The end of an open path has a single
side.

**Any node, from any tool.** A node on an arc (the circle, rounded corners, the results of offset and boolean) is a curve too
(round), and its handles are the arc's tangents. When you change its type or drag one of its handles, the neighbouring arc first
becomes curves of the same circle, with new nodes between them (a semicircle of radius 15 becomes 3 curves), off the circle by
at most 0.001 mm, the cutting tolerance: the shape does not change until you change it.

Nodes are edited on a single shape whose part is not used by other shapes. For a part with several outlines (an import, a
boolean with holes), each outline shows its nodes and is edited on its own. A rectangle or a circle becomes a **path** with the
same outline at the first change (the rounded corners stay arcs), and its fields no longer show in the panel. Each change can be undone with `Ctrl+Z`. At the
bottom, a hint says what can be done or why the chosen shape cannot be edited.

## Alignment
%% capitol: aliniere
%% acopera: editare.aliniere, document.muta-instantele, aliniaza.stanga, aliniaza.centru-x, aliniaza.dreapta, aliniaza.sus, aliniaza.centru-y, aliniaza.jos, aliniaza.centru-foaie, aliniaza.distribuie-x, aliniaza.distribuie-y

The **Align** section of the bar extension is always there; its button folds it to the left and opens it again. The
buttons **align** the boxes of the chosen shapes:

| Button | What it does |
|---|---|
| Align left / Align right | the left / right edges, on one line |
| Align centres horizontally | the centres, on one vertical |
| Align top / Align bottom | the top / bottom edges, on one line |
| Align centres vertically | the centres, on one horizontal |
| Centre on the sheet | the chosen shapes' centre in the sheet's centre, on both axes, in one click; several shapes move together, as a block |
| Distribute horizontally / Distribute vertically | equal gaps between shapes (at least three) |

With a single shape chosen, alignment places it against the sheet (for example, “Align left” takes it to the sheet's left
edge). **Centre on the sheet** always works against the sheet: it moves all the chosen shapes by the same amount, so their
arrangement stays and their common box ends up in the middle of the sheet. Several shapes are picked with the selection rectangle or with Shift + click (see [Selecting and editing](#selectie)).
Each alignment can be undone with `Ctrl+Z`.

## Importing SVG, DXF, PDF, AI and EPS
%% capitol: import
%% acopera: import.svg, document.importa

The **Import SVG / DXF / PDF / AI / EPS** button in the top bar (the first of the files, next to “Export vectors” and “Export
G-code”) opens the file window (you can pick several). Or drag the files straight onto the canvas: each one lands centred
where you drop it.

For each file a window opens that shows the drawing's size and how it will be cut:
- **closed outlines**: the outer ones on the outside, the holes in them on the inside (from nesting);
- **open paths**: on the line, a groove of at most 1 mm (half the sheet, if it is thinner), in one pass; the line width in the
  file does not matter, the groove has the cutter's diameter;
- for an SVG, **what a px means**: 1/96 inch (the CSS standard, Inkscape) or 1/72 inch (Illustrator); a file written by
  Illustrator is recognised;
- for a DXF, **the units**: the ones the file declares are used as they are; a file that declares none (an R12, for example)
  is read in mm, and the window lets you choose mm, cm, m, inch or foot (the drawing's size changes at once);
- for a PDF with several pages, **the page** to import (see below);
- what is not imported or is read differently, with their count (for an SVG: texts, `<use>` clones, images, hidden shapes).

**Import** puts the drawing on the sheet as a single shape, selected; **Skip** moves on to the next file; **Cancel** and
**Cancel all** close the window. SVG, DXF, PDF, AI and EPS files are imported, up to 16 MB, not compressed (no `.svgz`). Text has to be
converted to outlines in the drawing program before export.

A **DXF** is read like this:
- the text (ASCII) DXF, from R12 to the new ones; a binary one is refused (save it as ASCII);
- the drawing lands on the sheet where it is in the file: the DXF's origin is the sheet's corner (dropped on the canvas, it
  lands where you drop it);
- every shape keeps the name of its layer;
- lines, arcs, circles, polylines with arcs, ellipses and curves (splines) come in exactly: a circle stays a circle, curves
  become Bézier curves; blocks are taken apart, with their scale, rotation and array;
- open pieces on the same layer that touch (ends at most 0.01 mm apart) are joined: four lines that make a rectangle become a
  closed outline; where three ends meet (a T), they are not joined;
- skipped, and counted: texts, hatches, dimensions, points, 3D entities, images, layers that are off or frozen, and paper space
  (the layouts).

A **PDF** is read like this (an **AI** saved by Illustrator 9 or newer is a PDF too and is read the same way):
- one page is imported: the window reads the first one, and for a file with several pages you pick another from the
  **Page** list, also after a refusal (a cover with only text has nothing to import);
- the drawing lands on the sheet where it was on the page: the lower left corner of the displayed page (with its crop and
  rotation) is the sheet's corner;
- lines and curves come in exactly, at 1:1 scale (curves stay Bézier curves); a shape filled by the nonzero rule is redrawn
  as for SVG;
- every shape keeps the name of its layer (OCG), if the file has layers; shapes on layers that are off are skipped;
- skipped, and counted: texts, images and shadings (gradients); clipping paths are not applied (what they clip is imported
  whole);
- a protected file (with a password or editing restrictions) is refused: save a copy without protection. An AI saved
  without “Create PDF Compatible File” shows only a text notice, and the window tells you to tick it.

An **EPS** (and an **AI** from before Illustrator 9, which is PostScript, not PDF) is read like this; whether it is AI or EPS is
decided by the start of the file, not by the extension:
- the drawing lands on the sheet where it is in the file: the PostScript origin is the sheet's corner, at 1:1 scale (a binary
  EPS, with its preview, is read the same way);
- lines and curves come in exactly, with their transformations (move, scale, rotate, skew); a shape filled by the nonzero
  rule is redrawn as for SVG;
- for an AI, every shape keeps the name of its layer; shapes on hidden layers are skipped;
- skipped, and counted: texts, images and shadings; clipping paths are not applied;
- the reader is limited: it reads drawings written out step by step, with their simple procedures. A file that uses loops or
  conditions (an EPS from CorelDRAW, for example), an operator the reader does not have (`arc`, for example) or an EPS saved
  by Illustrator 9 or newer is refused, and the window says why: save it as PDF, SVG or PDF-compatible AI.

## The cutting operations
%% capitol: operatii
%% acopera: document.aplica-operatii, document.rol

Each shape has an operation: a **profile** (the cutter runs along the outline, in passes, down to the depth), a **pocket**
(the cutter clears all the material inside a closed outline, down to the depth), on circles a **drilling** (a hole the
size of the circle, see below) or a **V-carve** (the V bit carves the shape along its middle, see below). Operations are changed in the **Export
G-code** window, one row per shape; on export, the window does **Apply the operations**: it writes them into the project.

The **Cutting role** can also be chosen in the properties panel, in the **Cutting** section, for any number of chosen shapes:
**outside**, **inside**, **on the line**, **left** or **right** (on an open path), **pocket**, **drilling** (circles only) or
**V-carve**. The list shows only the roles that fit all the chosen shapes; “—” when they have different roles. The role is the
whole shape's: on a letter with holes, outside cuts the outline on the outside and the holes on the inside, while the pocket
and the V-carve carve the letter with its holes in one go. When the role changes, the cutter, the direction, the depth and the
step stay; the rest goes back to the defaults. A V bit only works on the line and in a V-carve: for a V-carve, a flat cutter
becomes a V60 of the same diameter, and for another role a V bit becomes flat. For a V-carve, the depth is at most the bit's
cone (5.196 mm for a V60 Ø6). Under the role, **Depth** and **Step down** are
written on all the operations of the chosen shapes (with different values, the field is empty). A part with several copies
changes its role for all of them. A shown toolpath updates by itself.

| Field | What it means |
|---|---|
| Cut | **outside** (the part stays inside), **inside** (a hole), **on the line** (the cutter on the outline), **pocket** (clears the outline, see below), **drilling** (only on a row with nothing but circles), **V-carve** (carves the shape with the V bit, see below); on an open path: on the line, **left** or **right** (the side the cutter runs on, looking along the arrow on the drawing) |
| Direction | **climb**: the material that stays is on the right of the travel (M3 spindle); **conventional**: the opposite. It does not matter on the line; there, next to it, **Line direction**: **as drawn**, **reversed** or **shortest path** (an open path starts from the end nearer to where the bit was left; a closed loop stays as drawn) |
| Depth, Step down | how deep it cuts and how far one pass goes down (mm) |
| Tabs | bridges that hold the part in the sheet on the last passes: how many per loop, the length and the bridge thickness (from the bottom face) |
| Ramp | the cutter goes down along the loop, not straight into the material; the ramp length (at least 1 mm) |
| Leads | the cutter enters and leaves the outline on a quarter circle, through the waste, so the part's wall keeps no mark |
| Corners | relief for the corners the cutter cannot reach: **dog-bone** (on the diagonal) or **T-bone** (into the longer wall) |
| Split | an open path cut through the whole sheet, outside the parts: it is cut last, to split the sheet |
| Side step | only on a pocket: the distance between the rings, at most half the cutter diameter (40% by default) |
| Descent | only on a pocket: how the cutter enters the material on each pass: **plunge** (default), **ramp along the ring**, **zigzag** or **helix**, with their values (see below) |
| Clear every … step | only on a drilling: after how many steps the cutter leaves the hole to clear the chips (1–100, 1 by default) |

The **pocket** clears the material in rings parallel to the outline: the first one a cutter radius from the wall, each next
one a side step further in, cut from the inside out to the wall, on every pass. The cutter goes from one ring to the next
without lifting as long as the way stays inside the pocket. With a side step of at most half the diameter, the floor comes out
clean everywhere; only the corners no round cutter can reach are left (with the cutter's radius). Where the pocket is
narrower than the cutter, the cutter does not go in. A pocket has no tabs, leads or corner relief, and the profile's ramp
is replaced by the descent.

**Pocket path.** Under a pocket row, **Path** chooses between **rings (offset)**, the default, and **parallel lines**, at the
given **Angle** to X (from 0 up to below 180°), with the stepover between them. On each pass, the bit first runs the lines,
linked at depth only to the next line and only when the way stays inside the pocket (otherwise it lifts), then a **profile pass**
along the edge, so the wall comes out exactly on the vector, not in steps. Lines plunge straight (the ramp, zigzag and helix
belong to the rings); on the lines the bit cuts back and forth, so alternately climb and conventional, and the profile pass
follows the row's direction. Islands and rest bits work as with rings.

**Rest bits.** Under a pocket row, **Add a rest bit** puts a smaller bit after the row's bit (by default half the diameter,
with the next free T and a 40 % stepover); you can add several, each smaller than the one before, and remove them with ×. Each
one cuts only where the one before could not reach: the corners and the strips narrower than it, on the same passes; it does
not run again along the walls the big one has already cut. The corners keep the radius of the smallest one. For example, an
80 × 40 pocket with Ø12 and then Ø3: Ø12 clears almost everything, Ø3 only the four corners, rounded to 1.5 mm instead of 6.
A rest bit with nothing to clear (a circle the big one empties entirely) is not mounted, and the export says so. Each bit needs
its own number (T); the program changes to it after the one before. They plunge straight, at most one step deep.

**Descent.** On every pass, the cutter enters the pocket at the start of the first ring (and wherever it has to lift between
rings). The kind is chosen under **Descent**:

- **Plunge (no ramp)**, the default: straight down, at the plunge feed.
- **Ramp along the ring**: the cutter goes down along the ring, with the slope given by the **angle** (between 0.5° and 45°,
  3° by default), then makes one more full round at depth, over everything the ramp cut higher up.
- **Zigzag**: back and forth on the first millimetres of the ring (the **length**, 20 mm by default), with a slope of at most
  the angle; the window shows how many ramps one pass takes (from the angle, the length and the depth per pass). Then one
  full round at depth.
- **Helix**: on a circle of the given **radius** (half the cutter diameter by default), with the centre picked by the app
  where it fits; after the helix, a full circle at depth, then the ring. Where the helix does not fit, the cutter goes down
  along the ring at the same angle, and the export summary says so.

Each one first goes down, at the plunge feed, to the floor of the previous pass (where the material is already cleared),
then cuts on the slope with a feed chosen so that the cutter never goes down faster than when plunging. The descent paths
stay inside the pocket: on the ring, or on the helix's circle, in its piece.

**Islands.** Pockets on the sheet with the same depth are one pocket, whatever their part: a shape with a pocket lying
entirely inside another is an **island** (it stays standing and the cutter goes around it, cutting its wall like the
pocket's), and one lying inside an island is a pocket again. For example, a rectangle and a text, both with a 3 mm pocket:
the letters stay raised and their counters (in "O", "A") are cleared. The side step and the direction come from the outer
outline; the island's own do not matter. With a different depth, each pocket is cut whole: a deeper pocket inside another
makes a step. Two outlines with the same depth that touch or cross are refused (join them first with the boolean, or give
them different depths). Between an island and the wall, a place narrower than the cutter stays uncut.

**Drilling.** On a row with nothing but circles, Cut also offers **drilling**: the hole comes out the size of the circle in the
drawing, with the row's flat cutter, written with plain moves only (G0, G1, G2, G3), without the G81–G83 drilling cycles GRBL
does not have.
- A **circle the size of the cutter** (its diameter, ± 0.02 mm) is drilled at its centre, **by pecking**: the cutter goes down
  by the step per pass, at the plunge feed; after each step it lifts 1 mm (breaks the chip), and every Nth step, the number
  under **Clear every … step**, it goes up to safe Z (clears the chips) and comes back down fast to 0.5 mm above the floor.
- A **larger circle**, up to two cutter diameters, is cut **as a helix** along the wall: turns of at most one step per pass,
  then a full circle at the floor, so the floor comes out clean. The direction: climb is counter-clockwise, conventional
  clockwise. The cutter never goes down faster than when plunging.
- A circle smaller than the cutter, or over two cutter diameters, is refused, with the reason (over two diameters, a core
  would stay in the middle: use a pocket). A drilling has no tabs, ramp, leads, corner relief or split; holes are cut with
  the insides.

**V-carve.** On closed outlines, Cut also offers **V-carve**: the V bit runs along the middle of the shape (its medial axis)
and goes down at each point as far as fits between the walls: the depth is the distance to the nearest wall divided by
tan(θ/2), where θ is the bit's angle (at 90°, the distance itself; at 60°, 1.73 times more). The walls come out sloped, right
on the outline, and sharp corners stay sharp: lettering, ornaments, the outline of a logo.
- The row's outlines are read together, even-odd: an "O" is the ring between its two outlines, not two shapes. So are the
  V-carve rows of the same shape with the same values (the cutter, the depth, the step, the flat bottom): a text set to
  V-carve row by row is carved with its holes. With different values, each row is a separate region.
- **Depth** is the maximum. Where the shape is wider than the bit at that depth, the bit runs at it along the middle and along
  an outline parallel to the wall, and a **flat floor** remains between them.
- **Flat floor with a straight bit**: the box under the V-carve row, with the straight bit (its own number, a different T from
  the V bit; the V bit's T + 1 and Ø3.175 by default) and its stepover (at most half the diameter, 40 % by default). The
  straight bit clears the floor first, level by level, without touching the walls; then the V bit cuts the walls and the
  corners the straight bit cannot reach (the floor's sharp corners and channels narrower than it), with close rings: a ridge
  of at most 0.05 mm stays there. The program has a bit change between them. Without the box, the floor is left uncut and the
  export says so, as a warning; a shape with no flat floor does not mount the straight bit at all. Under the straight bit,
  **Add a rest bit** adds more straight bits after it, each smaller, that clear the floor only where the one before could not
  reach (as in a pocket); the V bit comes after all of them, only where the smallest one could not reach.
- **Step**: on each pass, the bit goes at most one step deeper than the pass before.
- The row's bit must be a **V** bit (see [Exporting G-code](#export)), and its cone, ((diameter − tip) / 2) / tan(θ/2), must
  reach the depth asked for; otherwise the export is refused, with the reason. A V-carve has no tabs, ramp, leads, corner
  relief or split, and an open path is refused.

**A V bit with a flat tip (an engraving bit).** For a V bit, next to the angle, **Tip** is the diameter of the flat at its
point, in mm: 0 = a sharp tip (the default), otherwise below the bit diameter. The simulation and the export take it into
account: on the line, the bottom of the groove is as wide as the tip; in a V-carve, the bit goes down only where the shape is
wider than the tip, and sharp corners stay rounded by half the tip (a region narrower than the tip everywhere is refused, with
the reason). Two bits with the same T, the same angle and a different tip are two bits: the export asks for different numbers.

**Engraving on the line.** On the line, the bit can also be a V bit: its centre runs exactly on the vector, at the row's depth,
and the groove comes out tip + 2 · depth · tan(θ/2) wide (with V90 at 1 mm: 2 mm), with sloped walls. The bit's cone must reach
the depth, as in a V-carve. **On a side** (outside, inside, left, right), **in a pocket** or **for drilling**, a V bit is
refused, with the reason: there the job would offset it like a flat bit, and the wall would not come out where it is drawn
(chamfering along an outline comes later).

**Smart engraving** is a V-carve with a flat bottom and an engraving bit: the straight bit clears the inside of the letters,
then the V bit with a flat tip (usually 15° per flank, that is 30° as the V angle) cuts the sloped walls and rises into the
corners to sharpen them. For example, a 20 mm square at 2 mm, with a Ø2 straight bit and a 30° engraving bit with a 0.25 mm
tip: the walls come out at 15°, and the corners at the surface have a 0.13 mm radius (with Ø2 alone it would be 1 mm). For now
a single straight bit clears the bottom; several, from the largest to the smallest, come with the pocket with several bits.

Each row has its own cutter (see [Exporting G-code](#export)). The feeds and speeds are fixed for now: the spindle at 18,000 rpm (with a 3 s wait), feed 1,000 mm/min, plunge
300 mm/min, safe Z 5 mm; insides are cut first.

## The toolpath on the canvas
%% capitol: traseu
%% acopera: vedere.traseu

**Show toolpath** (`T`, or the button in the bottom bar) computes the document's program and draws the cutter's path on the
canvas: cuts in green, rapid moves in grey. Next to it the **job time** appears, estimated for the machine's settings (GRBL
1.1h's factory settings, or the `$$` settings pasted in the export window).

While it is shown, the toolpath updates by itself after every change (the drawing, the cutting role, the depth, an undo): the
old toolpath dims under “computing”, then the new one appears. `T`, on a shown toolpath, hides it. If the program cannot be
computed, the note at the bottom says why. The toolpath needs WebGL2 in the browser.

The computing (the toolpath, the time, the export, the 3D view) runs apart from the drawing: on a large project, the canvas
does not stop while it computes. If you change the drawing before the toolpath is ready, its computing stops and starts
again, on the drawing as it is now.

**Animate**, next to the job time, opens the toolpath animation: the bit moves along the toolpath in machine time (the same
estimate as the job time), and the path covered is coloured on the canvas. In the panel: **Play** / **Pause**, **Previous
step** and **Next step** (one program move at a time), **Speed** (1× is real time; by default the whole animation lasts about
a minute) and the slider (`Home` to the start, `End` to the end). Below: the time out of the total, the step, what the bit is
doing (rapid move, cutting with its feed, arc, dwell, tool change) and its operation, the X Y Z position and the mounted bit.
The bit's circle is its diameter, filled while it is in the material. `Esc` or **×** closes the animation; if you change the
drawing, it closes by itself.

## Exporting G-code
%% capitol: export
%% acopera: export.gcode

**Export G-code** opens the export window. Besides the [operations](#operatii), you choose:
- the sheet's **origin corner** (bottom left, bottom right, top right, top left): where X/Y zero is on the machine;
- **Z0**: the top of the material or the bottom of the material (the spoilboard);
- the **Post**: the machine's controller, from the GRBL family (GRBL 1.1, grblHAL, FluidNC). A post written only from the
  controller's documentation, not yet tested on a machine, carries a note: watch the first program run in the air;
- the **Units**: mm (the default) or inch (G20, with 5 decimals and the feed in inch/min); the header stays in mm;
- the **Tool change**, only when the rows have different bits: **stop in this app's sender** (the default: the job stops at
  `T… M6`, you take the bit out, put in the next one, probe Z and **Continue**), **M6 at the controller** (grblHAL, FluidNC,
  with the change set up there), **M0, with the bit in a comment** or **one file per bit** (all of them are downloaded).

Each row has its own **bit**: the tool number (T), the diameter (mm) and the shape: **flat** or **V**, with the included angle
of the tip (from 1° to 179°, 60° by default; for a V bit, the diameter is that of the cutting part). Rows with different bits
are cut with a change between them: in each class (insides, then on the line, then outsides), the bit already mounted first,
so there are as few changes as possible. The same number with two diameters or two shapes is refused: each bit needs its own
number.

The **Export** button downloads the file and shows how many lines it has and its SHA-256 fingerprint (with it you check that
exactly this file reaches the machine). If the cutter would leave the sheet, the window says by how much and where, and the
export asks you to confirm that nothing is in the way there (clamps, screws); the confirmation is written in the program's
header.

The **job summary** shows the estimated time, per operation and per tool. For your machine's times, paste the controller's
answer to `$$` (from the sender's console) under “Machine settings”; the program does not change.

After the download, the window **simulates** the program: the depth map of the sheet, the material removed, the deepest cut
and whether the cutter goes through the sheet. For the sheet seen in 3D, see [The 3D view](#vedere-3d).

## Exporting vectors
%% capitol: vectori
%% acopera: editare.vectori

**Export vectors** (in the top bar, between import and “Export G-code”) writes the sheet as a drawing file, for other programs
(ArtCAM, Inkscape, Illustrator / Corel, AutoCAD / LibreCAD) or for the laser:
- **DXF (R2007)**, the default, **SVG**, **PDF** or **EPS**;
- in mm, at 1:1 scale, from the lower left corner of the sheet (in SVG, the sheet has its size in mm);
- **circles, arcs and curves stay what they are**: a circle is a circle (CIRCLE), the lines and arcs of a shape are a
  polyline with arcs, curves are curves (SPLINE in DXF, `C` in SVG), with no approximated points. PDF and EPS have no arcs:
  there, circles and arcs come out of a few curves, at most 0.001 mm from them (the R50 circle from 7);
- **one layer per role**, from the first operation that cuts the shape: EXTERIOR, INTERIOR, PE_LINIE (on the line),
  PE_O_PARTE (a path cut on its left or right), BUZUNAR (pocket), GAURIRE (drilling) and FARA_OPERATIE (no operation), each
  with its colour; only the layers in use are written. In PDF they are PDF layers (you can show and hide them in the viewer);
  EPS has no layers, so the role stays only in the colour;
- **With the sheet outline** adds the sheet rectangle, on the FOAIE layer.

**Export** downloads the file and says how many entities and layers it has. A shape with both lines and curves comes out
in pieces joined end to end (a polyline, then a curve).

## The machine
%% capitol: masina
%% acopera: vedere.masina

The **Machine** panel (on the right, under the properties) sends the program to the machine over the USB cable and shows its
state.

- **Connect (USB)** lets you choose the machine’s port (GRBL, 115,200 baud). It works only in Chrome or Edge on a computer
  (Web Serial); otherwise, the panel says so. On the test instance there is also **Simulated machine**: a simulated GRBL
  controller, to try the panel without a CNC, with **Speed** 1×, 10× or 100×. **Disconnect** closes the port.
- **State** comes from the machine’s reports (5 times a second): Idle, Run, Hold:0 (stopped), Hold:1 (still braking), Alarm,
  and the position (the work position when known; otherwise the machine’s).
- **Program**: **Last export** loads exactly the file of the last Export G-code (the SHA-256 fingerprint matches the one in
  the export window); **File…** loads G-code from another program, checked first. A program is refused, with the line, if it
  has characters outside ASCII (on GRBL, “ș” and “ț” would change the spindle speed), Windows line endings (`\r`), lines over
  70 bytes, sets no work coordinate system (`G54`–`G59`) before its first move, changes the tool (`M6`) without being exported
  from here, or has no line end at the end. With one file per bit, **File of the last export** picks which one loads.
- **Start** sends the program line by line, as much as fits in the machine’s memory. The job shows its phase and line.
  **Pause** stops the motion (Hold), **Resume** continues it. A machine error on a line stops the job on hold and lists it;
  **Resume after the error** continues from the first line not yet sent. At a tool change (`M6`) or a pause in the program
  (`M0`), the job stops once the machine has finished its moves (at a tool change, with the spindle off); you jog, probe, set
  zero, then **Continue**. At a bit change, the job says which bit to mount (for example “mount T2 freza plata D3.000”); jog the
  bit up before probing: at safe Z it is below the top of the plate.
- **Stop** is the machine’s reset (Ctrl-X): it stops at once, and the job cannot be resumed (it starts again from the
  beginning). The same after an alarm or if the cable is lost. **Unlock ($X)** shows when the machine is in alarm.
- **Command** sends a line to the machine (for example `$G`, `$#`, `G0 X10`), only when no job is running; the reply shows in
  the **log**. `$` reads go only while the machine is at rest (otherwise GRBL refuses them).

The job is “done” only after the machine’s last reply and after it reports Idle: a pause does not end it.

**The machine’s errors and alarms.** When the machine answers with a code (`error:N`, a refused line; `ALARM:N`, the machine
stopped), its explanation appears under the state: what happened, where (the program line, the command, the jog, the probing)
and **What to do**, with the buttons that help: **Stop** (when the machine asks for a reset, “Reset to continue”), **Unlock
($X)**, **Resume** (after the safety door), **Go to the jog** and **Go to probing** (they take you to their buttons). **Got it**
hides the explanation until the next code; the error list and the log also show each code’s title.
- The explanation comes from your controller’s table, as it introduces itself when connecting: GRBL 1.1, grblHAL or FluidNC
  (until then, GRBL 1.1, written under the explanation). The same number means something else on each: `ALARM:10` is the second
  switch of a dual axis on GRBL, the emergency stop on grblHAL. A code the table does not have is shown as it is, with no guessed
  explanation.
- After an alarm that loses the position (a limit switch hit, a reset during a move, a failed homing), **Unlock** first asks for
  confirmation: the position is no longer certain, so home it (`$H`) or set the X, Y and Z zero again. **Unlock anyway** sends
  `$X`, **Cancel** sends nothing.
- The explanations work without a network too, after the app has loaded once.

**Positioning** (with the machine connected):
- **Work coordinates**: the machine’s active system (G54–G59), read from it; the work position is shown in it. If the loaded
  program cuts in another one, the panel says so and offers **Switch to** that one.
- **Jog**: the arrows move the bit by the chosen **Step** (0.1, 1, 10 or 100 mm) at the given **Feed**; the diagonals are a
  single straight move; Z+ and Z− on the right. **Stop the jog** shows while the machine is in Jog.
- **Zero XY** and **Zero Z** make the current position 0 in the loaded program’s system (otherwise the active one), named on
  the button. Below: where Z0 is for a program exported from here (the top of the material or the bottom, on the table) and
  the corner of the XY origin.
- **Z probe**: put the touch plate under the bit (on the material if Z0 is at the top; on the table if it is at the bottom),
  attach the clip and press **Probe Z**. The bit lowers until it touches the plate (at most the **Search distance**, at the
  **Search feed**), backs off 2 mm, touches again slowly, writes Z0 (the touch minus the **Plate thickness**) and lifts 5 mm.
  After probing, the machine is back in its previous mode (usually G90, in mm). With no touch, the machine goes into alarm
  (ALARM:5); if the bit was already touching the plate, ALARM:4: unlock ($X) and try again.
- What cannot be done now is disabled, with the reason next to it (“Not now: the machine is in alarm…”): in alarm, while a
  job or a procedure runs. Stopped at a tool change, jog, probing and Zero Z work, Zero XY does not.

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
- The app also works **offline** after the first load (the manual too). On the first visit, “Preparing offline use” appears at
  the bottom, with the percentage; once it is gone, the app works without a network too. When a new version is out, “Downloading
  the new version” appears first, with the percentage, then “New version ready”; it loads on your click, not in the middle of
  your work.
- **The error journal**: at the bottom, the chip says how many errors the browser's local journal holds. If something breaks,
  the app shows “Something went wrong”, with “Copy the report” (you can send it) and “Reload”.

## The step-by-step test
%% capitol: test
%% acopera: editare.sugestie

On the test instance, the app's address with `?test` at the end opens the drawing tools test in a floating panel that you
move by dragging its title and collapse with ▾. Each step says what you do
and what you should see; you mark **OK**, **No** or **Skipped** and can write a note. **Snapshot** saves the image of the
board (the drawing, the rulers, the guides, the handles, the toolpath) in the browser: nothing goes to a server. **Download
the report** writes a single HTML file with the results, the notes and the snapshots, to send on. The list at the top goes
to any step. The results stay after a reload too; **Start over** deletes them, after a confirmation.

Also on the test instance, the **Suggest** button in the bar extension, next to “?”
(its title: “Suggestion for the owner, with a picture of the sheet”), takes a picture of the sheet, keeps it in the browser
and opens the `/admin` page on the **Suggestions** tab, in a new tab. You sign in with
your staff account and write the suggestion, and the picture goes with it; before sending, you can remove it. If the
browser doesn't open the tab, a message gives you the link to it.

## Keyboard shortcuts
%% capitol: scurtaturi

| Key | What it does |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Ctrl+Shift+Y` | Redo |
| `Ctrl+D` | Duplicate |
| `Ctrl+Shift+G` | Ungroup |
| `Delete` | Delete selection |
| `Ctrl+K` | Search commands |
| `Home` | Show the whole sheet |
| `T` | Show toolpath |
| `V` `S` `N` `B` `R` `O` `E` `L` `P` `X` | the tools: Select, Transform, Nodes, Pen, Rectangle, Circle, Ellipse, Line, Polygon, Text (the key is also written in the button's corner) |
| `Shift+H`, `Shift+V` | Flip horizontally, Flip vertically |
| the arrow keys | move the selection 1 mm (Shift: 10 mm, Alt: 0.1 mm); in the 3D view, rotate the sheet |
| `Shift` + click, `Shift` + drag | add to the selection (on a click, a shape already chosen leaves it) |
| `Alt`, while dragging | inverts snapping |
| `Delete`, `Backspace` (with the Nodes tool and a node chosen) | removes the chosen node |
| `Enter` (with the Pen tool) | finishes the path you started |
| `Ctrl+Z`, `Ctrl+Y` (with the Pen tool and a path started) | undoes / redoes the last step of the path |
| `Ctrl+Shift+Z` (right after a path finished with the Pen) | reopens the path, with its steps |
| `Backspace`, `Delete` (with the Pen tool and a path started) | removes the last node placed |
| `Alt`, while you drag a handle (Nodes tool) | splits the node's handles; on split ones, joins them again |
| `Esc` | cancels the shape or path you started, lets go of the chosen node, goes back to Select, closes the 3D view and the windows |
| `F1` | the manual, at the current chapter |

On a Mac, `Ctrl` is `⌘`.
