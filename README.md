# Mexico City Simulation — Hotel Jacaranda

A 3D first-person game in the browser. You've just checked into room 1207 at
the (fictional) Hotel Jacaranda, twelve floors above Paseo de la Reforma in
Mexico City. Walk around the room, open things up, step out onto the balcony,
and watch the city light up at night.

## Play

Open `index.html` through any static web server (it uses ES modules, so
double-clicking the file won't work):

```bash
npm start          # runs a tiny server at http://localhost:8091
```

It also works as-is on GitHub Pages: in the repo's **Settings → Pages**, pick
the `main` branch and the root folder.

### Controls

| Desktop | Phone / tablet | |
| --- | --- | --- |
| `W` `A` `S` `D` or arrow keys | Left thumb joystick | Walk |
| Mouse | Drag anywhere | Look around |
| `E`, `Space` or click | Tap, or the **Use** button | Use whatever you're looking at |
| `Shift` | Push the joystick all the way | Walk faster |
| `N` | Sun/moon button | Day / night |
| `M` | Speaker button | Sound on / off |
| `T` | Tap the checklist | Show / hide the checklist |
| `Esc` | | Pause |

## What's in the room

- **Bedroom** — king bed with a sarape runner, two talavera lamps, a painting
  of the volcanoes, a Zapotec-style rug, a TV with a little local channel,
  a desk, an armchair and floor lamp, and an organ pipe cactus.
- **Balcony** — slide the glass door open (after opening the curtains) and
  step out. Below: Reforma's traffic (pink-and-white taxis included),
  jacaranda trees, and the Ángel de la Independencia. On the horizon:
  Popocatépetl and Iztaccíhuatl.
- **Bathroom** — blue-and-white talavera tiles, a hand-painted vessel sink,
  a walk-in rain shower, and a sunburst mirror with a real reflection.
- **Entry** — wardrobe, minibar with a mini fridge and coffee, your suitcase,
  the light switch, and the front door (lock it).

You can sit in the chairs and lie on the bed. A checklist of ten things to do
tracks your progress as you settle in.

## How it's built

- [three.js](https://threejs.org) r165 from a CDN — no build step, no installs.
- Every texture (wood floor, tiles, rug, city windows, the painting) is
  painted on a `<canvas>` in code, so there are no image files.
- Sounds (city traffic, running water, clicks) are synthesized with the Web
  Audio API.

| File | What it does |
| --- | --- |
| `index.html`, `css/style.css` | Page, HUD and menus |
| `js/main.js` | Renderer, input, checklist, game loop |
| `js/room.js` | The hotel room: walls, furniture, lights and everything you can use |
| `js/city.js` | Sky, sun, day/night, the city, traffic, landmarks, volcanoes |
| `js/player.js` | Walking, collisions, sitting and lying down |
| `js/textures.js` | Procedural textures |
| `js/audio.js` | Procedural sound |

Add `?debug` to the URL to get a `hotel` object in the browser console for
poking at the game (teleporting, stepping the simulation, etc.).
