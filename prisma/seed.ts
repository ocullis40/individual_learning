import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data (respecting foreign key constraints)
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.topic.deleteMany();

  console.log("Cleared existing data.");

  // Create root topic
  const nuclearEnergy = await prisma.topic.create({
    data: {
      name: "Nuclear Energy",
      description:
        "An introduction to nuclear energy, covering fundamental principles, current applications, and future potential.",
    },
  });

  // Create subtopics
  const nuclearFission = await prisma.topic.create({
    data: {
      name: "Nuclear Fission",
      description:
        "The process of splitting heavy atomic nuclei to release energy, the basis of all current nuclear power plants.",
      parentTopicId: nuclearEnergy.id,
    },
  });

  const nuclearFusion = await prisma.topic.create({
    data: {
      name: "Nuclear Fusion",
      description:
        "The process of combining light atomic nuclei to release energy, the mechanism that powers stars.",
      parentTopicId: nuclearEnergy.id,
    },
  });

  console.log(
    `Created topics: ${nuclearEnergy.name}, ${nuclearFission.name}, ${nuclearFusion.name}`
  );

  // Lesson 1: What is Nuclear Energy? (root topic)
  const lesson1 = await prisma.lesson.create({
    data: {
      title: "What is Nuclear Energy?",
      order: 1,
      difficultyLevel: 1,
      educationLevel: "college",
      topicId: nuclearEnergy.id,
      content: `# What is Nuclear Energy?

On a bitter December afternoon in 1942, beneath the abandoned squash courts of the University of Chicago's Stagg Field stadium, a small group of physicists gathered around an ungainly pile of graphite bricks and uranium slugs. Enrico Fermi, the Italian-born Nobel laureate who had fled Mussolini's Italy four years earlier, stood calmly issuing instructions as his team slowly withdrew the cadmium control rods. At 3:25 PM, the Geiger counters began to click faster — and then faster still — in a rhythm that would not stop. For twenty-eight minutes, **Chicago Pile-1** sustained the world's first controlled nuclear chain reaction before Fermi ordered the rods reinserted. Arthur Compton, who had overseen the project, placed a cryptic phone call to a government official: "The Italian navigator has just landed in the New World." The atomic age had begun.

What Fermi's team had demonstrated was something almost incomprehensible in its implications: that the nucleus of an atom — a speck of matter so small that a hundred million of them could line up across the width of a human hair — contained enough energy to reshape civilization. Roughly **a million times** more energy, reaction for reaction, than burning coal or any other chemical fuel. The question that has haunted us ever since is deceptively simple: can we use this power wisely?

## The Hidden Architecture of the Atom

To understand nuclear energy, you have to understand what holds an atom together — and what happens when that hold is broken. Every atom consists of a nucleus, a tightly packed cluster of protons and neutrons (collectively called **nucleons**), surrounded by a diffuse cloud of electrons. The nucleus itself is absurdly small, roughly one hundred-thousandth the diameter of the atom as a whole. If an atom were the size of a football stadium, its nucleus would be a marble on the fifty-yard line.

Yet almost all of the atom's mass is concentrated in that marble-sized core, bound together by the **strong nuclear force** — the most powerful force in nature, though it operates only at nuclear distances. The energy locked up in this binding is described by Einstein's famous equation, **E = mc²**: the nucleus weighs slightly less than the sum of its individual protons and neutrons, and that "missing" mass has been converted into the glue that holds everything together.

Here is the crucial insight. If you plot the **binding energy per nucleon** across all the elements, you find a curve that rises steeply from hydrogen, peaks at **iron-56** (about 8.8 MeV per nucleon), and then gently declines toward the heaviest elements. This curve is the Rosetta Stone of nuclear energy. Elements heavier than iron can release energy by splitting apart — this is **fission**. Elements lighter than iron can release energy by merging together — this is **fusion**. Nature, it turns out, has given us two doors to the same vault.

## Two Paths, One Promise

\`\`\`mermaid
graph TD
    A[Atomic Nucleus] --> B{Heavier than Iron?}
    B -->|Yes| C[Fission: Split Apart]
    B -->|No| D[Fusion: Combine Together]
    C --> E[Lighter Fragments + Energy]
    D --> F[Heavier Nucleus + Energy]
\`\`\`

Fission is the splitting of a heavy nucleus, such as **uranium-235** or **plutonium-239**, into lighter fragments. A single fission event releases approximately **200 MeV** of energy — enough to visibly move a grain of sand — along with two or three free neutrons that can go on to split other nuclei, sustaining a chain reaction. Every commercial nuclear power plant on Earth today runs on fission.

Fusion takes the opposite path: it forces light nuclei, typically the hydrogen isotopes **deuterium** and **tritium**, to merge into helium, releasing **17.6 MeV** per reaction. Though each individual fusion event produces less energy than a fission event, the fuel is lighter, and pound for pound the energy yield is comparable. More importantly, fusion fuel is virtually inexhaustible — deuterium can be extracted from ordinary seawater. The catch is that fusion demands temperatures exceeding **100 million degrees Celsius** to overcome the electrostatic repulsion between nuclei, and no one has yet built a reactor that produces more fusion energy than it consumes. Fusion remains the great unfinished project of physics.

## From Laboratory Curiosity to Global Infrastructure

The path from Fermi's graphite pile to today's global fleet of nuclear reactors is a story of breathtaking ambition, Cold War urgency, and hard-won lessons. In 1945, the **Manhattan Project** demonstrated nuclear energy's terrifying destructive potential at Hiroshima and Nagasaki. But a parallel dream was already taking shape: atoms for peace. In 1951, the **Experimental Breeder Reactor I** in Idaho lit four light bulbs with fission-generated electricity — the first time nuclear energy had produced usable power. Three years later, the Soviet Union's **Obninsk** plant became the first to feed nuclear electricity into a power grid, and Britain's **Calder Hall** followed in 1956 as the first full-scale commercial station.

Through the 1960s and 1970s, nuclear power expanded at a pace that would be unimaginable today. The United States, France, Japan, and the Soviet Union built hundreds of reactors. Then came the setbacks. The **Three Mile Island** accident in 1979 — a partial meltdown in Pennsylvania with no significant off-site radiation release — shattered public confidence in the United States. Seven years later, the **Chernobyl** disaster in Ukraine became the worst nuclear accident in history, caused by a fatally flawed reactor design and reckless operator decisions during a safety test. And in 2011, the **Fukushima Daiichi** catastrophe in Japan, triggered by a magnitude 9.0 earthquake and tsunami, reminded the world that even advanced industrial nations could be humbled by the atom.

## Where Nuclear Energy Stands Today

Despite these scars, nuclear power persists — and in some parts of the world, it is growing again.

| Metric | Value |
|---|---|
| Share of global electricity | ~10% |
| Operating reactors worldwide | ~440 |
| Reactors under construction | ~60 |
| Countries with nuclear power | 32 |
| Largest producer (by capacity) | United States (~95 GW) |
| Highest share of electricity | France (~70%) |
| Newest entrants | UAE (Barakah, 2020), Belarus (2020) |

France stands out as the most nuclear-dependent nation on Earth, drawing roughly **70%** of its electricity from 56 reactors — a legacy of a deliberate national strategy launched after the 1973 oil crisis. The United States operates the world's largest fleet, with **93 reactors** across 54 sites. And China is building faster than anyone, with over **20 reactors under construction** as of 2024, betting that nuclear power is essential to meeting its climate goals.

## The Case For — and Against

The arguments in favor of nuclear energy are formidable. Its lifecycle carbon emissions are comparable to wind and solar — roughly **10-20 g CO₂/kWh**, versus around 900 for coal. Its energy density is almost surreal: a single uranium fuel pellet, about the size of a pencil eraser and weighing just 7 grams, contains as much energy as **a tonne of coal** or **564 liters of oil**. Nuclear plants run at capacity factors above **90%**, humming along regardless of whether the wind is blowing or the sun is shining. And they are astonishingly compact — a 1 GW plant occupies roughly **1-3 square kilometers**, compared to the 50-100 square kilometers an equivalent solar installation would require.

But the case against is serious too. Spent nuclear fuel remains dangerously radioactive for thousands of years, and no country has yet opened a permanent deep geological repository for it — though Finland's **Onkalo** facility is tantalizingly close. New nuclear plants in Western countries cost **$6-12 billion** and take **10-15 years** to build, a financial and political ordeal that deters investors. The specter of severe accidents, however statistically rare, carries outsized psychological weight. And the link between civilian nuclear technology and weapons proliferation has never been fully severed.

## Clearing the Fog

Perhaps the most important step toward understanding nuclear energy is letting go of Hollywood myths. Nuclear reactors cannot explode like atomic bombs — reactor fuel is enriched to just 3-5% uranium-235, while a weapon requires above 90%. The physics simply will not allow it. Radioactive waste does not glow green; at most, intensely radioactive materials submerged in water can produce a faint, eerie blue light called **Cherenkov radiation**, caused by charged particles outrunning the speed of light in water. And far from being the deadliest energy source, nuclear is statistically among the safest: approximately **0.03 deaths per terawatt-hour**, compared to **24.6 for coal** and **2.8 for natural gas**.

The story of nuclear energy is far from over. As the world grapples with the twin pressures of rising energy demand and accelerating climate change, both fission and fusion will have roles to play. Understanding how they work — their promise and their peril — is no longer optional. It is essential.`,
    },
  });

  // Lesson 2: How Nuclear Fission Works (fission subtopic)
  const lesson2 = await prisma.lesson.create({
    data: {
      title: "How Nuclear Fission Works",
      order: 1,
      difficultyLevel: 2,
      educationLevel: "college",
      topicId: nuclearFission.id,
      content: `# How Nuclear Fission Works

Imagine you could freeze time and watch a single neutron drifting through the core of a nuclear reactor. It moves at roughly the speed of a rifle bullet — about 2,200 meters per second — weaving between trillions of uranium atoms packed into ceramic fuel pellets. Most of the atoms it passes are uranium-238, and they barely notice it. But then, in a moment that takes less than a billionth of a billionth of a second, the neutron wanders into the nucleus of a uranium-235 atom. What happens next powers cities.

## Anatomy of a Split

The uranium-235 nucleus, having absorbed the neutron, becomes uranium-236 — and it is furious with energy. Picture a water droplet wobbling on a vibrating surface. In 1939, Niels Bohr and John Archibald Wheeler described what happens next using exactly this analogy, their **liquid drop model**. The excited nucleus begins to oscillate and stretch, pulled in opposing directions. For an instant, it elongates into a peanut shape, the two lobes straining against each other. On one side, the **strong nuclear force** tries desperately to hold everything together. On the other, the **electrostatic repulsion** between all those positively charged protons is tearing the nucleus apart.

The repulsion wins.

The nucleus tears in two, producing a pair of **fission fragments** — typically unequal, something like barium-141 and krypton-92, or strontium-94 and xenon-140. These fragments fly apart at roughly 3% the speed of light, carrying about **167 MeV** of kinetic energy that instantly converts to heat as they slam into the surrounding fuel. Simultaneously, the split releases a burst of gamma radiation (about **6 MeV**), and — crucially — **two or three free neutrons**, each carrying roughly 2 MeV of kinetic energy.

\`\`\`mermaid
graph TD
    A[Neutron] --> B[Uranium-235]
    B --> C[Fission Products]
    B --> D[Energy: ~200 MeV]
    B --> E[2-3 Free Neutrons]
    E --> F[U-235 Atom]
    E --> G[U-235 Atom]
    F --> H[More Neutrons...]
    G --> I[More Neutrons...]
\`\`\`

Here is where the magic happens. Those newly liberated neutrons streak outward through the fuel, and if even one of them finds another uranium-235 nucleus and triggers another fission, the process repeats. The result is a **chain reaction**: one split becomes two, two become four, four become eight. In theory, the progression is exponential and explosive — this, after all, is the principle behind a nuclear weapon. But in a reactor, the chain reaction is held in exquisite balance. When exactly one neutron per fission event goes on to cause another fission on average, the reactor is said to be **critical**. Despite its alarming sound, this is simply the steady-state operating condition — not an emergency, but the quiet hum of controlled atomic fire.

If fewer than one neutron propagates, the reaction is **subcritical** and gradually fades. If more than one propagates, the reactor is **supercritical** — a condition used briefly during startup to bring power levels up, but dangerous if left unchecked. The entire art of reactor operation lies in walking this razor's edge.

## The Chosen Isotope

Of all the uranium atoms buried in the Earth's crust, only a tiny fraction — less than 1 in 140 — are the kind that can sustain a chain reaction. These are uranium-235 atoms, and what makes them special is almost absurdly simple: when a slow-moving neutron wanders into their nucleus, they shatter. The heavier uranium-238 atoms, which make up the other 99.3%, simply absorb the neutron and carry on.

The physics behind this selectivity is elegant. U-235 has 143 neutrons — an odd number. When it absorbs one more, it becomes U-236 with 144 neutrons, an even number. The energy gained by completing that neutron pair — physicists call it **pairing energy** — is enough to push the nucleus over its fission barrier without the incoming neutron needing any extra kinetic energy. U-235 presents a thermal neutron fission cross-section of approximately **585 barns**, a measure of how large a "target" the nucleus effectively offers to passing neutrons. U-238, by contrast, has a thermal fission cross-section of essentially zero.

This is why raw uranium ore cannot power a reactor. Natural uranium is only **0.7% U-235**, and that concentration must be carefully increased — **enriched** — to the 3-5% needed for most reactor fuel. The process is ingenious: uranium is converted to a gas, uranium hexafluoride (UF₆), and spun in centrifuges at dizzying speeds. The slightly heavier U-238 molecules migrate outward; the lighter U-235 molecules drift toward the center. Thousands of centrifuges in cascading series gradually concentrate the precious isotope to reactor-grade levels.

## The Astonishing Energy Within

The energy released by a single fission event — about **200 MeV** — sounds abstract until you translate it into everyday terms.

| Fuel | Energy per kg | Equivalent in coal |
|---|---|---|
| Natural uranium (LWR) | ~45,000 kWh | ~18 tonnes |
| Enriched uranium (3.5%) | ~50,000 kWh | ~20 tonnes |
| Uranium with reprocessing | ~650,000 kWh | ~260 tonnes |
| Coal | ~2.5 kWh | 1 kg |
| Natural gas | ~5.5 kWh | ~2.2 kg |

Consider a single uranium fuel pellet — a ceramic cylinder roughly the size of a pencil eraser, about a centimeter across and weighing just **7 grams**. That tiny object contains as much energy as **a tonne of coal**, **480 cubic meters of natural gas**, or **564 liters of oil**. You could hold a year's worth of energy for an average household in the palm of your hand. This extraordinary density is why a typical 1 GW reactor consumes only about **200 tonnes** of natural uranium per year — a few truckloads of raw material to power a million homes.

## Inside the Machine

A nuclear reactor is, at its heart, a sophisticated way to boil water. But the engineering required to do so safely is anything but simple. Each component plays a specific role in sustaining the chain reaction and converting atomic heat into electricity.

The **fuel rods** are where the action happens. Uranium dioxide ceramic pellets are stacked like coins inside slender tubes of **zirconium alloy** — chosen because zirconium is nearly transparent to neutrons while being tough enough to withstand years of intense radiation and heat. A typical pressurized water reactor core holds **40,000-50,000** of these rods, bundled into 150-250 fuel assemblies.

Threaded among the fuel assemblies are the **control rods**, made of neutron-hungry materials like **boron carbide** or **silver-indium-cadmium alloy**. Think of them as the reactor's throttle and brake combined. Withdraw them, and more neutrons survive to cause fissions — the reactor's power climbs. Push them in, and they swallow neutrons wholesale, tamping the reaction down. In an emergency, every control rod plunges into the core simultaneously — a **scram** — shutting the chain reaction down in seconds.

Between the fuel and the control rods, the **moderator** does invisible but essential work. Neutrons born in fission are fast — about 2 MeV of kinetic energy, far too energetic to efficiently trigger another fission in U-235. They need to be slowed down, or "thermalized," to the languid pace of about 0.025 eV where the fission cross-section is highest. In light-water reactors — the most common type worldwide — ordinary water serves double duty as both moderator and **coolant**, carrying heat from the core to steam generators at temperatures around 315 degrees Celsius and pressures of 155 bar. In boiling water reactors, the water boils directly in the core, sending steam straight to the turbines.

Surrounding all of this is the **containment structure**: a fortress of reinforced concrete and steel, typically **1-1.5 meters thick**, designed to withstand the pressure of a loss-of-coolant accident and prevent any release of radioactivity to the outside world.

## A Family of Designs

Not all reactors are built alike. Over the decades, engineers have developed several distinct approaches to sustaining a controlled chain reaction.

| Reactor Type | Moderator | Coolant | Fuel | Share of Global Fleet |
|---|---|---|---|---|
| **PWR** (Pressurized Water) | Light water | Pressurized light water | Enriched UO₂ (3-5%) | ~70% |
| **BWR** (Boiling Water) | Light water | Boiling light water | Enriched UO₂ (3-5%) | ~15% |
| **PHWR/CANDU** | Heavy water | Heavy water | Natural UO₂ (0.7%) | ~7% |
| **Fast Breeder (FBR)** | None | Liquid sodium | MOX or enriched U | ~1% |
| **RBMK** | Graphite | Light water | Enriched UO₂ (2%) | ~3% (Russia only) |
| **AGR** | Graphite | CO₂ gas | Enriched UO₂ | ~2% (UK only) |

The **pressurized water reactor** dominates the global fleet for a compelling safety reason: if its coolant is lost, the moderation of neutrons stops, and the chain reaction ceases on its own. This built-in shutdown mechanism — a **negative void coefficient** — means the reactor's physics work in your favor during an emergency. The Canadian **CANDU** design takes a different path, using heavy water (D₂O) as its moderator. Because heavy water absorbs far fewer neutrons than ordinary water, CANDU reactors can run on natural, unenriched uranium — a significant advantage for countries without enrichment facilities.

## From Mine to Monument: The Fuel Cycle

\`\`\`mermaid
graph LR
    A[Mining] --> B[Milling to Yellowcake]
    B --> C[Enrichment]
    C --> D[Fuel Fabrication]
    D --> E[Reactor]
    E --> F[Spent Fuel Cooling]
    F --> G{Reprocess?}
    G -->|Yes| H[MOX Fuel] --> E
    G -->|No| I[Geological Storage]
\`\`\`

The journey of nuclear fuel is an epic in itself. It begins in uranium mines — open-pit, underground, or increasingly through in-situ leaching, where acidic or alkaline solutions dissolve the uranium directly from underground deposits. The extracted ore is processed into **yellowcake** (U₃O₈), a concentrated powder that is then converted to uranium hexafluoride gas and enriched in centrifuge cascades. The enriched uranium is converted back to solid uranium dioxide powder, pressed into those tiny ceramic pellets, fired in kilns at roughly 1,700 degrees Celsius, and loaded into zirconium fuel rods.

Inside the reactor, fuel assemblies spend **3-5 years** in the core, periodically reshuffled to optimize their energy output. When spent, they are transferred to **cooling pools** — deep basins of water adjacent to the reactor — where they rest for 5-10 years as short-lived isotopes decay and their fierce radioactive heat gradually subsides. After cooling, the spent fuel may be moved to **dry cask storage**, sealed steel-and-concrete containers that rely on nothing but passive air circulation.

Some nations — France, Russia, and Japan among them — go a step further, chemically reprocessing spent fuel to extract reusable uranium and plutonium for **MOX fuel** (mixed oxide), reducing waste volume by roughly 75%. The final destination, for spent fuel or vitrified high-level waste, is intended to be a **deep geological repository** — a vault carved into stable bedrock hundreds of meters underground, designed to isolate radioactive material from the biosphere for hundreds of thousands of years.

## Layers Upon Layers of Safety

The philosophy that governs modern reactor safety is called **defense in depth** — the principle that no single failure, no single human error, should ever be able to release radioactivity to the environment. It works like a series of nested Russian dolls, each layer independent of the others. High-quality design and construction aim to prevent abnormal conditions in the first place. Sophisticated instrumentation detects deviations early and corrects them automatically. If normal systems fail, engineered safety systems — emergency core cooling, containment sprays, backup diesel generators — activate on their own. The physical containment structure stands as a final, massive barrier. And beyond the plant fence, off-site emergency plans, evacuation routes, and environmental monitoring networks provide the last line of defense.

The newest generation of reactor designs — the **AP1000**, the **EPR**, and others — have internalized the bitter lessons of Fukushima. Their **passive safety systems** rely not on pumps or diesel generators or human operators, but on the most reliable forces in the universe: gravity, natural convection, and compressed gas. These systems can cool a reactor for **72 hours or more** with no operator intervention and no external power whatsoever. In the world of nuclear engineering, the best safety system is one that requires nothing from us at all.`,
    },
  });

  // Lesson 3: Nuclear Fusion: The Power of the Stars (fusion subtopic)
  const lesson3 = await prisma.lesson.create({
    data: {
      title: "Nuclear Fusion: The Power of the Stars",
      order: 1,
      difficultyLevel: 2,
      educationLevel: "college",
      topicId: nuclearFusion.id,
      content: `# Nuclear Fusion: The Power of the Stars

Right now, ninety-three million miles from where you sit, a furnace rages at **15 million degrees Celsius** under a pressure of 250 billion atmospheres. Every second, the Sun converts roughly **600 million tonnes of hydrogen into helium**, and in the process, about four million tonnes of matter simply vanish — transformed into the light and heat that have sustained life on Earth for four and a half billion years. This is nuclear fusion: the engine of the stars, the reason the night sky glows, and perhaps the most tantalizing unsolved problem in all of energy science.

For more than seventy years, physicists and engineers have been chasing a deceptively simple idea: if we could recreate the process that powers the Sun in a machine on Earth, we would have access to an energy source that is virtually limitless, produces no carbon emissions, generates no long-lived radioactive waste, and cannot melt down. The fuel — hydrogen drawn from seawater — would last for billions of years. The promise is almost too good to be true. And so far, it has been.

## How Stars Forge the Elements

The Sun does not burn in any conventional sense. There are no flames, no combustion, no oxygen being consumed. Instead, deep in its core, the crushing weight of its own gravity squeezes hydrogen nuclei — bare protons — so close together that they overcome their mutual electrical repulsion and fuse.

The process happens in stages, through what physicists call the **proton-proton chain**. First, two protons collide and merge to form a **deuteron** — the nucleus of heavy hydrogen — releasing a positron and a ghostly neutrino. Then the deuteron captures another proton to become **helium-3**, emitting a gamma ray. Finally, two helium-3 nuclei fuse to produce **helium-4** and liberate two spare protons. The net result: four protons become one helium nucleus, and **26.7 MeV** of energy is released — carried away as radiation and kinetic energy.

The Sun can afford to be patient about this. Its enormous gravitational pressure ensures that each proton gets countless opportunities to collide with its neighbors over billions of years. A given proton in the solar core will, on average, bounce around for about a billion years before it finally fuses. We do not have that luxury. On Earth, without a star's worth of gravity to hold the fuel together, we must compensate with sheer, extraordinary heat.

\`\`\`mermaid
graph LR
    A[Deuterium] --> C((Fusion))
    B[Tritium] --> C
    C --> D[Helium-4]
    C --> E[Neutron]
    C --> F[Energy: 17.6 MeV]
\`\`\`

The reaction best suited to terrestrial fusion is the **deuterium-tritium (D-T) reaction**: a deuterium nucleus and a tritium nucleus merge to form helium-4 and a high-energy neutron, releasing **17.6 MeV** per event. But this reaction demands temperatures of **100-200 million degrees Celsius** — roughly six to thirteen times hotter than the center of the Sun. At these temperatures, matter enters a state called **plasma**: a roiling, electrically charged gas in which electrons have been completely stripped from their atoms, and the nuclei careen about at tremendous speeds. Plasma is not merely hot gas. It is the fourth state of matter, responsive to electric and magnetic fields, prone to strange waves and instabilities, and maddeningly difficult to contain.

The central challenge of fusion can be distilled to a single criterion, first articulated by the British physicist John Lawson in 1955. The **Lawson criterion** states that the product of three quantities — plasma density (**n**), temperature (**T**), and the time the energy stays confined (**tau**) — must exceed a certain threshold: roughly **n x T x tau > 3 x 10²¹ keV-s/m³** for D-T fusion. In plain language: the plasma must be hot enough, dense enough, and held together long enough for the fusion reactions to pay back the energy invested in heating and confining it. Meeting all three conditions simultaneously has proven to be one of the hardest problems in physics.

## Two Paths: Fission and Fusion Compared

To understand why fusion is so compelling, it helps to see it side by side with its older sibling.

| Property | Fission | Fusion |
|---|---|---|
| **Reaction** | Heavy nucleus splits into lighter nuclei | Light nuclei combine into heavier nucleus |
| **Fuel** | Uranium-235, plutonium-239 | Deuterium (from water), tritium (bred from lithium) |
| **Fuel abundance** | Uranium ore: ~8 million tonnes known reserves | Deuterium: virtually unlimited (1 in 6,500 water molecules); lithium reserves sufficient for millions of years |
| **Operating temperature** | ~300°C (coolant temperature) | ~150,000,000°C (plasma temperature) |
| **Energy per reaction** | ~200 MeV | ~17.6 MeV (but per unit mass of fuel, comparable) |
| **Radioactive waste** | Long-lived actinides (half-lives of thousands to millions of years) | Activated structural materials (half-lives typically <100 years); no long-lived actinides |
| **Meltdown risk** | Possible if cooling fails; decay heat must be actively managed | No meltdown possible — plasma disrupts and cools within milliseconds if confinement is lost |
| **Weapons proliferation** | Enrichment and reprocessing pathways to weapons material | No fissile material produced; tritium has some weapons relevance but is impractical |
| **Commercial status** | Mature (440+ reactors operating) | Experimental — no net-energy-producing plant yet built |
| **Waste volume (per GW-year)** | ~27 tonnes of spent fuel | ~5 tonnes of activated materials (estimated) |

## Bottling a Star: Magnetic Confinement

\`\`\`mermaid
graph LR
    A[Plasma: 150M degrees C] --> B[Magnetic Confinement]
    B --> C[Heat Extraction]
    C --> D[Steam Generation]
    D --> E[Turbine]
    E --> F[Electricity]
\`\`\`

If you cannot use gravity to hold a plasma together — and on Earth, you cannot — then the next best option is magnetism. Charged particles naturally spiral along magnetic field lines, and by shaping those field lines into a closed loop, you can keep a superheated plasma suspended in midair, never touching any physical wall. This is the principle behind **magnetic confinement fusion**, and its most successful embodiment is the **tokamak** — a Russian acronym for "toroidal chamber with magnetic coils."

A tokamak is a doughnut-shaped vacuum chamber threaded by powerful magnetic fields. Toroidal coils wrapped around the doughnut create a field that runs the long way around, while a strong electrical current driven through the plasma itself generates a second field that twists the first into a helical cage. The result is an invisible magnetic bottle, holding a wisp of plasma ten times hotter than the center of the Sun mere meters from walls kept at room temperature.

The most celebrated tokamak in history is **JET**, the Joint European Torus in Culham, England. Operational since 1983, JET pioneered D-T fusion experiments and, in December 2021, produced **59 megajoules** of fusion energy over five seconds — a peak power of roughly **12.5 MW**. JET ceased operations in December 2023 after forty years of groundbreaking research, its mission essentially complete. The torch has been passed to its successors.

The most ambitious is **ITER**, rising from a construction site in Cadarache, in the south of France. A collaboration of 35 nations, ITER is designed to produce **500 MW of fusion power** from just 50 MW of heating input — a tenfold energy gain, or **Q = 10** — sustained for pulses of 400-600 seconds. Its plasma chamber will hold **840 cubic meters** of superheated hydrogen, making it the largest tokamak ever built. First plasma is targeted for the early 2030s, with full D-T operations planned for later in the decade.

But ITER may not be the most exciting machine in the race. **SPARC**, being built by Commonwealth Fusion Systems — a spin-off from MIT — in Devens, Massachusetts, takes a radically different approach. Instead of building big, SPARC builds small, using revolutionary **high-temperature superconducting magnets** made from REBCO tape that can generate far stronger fields than ITER's conventional superconductors. The result is a machine roughly **one-fortieth the volume** of ITER that aims to achieve **Q > 2** — net energy gain — with first plasma targeted around 2026.

Meanwhile, the **stellarator** offers an entirely different philosophy. Rather than relying on a current flowing through the plasma to create part of the confining field — a current that can disrupt and die, crashing the plasma catastrophically into the walls — the stellarator generates the entire magnetic cage with external coils twisted into fantastically complex, computer-optimized shapes. Germany's **Wendelstein 7-X**, the world's largest stellarator, achieved a milestone in 2023 by sustaining plasma for **8 minutes**, demonstrating that this exotic geometry actually works.

## The Brute-Force Approach: Inertial Confinement

There is another way to achieve fusion, one born not from the dream of energy but from the demands of nuclear weapons research. **Inertial confinement fusion** skips the magnetic bottle entirely. Instead, it uses the most powerful lasers on Earth to crush a tiny pellet of fuel so quickly and so violently that fusion ignites before the fuel has time to fly apart.

The cathedral of this approach is the **National Ignition Facility** at Lawrence Livermore National Laboratory in California, where **192 laser beams** converge on a gold cylinder the size of a pencil eraser, called a hohlraum, containing a pea-sized capsule of D-T fuel. The lasers deliver up to **2.05 megajoules** of ultraviolet light in a few billionths of a second, generating X-rays that implode the capsule to pressures and temperatures rivaling the center of a star.

On **December 5, 2022**, NIF made history. For the first time ever, a controlled fusion experiment produced more energy than was delivered to the fuel: **3.15 MJ** out from **2.05 MJ** in, a gain of roughly **Q = 1.54**. The achievement, called **scientific ignition**, sent shockwaves through the physics community. But context matters: the total electrical energy needed to power those 192 lasers was about **300 MJ**, meaning the overall system was still far from breakeven. NIF is primarily a scientific and national-security facility; most commercial fusion efforts remain focused on magnetic confinement.

## The Unsolved Problems

Even after you have created a star in a bottle, you are not done. Between a burning plasma and a power plant lie some of the most punishing engineering challenges ever conceived.

The reactor's inner walls must survive bombardment by **14.1 MeV neutrons** — particles energetic enough to knock atoms out of their crystal lattice, causing embrittlement, swelling, and transmutation. No material on Earth has been tested under the full neutron fluence a commercial fusion reactor would produce. Candidates like **reduced-activation ferritic-martensitic steels**, **silicon carbide composites**, and **tungsten alloys** are under intense investigation, but the jury is still out.

Then there is the tritium problem. Tritium does not exist in useful quantities in nature — the world's entire inventory is roughly **20 kilograms**, mostly a byproduct of Canadian CANDU fission reactors. A fusion power plant would burn through kilograms of tritium per day, meaning it must **breed its own fuel** by surrounding the plasma with a **lithium blanket**: fusion neutrons strike lithium-6 and produce fresh tritium. Achieving a **tritium breeding ratio greater than one** — producing more tritium than consumed — is essential, and it has never been demonstrated at scale.

And the plasma itself remains a wild beast. Tokamak plasmas are prone to sudden **disruptions** — violent losses of confinement that dump the plasma's thermal and magnetic energy onto the vessel walls in milliseconds, with forces comparable to a small earthquake. Managing the heat flowing through the **divertor** at the bottom of the tokamak, where thermal loads can reach **10-20 MW per square meter** — comparable to conditions on the surface of the Sun — is a materials science nightmare that remains unsolved.

## A Century of Milestones

| Year | Milestone |
|---|---|
| **1920** | Arthur Eddington proposes that stars are powered by nuclear fusion |
| **1952** | First thermonuclear weapon (Ivy Mike) demonstrates uncontrolled fusion |
| **1958** | First tokamak (T-1) built in Moscow |
| **1968** | Soviet T-3 tokamak achieves record plasma temperatures, validating the tokamak concept |
| **1978** | Princeton Large Torus (PLT) reaches 60 million degrees Celsius |
| **1991** | JET produces the first controlled D-T fusion reactions, generating 1.7 MW |
| **1997** | JET sets fusion power record of 16 MW (Q = 0.67) |
| **2021** | JET produces 59 MJ over 5 seconds, setting a new energy record |
| **2022** | NIF achieves scientific ignition (Q = 1.54 relative to laser energy on target) |
| **2025-2026** | SPARC targets first plasma; multiple private fusion companies aim for key milestones |
| **Early 2030s** | ITER targets first plasma |
| **Late 2030s** | ITER targets full D-T operations (Q = 10) |
| **2040s-2050s** | **DEMO** (Demonstration Power Plant) — planned successor to ITER, intended as the first fusion device to generate electricity for the grid |

## The Prize

There is a reason that over **40 private fusion companies** — Commonwealth Fusion Systems, TAE Technologies, Helion Energy, General Fusion, Zap Energy, and dozens more — have collectively raised over **$6 billion** in private funding. The prize is almost beyond comprehension.

One gallon of seawater contains enough deuterium to produce the energy equivalent of **300 gallons of gasoline**. Deuterium from the oceans and lithium from the Earth's crust could power human civilization for **billions of years**. A working fusion plant would produce zero carbon emissions, generate waste that decays to background radiation levels in roughly **a century** (not millennia), and carry no risk of meltdown — the plasma contains only a few grams of fuel at any moment, and if confinement falters, it cools in milliseconds and the reaction simply stops. There is no chain reaction to run away, no fuel stockpile to overheat, no physical mechanism for catastrophe. And unlike solar and wind, a fusion plant could provide reliable **baseload power** around the clock, independent of weather or geography.

The old joke is that fusion is always thirty years away. But the joke is getting less funny, because the timeline is finally getting shorter. The question is no longer whether we can achieve fusion — December 2022 answered that — but whether we can engineer it into a power plant that is reliable, affordable, and buildable at scale. It is, quite possibly, the most important engineering challenge of the twenty-first century. And for the first time in history, the people working on it believe they are going to win.`,
    },
  });

  console.log(
    `Created lessons: "${lesson1.title}", "${lesson2.title}", "${lesson3.title}"`
  );
  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
