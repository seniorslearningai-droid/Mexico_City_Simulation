# Mexico City Simulation — Air BnB

A 3D first-person game in the browser. You've just checked into suite 602 on the sixth floor of
the (fictional) Air BnB, overlooking Paseo de la Reforma in
Mexico City. Explore the suite, open things up, step out onto the balcony,
and watch the city light up at night.

Open **Places** at the top left to visit the room, stadium, castle, or
Bandera Monumental. Choose **Zoo map** to travel to a marked zoo destination.

- **Go to stadium** — **Arena México**, the cathedral of lucha libre. No
  luchadores yet: just you, the ring, and (once you open the doors) a few
  thousand fans.
- **Aviary** — the **bird trail at Chapultepec Zoo**: a U-shaped forest
  path lined with mini aviaries, emu and rhea paddocks, trumpeter swans, and a
  big pond of black swans, ducks and geese in the middle.
- **Panda Complex** — the **Pabellón del Panda** at Chapultepec Zoo, home
  to one giant panda, Xin Xin, who mostly keeps to herself.
- **Coastal Zone** — the **Franja Costera** at Chapultepec Zoo, with
  Humboldt penguins, California sea lions, and two pressed-coin designs.
- **Axolotl Exhibit** — the **Ajolotario** at Chapultepec Zoo, with a hall of
  freshwater tanks and an axolotl coin press outside.
- **Go to castle** — the **Castillo de Chapultepec**, with the Alcázar
  garden, carriage hall, and a gallery of period artifacts.
- **Temperate Forest** — the **Bosque Templado**, a loop past thirteen outdoor
  habitats and an indoor Nocturnario.
- **Tropical Forest** — the **Bosque Tropical** at Chapultepec Zoo: big
  cats, monkeys, a crocodile, a sloth, bats and more along jungle paths.
- **ATM** — a small bank vestibule whose ATM trades a $20 peso bill for
  four $5 coins.
- **Go to Bandera Monumental** — a huge plaza with a 50 m flagpole, a giant
  waving Mexican flag (and its shadow), and stalls selling traditional toys.

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
| Hold `Shift` | Push the joystick all the way | Sprint (more than three times walking speed) |
| Tap `Shift` | | Dash: a quick burst forward in the direction you're moving |
| `N` | Sun/moon button | Day / night |
| `M` | Speaker button | Sound on / off |
| `T` | Tap the checklist | Show / hide the checklist |
| `1`–`9`, `0`, `-` (or `G` to cycle) | **Places** menu and Zoo map | Switch destinations |
| `Z` | **Places** → **Zoo map** | Open the map and select a zoo destination |
| `K` | Mask button | Put your luchador mask on / off (after you buy one) |
| `B` | Backpack button (top right) | Open your backpack of souvenirs |
| `Esc` | | Pause |

## What's in the suite

Suite 602 is a whole apartment. Walk in through the front door and:

- **Kitchen** (right beside the front door, on your right) — a compact
  L-shaped kitchen that reaches no further east than the living room: teal
  cabinets and talavera tiles, a fridge that opens (nearest the door), a
  sink and a stove whose burners glow, and a coffee machine on the counter
  by the door (make a café de olla).
- **Dining room** (straight ahead, through the arch) — a round table, four
  chairs, a pendant lamp and a sideboard.
- **Living room** (beyond the dining room) — a big three-seat couch facing a
  wall-mounted TV across the room (it has a little local channel), an armchair, a coffee table, a painting of
  the volcanoes and the sliding door to the **balcony**. Below:
  Reforma's traffic (pink-and-white taxis included), jacaranda trees and the
  Ángel de la Independencia; on the horizon, Popocatépetl and Iztaccíhuatl.
- **Hallway** (to the left of the dining room) — it runs across, so from the
  dining room you only see the bathroom door opposite. Inside it:
  - straight ahead, the **bathroom** (compact): talavera tiles, a
    hand-painted vessel sink, a sunburst mirror with a real reflection, a
    toilet and a walk-in rain shower;
  - on the left, a **bedroom** with a queen bed, a desk and a wardrobe;
  - on the right, a **walk-in closet** (clothes, shelves and a safe) and then
    the **master bedroom** with a king bed, two talavera lamps and a window
    onto the city.
  - Inside the closet is a **second bathroom** with a bathtub you can fill.

The interior doors open and close, and you can sit on the couch and the
chairs and lie on the beds. A fourteen-item checklist tracks your progress
as you settle in.

### Outside your door: the atrium

