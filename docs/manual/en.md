# CNC Vector Studio manual

## Getting started
%% capitol: pornire
%% acopera: vedere.paleta, vedere.lista, vedere.proprietati, vedere.proiectare, vedere.tema, editare.manual

CNC Vector Studio draws parts for a CNC router and writes the program (G-code) the machine cuts. You work on a **sheet** (the
board of material), put shapes on it, each with its own cutting **operation**, then export the G-code.

**The screen.** At the very top sits the **application menu**, in every window: the brand, the window tabs (**Design** and
**Machine**), the job indicator (with the machine connected, see [The machine](#masina)), then “Search commands”, the
language (RO / EN), the theme and the **Account** button. The pressed tab is the current window; the app reopens in it the
next time it starts. On a phone, the menu has two rows: the brand and the other buttons on top, the tabs and the job
indicator below; the open tab shows its name, the others only their icon.

In the **Design** window, the canvas fills the screen; floating above it are:
- the **top bar**: the drawing tools, Snap and Grid, Undo and Redo and, at its end, the files: import, “Export vectors”
  and “Export G-code”;
- the **bar extension** just below: alignment, mirroring, copying, offset, the boolean and the 3D view;
- on the left, the **On the sheet** panel: the sheet's shapes, with the part and operations of each; on the right, the
  **Properties** panel;
- at the bottom: what is selected, the cursor on the sheet (in mm, from the sheet's bottom-left corner), the zoom, the error
  journal, “Show toolpath” and “Show the whole sheet”.

Each panel folds and opens from the button in its corner (“Sheet list panel”, “Properties panel”). The “Theme” button cycles
through light, dark and as the system.

**Search commands** (`Ctrl+K`): the command palette. Type a few letters, pick with the arrow keys and press Enter; Esc closes
it. The palette lists every command, with its key; for the ones done with the mouse it says how.

The **Manual** opens from the **Account** menu in the top-right corner (the **Manual** row) or with `F1`. With F1 it opens
at the chapter for what you are
doing now (the chosen tool, the 3D view, the open window, the Machine). You can search the manual by words, with or without diacritics.

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
sheet's edges and centre, the other shapes and the grid; the alignment lines show what it snapped to. `Shift+L` turns it on
or off, also while dragging (the button shows the state). When you move a shape, a guide or a node, hold `Alt` while dragging
to invert it; on the handles and when drawing, `Alt` means “from the centre” (see [Transforms](#transformari)).

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
the dimension line (by how many mm it goes past). A project can have several sheets: see [Sheets](#foile).

## Sheets
%% capitol: foile
%% acopera: foaie.adauga, foaie.duplica, foaie.sterge, foaie.muta-sus, foaie.muta-jos, foaie.eticheta, selectie.muta-pe-foaie, vedere.foaia-anterioara, vedere.foaia-urmatoare, vedere.toate-foile, foaie.aseaza, selectie.muta-si-aseaza

A project can have several sheets of material: different boards (another material, another thickness) or parts that do not
fit on one. Each sheet has its own size, its own parts and, if you like, a name and a material.

**The active sheet.** You work on one sheet at a time, the active sheet: the canvas, the tools, the Properties panel, the
check, the toolpath, the time, the 3D view and the [export](#export) are all its own. The **On the sheet** panel shows all the
sheets, one below the other, with the size, the material and how many parts each has; the parts show only under the active
sheet. A click on a sheet's row makes it active (the selection is cleared); `PageUp` (**Previous sheet**) and `PageDown`
(**Next sheet**) go through the list. With several sheets, the bottom bar shows the active sheet and its place ("Sheet 2 · 2
of 3"). The app remembers the active sheet in the browser: when you open the project again, it starts on it.

**All sheets on the canvas.** The sheets sit on the canvas side by side, in the order of the list, 100 mm apart, each with its
name above it. The active one is live, with its rulers; the others are dimmed and cannot be edited. A **double click** on a
dimmed sheet makes it active, without the canvas jumping. The **All sheets on the canvas** button, at the bottom right (next to
"Show toolpath"), turns the dimmed sheets off and on: on, it frames them all; off, only the active sheet stays, framed. The
choice is remembered in the browser. `Home` frames the active sheet.

**New sheet.** The **+ New sheet** button, under the list, adds a sheet after the active one, with the same size and the same
material, and makes it active. A sheet without a name is called by its number ("Sheet 2"); the number stays when you move or
delete other sheets.

**The sheet menu** (the ⋯ button on its row, or a right click on the row):
- **Name, size and material…** makes the sheet active and opens the Properties panel, where you write the
  **Sheet name and material** (up to 200 characters; an empty field removes them) and its size. The material is a label
  ("white MDF 18"): it does not change the cutting.
- **Duplicate the sheet** makes a new sheet after it, with the same size, the same material and separate copies of its parts
  (like `Ctrl+D`).
- **Duplicate the sheet with the same parts** does the same, but with the same parts: see [Parts placed more than
  once](#piese-legate).
- **Move the sheet up** and **Move the sheet down** change the order of the sheets in the list.
- **Delete the sheet** removes it, with its parts; if it has parts, the menu asks first. The project's last sheet stays.

**Move to another sheet.** The chosen parts go to another sheet from the canvas [right-click menu](#meniu): **Move to** and the
sheet's name, or **Move to a new sheet**. Or drag a part's row from the list onto another sheet (if it is in the selection, the
whole selection goes). Each part keeps its place and rotation; if it goes past the new sheet, the usual warning shows. The
active sheet stays the same.

**Arrange on sheets.** **Arrange on sheets…** (from the canvas right-click menu or from the sheet menu) opens the
arranging window. You choose what is arranged (the chosen parts or all on the sheet), the starting corner (top left by
default), the sheet margin and the distance between parts, on X and on Y (with **Same on X and Y** ticked, a single
number). The parts are placed by the box of each one, with its rotation, row by row; the ones staying on the sheet are
avoided. Whatever no longer fits goes to the next sheet, if it is empty, then to new sheets, like the active sheet. A part
larger than the sheet stays where it is. No size changes. The distance is at least the cutter of the outside profile
(otherwise one part’s cut would run into its neighbour), and the window says the minimum. **Order**: as in the list
(default) or largest first. **Rotation**: none (default) or by 90°, lying down, only when more fit that way. Before
**Arrange**, the window says the result (“25 parts on 2 sheets: 15 + 10.”). The choices are remembered in the browser.

**Move and arrange at the end.** In the right-click menu, next to **Move to**, **Move and arrange at the end of** and the
sheet’s name moves the chosen parts onto it and arranges them after its parts, with the choices of the last arrangement;
**Move and arrange on a new sheet** arranges them on a new sheet, like the active one. Whatever does not fit goes, as
above, to the next sheets.

Each gesture (a new sheet, one deleted, moved or renamed, a move between sheets, an arrangement) is a single undo step
(`Ctrl+Z`).

## Parts placed more than once
%% capitol: piese-legate
%% acopera: piesa.inca, piesa.plus-unu, piesa.desprinde, foaie.duplica-legat

A part can be placed more than once: the same shape, with the same operations, in several places, on the same sheet or on
others. Each place is an instance of the part, with its own place and rotation; the shape and the operations belong to the
part, so a change to them shows on all of them.

**More and +1.** With a single part chosen, the Properties panel shows, under **Part**, how many times it is placed and on
which sheets. **More…** asks **How many in total** (more than now, at most 1,000) and shows, before you add them, where the
new ones go: on the part's row, to its right, then on rows below, from the sheet's margin (10 mm), going around the parts on
the sheet. At least 5 mm stay between parts, or the diameter of the largest cutter of the outside profiles, if larger.
Whatever does not fit goes to the next sheet, if it is empty, then to new sheets, like the part's sheet. **+1** places one
more after the last. `Ctrl+D` stays a separate copy, with its own part.

**How they show.** The row of a part placed more than once shows in the list, in violet, which one it is ("(3 of 12)"). While
one is chosen, a violet band at the bottom of the canvas says how many times the part is placed (with the text panel open, the panel says it): a change to the shape, the
nodes, the text, the scale, the mirroring, the skew or the operations is made for all of them. The place and the rotation stay
each one's own. Two chosen instances of the same part, rotated differently, would change differently on a non-uniform scale,
a mirror or a skew: then the change is refused, with the reason.

**Detach.** **Detach** (in the panel, or **Detach just this one**, from the band) gives each chosen instance a part of its own,
a copy, in the same place: from then on it changes on its own. The last instance keeps the part. [Ungrouping](#degrupare),
the [check](#verificare)'s repairs and [cutting the vectors](#taiere) do not change a part placed more than once: detach it
first. A deleted instance goes alone; the part goes with its last instance.

**Grouping.** With a part placed more than once among the chosen shapes, **Group** asks: **Just this one** (detaches it, then
groups) or **In all N** (the other shapes go into the part, so they show next to each of its instances; it works with a single
part of this kind among the chosen ones). The **Remember the choice** box keeps it in the browser: grouping no longer asks.
The right-click menu has both rows, **Group just this one** and **Group in the whole part**.

**Duplicate the sheet with the same parts**, from the sheet menu, makes a new sheet after it, with the same parts (new
instances, in the same places): a change to a part shows on both sheets. **Duplicate the sheet** makes, as before, separate
copies.

**Plates.** A field is written in the text of a part between braces: `{name}`, `Table {no}`. The part becomes a template: the
shape, the font and the size are its own, and each instance is a plate with its own values. With one chosen, the Properties
panel shows **On this plate**, with a row per field; a value written (`Enter`) makes the letters of the plate from the font of
the text (the font must be on this computer; otherwise the panel says why not). A field without a value stays empty. On the
sheet, when cutting and in the export, the plate has its own text; the list names it after it. The operations of the template
that cut its text (the outside profile, the inside one, the engraving) cut the letters of every plate the same way; the frame
and the holes stay the template's. **More…** and **+1** place copies with the same values. The text of the template is edited
with the Text tool, on any plate: **Apply** redoes the letters of all the plates, with their values (the panel says how many).
The cutting role and the scale of the part are changed for all of them. The letters of the template are not edited as nodes
and are not skewed: the plates would keep the old text (the reason says so). **Detach** on a plate (even a single one) gives it
a part of its own, with its ordinary text; grouping and ungrouping detach it the same way.

**From CSV.** On a part with a text (even a grouped one, with a frame), **From CSV…** (in the panel, under **Part**) makes one
plate per row of a table: a `.csv` or `.txt` file (**Choose the file…**), or cells pasted from Excel. The separator (`;`, `,`
or tab) and the encoding (UTF-8 or Windows-1250, as Excel saves in Romanian) are found automatically and can be changed; the
**The first row has the column names** box gives the column names. Each field takes the column with the same name (ignoring
capitals and diacritics: **matched automatically**) or, by choice, another column, **a value** written in, or **numbering**
(from, step, digits). A text without a field: choose in **The text of the part** the piece that changes from one plate to
another and press **Make the chosen text the field {Name}** (the name is the column's, or the one written in). **Rows from …
to** chooses the rows. Below them, where the plates go (“6 plates on 3 sheets: 2 + 2 + 2”), with the margin and spacing of
“Arrange on sheets” (**Change…**; the spacing is at least the outside profile's cutter). **Make the plates**: the first row on
the chosen plate, the others new plates, all arranged on sheets (as “Arrange on sheets”), in a single step. With the **Limited
by the box** box on the text, the panel says how many plates were shrunk and by how much.

**Text coming out of the plate.** The plate is the largest closed contour of the part, outside its texts (the frame, the edge
of the plate). When the text of a plate goes past it (a name too long, without a box), the plate is red in the list, the
bottom bar says so, and the panel says so under **On this plate**: shorten the text, make it smaller or put it in a box. In the
**From CSV…** window, **If the text comes out of the plate** chooses what happens: **warning** (by default) or **warning and
confirmation at export**; with the second, the export window shows the plates and **Export** starts only after the tick.

**The text of a frame.** On a template with a frame (the text grouped with other shapes), the Text tool chooses the text with a
click on its letters; **Apply** changes it and keeps the frame and its place on it, and the plates are redone.

Each gesture is a single undo step (`Ctrl+Z`).

## Drawing
%% capitol: desen
%% acopera: unealta.dreptunghi, unealta.cerc, unealta.elipsa, unealta.linie, unealta.poligon, document.deseneaza, document.adauga-dreptunghi, document.adauga-cerc

The drawing tools are in the top bar; each has a key. Pick the tool, then drag on the canvas. **Draw** makes a new shape, with
its default operation; the tool stays chosen for the next shape.

| Tool | Key | How to drag | With Shift | With Ctrl | With Alt |
|---|---|---|---|---|---|
| Rectangle | `R` | corner to corner | square | as with no key | from the centre |
| Circle | `O` | from the centre; the drag gives the radius | — | ellipse, with the cursor at the corner of its box | — (starts from the centre anyway) |
| Ellipse | `E` | corner to corner | circle | as with no key | from the centre |
| Line | `L` | end to end | 15° steps | — | from the middle |
| Polygon | `P` | from the centre (a regular polygon) | 15° steps | stretched: the vertices on the ellipse of the box, the first at the top | — |

- The keys can be held together (Alt + Shift: a square or a circle from the centre); with Shift and Ctrl, Shift wins. They
  can also be pressed while dragging, with the mouse still. Next to the cursor, the label shows the shape's size and what the
  keys do. On a Mac, `Ctrl` is `⌘`. In the bottom bar, the **keys row** says what Shift, Ctrl and Alt do with the chosen
  tool; a held key is filled.
- With **Circle**, a click without dragging places a circle with the radius from the field next to the tool; a drag writes
  its radius in the field. The list next to the radius chooses where the circle starts: **Circle: from the centre** (the
  default, as in the table) or **Circle: from a corner**: the circle of the dragged box, like the ellipse with Shift; with Alt,
  from the centre (the cursor at the corner of the box), with Ctrl, an ellipse. The list is kept in the browser.
- The **stretched** polygon (Ctrl) is no longer regular: the panel shows it as a path, without sides and radius.
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
%% acopera: unealta.text, document.text, editare.text.fonturi, editare.text.aldin, editare.text.cursiv, editare.text.vertical, editare.text.caseta, editare.text.unitate, editare.text.proportii.latime, editare.text.proportii.inaltime, editare.text.crenare, editare.text.spatieri

The **Text** tool (`X`; `T` is “Show toolpath”) writes text to cut. With it chosen:
- a **click on the sheet** puts the anchor (a cross): there the baseline of the first line starts (left aligned), has its
  middle (centred) or its end (right aligned);
- a **click near a shape's outline** (a circle, an arc, a curve, a rectangle) puts the anchor on the outline, at the
  nearest point, and the text **follows the curve** (below);
- a **click on a text** chooses it, to edit it.

In the tool's panel you type the text (Enter: new line) and choose:
- the **font**: the **included** ones (Roboto, Droid Serif and Relief SingleLine, a single-line engraving font), **My
  fonts** (loaded by you or downloaded from Google Fonts) and, once you allow access, the **system fonts**; below the fields
  you see the text as it will be cut;
- the **capital height**, with the **size unit** beside it: in mm (at “20 mm”, H, N or E are exactly 20 mm tall; round
  letters, like O or C, go slightly over the line, as in any font), in inches (still the capitals: 1 in is 25.4 mm) or
  in pt, where the number is the **font size**, as in Word or CorelDRAW (72 pt = a 1 inch em; below the field, the panel
  says which capitals it gives, for example 18.06 mm in Roboto). Changing the unit doesn’t change the text: the number is
  converted;
- the **letter width** and the **letter height**, in percent (100 %: the font’s letters): at 70 % width the text gets
  narrow, with the same capitals; at another height, the cut capitals show below the fields, for example 30 mm at 20 mm
  and 150 %;
- **font kerning**: on, pairs like “AV” or “Te” close up after the font’s table; off, each letter sits at its own
  advance (vertical text doesn’t use it);
- the **space between letters** (in mm; negative, tighter), the **distance between lines** (a multiple of the font's line)
  and the **alignment** to the anchor;
- **between selected letters**, right under the text: select some letters in the text (with the mouse or Shift + arrows)
  and change the space between them, all at once, in the field (mm; negative, tighter), with − / + or with `Alt+←` /
  `Alt+→` right in the text (0.1 mm); with the cursor between two letters, only that pair. The field is empty when the
  chosen spaces differ. The space adds to the space between letters (on a curve, along it; in vertical text, between the
  letters of the column) and stays on its letters while you type elsewhere in the text; **Clear letter spacing** removes all
  of them;
- **Bold** and **Italic**, for any font, even without its own bold or slanted faces, **Vertical**, letters one under
  another, and **Box**, the text fitted into a width and a height (below).

**Bold** thickens the letters: ticked, it asks for the **Thickening on each side** (mm; it suggests 3 % of the height, for
example 0.6 at 20 mm; at most a fifth of the height). Each stroke grows by twice that, small holes shrink (they may close)
and close parts of a letter (the comma of ș, the dot of i) may join. The height stays the one you asked for: a 20 mm H is
still 20 mm, with its outer corners rounded by the thickening, and the space between letters stays the same. Bold letters
are cut from lines and arcs, within 0.001 mm of the exact shape. **Italic** slants the letters: ticked, it asks for the
**Slant** (°; it suggests 12°; negative, to the left; at most 45°), each letter about its own baseline, exactly. With both,
the letters are slanted first and thickened after, so the strokes thicken the same in every direction. The text keeps its
bold and italic: it reopens with them, and uniform scaling grows the thickening too.

The letter width and height scale the letters before any other step: the space between letters, the bold and the
distance from a curve stay in mm, and italic slants the already scaled letter. Dragged with the handles in width only (or
in height only), a straight text without bold stays text: its letter width changes (and its size, when you drag in
height). A text on a curve or a bold one becomes vectors (the arcs of the bold, curves), and the handles’ label says so;
uniform scaling grows them all.

**Vertical** puts the letters one under another, upright: each line becomes a column, and the columns go from left to
right, at the **distance between columns** (as a multiple of the font's line). Each letter is centred on the column's axis,
and two neighbouring letters keep the same gap: what the font's em leaves under a capital (between two capitals, the step is
exactly one em), plus the **space between letters**. The breve of Ă or the comma of Ș get their room, so the letters do not
touch; a space takes the place of a capital. The **alignment** becomes **Top** (the column starts at the anchor and goes
down), **Middle** or **Bottom** (the column ends at the anchor). Vertical text stays straight: put on a curve, it does not
follow it. Bold, italic and single-line fonts work the same, and the text reopens vertical.

**Box** fits the text: **Limited by the box** keeps the capital height you wrote and shrinks it only as much as needed to
fit; **Scaled to the box** makes the text as large as fits, and the box gives the height (its field is off). What fits is
the cut letters (not the space around them), in the **Box width** and **Box height** (mm); the space between letters and
the bold stay as you wrote them, in mm. Under the fields, the panel says the height that fitted and the size of the text; if
the text does not fit even at the smallest height (for example, with too large a space between letters), it says so and
does not put it on the sheet. The box does not move the text: it still starts at the anchor. Text in a box stays straight
(it does not follow a curve), it can be vertical, and uniform scaling grows the box too.

**Single-line fonts** (engraving, “stick” fonts) have no filled letters, only strokes: the cutter goes once along each line.
Relief SingleLine is included; one you load into My fonts (TTF, OTF or an SVG font, the format of the Hershey and EMS
engraving fonts) is recognised on its own, whether it writes its strokes there and back or open, like the fonts made for CAD
and the SVG ones. With such a font, the preview shows the lines, **Bold** is off (a stroke
has nothing to thicken; **Italic** works), and the text put on the sheet is made of open lines (a closed loop stays a loop),
engraved on the line at the depth of imported lines (1 mm, at most half the sheet thickness, in one pass). You change the
cutter and the depth in the export window, with a V cutter for example.

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
- **My fonts**: **Load fonts…** takes TTF, OTF (CFF outlines too, like Adobe fonts), TTC (all the faces), WOFF and SVG
  fonts (the engraving ones, Hershey or EMS); the fonts stay in this browser, work offline and go nowhere. A variable font (like Roboto Flex) gives one row for each of its
  named styles (Thin, Bold, Bold Italic…), as separate faces. **Use** chooses the font in the panel, **Delete** removes it (a
  text made with it stays, it just cannot be edited here until you load the font again);
- **Google Fonts**: you search a family (by name, by category, only with the Romanian diacritics), choose the style and
  **Download**: the font comes once and goes into My fonts. On another computer, a text in a Google font asks for it again
  in one click (**Download again**);
- **System fonts**: **Allow access to the system fonts** (Chrome and Edge, on a computer) puts the installed fonts in the
  panel's list and in the window, with a search, each one's sample and **Use**. They are copied nowhere: the text can be
  edited only where the font is installed.

The height in mm is measured on the font's letter **H** (its top is at “20 mm”); a font without an H uses the capital height
written in it. A variable font (like Bahnschrift) is cut in the chosen style (SemiBold, Condensed…), with its outlines,
widths and kerning; the text keeps the style and reopens with it. A WOFF2 is loaded after converting it to TTF or OTF.

The text stays editable after saving too, as long as its outlines are not changed some other way: moving, rotating,
mirroring and uniform scaling keep it (scaling also grows the height in the panel), and so does scaling a straight text
without bold on one axis; scaling a text on a curve or a bold one on one axis, a skew or a node edit turn it into ordinary
vectors. **Ungroup** takes it apart into letters, as vectors. Ș and Ț are written with a comma
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

The **Transform** tool (`S`) shows the handles on the selection's box and transforms the shape exactly (arcs stay arcs while
the scaling is proportional):
- the **corners** scale proportionally, with the opposite corner fixed; the **sides** scale on one axis, with the opposite
  side fixed;
- **Shift**: proportional on any handle (on a side too: the other axis grows by the same factor, symmetric about the middle);
- **Ctrl** (`⌘` on a Mac): free on any handle (on a corner too, each axis with its own drag);
- **Alt**: about the **anchor** (the centre of the box by default): the anchor stays put, not the opposite handle;
- the keys can be held together (Alt + Shift: proportional about the anchor; Alt + Ctrl: free about the anchor); with Shift
  and Ctrl, Shift wins. They can also be pressed while dragging, with the mouse still;
- the **round handle above** rotates around the anchor; with Shift, in 15° steps.

The **anchor** is the fixed point of the transforms: rotation is around it, Alt scales about it, mirroring and skewing use it.
On the canvas it is the blue target, a circle with a cross. It starts from one of the 9 points of the box (the corners, the
middles of the sides, the centre), chosen in the **picker** next to the tool and kept in the browser. You drag it by hand
anywhere, outside the box too: it snaps to the 9 points of the box and to the targets (`Alt` inverts snapping); a
**double-click** on it brings it back to the chosen point. When the anchor sits on a handle (a corner chosen in the picker),
the handle wins, and you move the anchor from the picker. It goes with the selection when you move it or scale it from
another handle; after a rotation, an Alt scaling, a mirroring or a skew around it, it stays put. A new selection brings it
back to the chosen point; the anchor is not saved in the project. In the properties panel, the **Transform anchor** row shows
where it is, with X / Y: written there, they move the anchor, not the shapes.

The **What Alt holds fixed** list, next to the picker, kept in the browser: **Alt: anchor** (the default) or **Alt: centre**:
then Alt scales about the centre of the box, wherever the anchor is, and rotation is about the centre too (the anchor stays
for mirroring and skewing).

While you drag, the label above shows the size and what the keys do (for example “50 × 40 mm · one axis · from the opposite
side”), and a blue dot shows what stays put. The handles snap to guides, the sheet, the other shapes and the grid, only on the
axis they scale, while snapping is on (`Shift+L` toggles it). A **circle** scaled on one axis becomes an **ellipse**: the same
ellipse as one drawn with the Ellipse tool, with its radii editable in the panel. The arcs of a path (the corners of an offset,
imported arcs) scaled on one axis become **curves**, within 0.001 mm of the stretched arc; the label says “arcs become
curves”, and `Ctrl+Z` brings them back.

The **rounded corners** of a rectangle follow the list next to the anchor picker, kept in the browser:
- **Corners: keep on stretch** (the default): dragged on one axis, the radius stays the same and the rectangle
  stays a rectangle, with its radius editable in the panel; scaled proportionally, the radius grows with the shape;
- **Corners: always keep**: the radius stays with proportional scaling too;
- **Corners: scale**: the radius always grows with the shape; dragged on one axis, the corners become quarter ellipses, made
  of curves (the shape becomes a path).

A corner that no longer fits in the scaled side (for example R 10 in a 15 mm side) is refused, with the reason. A shape
**rotated at an angle** (other than 90°), dragged on one axis, is scaled in the sheet's axes through the geometry, like
skewing: it becomes a path (a rotated rectangle comes out a parallelogram), arcs become curves, and its place and rotation
stay; the label says “shapes rotated at an angle become paths”. Changing a part used by other shapes too stays refused, with
the reason. In the bottom bar, the **keys row** says what Shift, Ctrl and Alt do with Transform; a held key is filled.

**Mirroring** is in the bar extension: **Flip horizontally** (`Shift+H`, left ↔ right) and **Flip vertically** (`Shift+V`,
top ↔ bottom), about the anchor (the centre of the selection's box by default). The mirror image is what gets cut, with the
same cutting direction.

**Skew** (next to mirroring, the button with a square and its parallelogram) opens a panel with two angles, in degrees,
between −75° and 75° (empty = 0): **Horizontal** moves points to the right the higher they are (a negative angle, to the
left), then **Vertical** raises them the further right they are, about the anchor (the centre of the selection box by
default). The area stays the
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

Ungrouping is refused, with the reason shown next to the buttons (also on `Ctrl+Shift+G`), if a **V-carve** cuts its outlines
together (letters with their holes: apart, the holes would be cut too), if the part is placed more than once (detach it first,
see [Parts placed more than once](#piese-legate)), or if none of the chosen shapes is a group.

## Grouping
%% capitol: grupare
%% acopera: document.grupeaza

**Group** (the button next to Ungroup, the right-click menu, `Ctrl+G`) makes the chosen shapes, at least two, a single part: it
is chosen, moved, rotated and aligned as one block, so its shapes no longer pile up when aligned. A part that was already a
group (an import, a text, a shape with holes) goes in whole, as one level of the new group; **Ungroup** takes apart only that
level.

Each shape stays exactly where it was and keeps its operation (the side, the depth, the cutter): **what is cut stays the
same**. The group takes the place of the first chosen shape in the cutting order; if other shapes stood between the chosen
ones, they are cut, in the same class, after the group. Inside a group, a text is only vectors; after ungrouping, it can be
edited again. After grouping, the group is chosen, and a single `Ctrl+Z` undoes the grouping, with each shape back in its
place.

Two texts (or shapes) each with a **V-carve** with the same values can be grouped: the cutter carves them in one go, and each
letter comes out the same. Grouping is refused, with the reason shown next to the buttons (also on `Ctrl+G`), if a single shape
is chosen, if two shapes with the same V-carve touch or overlap (grouped, they would be carved as a single region, and the
overlap would be left uncut). With a part placed more than once among the chosen ones, grouping asks first: see [Parts placed
more than once](#piese-legate).

## The right-click menu
%% capitol: meniu
%% acopera: editare.meniu

A right click on the canvas opens the **right-click menu**, with what can be done to the selection: **Group** and **Ungroup**, then **Unite**,
**Subtract** and **Intersect** (the boolean), then **Duplicate** and **Delete selection**, each with its key. On a shape that is
not chosen, the right click chooses it first; on empty space, the selection stays. A row is active only when it can run (the
boolean with two shapes, grouping with at least two, ungrouping with a group chosen); a refusal shows its reason in the menu.
With several sheets, at the end: **Move to** each other sheet and **Move to a new sheet** (see [Sheets](#foile)).

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
  curve) and removes the other; another click moves the curve to the other side;
- **Split**: cuts the shape right at the chosen node, like the [knife's scissors](#cutit): a closed path opens there, an open
  one becomes two shapes (the first stays chosen). The end of an open path is not split.

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
%% acopera: editare.aliniere, editare.aliniere-bloc, document.muta-instantele, aliniaza.stanga, aliniaza.centru-x, aliniaza.dreapta, aliniaza.sus, aliniaza.centru-y, aliniaza.jos, aliniaza.centru-foaie, aliniaza.distribuie-x, aliniaza.distribuie-y

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

The **As a block** toggle (the first button after the one that folds the section) moves the chosen shapes together, against
the sheet: their common box is aligned to the sheet's edge or middle, and their arrangement stays, so they don't end up on
top of each other. Without it, each shape is aligned to the common box, and they may overlap. The toggle is kept in the
browser, like Snap; distributing and centring on the sheet work the same with it or without. To have some shapes always
move together, group them (see [Grouping](#grupare)).
Each alignment can be undone with `Ctrl+Z`.

## Importing SVG, DXF, PDF, AI, EPS, WMF and images
%% capitol: import
%% acopera: import.svg, document.importa

The **Import SVG / DXF / PDF / AI / EPS / WMF / image** button in the top bar (the first of the files, next to “Export vectors” and
“Export G-code”) opens the file window (you can pick several). Or drag the files straight onto the canvas: each one lands
centred where you drop it.

For each file a window opens that shows the drawing's size and how it will be cut:
- **closed outlines**: the outer ones on the outside, the holes in them on the inside (from nesting);
- **open paths**: on the line, a groove of at most 1 mm (half the sheet, if it is thinner), in one pass; the line width in the
  file does not matter, the groove has the cutter's diameter;
- for an SVG, **what a px means**: 1/96 inch (the CSS standard, Inkscape) or 1/72 inch (Illustrator); a file written by
  Illustrator is recognised;
- for a DXF, **the units**: the ones the file declares are used as they are; a file that declares none (an R12, for example)
  is read in mm, and the window lets you choose mm, cm, m, inch or foot (the drawing's size changes at once);
- for a WMF without a placeable header, **the unit**: 1/96 inch (px, as in LibreOffice), 1/1440 inch (twip), 0.01 mm, 0.1 mm
  or mm (see below);
- for a PDF with several pages, **the page** to import (see below);
- for an image, **the tracing**: how the drawing's pixels become outlines (see below);
- what is not imported or is read differently, with their count (for an SVG: texts, `<use>` clones, images, hidden shapes).

**Import** puts the drawing on the sheet as a single shape, selected; **Skip** moves on to the next file; **Cancel** and
**Cancel all** close the window. SVG, DXF, PDF, AI, EPS and WMF files are imported, and so are PNG, JPEG, WebP, GIF and BMP
images, up to 16 MB, not compressed (no `.svgz`). Text has to be converted to outlines in the drawing program before export.

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

A **WMF** (the Windows metafile: old clipart, exports from CorelDRAW, Office or AutoCAD) is read like this:
- with the placeable header (almost every WMF on disk), the drawing lands on the sheet where it is in its frame: the frame's
  lower left corner is the sheet's corner, and the size comes from the header (the units per inch, shown in the window);
- without the header, the file does not state its size: the window lets you choose the unit (1/96 inch by default, as
  LibreOffice shows it), and the drawing lands in the sheet's corner; a file drawn in a metric mode (in 0.01 mm, for example)
  states its units by itself;
- polylines, polygons (also those with several outlines), rectangles, rounded rectangles, ellipses, arcs (also those closed
  by a chord or by two radii) and lines drawn from point to point come in as Windows draws them, with the file's window,
  viewport and mapping mode: a circle stays a circle, ellipses become Bézier curves;
- a shape filled by the “winding” rule is redrawn as for SVG; an invisible one (no outline and no fill) is skipped;
- skipped, and counted: texts, images and raster operations, painted regions, unknown records; clipping is not applied;
- a WMF has no Bézier curves: a circle a program drew freehand becomes a polygon, and is imported as one;
- an EMF (the 32-bit metafile) is refused: save it as WMF, SVG or PDF.

An **image** (PNG, JPEG, WebP, GIF or BMP: a logo, a scanned drawing, a signature) is **traced**: the application finds the
drawing's edge and writes it as vectors, in black and white. The window widens, with the settings on the left and the
preview on the right:
- **Source**: what counts as drawing. **Chosen automatically** takes **Transparency** for an image with a transparent
  background (the drawing is everything that is not transparent, whatever its colour) and **Brightness** for an opaque one
  (the background has the colour of the image's edge); the line under the list says which it chose;
- **Result** (with Transparency and Brightness): **Outlines** (the drawing's edge) or **Centre lines** (the middle of each
  stroke, cut on the line: see below);
- **Threshold**: where the drawing separates from the background. **Automatic** picks it from the image, between its two
  tones; without it, the slider moves it;
- **Invert**: the background becomes the drawing and the other way round (for example, white text on a black plate);
- **Lighting** (with Brightness): **Even** (the default) uses one threshold for the whole image, for a clean scan or a logo;
  **Uneven** compares the paper with a smooth surface fitted on it, for a photo lit from one side, with dark corners or solid
  patches; **With shadows** compares it with the background around each point, for the shadow of a phone or a hand (a solid
  patch wider than a twelfth of the image comes out hollow: then use Uneven). With both, the drawing is whatever stands out
  from the paper, whatever the image's edge is (a sheet photographed on a table); if it still comes out inverted, use
  **Invert**. When the paper varies a lot under Even, the report suggests Uneven;
- **Smoothness**: **Faithful** follows the edge closely and keeps small corners, **Balanced** smooths the pixel steps,
  **Smooth** rounds small corners and gives fewer nodes;
- **Ignore specks under** and **Fill holes under** (in mm, with the pixels beside them): specks of drawing and holes in it
  smaller than that disappear (the dust of a scan, the noise of a photo); a shape touching the image's edge stays;
- **Ignore what touches the edge**: a piece of drawing touching the edge of the image (or of the area) is removed, however
  large: the table around a photographed sheet, a letter cut by the area; the report counts them. It works on colours too;
- **Width (mm)**: the drawing's size on the sheet. Left empty, the size comes from the DPI written in the file, and without
  it from 96 px per inch, as for an SVG; the line under it shows the height, the pixel's size and where the scale comes from.

The preview shows the **Image**, the **Vectors** or **Both** (with **Fade the image**, so the vectors show over it); the wheel
zooms around the mouse, dragging moves the image, **Zoom in** and **Zoom out** do the same from buttons, and **Fit** shows the
whole image. **Area** picks only part of it: while the button is pressed, dragging on the preview draws the
rectangle, moves it or stretches it by its sides and corners (Shift + drag draws it without the button), and **Whole image**
removes it. Only the area is traced, as if it were the image: the automatic threshold and the lighting no longer see what
is outside it, its bottom-left corner lands on the sheet's corner, and **Width** is its width. Under the preview is the
report: the **largest deviation** of the vectors from the edge in the image (in mm and in
pixels, measured on every outline), the image's size, how many specks and holes were cleaned up, and whether the edges were
hard (no shades: then the pixel steps are smoothed). Every change traces the image again, on the side: the window stays
responsive, and a new change stops the one under way.

With **Source: Colours**, the image is traced by colour: each colour becomes a shape of its own, and two neighbouring
colours share exactly the same edge (no strip and no overlap between them), so you can carve them at different depths or
inlay them. The threshold and **Invert** are hidden; the other settings stay. Then:
- **Number of colours**: **Automatic** finds the image's distinct colours by itself (the shading of a surface stays one
  colour, and a small but clear colour, such as a thin line, keeps its own); without it, the slider picks from 2 to 16. A
  new number makes the colours again, without the earlier links and ticks;
- **the swatches**: each colour, with its share of the drawing and the **Trace** tick. On an opaque image, the colour of
  the image's edge is the **background**, unticked (you can tick it); on a transparent one, transparency is not a colour;
- **linking**: drag a swatch onto another and the two become one colour (for example, a letter's shadow and the letter);
  **Link to…** does the same from the keyboard, and a linked swatch has **Unlink**;
- the mouse over a swatch shows its region in the preview; the **Image** here is the image painted in the colours found.

**Import** adds one shape per ticked colour, all aligned as in the image, in a single step (one Ctrl+Z removes them all);
each one's name has its colour (for example “logo #0c619c”). You then pick each one's role (pocket, V-carve, inlay) in the
panel.

With **Result: Centre lines**, each stroke becomes its middle line, not its outline: handwriting, a signature, a line
drawing. A line ends at the centre of the stroke's round end (where a cutter as wide as the stroke stops); where strokes
meet, the lines meet at one point, and those that carry on (the bar of a T, an X, a loop that crosses itself) stay one
line; an O or a ring becomes a loop. A filled blob gives its middle line (a long rectangle, a line; a disc, only a dot):
dots, that is strokes shorter than their width, have no line, and the report counts them. The report also gives the
**usual stroke width**, in mm, and, if the sheet has a single cutter, how it compares with the stroke: wider (the
engraving would eat into its surroundings), narrower (it would come out thinner) or as wide. **Show the width** draws,
under the lines, the band a cutter as wide as the stroke would cut. **Import** adds the lines as one shape, all cut on the
line (the loops too), like the open paths of an SVG.

Under **Result: Centre lines** sit their options:
- **Line ends:** **Centre of the end** (the default) or **Tip of the stroke**: the line runs to the stroke's edge, for a
  V-bit that has to reach the tip;
- **Wide parts:** **Centre lines** (the default: a filled blob gives its middle line) or **Outlines**: parts wider than the
  threshold stay closed outlines, cut on the outside (their holes on the inside), and the lines that reach them stop on
  their outline, with no bridge; **Wider than**: **Automatic** (twice the usual stroke width) or a value in mm;
- **Show the wide parts** (on by default): the preview colours them and the report says how many there are and what share
  of the ink, so you see that the drawing has filled parts before you import;
- **Loops:** **On the line** (the default) or **Closed vectors**: an O or a ring becomes a closed outline, cut on the
  outside, and a loop inside another one, on the inside.

The traced drawing comes in as one shape, with the image (or the area) as its page: the image's bottom-left corner is the
sheet's corner.
Outer outlines are cut on the outside, holes on the inside, from each outline's direction. For now:
- centre lines by colour and straightened scans come later;
- an image over 16 megapixels is reduced first (the report says so); one with over 20,000 outlines is refused, with their
  number, as is a tracing that takes over 30 seconds: raise **Ignore specks under** or move the threshold;
- a photo is read turned the way the phone shows it (the orientation stored in the file);
- TIFF is not read yet (save the image as PNG), and images inside PDFs and SVGs are skipped, as before.

## Cutting vectors
%% capitol: taiere
%% acopera: editare.taiere, document.taie

**Cut** (the scissors button, after the booleans and ungrouping, in the toolbar extension) divides the chosen shapes,
**Cut with**:
- **Vertical line X =** or **Horizontal line Y =**, the position in sheet millimetres (it starts in the middle of the chosen
  shapes);
- **The line through a point, at an angle**: the point (X, Y, in sheet millimetres) and the angle (0° is horizontal, 90°
  vertical), exact too;
- **Guide**: one of the sheet guides, dragged from the ruler;
- **The last chosen shape (Shift + click)**: the knife is one of your shapes. Choose the shapes to cut, then, last, the
  knife, with Shift + click; the knife stays unchanged, and with **and delete it after the cut** it goes in the same step as
  the cut.

While the panel is open, the line shows on the canvas, dotted. **Cut** turns each shape the line crosses into two shapes:
what is on one side of the line and what is on the other, each chosen after the cut, in its place. A shape the line does not
cross stays as it is. The cut is exact: an arc is cut into two arcs of the same circle, a curve stays on its curve, and the
nodes the line does not touch stay unchanged. Only a crossing cuts: a circle tangent to the line or a corner that only
touches it is not cut.

A closed knife (a circle, a rectangle) leaves two shapes from each shape: what is inside it and what is outside it. A closed
knife lying wholly inside a shape, without touching its edge (a text on a plate), cuts it too, with **Close the
pieces**: the letters come out of the plate, and the plate keeps their holes. An open
knife (a polyline, a curve) makes each piece a shape; the contours it does not cross stay together, and an uncut hole goes
with the piece it lies in. The knife cuts where it crosses the shape and where its end enters the shape through a side; a
knife that only touches the shape does not cut it.

**Close the pieces** (ticked by default; the app remembers the choice): each side of a closed shape is closed along the
cut: with a straight line, for the line and the guide, or along the knife, with its nodes. A shape with holes is read as a
region: a ring cut in two gives two closed “U” shapes. Unticked, the pieces stay open: a circle cut through its centre gives
two half circles, one arc each. Ticked, a knife that stops inside a shape or crosses itself inside it cannot be used (the
panel says why): extend it (or choose “until they leave the shape”, below) or cut without the tick.

**Extend the ends** (only for an open shape knife; the lines are whole already): **no** (the default); **until they leave the
shape**: an end stopped inside a shape to cut goes on along its tangent (the line, the arc or the curve at the end) until it
leaves the shape, and the shapes it enters that way, so that the cut goes right through; **whole line**: the ends go on along
the tangent past all the shapes to cut (for a straight line, the line without ends).

**Keep**: **both parts** (the default), the **left** or the **right** of the cut, relative to its direction: for the
vertical line, left is the smaller x; for the horizontal one, the parts are called **above** and **below**; for the line at
an angle, the left of the direction the angle gives; for an open shape knife, of the direction it was drawn in; for a closed
one, **inside** or **outside**. The other part of the cut shapes goes in the same step; a shape the cut does not touch
stays, even on the other side. The app remembers the choices, the same in the [Knife](#cutit) bar.

**Between pieces** (it needs **Close the pieces**): **nothing** (the default), a **gap** or an **overlap**, of the given
**width** (in mm, 3 by default, from 0.01 to 1 000), centred on the cut. Each part is cut with the cut moved by half the
width: for a gap, towards it, so an empty strip stays between the pieces, like the cut of a saw blade (the 100 × 100 square
cut at X = 50 with a gap of 6 gives two rectangles of 47 × 100); for an overlap, towards the other one, so the pieces
overlap over the whole width (53 × 100 each). For an open shape knife, the moved cut is its path moved in parallel (the
corners come out rounded on the outer side); for a closed one, the inside shrinks and the outside grows. While the panel is
open, the strip shows on the canvas, with two lines dotted more sparsely. Only the shapes the cut goes through are cut: one
next to it stays, even if the strip would touch it. A gap that would eat a whole piece on the kept side (a strip narrower
than it, an island inside the strip) is not made, and the panel says why; a hole inside the strip goes with it. Neither can
a knife that cannot be moved (it breaks in a curve tighter than half the width) be used.

**Joint** (it needs **Close the pieces**; only on straight cuts: the lines of the panel, the guide and the Line kind of the
[Knife](#cutit)): the new edge of the pieces follows a pattern, so that they hold each other: **straight** (the default, no
pattern), **zigzag**, **wave**, **square teeth**, **dovetail** or **puzzle**, with the **pitch** (the length of a tooth, 40
mm by default), the **height** (from the bottom tip to the top one, 20 mm by default) and the **radius** of the corners (3
mm by default; 0 leaves the corners sharp). On each stretch of the cut that goes through a shape, the whole teeth stay in
the middle, and at each end a straight margin of at least half a pitch stays, so no tooth is cut by the edge of the shape:
the 100 × 100 square cut at X = 50 in a zigzag with a pitch of 20 and a height of 10 has four teeth, with 10 mm straight at
each end, and each piece is 55 × 100. Each corner belongs to both pieces (hollow in one, bulging in the other), so it is
rounded with the given radius, for a cutter of that radius to cut both; the wave and the puzzle are made of arcs, and their
arcs must have at least the given radius. The dovetail has its sides slanted 1 : 6, and the puzzle, its head wider than its
neck (as long as the height is over four radii): both hold the pieces together along the cut as well. The patterns are
symmetric about their middle, so the two pieces of a symmetric shape have the same area. With **Between pieces**, the teeth
are cut with the given gap between them (the clearance, so that the pieces fit into each other) or with the given overlap.
While the panel is open, the teeth show on the canvas, on the chosen shapes, instead of the strip. Not made, and the panel
says why: a cut where no tooth fits, a pattern that does not work with the given sizes (a rounding that does not fit in a
tooth, a radius of the wave or of the puzzle below the given one) and teeth that would touch the edge of a shape (a slanted
side or a hole too close to the cut).

**Cut into panels** (a block of the panel): a sign bigger than the machine bed is cut into panels, which then fit together.
The chosen shapes (with nothing chosen, all the shapes on the sheet) are cut on a grid over their box: with the **Panel
size**, width × height in mm (by default, the sheet's material), or with the **Number of panels**, across × up. With the
size, the **Panels** are **equal** (the default: the fewest that fit, all the same size) or **from the corner** (full panels
from the bottom-left corner, plus what is left): a 2 400 × 1 000 mm sign with a 1 200 × 900 panel gives four panels of 1 200
× 500, or two of 1 200 × 900 and two of 1 200 × 100. Under the fields, the panel says how many panels come out, and while
you work in the block, the grid shows on the canvas. The cuts are those of the panel's lines, with **Close the pieces**,
**Between pieces** and the **Joint** above: the teeth hold the panels together, and the clearance lets them slide into each
other. The pieces of each panel become a group, **Panel 1**, **Panel 2** … (row by row, from the bottom, from the left), and
stay where they were; a panel with a single piece is that piece, with the panel's name, and an empty cell of the grid gets
no number. A text with its letters on both sides of a line that does not touch them is split too, each letter in its panel.
More than 100 panels are not cut; neither is a shape placed more than once on the sheet. **Cut into panels** is a single
undo step.

**Clip to the last chosen shape**: the boundary is the shape chosen last (with Shift + click), closed, and it stays. **Keep**
**inside** or **outside**: each chosen shape keeps only what is on the chosen side, and one with nothing there goes.
**Shapes crossing the boundary** are cut (the default), are deleted or stay whole. With **Close the pieces**, a closed shape
that is cut stays closed along the boundary: a rectangle clipped to a circle becomes their common part; unticked, only its
pieces inside remain, open. **Clip** is a single undo step too.

**Cut at intersections** (the button at the bottom of the panel, or from the right-click menu) cuts the chosen shapes by
each other, at all their common points: where they cross, where they touch and at the ends of a shared side. Each piece
becomes a shape, chosen, so you can delete the one you do not need. A shape that crosses itself is not split from here
(that is the checking's job), and a closed contour with a single common point stays whole.

The pieces keep their cutting role: a square cut on the outside gives two rectangles that are also cut on the outside. An
open piece of a closed shape is cut on the same side of the bit (outside or inside, following the drawing direction). A
pocket, a V-carve and drilling need a closed shape, so they leave the open pieces, and the panel says how many. A shape
placed several times on the sheet is not cut from here. Each cut (**Cut vectors**, from the panel) is a single undo step
(Ctrl+Z).

## The Knife tool
%% capitol: cutit
%% acopera: unealta.cutit

The **Knife** tool (`K`, after Nodes) cuts the shapes it crosses, right on the canvas. It cuts the chosen shapes; with nothing
chosen, all the shapes of the sheet. The drawn knife does not stay in the drawing, and the cut is the one from [Cutting
vectors](#taiere): exact, with the pieces in their place and with their cutting role. The choice stays as it was: with nothing
chosen, nothing stays chosen (the next cuts still have all the shapes of the sheet), and a chosen shape that is cut is replaced
by its pieces. Pick the knife mode in the bar:
- **Line**: a drag across the shapes, from end to end; **Shift** gives 15° steps, and the ends snap as in drawing (Alt
  inverts snapping).
- **Pen**: the knife nodes, as in the [Pen](#pen) tool (click = corner, drag = curve); **Enter** or a double-click cuts,
  **Backspace** removes the last node, **Esc** cancels.
- **Freehand**: drag by hand; the stroke is smoothed when you release the mouse, finer when zoomed in, with sharp corners
  kept.
- **Shape**: click a shape that already exists (a text, a circle, a piece with several contours) and it becomes the knife; it
  stays unchanged. A text cuts the letters out of the plate under it, and the plate keeps their holes (the middle of an “O”
  stays in the plate). **Shift + click** adds shapes to the knife (their contours are read together); a click without Shift,
  or **Enter**, cuts with all of them; **Esc** drops them.
- **Scissors**: a click on the outline of a shape splits it there (near a node, right at it): a closed path opens at that
  point, an open one becomes two shapes. An opened circle stays a circle, as a path: two half circles. The end of an open path
  is not split.
- **Trim**: the piece of the outline under the mouse, between the two nearest places where other outlines cross it (of the
  chosen shapes or, with nothing chosen, of all the shapes of the sheet; and the other outlines of the same piece), shows in
  red, and the click removes it. With something chosen, the chosen shapes are the edges, and the shape under the mouse can be
  any, even one not chosen. What is left stays in the same shape, so that a DXF with overshooting lines stays, once cleaned, a
  single shape: the eight ends of a “#” leave the square in the middle. An outline without two common points (an open path:
  without any) goes entirely. Where an outline crosses itself is not a common point: that is the checking's job. The lines
  left are not joined.

While you drag, the stroke is dotted and the places where it cuts show in red. The cut happens when you release the mouse
(for Pen, on Enter), as a single undo step (Ctrl+Z). What was cut (or why not) is said in the corner of the canvas.

The **Cutting options** button (the sliders after the knife kinds; Scissors and Trim have none, they have no options) opens
**Close the pieces**, the same checkbox as in the Cut panel, then **Extend the ends**, **Keep**, **Between pieces** and
**Joint**, the same as in the [Cut panel](#taiere): an end stopped inside a shape goes on along the tangent until it leaves
the shape, the part on the right or on the left of the direction you drag in goes in the same step, the gap (or the overlap)
moves the knife by half the width for each part, and the joint, only for the Line kind (a straight cut), puts its pattern on
the cut. For the Shape kind, the parts are called **inside** and **outside**, and **Delete the knife** removes the knife
shapes after the cut. When an option is not the default (the pieces left open too), the button has a red dot, and the hint
in the corner of the canvas says it. While you drag (Line, Freehand), the extended ends show dotted, and the part that goes
is faded, with a red tint, over the shapes the knife splits right through; with a gap or an overlap, their strip shows on
both sides of the trace, dotted more sparsely; with a joint, the teeth show instead of the strip, on the shapes the trace
goes right through.

## Converting vectors
%% capitol: conversie
%% acopera: editare.conversie, document.converteste

**Convert** (the button with the polygon turning into a circle, next to Cut, in the bar's extension) changes the form of the
chosen shapes without changing their place, their names or their operations. The panel has four blocks, each with its
button:
- **Arcs instead of curves**: each curve becomes arcs and lines, straying from it no more than the **tolerance** (0.01 mm by
  default); lines and arcs stay. With **and the short lines lying on a circle** (ticked by default), a run of short lines
  whose vertices lie on a circle (a polyline from a DXF) becomes an arc, of at most half a circle; corners (where the path
  turns by more than 30°) and long lines stay.
- **Smooth**: runs of short lines (a polyline from a DXF, the steps of a trace) become smooth curves, straying from them no
  more than the **tolerance** (0.01 mm by default). Lines longer than **Keep lines longer than** (5 mm by default), arcs and
  curves stay, and the new curve joins them without a kink; sharp corners (where the path turns by more than 60°) stay
  corners. Steps smaller than four times the tolerance are not corners: for a stepped trace to become a curve, choose a
  tolerance as large as the steps.
- **Into a circle**: **only if it is a circle** (tolerance 0.1 mm by default), the shape becomes the circle through its
  nodes, if all of it lies within the tolerance of it: a Ø100 circle drawn with 64 sides stays Ø100 (its sides stray from the
  circle by 0.06 mm). **With the diameter** given (8 mm by default), any closed shape becomes that circle, at the centre of
  its box: the drilling marks from a DXF become circles you can drill.
- **Into a rectangle**: **only if it is a rectangle** (0.1 mm), the shape becomes the smallest rectangle around it, however
  rotated, with rounded corners if it has them. **With the size** given (40 × 20 mm by default), any closed shape becomes that
  rectangle, straight on the sheet, at the centre of its box. A drilled shape does not become a rectangle: drilling needs a
  circle.

The deviation is measured along the whole shape, at the nodes and along the sides, both ways. A shape stretched unevenly (more
along one axis than the other) gets no arcs. The panel says what was done (the shapes, the curves replaced, the new arcs and
lines, the largest deviation) and why the others stayed: how far the closest one is from a circle or a rectangle, how many
were open paths (only closed shapes become a circle or a rectangle) or shapes placed several times on the sheet, which are not
converted from here. Each conversion (**Convert vectors**, from the panel) is a single undo step (Ctrl+Z).

## Checking vectors
%% capitol: verificare
%% acopera: editare.verificare, document.repara

**Check vectors** (the button with the circled node, after boolean and ungrouping, in the bar extension) looks for what
can spoil a cut, without changing anything in the project:
- **duplicates**: the same shape placed more than once in the same spot (also across parts): the first one stays, the
  others are copies; the cutter would cut them all, and the export refuses contours that touch;
- **intersections**: two shapes that cross, touch or share a stretch (a common side is an overlap);
- **self-intersections and loops**: a shape that crosses itself, with the area of the smaller loop and its share of the
  shape; below the “Small loop” threshold (1 % by default), the loop is “small”, like the knots left by an import;
- **nodes too close**: a segment shorter than the tolerance, or the nodes of two shapes closer than that (for example the
  ends of two paths that should be one);
- **open shapes**: every open path, with the distance between its ends.

The **tolerance** (0.01 mm by default) is the distance below which two nodes are the same spot and two shapes are the same
shape. With shapes selected and **Only the selected shapes** ticked, the check looks only at them, among themselves;
otherwise at the whole sheet. While the panel is open, the list redoes itself after every change. It works the same on
drawn and on imported vectors.

On the canvas, every problem has a circle, the same size at any zoom: **red** in the same shape, **green** between shapes;
an overlap is a thick line, and the gap of an open path a dotted line. A click on a row selects its shapes and enlarges its
circle.

The check helps you find the mistakes first; the drawing stays yours. A few can be repaired from the panel
(**Repair vectors**), each with a single undo step (Ctrl+Z):
- **Remove all copies**, under the list of duplicates: the first shape of each group stays, with its operation. A copy
  with an operation the first one does not have stays too, and the row says how many stayed;
- **Close**, on an open path with its ends at most **Close below** apart (1 mm by default): below the tolerance the ends
  are snapped, above it a straight line is added between them. The operation stays the same; you change the role in the
  properties panel. A path with its ends farther apart (an engraving line) stays open, without a button;
- **Remove** or **Split**, on the loop of a closed shape: below the “Small loop” threshold the loop is removed and the
  contour goes straight through the crossing; above it, the loop becomes a separate shape, in the same part and with the
  same operation (an “8” becomes two shapes, which touch at the crossing). **Repair all loops** does them all at once;
- **Merge**, on the nodes too close in the same shape: the run of short segments becomes a single node. **Merge all
  nodes** does them all. The nodes of two different shapes are only shown.

Intersections between shapes are only shown: they may be intended, since the bit follows each shape with its role, and the
export says what cannot be cut. A shape from a part placed more than once is not repaired from here, since the repair
would change all of them: the row says how many times it is placed.

## The cutting operations
%% capitol: operatii
%% acopera: document.aplica-operatii, document.rol

Each shape has an operation: a **profile** (the cutter runs along the outline, in passes, down to the depth), a **pocket**
(the cutter clears all the material inside a closed outline, down to the depth), on circles a **drilling** (a hole the
size of the circle, see below) or a **V-carve** (the V bit carves the shape along its middle, see below). Operations are changed in the **Export
G-code** window, one row per shape; on export, the window does **Apply the operations**: it writes them into the project.

The **Cutting role** can also be chosen in the properties panel, in the **Cutting** section, for any number of chosen shapes:
**outside**, **inside**, **on the line**, **left** or **right** (on an open path), **pocket**, **drilling** (circles only),
**V-carve**, **V inlay** (see [The V inlay](#incrustatie)) or **straight-walled inlay** (see
[The straight-walled inlay](#incrustatie-drept)). The list shows only the roles that fit all the chosen shapes; “—” when they have different roles. The role is the
whole shape's: on a letter with holes, outside cuts the outline on the outside and the holes on the inside, while the pocket
and the V-carve carve the letter with its holes in one go. When the role changes, the cutter, the direction, the depth and the
step stay; the rest goes back to the defaults. A V bit only works on the line and in a V-carve: for a V-carve, a flat cutter
becomes a V60 of the same diameter, and for another role a V bit becomes flat. For a V-carve, the depth is at most the bit's
cone (5.196 mm for a V60 Ø6). Under the role, **Depth** and **Step down** are
written on all the operations of the chosen shapes (with different values, the field is empty). A part with several copies
changes its role for all of them. A shown toolpath updates by itself.

**My roles.** A role with all its values (the cutter, the direction, the depth, the step down, the tabs, the ramp, the leads,
the corners, the descent, the pocket toolpath, the rest cutters, the flat bottom) is kept with **Save as role…**, under
the Cutting fields: type the name (at most 40 characters; it is suggested from the role, the cutter and the depth) and press
Enter. It works when the chosen shapes have the same role and the same values. Saved roles show in the Role list, under the
base ones, in the **My roles** group: only those that fit the chosen shapes. Choosing one gives the shapes exactly its values,
in one undo step; for outside and inside, the holes get their own values, if they were different when saved. The cutter keeps
its number (T) as long as no other cutter in the project has it; otherwise it takes the number of an identical cutter, or the
lowest free one. The **My roles (N)** list shows them all, with **Rename** and **Delete**. The shapes keep their operations
(the values are copied), and after a value changed by hand, the Role list shows the base role. Roles live in this browser, for
all projects: another computer, another browser, or the test address versus the live one each have their own list.

| Field | What it means |
|---|---|
| Cut | **outside** (the part stays inside), **inside** (a hole), **on the line** (the cutter on the outline), **pocket** (clears the outline, see below), **drilling** (only on a row with nothing but circles), **V-carve** (carves the shape with the V bit, see below), **V inlay** (the pocket and its plug, see [The V inlay](#incrustatie)), **straight-walled inlay** (a pocket with its plug, see [The straight-walled inlay](#incrustatie-drept)); on an open path: on the line, **left** or **right** (the side the cutter runs on, looking along the arrow on the drawing) |
| Direction | **climb**: the material that stays is on the right of the travel (M3 spindle); **conventional**: the opposite. It does not matter on the line; there, next to it, **Line direction**: **as drawn**, **reversed** or **shortest path** (an open path starts from the end nearer to where the bit was left; a closed loop stays as drawn) |
| Depth, Step down | how deep it cuts and how far one pass goes down (mm) |
| Tabs | bridges that hold the part in the sheet on the last passes: how many per loop, the length and the bridge thickness (from the bottom face) |
| Ramp | the cutter goes down along the loop, not straight into the material; the ramp length (at least 1 mm) |
| Leads | the cutter enters and leaves the outline on a quarter circle, through the waste, so the part's wall keeps no mark |
| Corners | relief for the corners the cutter cannot reach: **dog-bone** (on the diagonal) or **T-bone** (into the longer wall). A corner whose relief would leave less than 1 mm of material to another wall of the part, or to the relief of another corner (at the base of a thin tongue or finger), goes without it, with a warning. Corners with a curved side (a “D”, a round shoulder, a lens, an imported curve) get the relief too; where the cutter cannot reach the corner at all, a warning says so |
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

## The V inlay
%% capitol: incrustatie

A **V inlay** sets a plug of one wood into a pocket carved in another: the pocket is a V-carve of the drawing, and the plug is
the same drawing, mirrored, V-carved on its own blank so that it goes into the pocket and stops before the bottom. Choose it as
a role: **V inlay**, in the **Cutting** section of the properties panel or in the Cut list of the **Export G-code** window.
The row's bit is a sharp V bit (no flat tip), and the flat floor with the straight bit is on: it clears the bottom of the
pocket and the wood around the plug.

**Without a straight bit**, untick **Flat floor with a straight bit** on the inlay row: the V bit then does it all. It clears
the pocket floor with dense rings, glue gap · tan(θ/2) apart (a crest of at most half the gap, so at least half of it stays
under the plug for glue), and the lowered face of the plug or the band floor with rings saw gap · tan(θ/2) apart (a crest of
at most half of it, between the boards). It is slower than with a straight bit: the warning says how many rings it cuts;
above 400 in one region, the export is refused, with the advice. With the band, cutting the plug out of the board then needs
**Another bit for the cut-out** (a straight bit); without one, untick the cut-out.

The inlay's values, under Depth and Step down in the panel and on its row in the export window:

- **Glue gap** (g; default 0.5 mm, at least 0.1): what stays under the plug. The plug is carved from the pocket depth minus
  the gap (S = D − g), so it stops on the walls, with g above the bottom.
- **Saw gap** (H; default 2 mm): what stays between the two boards after gluing, so you can saw off or plane away the back
  of the plug blank. In the export window, **Same space for glue and saw** keeps a single value for both.
- **Plug margin** (default 5 mm): how much wood stays around the drawing on the plug blank (with the band, beyond the band
  and its groove).

**Wood around the plug**, chosen in the panel's **Cutting** section (for all the selected shapes) or on the inlay's row
in the export window; the band values are chosen in the window:

- **whole face lowered** (default): the straight bit lowers the whole face of the plug blank, past its edges, so the blank is
  held without edge clamps (with double-sided tape, for example), and its back is cut off after gluing;
- **narrow band**: only a band around the plug, cut with the V bit and the flat floor, and the blank edges stay whole, for
  clamps. Its values, each your choice:
  - **Band width**: empty, the narrowest, worked out by the app and shown next to the field: 2 · H · tan(θ/2) (the plug and
    band walls) plus the flat-floor bit (or, with the cut-out, the wider of it and the cut-out bit) plus 2 · 0.5 mm to spare.
    You can widen it; narrower, the window refuses it.
  - **Cut the plug out of the board, with tabs** (on by default): last, the cut-out bit cuts the plug through the whole board,
    on the band floor, H · tan(θ/2) + 0.5 mm from the drawing, leaving the tabs. Unticked, only the band stays, and you saw the
    plug out yourself, on its floor.
  - **Plug board thickness**: empty, depth − glue gap + saw gap + 1 mm (S + H + 1). The cut goes through the whole board, so
    the thickness must be exact; at least the band floor plus the tab thickness.
  - **Tabs per loop**, **Tab width**, **Tab thickness** (default 4, 4 mm and 1 mm): like hold-down tabs; the thickness is
    measured from the bottom of the board, so once seated the tabs sit above the board and are planed off with the rest.
  - **Another bit for the cut-out**: by default, the flat-floor straight bit; ticked, the number and diameter of another one (a
    new number, like any bit).

**On paper**, the panel shows, for the chosen shapes with the same values: how far the plug goes into the pocket (S), over
how much the walls touch from the outline (S · tan(θ/2)), the gap under the plug, the space between the boards, how much of
the bit's cone the pocket and the plug use, and the smallest thickness of the plug blank (S + H + 1 mm). For example, with a
V60 Ø6, depth 3, glue gap 0.5 and saw gap 2: the plug goes in 2.5 mm, the walls touch over 1.44 mm, the plug is carved down
to 4.5 mm of the 5.20 mm cone, and the blank is at least 5.5 mm thick. With the band (as soon as you choose it, before the first export too), it also shows its width (and the
narrowest), the blank in plan (the drawing's box plus the band, the groove at the face and the margin, on each side) and the
cut-out: the board and the tabs, or where you cut by hand. In the example, with a Ø6 flat floor, the band is at least 9.31 mm,
and the blank is the drawing's box plus 15.75 mm on each side.

**The export.** On **Export**, besides the sheet's program (with the pocket), one file per plug is downloaded: the name of the
sheet's program with “-dop-1”, “-dop-2”… (on short names, DOP1…). The window shows each one's blank: width × height (the
drawing's box, plus the margin on each side) and the smallest thickness. The plug is the drawing mirrored left to right; XY0
is at the corner chosen for the sheet, on the plug blank, and Z0 on its face. The program first lowers the blank face with
the straight bit, down to S + H (the wood around the plug), then the V bit cuts the plug walls from S down; the bit change is
the one chosen in the window, as for the sheet. With the band, the straight bit clears only the band floor, and with the
cut-out, last, the cut-out bit cuts the plug through the board; the window then shows the board “exactly” as thick as chosen.

**Gluing.** Turn the plug face down over the pocket (the mirroring brings it back to the drawing) and press it in with glue:
it stops on the walls, with the gap under it and the space between the boards. Then saw or plane its back down to the face
of the board. With the cut-out, first cut the tabs and clean them flush with the walls, so the plug goes in whole.

**Refusals**, with the reason, on export: a flat bit or one with a flat tip; a glue gap under 0.1 mm (the ridges in the
pocket's corners would hold the plug) or at least the depth; a plug carved (depth − gap + saw gap) deeper than the bit's cone;
more than 400 rings with the V-bit-only floor. With the band: narrower than the narrowest; with
the cut-out, a board thinner than the band floor plus the tabs, a V cut-out bit, or one with another bit's number and another
diameter, or, without a straight bit, no cut-out bit. The plug in the 3D view comes in a later slice; straight walls have their own chapter ([The straight-walled
inlay](#incrustatie-drept)).

## The straight-walled inlay
%% capitol: incrustatie-drept

A **straight-walled inlay** sets a plug with vertical walls into a pocket cut in another board: the pocket is a pocket of the
drawing, and the plug is the same outline, cut with the flat bit on its own blank, smaller by a side gap all around. Choose it
as a role: **straight-walled inlay**, in the **Cutting** section of the properties panel or in the Cut list of the **Export
G-code** window. The row's bit is flat; the pocket keeps its rest bits, strategy and ramping.

**The app matches the corners.** The bit is round: in the pocket, the tips of the drawing come out rounded with its radius (R),
and on the plug, which the bit goes around from outside, the inside corners get rounded (with the plug bit radius, r). So the
app also rounds the pocket's inside corners, with r minus the gap, and the plug is the pocket's cut outline shrunk by the gap:
paired arcs are concentric, and the gap is the same all along the outline, corners included. How far the sharpest tip moves
back from the drawing appears as a warning after export. A part of the drawing narrower than the bit does not fit in the
pocket: the export refuses it.

The inlay's values, in the panel (under Depth and Step down) and on its row in the export window:

- **Side gap** (c; default 0.1 mm): what stays between the plug walls and the pocket walls, on each side. The pocket keeps the
  drawing size, the plug shrinks by c. It must be under the radius of the pocket's smallest bit.
- **Plug** (in the export window only): **raised on a blank**: the plug stands on its own blank (drawing mirrored, face
  lowered around it); you flip it into the pocket and cut off the back; or **cut out of a board**: the plug is cut through its
  whole board, with 4 tabs per loop (drawing not mirrored), and goes into the pocket without flipping.
- **Rests on** (raised plug only): **the pocket floor**: the plug is as tall as the depth plus the **saw gap** (H; default
  2 mm), which stays between the boards; or **the board face**: the lowered face of the blank sits on the board, and the plug
  is as tall as the depth minus the **glue gap** (g; default 0.5 mm, at least 0.1 and under the depth).
- **Above the board** (cut-out plug; also H): the plug board is as thick as the depth plus H, and the part above the board is
  planed off after gluing.
- **Plug margin** (default 5 mm): how much wood stays around the drawing on the plug blank; for a cut-out plug, at least its
  bit diameter.
- **Another bit for the plug** (in the export window only): by default the plug is cut with the pocket bits; ticked, with a bit
  of its own (T, Ø, stepover) and its rest bits. A smaller bit sharpens the inside corners: the pocket rounds them with its
  radius minus the gap. The same T means the same bit in the plug file too.

**On paper**, the panel shows, for the chosen shapes with the same values: the pocket corners (tips R, inside corners r − c) and
the plug corners (tips R − c, inside corners r), the gap along the outline, the plug height and the blank thickness (the
smallest for a raised plug, the height plus 1 mm; exact for a cut-out one). For example, with a Ø6 bit, depth 6, gap 0.1 and a
raised plug resting on the floor: pocket tips R3, inside corners R2.9; plug R2.9 and R3; the plug is 8 mm tall, and the blank
at least 9 mm.

**Export.** As with the V inlay, a file for each plug is downloaded too (“-dop-1”…), with its blank: XY0 at the chosen corner,
Z0 on its face. For a raised plug, the face is lowered around it with the plug bits, past the edges of the blank: hold it
without clamps on the edges, for example with double-sided tape. For a cut-out plug, the outline is cut as an outside profile,
through the board, with tabs 4 mm wide and 1 mm thick, and the drawing's holes as insides; cut the tabs and clean them flush
with the walls before gluing.

**Refusals**, with the reason, on export: the inlay on anything but a pocket; a V bit for the plug; a side gap at least the
radius of the pocket's smallest bit; on the face, a glue gap under 0.1 mm or at least the depth; a part of the drawing narrower
than the bit; a cut-out plug margin smaller than its bit.

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

**Export G-code** opens the export window, for the active sheet (with several [sheets](#foile), the window's title says
which). Besides the [operations](#operatii), you choose:
- the sheet's **origin corner** (bottom left, bottom right, top right, top left): where X/Y zero is on the machine;
- **Z0**: the top of the material or the bottom of the material (the spoilboard);
- the **Post**: the machine's controller. The GRBL family (GRBL 1.1, grblHAL, FluidNC) talks to this app's sender;
  **NcStudio, RichAuto, Syntec, Mach3** and **Mach4** get a file that you run from their own controller (it doesn't reach the
  machine panel). A post written only from the controller's documentation, not yet tested on a machine, carries a note: watch
  the first program run in the air;
- the **Units**: mm (the default) or inch (with 5 decimals and the feed in inch/min); the header stays in mm. RichAuto reads mm
  only;
- the **Tool change**, only when the rows have different bits: **stop in this app's sender** (the default for the GRBL family:
  the job stops at `T… M6`, you take the bit out, put in the next one, probe Z and **Continue**), **M6 at the controller**
  (grblHAL, FluidNC, with the change set up there; the default for Syntec, Mach3 and Mach4), **M0, with the bit in a comment**
  or **one file per bit** (all of them are downloaded; the default for NcStudio and RichAuto, which have no M06).

The workshop posts write what the controller's documentation asks for. The settings the file depends on appear in the window
and in the program's header: check them on the controller before you start.
- **NcStudio**: comments start with an apostrophe, the `G4 P` dwell is in milliseconds, no `G94`. Settings: **N4063 = 1**
  (arcs with I/J from the start point), **N4034 = 0** and **N4035 = 0** (the feed and speed from the file);
- **RichAuto**: no comments, no units word and no WCS (it works in the controller's active system), no `G4` (the controller
  waits after the spindle starts), helices as segments, short names for the FAT stick (`CNCVS2.NC`, `CV2T3.NC`). A confirmed
  run past the sheet can't be written into the program, so the export refuses it. Settings: **F Read = Read**, **AbsCntr =
  Off** and a spindle start delay of at least 3 s;
- **Syntec**: the program starts with `%` and `O0001`, the units are `G71` (mm) or `G70` (inch), the dwell is in
  milliseconds. At the start and at each change, `T… M6`, then `G43 H…`: the bit's length from the tool table (0, if you set Z
  for each bit);
- **Mach3**: `G91.1` (arcs with I/J from the start point), `T…` on the line before `M6`, the dwell in seconds. Profile
  settings: **G04 Dwell param in Milliseconds** unticked and **Tool Change = Stop Spindle. Wait for Cycle Start**;
- **Mach4**: like Mach3, with `%` after `M30`; the `G4 P3.000` dwell means 3 s in both editions of the Mach4 manual.

On these five posts, a rapid move that changes both XY and Z is written as two lines (going up first, going down last):
there, `G0` may move each axis at its own speed.

Each row has its own **bit**: the tool number (T), the diameter (mm) and the shape: **flat** or **V**, with the included angle
of the tip (from 1° to 179°, 60° by default; for a V bit, the diameter is that of the cutting part). Rows with different bits
are cut with a change between them: in the automatic order, in each class (insides, then on the line, then outsides), the bit
already mounted first, so there are as few changes as possible. The same number with two diameters or two shapes is refused:
each bit needs its own number.

The **Cutting order** sits above the table. The rows appear in the order they are cut, with their place in the **#** column:
- **Automatic** (the default): insides first, then lines, outsides and sheet separations last; in each, grouped by bit. A side
  or a bit changed in the window redoes the order on export;
- **Mine**: cut from top to bottom. You move a row by dragging its handle (the six dots) or with the **↑** / **↓** arrows. The
  list starts from the automatic order, and **Back to the automatic order** brings it back. The order is written in the project
  on **Export**: the window shows it when reopened, and the toolpath, the time, the animation and the 3D view follow it. A new
  operation (a drawn shape, an import, a text) comes at the end. The bit changes follow your order, so there may be more than in
  the automatic one.

The V-carves of the same piece, with the same values (the bit, the depth, the step, the direction, the flat bottom), are
carved as a single region: the rows after the first show **with N**, meaning they are carved together with row N. Pockets are
not merged: each one is cut at its own place. If in your order the outside of a piece comes before another operation of the
same piece or of a shape inside it (a circle drawn in a rectangle), or a sheet separation before another operation, the piece
may come loose before it is done: the window names the rows, and **Export** asks for the **Cut in my order** tick (any move
clears it).

The **Export** button downloads the file and shows how many lines it has and its SHA-256 fingerprint (with it you check that
exactly this file reaches the machine). If the cutter would leave the sheet, the window says by how much and where, and the
export asks you to confirm that nothing is in the way there (clamps, screws); the confirmation is written in the program's
header. After an export this app's sender sends (the GRBL family), **Open in Machine** closes the window and loads the program
in [the Machine](#masina), without starting it.

**All sheets.** With several [sheets](#foile), the window asks **What to export: The active sheet / All sheets (N)**. **All
sheets** makes one program per sheet, each exactly the one you would export from its sheet alone, and downloads them in a
`.zip` archive (`cncvs2-stanga-jos-foile.zip`), with the sheet in each file's name (`cncvs2-stanga-jos-foaia-2.nc`); on
RichAuto, `CNCVS2.ZIP`, with each sheet in its own folder (`F2/CNCVS2.NC`). Identical sheets (the same parts in the same
places, with the same operations, as after “Duplicate the sheet with the same parts”) come out once, with ×N in the name
(`…-foaia-1-x3.nc`: cut it three times), and a sheet with nothing to cut is left out. The window's rows stay those of the
active sheet: the other sheets keep their own operations. After the export, the window shows the sheets, the files and the
time of each, then the time of all. A sheet the cutter leaves (other than the active one, whose confirmation you give here)
is exported alone, with its own confirmation. **Open in Machine** loads the active sheet's program. The plates the text comes
out of are, here, those of all sheets: if you chose the confirmation in **From CSV…**, **Export** waits for the tick.

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

The **Machine** tab in the application menu opens the machine window, full screen, under the menu: it sends the program to
the machine over the USB cable or over WiFi and shows its state. On a wide screen it has three columns: the machine (the
connection, the state and the position in large digits, positioning), the job (its phase with its buttons, and the program)
and the console (the command and the log). On a laptop, the console moves underneath; on a phone, everything is in one
column, most urgent first.

- **The drawing stays one click away.** The **Design** tab takes you back to the drawing at any time, and the job carries on.
  While you are in the Machine window, the drawing's keys (Delete, Ctrl+Z, the arrows, the tools) do not touch the hidden
  drawing; `Ctrl+K` works, and a drawing command picked from the palette takes you to Design first. `F1` opens this chapter.
  **Escape** closes only what is open (the WiFi choice, a confirmation): it does not change the window and sends nothing to the
  machine.
- **The job indicator** sits in the application menu once the Machine window has been opened, and shows from any window:
  “Machine connected”, “Running 42%” (green, with **Pause** next to it), “Paused 42%” (orange, with **Resume**), “Stopped at
  M6”, “Stopped at line …” or “Stopped on an error” (orange), “Alarm” or “Job interrupted” (red), “Job done”. Clicking it opens
  the Machine window. **Stop** stays only in the window: a reset pressed by mistake loses the position. While the job runs, the
  browser tab's title starts with the percentage.
- **With a job running**, closing or reloading the page first asks for the browser's confirmation: the connection would be cut
  and the job would stop halfway. Meanwhile “New version ready” shows **Reload after the job**, disabled, until it ends.

- **Connect (USB)** lets you choose the machine’s port (GRBL, 115,200 baud). It works only in Chrome or Edge on a computer
  (Web Serial); otherwise, the panel says so. On the test instance there is also **Simulated machine**: a simulated GRBL
  controller, to try the panel without a CNC, with **Speed** 1×, 10× or 100×. **Disconnect** closes the port.
- **Connect (WiFi)** links the panel to a controller on the local network, through a WebSocket (Chrome and Edge, from version
  147: the first time, the browser asks to allow devices on your local network, and a refusal is changed in the site
  settings). The window shows the connections saved in the browser, each with its network: **through the workshop network**
  (by name, for example `esp3d.local`, with the last IP as a fallback), **directly**, through the machine’s own network (the
  ESP3D bridge, at `192.168.0.1`), or an address typed by hand. You choose which one to use, with **Connect**: the window never
  connects on its own. **Forget** removes a connection from the list, and **Cancel** closes the choice. If it fails, the panel
  says what it tried (the name, then the last IP) and what to check: the machine switched on, the computer on the same
  network, the controller’s page (with a link to it).
- **Find the machine** tries at once the saved connections, the usual controller names (`esp3d.local`, `fluidnc.local`,
  `grblhal.local`) and the bridge’s own network; the controller is deduced from what answers, and a machine found is linked
  with **Connect**. **Search the whole network**, only on a click, tries every address of the usual networks (192.168.0.x,
  192.168.1.x, or the last IP’s network), first on port 8282 (the ESP3D bridge), then on 81, with a progress bar; the browser
  slows down attempts that get no answer, so it takes about a minute per network and port. It stops at the first machine found,
  or with **Stop searching**. A controller is only sent `?` (a status request, with no `ok` reply), so it does not disturb another
  program already sending it a job. **Back** returns to the list.
- **Other address…** is the form by hand: the **Controller** (FluidNC, grblHAL or an ESP3D bridge on a classic GRBL, which
  brings its default port), the **Address** (a local IP, for example `192.168.1.50`, or a name ending in `.local`) and the
  **Port**, then **Connect**. The last address stays in the form. An address the browser would not allow (an ordinary name, an
  IP outside the local network) is refused before connecting, with the reason.
- **Set up a new bridge** puts the ESP3D bridge on the workshop network, in three steps, without its terminal:
  1. join the computer to the bridge’s network (ESP3D, with the factory password, 12345678), then **Check** (the **Bridge
     address** is `192.168.0.1:8282` by default): the bridge tells its version and target, and the direct route, through its
     network, is saved; **Continue**;
  2. from the **Networks the bridge sees** (with the signal; **Look again** reads them again) choose the workshop network, or
     **Other network** for a hidden one, type the **Network password** and a **New password for the bridge’s network** (the
     factory one is public), then **Send to the bridge**. Passwords only travel from the browser to the bridge and are kept
     nowhere;
  3. join the computer back to the workshop network, and the app looks for the bridge at `esp3d.local` until it answers, then
     saves it, with its network: **Connect** or **Done**. If it does not show up, the bridge went back to its own network
     (with the new password): **Start again from step 1**, or search the whole network for it.
- **Over WiFi, the connection can drop.** Then the machine finishes what it has in memory and stops, and the panel can no longer
  send Pause or Stop, as with an unplugged cable. So, at the first start of a program over WiFi, the panel says this first:
  **Start anyway** or **Cancel**. The machine’s emergency stop stays the physical one.
- **State** comes from the machine’s reports (5 times a second): Idle, Run, Hold:0 (stopped), Hold:1 (still braking), Alarm,
  and the position (the work position when known; otherwise the machine’s).
- **Program**: **Last export** loads exactly the file of the last Export G-code (the SHA-256 fingerprint matches the one in
  the export window); **File…** loads G-code from another program, checked first. A program is refused, with the line, if it
  has characters outside ASCII (on GRBL, “ș” and “ț” would change the spindle speed), Windows line endings (`\r`), lines over
  70 bytes, sets no work coordinate system (`G54`–`G59`) before its first move, changes the tool (`M6`) without being exported
  from here, or has no line end at the end. With one file per bit, **File of the last export** picks which one loads. From the export window, after a successful
  export, **Open in Machine** brings the export's first file here, loaded, without starting it.
- **Received job**: an app that sends jobs (for example Easy 3Draw, with “Send to cvs2”) opens cvs2 in a new tab.
  The **Incoming job** dialog says who sends it, from where (an address, or a page opened from a file on your computer) and
  which files, with the board, the bit and the time. **Accept** checks each file like one loaded with **File…** and opens the
  Machine window; **No** tells the app you declined the job. The good files sit under the buttons, in cutting order: pick one in
  **File of the received job** and press **Load received file**; the refused ones sit below, each with its reason. Nothing
  starts by itself, and the job is lost when the page reloads (the app can send it again). On the live instance, receiving
  is off for now.
- **From an extension** (the Extensions chapter): a program loaded by an extension shows “from” it next to its name. A start
  or a resume asked by an extension asks you first, in a window of the app: **Start** (or **Resume**) can be pressed after a
  second, and **No** and Escape send nothing.
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

## The printer
%% capitol: imprimanta
%% acopera: vedere.imprimanta

The **Printer** tab in the app menu opens the 3D printer window, full screen, under the menu. For now it works with Creality
printers of the K1 family (K1C and K1C 2025), over WiFi, on their factory protocol: no root and no setting on the printer. The
printer works alongside the CNC, so the Machine window stays the CNC’s. `F1` opens this chapter.

- **Connecting.** Type the **Printer address** (you see it on the printer screen: Settings → Network, for example
  192.168.1.50) and press **Connect**. The first time, the browser asks whether the page may reach devices on the local
  network: choose **Allow**. It works in Chrome and Edge on a computer. A connected printer stays in the list, with its name
  (for example “K1C-8578”): next time you pick it there, with **Connect**, and **Forget** removes it from the list. The window
  does not connect by itself when you open it.
- **Search the whole network** tries port 9999 on every address of the network, only when you press it, for about a minute;
  **Stop the search** stops it. The first printer that answers gets connected.
- **When it does not work,** the window says what happened (nothing answers, the permission was refused, something other
  than a printer answers) and what to check: the printer is on, the computer is on the same network (not a guest network),
  the address is the one on its screen.
- **The status.** At the top sits the printer strip: the state (Ready, Preparing, Printing, Paused, Stopped, Done), the name,
  the address and the firmware. Below: the job (the file, the progress, the elapsed and remaining time, the layer), the
  **Temperatures** of the nozzle, the bed and the enclosure and the code the printer reported (its screen shows the text).
- **The plate**, while printing or paused, in the job card: the bed seen from above, zoomed on the parts, with the
  printer’s front at the bottom. It shows the parts (their outline; the **current part** with a teal outline; a
  **cancelled** one, crossed out), the **nozzle** (a white dot, only while printing) and, for files sent from cvs2, the
  **current layer** (orange) over the one below. Next to it, the layer bar (the finished layers, the current one, the pauses
  in the file) and “Layer 6 / 10 · 1.2 mm”: the K1C mixes two layer counters, so the window takes the layer from the
  filament used (for files sent from cvs2) or the one that matches the progress. Below, the **Parts**, with their cvs2
  names. While the printer waits in a pause of the file, the plate shows that pause and its note. Files sent from cvs2
  are kept in the browser (the last 5) so their layers can be drawn; for other files, the plate shows only the parts, the
  nozzle and the layer number.
- **Cancelling one part** (only what the connected printer has; today the K1 family), while printing or paused:
  **Cancel…** next to a part in the list (or a click on it, on the plate) opens the confirmation: **Cancel the part** or
  **Keep it**. The other parts carry on, and a cancelled part is not printed again. The part’s row shows “→ being cancelled ·
  waiting for the printer” until the printer lists it as cancelled; without that within 6 s, “the printer did not confirm”.
  K1 does not cancel the part it is working on at that moment: the request stays in view, with **Withdraw**, and is resent
  until the printer takes it, at most 2 minutes. The last part left has no button: for it, use Stop. Only a name from the
  printer’s own list, made of letters, digits, _ . -, reaches the printer; nothing typed by hand.
- **Notifications** (their card, in the Printer window): **Turn on notifications** asks the browser for permission, once.
  Under **Tell me when** you choose the events: it finished, it stopped, the pause from the file (with its note), another
  pause, out of filament, an error, the connection lost while printing and the first layer done (off at first). While
  cvs2 is hidden, a system notification comes (click it: the Printer window); while it is in front, a banner at the top,
  with **Open Printer** and **Close**. **With sound**: a few short tones. **Also the system notification while cvs2 is in
  front**, if you want it then too. **Percentage in the tab title**: “45 % · CNC Vector Studio”. On the Printer button in
  the top bar, a dot and the percentage, wherever you are in the app, once you have opened the window; with **Connect the
  kept printer when cvs2 opens**, also without that. They come while cvs2 is open, also in the background; on a phone,
  only while it is in front. On Edge, an inactive tab sleeps after 2 hours: add cvs2 to “Never put these sites to sleep”.
- **Pause**, **Resume** and **Stop** stay at the top, in the strip, while it prints. Pause goes at once. Stop asks for a
  confirmation, because a stopped print cannot be resumed: **Stop printing** or **Let it run**. **Disconnect** only closes the
  connection; the printer is not touched.
- **Controls while printing** (only what the connected printer has; today the K1 family). A requested value shows as
  “→ 120 % · waiting for the printer” until the printer reports it; if it does not within 6 s, the window goes back to the
  printer’s value, with “the printer did not confirm”. A slider sends when you let go, a field on `Enter` or when you
  leave it; a number outside the range is not sent.
  - **Temperatures:** **Nozzle target** and **Bed target** are written directly, in whole degrees, between 0 and the
    maximum the printer reports (320 and 115 °C on the K1C). With the printer free, **Preheat** opens the slicer’s material
    list (the same as in “From drawing…”), with the first-layer temperatures, and **Cool down** sets the targets to 0. While
    a target is on without a job, the strip says **Heating**, with **Cool down** next to it. **Cool down by itself after**
    30 **min without a print** (ticked by default, the minutes can be changed): after a preheat from the app, if no print
    starts, the window sets the targets to 0 and says when; it works only while the window is open and connected. While
    printing, the file may change the targets on the next layers.
  - **Speed** and **Flow**, while printing or paused: between 1 and 200 %, with the slider, the field and **100 %**, which
    brings them back.
  - **Fans and light:** **Light**, on or off; the part, enclosure and side fans, between 0 and 100 % (on the K1 an `M106`
    written only by the app goes out: the window has no G-code console). **Home (X, Y, Z)**, only while the printer is
    free, after the **The bed is clear** tick: the head moves on X and Y first, then the nozzle comes down to the bed for
    Z; **Cancel** closes the confirmation.
- **The files on the printer** (sent from Creality Print or OrcaSlicer): **Start** opens the confirmation, with the file, the
  material and the estimated time. **Start printing** lights up only after the **The bed is clear** check (no part left under
  the nozzle); **Cancel** closes the confirmation. The printer heats up and runs its own checks; right after the start it
  closes the connection, and the window reconnects by itself. **Refresh** asks for the list again.
- **Send a file…** (under the list) sends a `.gcode` from this computer to the printer, already sliced in Creality Print or
  OrcaSlicer. First the window checks it on the computer: the printer it was sliced for, the nozzle, the material, the
  temperatures, the estimated time and the thumbnail, then whether every move fits the printer’s bed (220 × 220 × 250 mm on a
  K1C). A move outside the bed (with its line) or a file sliced for another printer gives a warning, and the button becomes
  **Send anyway**; otherwise it is **Send**. **Another file…** picks a different one; **Cancel** (or `Escape`) closes the
  window and stops a sending under way. The name loses its spaces, and a file already on the printer is never replaced: the
  new one gets “-2” in its name. After sending, the window looks for it in the printer’s list (and, when the list has the
  sizes, with the same size); once found, **Start
  printing…** opens the confirmation above (with the **The bed is clear** check), and **Close** leaves it on the printer. If it
  does not arrive, the window says why (the printer does not answer on port 80, the file is not in its list, or its size
  differs), with
  **Try again**.
- **From drawing…** (under the list; with no printer connected, under the opening text) slices flat parts from the drawing
  here, without Creality Print: a plate, a spacer, a template, a calibration cube, that is a closed outline raised to a
  thickness. Holes come from the drawing (a shape inside another is a hole, one inside a hole is an island), overlapping shapes
  are joined, text prints too, and open paths are left aside, with a message. In the **Flat part for the printer** window:
  - **What to print:** **The parts of the sheet**, **The selected parts** or **One part**, picked from the list. The parts keep
    their layout from the sheet and are centred on the bed; what does not fit (220 × 220 mm on a K1C, with a 5 mm margin on
    each side) is said.
  - **After CNC: pockets, drillings and partial profiles as steps** (the tick box under “What to print”): each part prints as
    the cutter leaves it, from its operations, not from the drawn shapes. The edge and the holes come from the through
    profiles (outside or inside, at least as deep as the sheet); a pocket, a drilling or a partial profile (the cutter’s width,
    on the side of the cut) lowers its area to the height minus the depth, and the depth stays in mm, measured from the top,
    whatever the chosen height; what goes all the way through (or deeper than the height) is a hole. Each step gets the solid
    top layers, like the face of the part. Tabs, ramps and leads do not count; V-carves and engravings with a V bit do not
    print (a V engraving has no straight steps), and the window says how many there are. A part without a through outside
    profile has no edge: the window says so.
  - **Height:** **One for all** (the **Height for all** field, by default the sheet thickness) or **Each part’s own, kept in
    the project**: the list of the chosen parts, each with its height, written into the part (in the project, with the usual
    undo), so next time it comes by itself; a part without one takes the height for all (with the project open read-only, the
    list cannot change).
  - **Material** (PLA, PLA High Speed, PLA Matte, PLA Silk, PLA-CF, PETG, ABS,
    ASA, PC, PA-CF, TPU, with the values of the Creality K1 profiles in OrcaSlicer), **Quality** (0.08, 0.12, 0.16, 0.20 or
    0.24 mm layers), the **Nozzle** and **Bed** temperatures, **Walls**, **Infill** (the sparse infill percentage)
    and **Brim** (Automatic: for narrow or tall parts; Yes; No).
  - **Advanced** shows the other settings, in groups. Layers: Layer height, First layer height, Top layers, Top thickness at
    least, Bottom layers, Ensure vertical shell thickness (All (also under the walls of steps), the default: on a part with
    steps, solid infill also goes under the walls above a step, so they do not stand on sparse infill; Moderate; Critical
    only; None: solid only under top faces, with narrow solid regions widened or, with None and Critical only, the very
    narrow ones removed). First layer temperatures: Nozzle, first layer; Bed, first layer. Line widths: Outer wall width, Inner
    wall width, Solid infill width, Sparse infill width, Top surface width, First layer width. Speeds: Outer wall speed, Inner
    wall speed, Solid infill speed, Sparse infill speed, Top surface speed, First layer speed, First layer infill speed, Travel
    speed. Accelerations: Wall acceleration, Top surface acceleration, Infill acceleration, First layer acceleration, Travel
    acceleration. Retraction: Retraction length, Retraction speed, Z hop. Cooling: Part fan, minimum; Part fan, maximum; Fan
    off for the first layers; Auxiliary fan; Minimum layer time (a shorter layer prints slower, so it can cool); Slowest
    cooling speed. Material flow: Flow ratio, Maximum volumetric speed (speeds are capped so the material fits through the
    nozzle). Edges: Elephant foot compensation (the first layer, shrunk a little), Sparse infill overlap on walls, Solid infill
    overlap on walls, Brim width, Brim gap. Infill patterns: Sparse infill pattern (Grid, the default; Rectilinear, turned
    by 90° from one layer to the next; Aligned rectilinear; Line, every other line slightly slanted; Triangles; Tri-hexagon;
    Cubic, Cross hatch and Gyroid, which change with height, as a 3D infill; Honeycomb; Concentric; Hilbert curve;
    Archimedean chords; Octagram spiral; at 0.12 mm the profile starts with Cross hatch), Sparse infill direction, Internal
    solid infill pattern, Top surface pattern and Bottom surface pattern (Monotonic line, the top default; Monotonic, the
    bottom and internal default: the lines always in the same order, for an even face; Rectilinear; Aligned rectilinear;
    Concentric; Hilbert curve; Archimedean chords; Octagram spiral), Solid infill direction. Wipe: Wipe while retracting (on
    in the K1C profile: before a travel, the nozzle moves a little along the line it just made, so it leaves no blob), Wipe
    distance, Retract amount before wipe (the rest of the retraction happens on the way), Role-based wipe speed (at the
    speed of the last line), Wipe speed, of travel speed. Seam: Seam position (Aligned, the default: in the most hidden
    corner, the same on every layer; Aligned back; Back; Nearest, to the nozzle; Random), Staggered inner seams (each inner
    wall starts a little further along, so the seams do not stack), Seam gap. Ironing: Ironing type (No ironing, the
    default; All top surfaces; Topmost surface only; All solid layers): one extra pass with a small flow over the face, to
    smooth it; Ironing pattern (Rectilinear, Concentric), Ironing flow, Ironing line spacing, Ironing speed, Ironing inset
    (0: half a nozzle), Ironing angle offset (from the lines of the face). Skirt: Skirt loops (0: no skirt, the default),
    Skirt distance (from the parts or the brim), Skirt height, Skirt speed, Skirt type (Combined; Per object), Skirt minimum
    extrusion length (loops are added until they reach it), Draft shield (the skirt as tall as the parts, against drafts,
    for ABS or ASA), Skirt start point (the angle, from the centre of the parts), Single loop after first layer. The skirt
    is printed first, on the first layer: it primes the nozzle and shows whether the bed is level. **Profile values** puts
    back those of the chosen material and quality. The chosen settings are kept in the browser, for next time.
  - On the right, the chosen layer, seen from above, with the lines coloured by role (outer wall, inner walls, solid, top
    surface, sparse infill, brim, ironing, skirt) over the part outline, thin and red: where only the red shows, the part is narrower than one
    line and nothing prints there (the window also says the area). The **Layer** slider picks the layer; below it, its role (on a part with steps, a layer can have several: **with a
    step:** the top surface of the step, the solid under a face, the sparse infill),
    then the layers, the estimated time (without heating) and the filament, in metres and grams. The **travel moves** check
    also shows, dotted, the nozzle’s paths between lines.
  - **Pause before this layer** (under the slider) adds a pause at the layer shown: the printer stops after the layer
    below, for example to change the filament for a second colour from a height upwards (sunken text or a drawing), or to
    place something into an open pocket; then you press **Resume** in the Printer window or on its screen. Another click
    on the button removes it. Pauses show as red marks on the slider and in the **Pauses** list, each with its layer and
    height (a click on it shows the layer), a **Pause note** (for example “black filament”) and **Remove the pause**. A
    pause keeps the height printed so far: with another layer height it stays at the same place in the part, and above
    the parts it is left out of the file. Pauses are kept in the browser for the same parts (they come back when you
    reopen the window on them), and the summary counts them. In the file, a pause is the printer’s `PAUSE` command, before
    the first part of the layer; the estimated time does not include how long the printer waits. There is no pause before
    the first layer.
  - **Nozzle** and **Bed** in “Simple” also change the first layer temperatures (with the same difference from them as the
    material profile has: PC starts 10 °C lower). The brim is one for all the parts: it goes around neighbouring parts.
    Everything extruded, the brim included, must fit the bed with its 5 mm margin, and the last layer must stay under
    250 mm; otherwise no file is made, and the window says how far it goes out. If the drawing changes in Design while the
    window is open, the parts are read again.
  - **Send to the printer** (only with the printer connected) passes the file through the same check and sending as **Send a
    file…**, with the same **The bed is clear** check at start. **Save .gcode** downloads it, for a USB stick or to send later;
    **Cancel** (or `Escape`) closes the window. The file uses only the commands OrcaSlicer writes for the K1C: the start
    (`START_PRINT`) and the end (`END_PRINT`) stay the printer’s, with its levelling, purge line and cooling; each part is an
    object the printer can skip if it comes loose.
- **A lost connection does not stop the print:** the printer keeps going from its memory. The window says “Connection lost”
  and tries to reconnect by itself; while it is gone, the buttons are off. The emergency stop stays the printer screen. A
  printer silent for more than 20 s counts as lost (a connection can die without closing), and one that no longer answers at
  its address is looked for on the network by name (for example “K1C-8578”) and kept at its new address.
- **The frame log** shows what the window sent and what it received; **Copy the log** puts it on the clipboard, for a report.
- On its own, the window only reads the status and tells the printer it is there; every command comes from your click. Port
  9999 has no password: anyone on the workshop network can command the printer, so keep it on a network of your own.

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

On the test instance, the app's address with `?test` at the end opens the drawing tools test in a floating panel that you
move by dragging its title and collapse with ▾. Each step says what you do
and what you should see; you mark **OK**, **No** or **Skipped** and can write a note. **Snapshot** saves the image of the
board (the drawing, the rulers, the guides, the handles, the toolpath) in the browser: nothing goes to a server. **Download
the report** writes a single HTML file with the results, the notes and the snapshots, to send on. The list at the top goes
to any step. The results stay after a reload too; **Start over** deletes them, after a confirmation.

Also on the test instance, a suggestion for the owner, with a picture of the sheet, is sent from the **Account** menu (see
[The account](#cont)).

## The account
%% capitol: cont
%% acopera: editare.cont, editare.sugestie

The **Account** button in the top-right corner, next to the theme button (its title: “Account: sign in, the plan, reports and
the manual”), opens the account menu. Signed in, the button shows the initials and the first name. At the top of the menu are
the name and today's plan, with the trial days left; without an account, “Not signed in”. The rows:

- **Your account…** (signed in) or **Sign in or create an account…** (no account) opens the account panel, below;
- **My reports** (with an open account) shows your reports, newest first, with their state (sent, in progress, resolved) and
  the team's replies, below;
- **Manual** (`F1`) opens this manual;
- **Report a problem…** (with an open account) sends the team a problem, an idea or a question, below;
- **Send a suggestion…**, only on the test instance (its title: “Send a suggestion: for the owner, with a picture of the
  sheet”), takes a picture of the sheet, keeps it in the browser and opens the `/admin` page on the **Suggestions** tab, in a
  new tab. You sign in with your staff account and write the suggestion, and the picture goes with it; before sending, you
  can remove it. If the browser doesn't open the tab, a message gives you the link to it;
- **Sign out** (signed in) closes the account in this browser.

The menu works from the keyboard too: the arrow keys move between rows, Enter picks, Escape closes it. The account panel and
the reports need internet: without a network they do not open, but the app goes on with the last rights it received.

- **Report a problem…:** you choose what you are sending (a problem, an idea or a question), write what happened and, if you
  want, tick **Attach a picture of the sheet**. With **Attach the project (so the team can open it)** the open project goes
  too, exactly as you have it, compressed; its size shows under the tick box. At most 10 MB can be attached: a bigger project
  does not go, and without the tick it does not go at all. Below the text, **What else goes with the report** shows
  everything else that goes: the app version, the language, the plan, the browser, the fingerprints of the errors in this
  session (only the fingerprints, without the errors' content, so the team can find them in its log) and, with the tick, the
  project. **Send** sends it; an account sends at most 10 reports a day.
- **My reports:** a new reply from the team puts a dot on the **Account** button and the number of reports with a new reply on
  the **My reports** row. When you open the list, the new replies are marked, and the sign goes out. A report with the
  project attached shows its size. Resolved reports are deleted automatically, with their picture and project, after the
  retention period (by default one year after they were resolved; see the privacy notice in the account panel).

- **Signing in:** **Sign in with Google**, or the email address and the password, with **Sign in**. **Create account** makes a
  new account with a password and sends a confirmation email; after you open the link in it, press **I have confirmed**.
  **Forgot password** sends a reset email.
- **The trial:** a new account has a 14-day trial, no card, with all functions. It starts at the first sign-in with a confirmed
  address (with Google, the address is already confirmed). The panel shows how many days are left.
- **After the trial:** G-code export and starting the program from the machine panel stop; drawing, operations, the toolpath
  and vector export stay. The team can give a free plan. The machine's manual commands (jog, zero, stop) always stay.
- **Without internet:** the app keeps the rights it received for 7 days (as the team sets it) from the last confirmation, then
  asks for a connection to confirm them again. At every start with a network, the rights are confirmed again by themselves.
- The display **Name** is changed from the panel, and **Sign out** closes the account in this browser.

Without an account, the app works as before. Below, **What data we keep** says what we keep about the account (and about the
reports) and why.

## Extensions
%% capitol: extensii
%% acopera: extensii.buton, extensii.trimite-selectia

An extension adds a window of its own to the app, for example Easy 3Draw. It isn’t part of the app: you install
it, and the app’s interface stays the same.

- The **Extensions** button (the puzzle piece next to the instance name) opens the menu: the installed extensions, the
  **Library**, then **Install from file (.zip)…**, **Install from address…** and **Manage extensions…**.
- The **Library** shows our extensions, published together with the app, for example Easy 3Draw: the name, the version,
  what it does, what it asks for in short and its size. **Install** opens the install window, with what the extension asks
  for in full; there, **Install** downloads the package, checks it against its fingerprint in the library and keeps it in
  this browser, and **Open** opens its window (**Close** leaves it for later). When the library has a newer version of an
  installed extension, its row in the menu says “update: …”, and **Update to …** brings it in one click, with its data; if
  the new version asks for something more, the window says what first, and **Update** installs it. The library is read each
  time the menu opens and needs an internet connection; without one, **Try again** asks for it again, and installed
  extensions work as before. A link like `…/#biblioteca=trenulet` opens Easy 3Draw’s window from the library; nothing
  downloads without your click. A package installed from a file or an address comes from outside the library, and the
  window says so.
- **Install from file** takes a `.zip` package. **Install from address** asks for the **Package address** (HTTPS), then
  **Download**; the host must allow downloads from other pages, otherwise you download the file yourself and install it
  from the file. A link like `…/#instaleaza=<address>` opens the same window with the address filled in; nothing downloads
  without your click.
- Before installing, the window shows the name, the version, where the package comes from, its files and their size, what
  the extension asks for (for example, to keep its data in this browser) and, if there is one, the version it replaces.
  **Install** keeps it in this browser (it works offline too); **Cancel** changes nothing. A damaged or wrong package is
  refused, with the reason.
- An extension that asked for it keeps its data (for example, its circuits) in this browser, at most 16 MB. A new version of
  it keeps them.
- An extension that asked for it can save files (for example, the G-code or the parts to print) as ordinary browser
  downloads: only data and drawings (`.zip`, `.json`, `.gcode`, `.stl` and the like), at most 64 MB each, never programs
  or pages.
- An extension that asked for it sees whether you are signed in to cvs2, with what name and plan, read-only: it can’t see
  your email, your password or your projects. Easy 3Draw shows it under **Layouts**; signing in or
  out (in another tab too) reaches the extension at once.
- The extension takes the app’s theme: light or dark (the one picked with **Theme**), the colours and the fonts; a theme you
  change reaches the extension at once. Easy 3Draw keeps only its own colours: the table, the wood, the bricks,
  the signal green.
- The extension also gets the app’s language. Easy 3Draw speaks Romanian or English, following **Language** in the
  top bar; when you change the language, it restarts by itself, after saving its work (the layout, the settings, the
  workshop). The comments in the G-code stay in Romanian, as in the app’s own export.
- A click on an extension in the menu opens its window: a tab with its name appears next to **Design** and **Machine**, and
  below it, on the whole screen, sits the extension. Switch to another window any time: the extension stays open, with what
  you did in it, and a drawing command picked from **Search commands** takes you to Design first. **×**, next to its name,
  closes the extension: first it gives it a few seconds to save what it had to save (Easy 3Draw then saves its
  circuit, its settings and its workshop). If unsaved changes are still left, it asks you: **Stay** (or Escape) keeps it
  open, **Close anyway** closes it, and the changes are lost. Likewise, while the extension has unsaved changes, reloading or
  closing the tab asks you, through the browser’s window. After the page reloads, the app starts without the extension. F1
  opens this chapter.
- An extension that asked for it can use the machine, through the **Machine** window: it sees its state (the connection, the
  job with its percentage, the loaded program), loads a G-code program, checked like one loaded with **File…** (the Machine
  window writes next to it where it came from), pauses and stops the job. To start or resume the job, it asks you first, in
  a window of the app: which extension asks, which program (the name, the lines, the start of the fingerprint) and what
  resumes. The button that moves the machine can be pressed only after a second, and **No** or Escape send nothing. The
  connection, jogging, zeroing, probing, unlocking, manual commands and continuing after a stop in the program stay in the
  Machine window. On the live instance, extensions don’t use the machine for now.
- Such an extension can also send a whole job (for example, “Send to cvs2” in Easy 3Draw): it comes in the
  **Incoming job** dialog, like one from an app opened next to it, with the extension as its origin.
- An extension that asked for it receives shapes from the drawing and proposes shapes for the drawing. Choose shapes on
  the sheet: the selection bar shows **Send to extension**, with the name of the open extension (for example, **Send to
  Easy 3Draw**; also in **Search commands**). The chosen outlines go to the extension, in mm, and its window
  opens; Easy 3Draw raises them in 3D, in its workshop, under **From cvs2**. The extension sees the drawing in no
  other way. The other way round, an extension can propose an SVG or DXF file (Easy 3Draw: a board from its CNC
  export, with **Into the cvs2 drawing**): the **Import** window opens, with “Proposed by” and the extension's name, and
  nothing enters the drawing until you press **Import**.
- Easy 3Draw also uses the machine from its CNC export, under **On the machine, through cvs2**: it loads a file,
  starts it (with the question above), pauses, resumes and stops it. The machine’s state sits above the buttons.
- The extension runs isolated: it can’t see your projects or the machine’s port, and it can’t reach the internet; of your
  account it sees only what you allowed it (above); it talks to the app only through what the app gives it.
- **Manage extensions** shows the installed ones, with their source, date and how much their data takes; **Remove** deletes
  one, together with its data, **Close** closes the window.

## Keyboard shortcuts
%% capitol: scurtaturi

| Key | What it does |
|---|---|
| `Ctrl+Z` | Undo |
| `Ctrl+Y`, `Ctrl+Shift+Z`, `Ctrl+Shift+Y` | Redo |
| `Ctrl+D` | Duplicate |
| `Ctrl+G` | Group |
| `Ctrl+Shift+G` | Ungroup |
| `Delete` | Delete selection |
| `Ctrl+K` | Search commands |
| `Home` | Show the whole sheet |
| `PageUp`, `PageDown` | Previous sheet, Next sheet (the active sheet, along the list of sheets) |
| `T` | Show toolpath |
| `V` `S` `N` `K` `B` `R` `O` `E` `L` `P` `X` | the tools: Select, Transform, Nodes, Knife, Pen, Rectangle, Circle, Ellipse, Line, Polygon, Text (the key is also written in the button's corner) |
| `Shift+H`, `Shift+V` | Flip horizontally, Flip vertically |
| the arrow keys | move the selection 1 mm (Shift: 10 mm, Alt: 0.1 mm); in the 3D view, rotate the sheet |
| `Alt+←`, `Alt+→` (in the Text tool's text) | the space between selected letters, 0.1 mm tighter / looser |
| `Shift` + click, `Shift` + drag | add to the selection (on a click, a shape already chosen leaves it) |
| `Shift+L` | turns snapping on or off, also while dragging |
| `Alt`, while dragging a shape, a guide or a node (and with Pen) | inverts snapping |
| `Shift` / `Ctrl` / `Alt`, while dragging a handle (Transform tool) | proportional on any handle / free on any handle / about the anchor (the centre by default); they can be held together, and with Shift and Ctrl, Shift wins |
| double-click on the anchor target (Transform tool) | the anchor back to the point chosen in the picker |
| `Shift` / `Ctrl` / `Alt`, while drawing | square, circle, 15° steps / no proportion (the circle becomes an ellipse) / from the centre (the line, from the middle) |
| `Delete`, `Backspace` (with the Nodes tool and a node chosen) | removes the chosen node |
| `Enter` (with the Pen tool) | finishes the path you started |
| `Ctrl+Z`, `Ctrl+Y` (with the Pen tool and a path started) | undoes / redoes the last step of the path |
| `Ctrl+Shift+Z` (right after a path finished with the Pen) | reopens the path, with its steps |
| `Backspace`, `Delete` (with the Pen tool and a path started) | removes the last node placed |
| `Alt`, while you drag a handle (Nodes tool) | splits the node's handles; on split ones, joins them again |
| `Esc` | cancels the shape or path you started, lets go of the chosen node, goes back to Select, closes the 3D view and the windows |
| `F1` | the manual, at the current chapter |

On a Mac, `Ctrl` is `⌘`.
