# Mexico City Simulation — Hotel Jacaranda

A 3D first-person game in the browser. You've just checked into suite 1207 at
the (fictional) Hotel Jacaranda, twelve floors above Paseo de la Reforma in
Mexico City. Explore the suite, open things up, step out onto the balcony,
and watch the city light up at night.

The buttons at the top left take you to four more places:

- **Go to stadium** — **Arena México**, the cathedral of lucha libre. No
  luchadores yet: just you, the ring, and (once you open the doors) a few
  thousand fans.
- **Go to aviary** — the **bird trail at Chapultepec Zoo**: a U-shaped forest
  path lined with mini aviaries, emu and rhea paddocks, trumpeter swans, and a
  big pond of black swans, ducks and geese in the middle.
- **Go to panda exhibit** — the **Pabellón del Panda** at Chapultepec Zoo, home
  to one giant panda, Xin Xin, who mostly keeps to herself.
- **Go to coastal zone** — the **Franja Costera** at Chapultepec Zoo, with
  Humboldt penguins, California sea lions, and two pressed-coin designs.

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
| `1`–`5` (or `G` to cycle) | Buttons at the top left | Go to the hotel, the stadium, the aviary, the panda exhibit, or the coastal zone |
| `K` | Mask button | Put your luchador mask on / off (after you buy one) |
| `B` | Backpack button (top right) | Open your backpack of souvenirs |
| `Esc` | | Pause |

## What's in the suite

Suite 1207 is a whole apartment. Walk in through the front door and:

- **Kitchen** (on your right) — teal cabinets and talavera tiles, a fridge
  that opens, a stove whose burners glow, a sink, a coffee machine (make a
  café de olla), and an island with three stools.
- **Dining room** (straight ahead) — a small room with a round table, four
  chairs, a pendant lamp, a sideboard and a serving hatch to the kitchen.
- **Living room** (beyond the dining room) — a big sectional couch facing a
  TV with a little local channel, an armchair, a coffee table, a painting of
  the volcanoes, a window and the sliding door to the **balcony**. Below:
  Reforma's traffic (pink-and-white taxis included), jacaranda trees and the
  Ángel de la Independencia; on the horizon, Popocatépetl and Iztaccíhuatl.
- **Hallway** (to the left of the dining room) — it runs across, so from the
  dining room you only see the bathroom door opposite. Inside it:
  - straight ahead, the **bathroom**: talavera tiles, a hand-painted vessel
    sink, a sunburst mirror with a real reflection and a walk-in rain shower;
  - on the left, a **bedroom** with a queen bed, a desk and a wardrobe;
  - on the right, a **walk-in closet** (clothes, shelves and a safe) and then
    the **master bedroom** with a king bed, two talavera lamps and a window
    onto the city.
  - Inside the closet is a **second bathroom** with a bathtub you can fill.

The interior doors open and close, and you can sit on the couch, the chairs
and the stools and lie on the beds. A thirteen-item checklist tracks your
progress as you settle in.

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

## Chapultepec Zoo panda exhibit

You arrive on a small plaza with paper lanterns and walk straight onto a
terrace that looks through a glass wall into the panda yard: grass, bamboo
groves, a rock cliff with a cave, a pool with a little waterfall, a wooden
climbing tower and a keepers' bamboo pile. The panda house, where she sleeps
at night (keepers only), sits beside the yard.

The yard is home to just one panda, **Xin Xin**, and she keeps to herself.
She follows her own calm routine: munching bamboo (holding the stalk in her
paws), pottering about, sitting by the pool and napping sprawled on her
tummy (with sleepy z's). Look right at her to spot her, and keep watching to
catch her eating and napping.

On the wall beside the terrace is a painted **family tree** of Chapultepec's
pandas: Pe Pe and Ying Ying (who came from China in 1975), their seven cubs
(Xen Li, Tohui, Liang Liang, an unnamed cub, Xiu Hua, Ping Ping and Shuan
Shuan), and Tohui and Chia Chia's daughter, Xin Xin. It shows each panda's
years, whether they were male or female, and a black ribbon in memory of
Shuan Shuan.

Around the terrace and the plaza: a keeper who's happy to chat about pandas,
signs about Mexico's pandas and about Xin Xin, a souvenir kiosk with plush
pandas, benches, and a photo spot that snaps a polaroid of Xin Xin.

On the plaza there's a **souvenir coin machine**, like the pressed-penny
machines at real zoos. Pick the panda or the flamingo, drop two coins in the
slot, then turn the gear-shaped crank three times. You can watch the gears
turn and the coin get squashed flat behind the glass. The finished copper
coin, stretched long with your animal pressed into it, drops into the tray.
Take it to see it up close.

**Next door: the flamingos.** A boardwalk off the plaza leads to a separate
fenced lagoon of Caribbean flamingos (not part of the panda exhibit). They
wade and feed with their heads down, preen, honk, rest on one leg, and nest
on a little mud island. There's a sign about them and a bench to watch from.

It has its own ten-item panda-watch checklist.

## Chapultepec Zoo coastal zone

Two pools flank the visitor plaza. Look over the glass to spot Humboldt
penguins and California sea lions on the rocks and in the water. Read an
animal sign, use the bench or the penguin photo spot, and finish the
seven-item coastal checklist.

The plaza's coin press offers **Penguin** and **Seal** designs. Choose a
design, insert two coins, turn the gear three times, and take the pressed
coin from the tray. Both designs appear in your backpack.

## Your backpack

The backpack button in the top right corner (or `B`) opens your souvenirs
from every place: the luchador masks you bought at Arena México (click one
to wear it), souvenir coins from the zoo's two coin machines, panda plushies,
and photos from the photo spots (click one to see it again). A little badge
counts them, and the button bounces whenever you pick something up.

## How it's built

- [three.js](https://threejs.org) r165 from a CDN — no build step, no installs.
- Every texture (wood floor, tiles, rug, city windows, the painting) is
  painted on a `<canvas>` in code, so there are no image files.
- Sounds (city traffic, running water, the crowd, the ring bell, the light
  show beat, birdsong, squawks, whistles, emu drumming, honks, quacks, crunching bamboo, a snoring panda and the coin machine's clinks, ratchet and ka-chunk) are synthesized with the Web
  Audio API.

| File | What it does |
| --- | --- |
| `index.html`, `css/style.css` | Page, HUD and menus |
| `js/main.js` | Renderer, input, checklist, game loop |
| `js/room.js` | The hotel suite: every room's walls, doors, furniture, lights and everything you can use |
| `js/city.js` | Sky, sun, day/night, the city, traffic, landmarks, volcanoes |
| `js/arena.js` | Arena México: stands, ring, stage, shops, fans, light show |
| `js/aviary.js` | Chapultepec Zoo bird trail: forest path, aviaries, paddocks, ponds, birds, binoculars |
| `js/pandas.js` | Chapultepec Zoo panda exhibit: terrace, yard, Xin Xin and her daily routine, family tree, coin machine, and the flamingo lagoon next door |
| `js/coastal.js`, `js/coastal-press.js` | Chapultepec Zoo coastal pools, animals, interactions, and souvenir press |
| `js/player.js` | Walking, collisions, stairs, sitting, hops into the ring |
| `js/textures.js` | Procedural textures |
| `js/audio.js` | Procedural sound |

Add `?debug` to the URL to get a `hotel` object in the browser console for
poking at the game (teleporting, stepping the simulation, etc.).
