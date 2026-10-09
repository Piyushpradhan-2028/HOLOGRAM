# Hologram 3D

Dotted 3D holograms of 80 models (20 cars, 20 bikes, 20 war vehicles, 20 guns) controlled with hand gestures through your webcam, or with the mouse.
Built with React, Vite, Three.js and MediaPipe Hand Landmarker.

## Run it (VS Code)
1. Install Node.js 18 or newer.
2. Open this folder in VS Code, then open a terminal and run:
   ```bash
   npm install
   npm run dev
   ```
3. Open the address shown (usually http://localhost:5173) in Chrome or Edge.
4. Click **Start camera** and allow access. The first start downloads the hand model, so it needs internet.

Production build: `npm run build`, then `npm run preview`.

## Gestures (camera)
| Gesture | Action |
|---|---|
| Pinch (thumb + index) and move | Move the model |
| Two hands, move apart or together | Zoom |
| Index finger only | Rotate |
| Open palm | Explode into parts |
| Fist | Assemble again |
| Two fingers held for about half a second | Next model |

## Mouse and keyboard (no camera needed)
- Drag: rotate. Wheel: zoom. Shift-drag or right-drag: move. Double-click: reset.
- Two-finger pinch on touch screens: zoom.
- Keys: Left/Right switch model, H pyramid hologram, E explode, R reset, / search.

## Control panel (right side)
Search, category chips (All, Cars, Bikes, War, Guns), the model list, and settings for zoom, explode, dot size, brightness, spin speed, colour theme, labels, floor and quality. On narrow screens the panel becomes a bottom sheet.

## Folder layout
```
src/models.js     shape builders (loft, tube, torus ...) and the 20 cars
src/vehicles.js   20 bikes and 20 war vehicles
src/guns.js       20 guns
src/catalog.js    joins everything into the model list
src/hologram.js   Three.js dot renderer, shader, labels, pyramid mode
src/hands.js      MediaPipe hand tracking
src/gestures.js   turns hand landmarks into actions
src/App.jsx       UI and main loop
src/App.css       responsive styling
```

## Add a model
Add an entry to `CARS`, `BIKES`, `WAR` or `GUNS` with a name, tags and a generator that returns parts, for example `part('Body', C.body, () => loft(...))`. It appears in the list automatically.

## Troubleshooting
- "Hand model could not be downloaded": check your internet, then press Try again. Mouse controls keep working.
- Black screen: use Chrome or Edge, turn on hardware acceleration (Settings > System), and update your graphics driver. Hand tracking runs on the CPU on purpose, to avoid a clash with the 3D canvas.
- Choppy: lower **Quality** in settings; close other tabs; use a browser with hardware acceleration on.
- No camera prompt: camera access needs `localhost` or HTTPS.