The front door really opens (the latch on the inside locks it). Step out
through the little vestibule and you're on a gallery on the left arm of a
long **U** that wraps round an open-air atrium. Walls with room doors run
along the outside of the U, and a glass railing along the inside:

- **Three rooms on each side.** Yours, 602, is the middle one on the left
  (601 and 603 are your neighbours; 604–606 are across the well). Only your
  room opens — there's a **Suite 602 key card in your backpack**, and every
  other door is locked.
- **The well** goes all the way down to the lobby on floor 1 and all the way
  up to the open sky (no roof), with galleries on every floor.
- **The bottom of the U** has **two elevators and the stairs**. Ride (or
  walk) down to the **lobby**, with its fountain, palms, reception desk and
  two lounges of couches where you can rest and look up through the whole
  building; then ride back up to floor 6.

## Arena México

- **Entrance stage** — a big LED screen, a lighting truss, and the tunnel
  doors. Open the doors and the fans pour in and fill the seats.
- **Merch stand** — choose a mask color from the display and buy it for 15 pesos. Put it on and you
  see the world through its eye holes; your reflection in the hotel mirror
  wears it too.
- **Snack stand** — buy chile-lime popcorn for 10 pesos. The stand also has
  tacos al pastor, churros, and agua de jamaica.
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
pandas (20 pesos each), benches, and a photo spot that snaps a polaroid of Xin Xin.

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

## Chapultepec Zoo axolotl exhibit

Walk in from the plaza to explore nine freshwater tanks with animated
pink, golden, and wild-type axolotls. Look for their feathery gills, read an
exhibit sign, and use the photo spot at the end of the hall. Outside, insert
two coins and turn the gear three times to press an **Axolotl** souvenir coin.

Choose **Places** → **Zoo map**, or press `Z`, to view the map during
play and pick a marked destination. [Open the illustrated Chapultepec Zoo map for kids](docs/chapultepec-zoo-kids-map.png).

## Castillo de Chapultepec

Start in the Alcázar’s formal garden, by the fountain and the round
Caballero Alto tower. Take a garden photo, then follow the stairs behind
the tower into the carriage hall. Read the plaques for the imperial gala
coach, the everyday coach, and Benito Juárez’s calesa. Beyond the coaches,
the artifact gallery has modeled examples of dining pieces and period dress.

