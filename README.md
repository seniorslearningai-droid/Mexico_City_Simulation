# Mexico City Simulation — Hotel Jacaranda

A 3D first-person game in the browser. You've just checked into room 1207 at
the (fictional) Hotel Jacaranda, twelve floors above Paseo de la Reforma in
Mexico City. Walk around the room, open things up, step out onto the balcony,
and watch the city light up at night.

The buttons at the top left take you to two more places:

- **Go to stadium** — **Arena México**, the cathedral of lucha libre. No
  luchadores yet: just you, the ring, and (once you open the doors) a few
  thousand fans.
- **Go to aviary** — the walk-through **aviary at Chapultepec Zoo**: a netted
  dome over a tropical garden full of macaws, parrots, a toucan,
  hummingbirds and waterbirds.

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
| `1` `2` `3` (or `G` to cycle) | Buttons at the top left | Go to the hotel, the stadium or the aviary |
| `K` | Mask button | Put your luchador mask on / off (after you buy one) |
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

## Arena México

- **Entrance stage** — a big LED screen, a lighting truss, and the tunnel
  doors. Open the doors and the fans pour in and fill the seats.
- **Merch stand** — buy a luchador mask (and swap designs). Put it on and you
  see the world through its eye holes; your reflection in the hotel mirror
  wears it too.
- **Snack stand** — tacos al pastor, churros, palomitas con chile, agua de
  jamaica.
- **The ring** — red, white and green ropes, padded turnbuckles, steel steps.
  Climb in, bounce off the ropes, climb a turnbuckle and jump, or slide out
  under the bottom rope.
- **Timekeeper's table** — ring the bell, or start the light show from the
  lighting desk (beams, music, a roaring crowd chanting "¡Lu-cha! ¡Lu-cha!").
- **Stands** — 20 rows in red, white and green. Walk up the aisles and take
  any empty seat, or sit ringside.

The arena has its own ten-item fan checklist.

## Chapultepec Zoo aviary

- **Flying birds** — scarlet and military macaws and yellow-headed parrots
  loop under the net; more perch in the trees and palms.
- **Macaw feeder** — fill it and three macaws swoop down to eat.
- **Hummingbird garden** — stand by the nectar feeder among the heliconias
  and a hummingbird zips in to feed.
- **Pond** — an arched wooden bridge, a waterfall, whistling ducks (pijijes)
  you can feed, and roseate spoonbills wading in the shallows.
- **Lookout deck** — walk up the ramp and use the binoculars to zoom in and
  identify birds. The keel-billed toucan is hiding in the old ahuehuete tree.
- **Misting rain** — press the button near the entrance for a tropical mist
  and a rainbow over the pond.
- **Photo spot** — the camera glides to the best view and you get a polaroid.
- **Benches and signs** — sit and listen to the birdsong, or read about the
  birds.

It has its own ten-item bird-spotter checklist.

## How it's built

- [three.js](https://threejs.org) r165 from a CDN — no build step, no installs.
- Every texture (wood floor, tiles, rug, city windows, the painting) is
  painted on a `<canvas>` in code, so there are no image files.
- Sounds (city traffic, running water, the crowd, the ring bell, the light
  show beat, birdsong, squawks and whistles) are synthesized with the Web
  Audio API.

| File | What it does |
| --- | --- |
| `index.html`, `css/style.css` | Page, HUD and menus |
| `js/main.js` | Renderer, input, checklist, game loop |
| `js/room.js` | The hotel room: walls, furniture, lights and everything you can use |
| `js/city.js` | Sky, sun, day/night, the city, traffic, landmarks, volcanoes |
| `js/arena.js` | Arena México: stands, ring, stage, shops, fans, light show |
| `js/aviary.js` | Chapultepec Zoo aviary: net dome, garden, pond, birds, binoculars |
| `js/player.js` | Walking, collisions, stairs, sitting, hops into the ring |
| `js/textures.js` | Procedural textures |
| `js/audio.js` | Procedural sound |

Add `?debug` to the URL to get a `hotel` object in the browser console for
poking at the game (teleporting, stepping the simulation, etc.).
