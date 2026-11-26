# Mexico City Simulation — Hotel Jacaranda

A 3D first-person game in the browser. You've just checked into room 1207 at
the (fictional) Hotel Jacaranda, twelve floors above Paseo de la Reforma in
Mexico City. Walk around the room, open things up, step out onto the balcony,
and watch the city light up at night.

The buttons at the top left take you to two more places:

- **Go to stadium** — **Arena México**, the cathedral of lucha libre. No
  luchadores yet: just you, the ring, and (once you open the doors) a few
  thousand fans.
- **Go to aviary** — the **bird trail at Chapultepec Zoo**: a U-shaped forest
  path lined with mini aviaries, emu and rhea paddocks, trumpeter swans, and a
  big pond of black swans, ducks and geese in the middle.

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

## Chapultepec Zoo bird trail

A dirt trail curves through the forest in a U. Both ends of the U are closed
off with yellow **"AUTHORIZED ACCESS ONLY"** caution tape, so you walk from
one end, around the curve, and back down the other side. The U is wide (the
legs are 72 m apart) with thick forest and a big pond in between, so you
can't see across to the other side. The right leg's tape sits about 7 m
farther down than the left one, leaving a cleared plot for another exhibit.
Every enclosure is fenced.

On the left leg (on your left as you walk):

1. **Peacocks** — a blue peacock, a white one and a peahen. Whistle and a
   peacock struts over and fans out his tail.
2. **Emus** — a fenced paddock with a shelter and trough. Toss in some feed
   and they come striding over, drumming.
3. **Parakeets** — a flock of green and blue budgies. Hold out a seed stick
   and they line up on the bar in front of you.
4. **Greater rheas** — five rheas, two of them albino (pure white). Feed
   them and they trot over to the trough.
5. **Macaws** — scarlet and military macaws. Feed them and they come down to
   the tray.

Around the curve:

6. **Trumpeter swans** — on your left, three swans on their own fenced pond.
   Call to them and they answer and glide over.
7. **The big pond** — on your right, filling the middle of the U: two black
   swans, mallards, wood ducks, mandarin ducks, whistling ducks, Canada geese
   and farm geese, with reeds, lily pads and an island duck house. Toss food
   from the dispenser and they all race over.

On the right leg (on your right):

8. **Parrots** — yellow-headed and red-crowned parrots. Say ¡hola! and one
   flies over and talks back.
9. **Mixed aviary** — a peacock, macaws, parrots and parakeets together. Fill
   the feeder and everyone comes to eat.

Along the way: signs about each bird, a bench looking out over the pond,
binoculars for spotting the wild toucan (it hides in a different treetop
each visit, off to the side or behind you, so look all around) and the wild
monk parakeets that fly over the forest, and a photo spot that gives
you a polaroid of the mixed aviary.

It has its own fourteen-item bird-spotter checklist.

## How it's built

- [three.js](https://threejs.org) r165 from a CDN — no build step, no installs.
- Every texture (wood floor, tiles, rug, city windows, the painting) is
  painted on a `<canvas>` in code, so there are no image files.
- Sounds (city traffic, running water, the crowd, the ring bell, the light
  show beat, birdsong, squawks, whistles, emu drumming, honks and quacks) are synthesized with the Web
  Audio API.

| File | What it does |
| --- | --- |
| `index.html`, `css/style.css` | Page, HUD and menus |
| `js/main.js` | Renderer, input, checklist, game loop |
| `js/room.js` | The hotel room: walls, furniture, lights and everything you can use |
| `js/city.js` | Sky, sun, day/night, the city, traffic, landmarks, volcanoes |
| `js/arena.js` | Arena México: stands, ring, stage, shops, fans, light show |
| `js/aviary.js` | Chapultepec Zoo bird trail: forest path, aviaries, paddocks, ponds, birds, binoculars |
| `js/player.js` | Walking, collisions, stairs, sitting, hops into the ring |
| `js/textures.js` | Procedural textures |
| `js/audio.js` | Procedural sound |

Add `?debug` to the URL to get a `hotel` object in the browser console for
poking at the game (teleporting, stepping the simulation, etc.).