The route is condensed for the game. The models and labels draw on the
[Museo Nacional de Historia’s Alcázar guide](https://mnh.inah.gob.mx/salas-del-alcazar)
and [the museum’s floor plan](https://lugares.inah.gob.mx/images/museos/planos/72_historia_chapultepec.pdf).

## Chapultepec Zoo temperate forest

Follow the shaded loop past the tiger, maned wolf, deer, gray fox, bears,
Canadian wolves, raccoon dogs, macaques, margay, and snow leopard. Visit
the Nocturnario to see an owl, read the bilingual enclosure signs, and take
a Bengal tiger photo. There are eight checklist activities.

## Chapultepec Zoo tropical forest

Based on the zoo's own map of the **Bosque Tropical**. From the entrance, a
loop path circles the section with a cross path through the middle, and a
map board by the entrance shows where everything is. 22 enclosures line the
paths, each with a sign (Spanish name, English name, scientific name and a
fact):

- **Cats** — jaguar, black jaguar, ocelot, margay (tigrillo), leopard and the
  main attraction: a pride of three lions in a huge enclosure (26 × 23 m) with
  a boulder kopje, shade trees and a waterhole behind a long glass front. The
  big cats pace along their glass; the lion roars now and then.
- **Monkeys** — spider monkeys swinging on ropes, siamangs that hoot, ring-tailed
  lemurs, white-faced, white-throated and tufted capuchins, stump-tailed
  macaques, cotton-top tamarins and patas monkeys.
- **Others** — golden agoutis, red brocket deer (temazate), a crocodile that
  basks and swims, spotted hyenas, a spectacled bear, a sloth hanging in its
  tree, and a dim bat house you can peek into.

The enclosures are open-top fences (mesh panels on posts, nothing overhead).
Animals walk around rocks, tree trunks, logs and water and never through a
fence; the crocodile basks on the sand and swims laps that keep it in its pond.

It has its own ten-item jungle-explorer checklist.

## Bandera Monumental

A huge paved plaza ringed by trees, with the city skyline beyond. In the
middle, on a stepped stone base, stands a 50 m steel flagpole flying a
giant Mexican flag (25 × 14.3 m) that ripples in the wind. The sun is high,
so the flag's shadow lies across the paving and ripples along with it — walk
into it. Read the plaque on the base, sit on a bench to look up at the
flag, and watch the other visitors strolling round.

Along the left side, three stalls sell traditional toys for $5 coins:

| Stall | Toys |
| --- | --- |
| Juguetes de madera | trompo $10, balero $10, wooden yo-yo $10 |
| Juegos y fiesta | lotería $20, matraca $15, piñata $20 |
| Artesanías | alebrije $30, luchador figure $25, matatena $5 |

Toys you buy go in a new **Juguetes · Toys** section of your backpack. The
plaza has its own six-item checklist.

## Pesos

Shiny $5 peso coins lie around Arena México, the aviary trail, the panda
exhibit, coastal zone, axolotl plaza, temperate forest and tropical forest (never in the hotel), with extra ones near the
shops and all over the arena. They're not easy to spot: each game only some
of the hiding spots get a coin, and they lie flat on the ground, giving
themselves away only with a quick glint now and then. Walk right over one to
pick it up; a coin counter
appears next to the backpack. The souvenir coin presses take **2 coins per
pressed coin**.

Somewhere in the zoo there is also **one $20 peso bill**. It hides in a
different tucked-away spot each game, lies flat and dull on the ground and
never glints. Take it to the **ATM** (marked on the Zoo map): touch
the screen to feed the bill in, take the four $5 coins from the tray, then
take your receipt. The keypad shows your balance. The ATM on the right is out
of service.

## Your backpack

The backpack button in the top right corner (or `B`) opens your souvenirs
from every place: the luchador masks you bought at Arena México (click one
to wear it), souvenir coins from the zoo's coin machines, panda plushies,
and photos from the photo spots (click one to see it again). A little badge
counts them, and the button bounces whenever you pick something up.

## How it's built

- [three.js](https://threejs.org) r165 from a CDN — no build step, no installs.
- Every texture (wood floor, tiles, rug, city windows, the painting) is
  painted on a `<canvas>` in code, so the 3D scenes need no external texture files.
- Sounds (city traffic, running water, the crowd, the ring bell, the light
  show beat, birdsong, squawks, whistles, emu drumming, honks, quacks, crunching bamboo, a snoring panda and the coin machine's clinks, ratchet and ka-chunk) are synthesized with the Web
  Audio API.

| File | What it does |
| --- | --- |
| `index.html`, `css/style.css` | Page, HUD and menus |
| `js/main.js` | Renderer, input, checklist, game loop |
| `js/room.js` | The hotel suite: every room's walls, doors, furniture, lights and everything you can use |
| `js/atrium.js` | The hotel's open-air atrium outside the suite: U-shaped galleries, locked neighbours, elevators, stairs and the lobby |
| `js/city.js` | Sky, sun, day/night, the city, traffic, landmarks, volcanoes |
| `js/arena.js` | Arena México: stands, ring, stage, shops, fans, light show |
| `js/aviary.js` | Chapultepec Zoo bird trail: forest path, aviaries, paddocks, ponds, birds, binoculars |
| `js/pesos.js` | Loose $5 peso coins to pick up, and the wallet they go into |
| `js/pandas.js` | Chapultepec Zoo panda exhibit: terrace, yard, Xin Xin and her daily routine, family tree, coin machine, and the flamingo lagoon next door |
| `js/coastal.js` | Chapultepec Zoo coastal pools and animals |
| `js/axolotls.js` | Indoor axolotl tanks and outdoor plaza |
| `js/zoo-press.js` | Shared coastal and axolotl souvenir presses |
| `js/castle.js`, `js/castle-carriages.js` | Chapultepec Castle garden, museum galleries, and carriages |
| `js/forest.js`, `js/forest-animals.js` | Temperate Forest trail, habitats, and animal models |
| `js/tropical.js` | Chapultepec Zoo tropical forest: paths, 22 enclosures, cats, monkeys and the other animals, signs, zoo map |
| `js/atm.js` | The bank vestibule and the ATM that trades the $20 bill for coins |
| `js/bandera.js` | The Bandera Monumental plaza: flagpole, waving flag and its shadow, toy stalls, visitors |
| `js/player.js` | Walking, collisions, stairs, sitting, hops into the ring |
| `js/textures.js` | Procedural textures |
| `js/audio.js` | Procedural sound |

Add `?debug` to the URL to get a `hotel` object in the browser console for
poking at the game (teleporting, stepping the simulation, etc.).
