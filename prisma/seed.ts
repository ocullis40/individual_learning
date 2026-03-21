import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data (lessons first due to foreign key)
  await prisma.lesson.deleteMany();
  await prisma.topic.deleteMany();

  console.log("Cleared existing topics and lessons.");

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
      topicId: nuclearEnergy.id,
      content: `# What is Nuclear Energy?

Nuclear energy is the energy stored in the **nucleus** of an atom — the dense core held together by the strong nuclear force. When the configuration of an atom's nucleus changes, either by splitting apart or merging with another nucleus, a fraction of that binding energy is released. The amounts involved are enormous: roughly **a million times** greater per reaction than typical chemical processes like combustion.

## Two Paths to Nuclear Energy

There are two fundamental processes for extracting energy from atomic nuclei:

- **Fission** — splitting a heavy nucleus (such as uranium-235 or plutonium-239) into lighter fragments, releasing energy and additional neutrons
- **Fusion** — combining light nuclei (such as hydrogen isotopes deuterium and tritium) into a heavier nucleus, releasing energy carried away primarily by neutrons and kinetic energy

All commercial nuclear power today relies on fission. Fusion remains an active area of research with no grid-connected power plants yet operational.

## Why Nuclear Energy Matters

Nuclear power occupies a unique position in the global energy landscape:

- **Low carbon emissions** — lifecycle CO₂ emissions are comparable to wind and solar, roughly 10–20 g CO₂/kWh
- **High energy density** — a single fuel pellet (~7 g of UO₂) produces as much energy as approximately 1 tonne of coal
- **Baseload reliability** — nuclear plants operate at capacity factors above 90%, providing consistent output independent of weather
- **Land efficiency** — a 1 GW nuclear plant requires roughly 1–3 km² of land, compared to 50–100 km² for equivalent solar capacity

## Key Global Statistics

| Metric | Value |
|---|---|
| Share of global electricity | ~10% |
| Operating reactors worldwide | ~440 |
| Countries with nuclear power | 32 |
| Largest producer | United States (~95 GW capacity) |

## The Debate

Nuclear energy is not without controversy. Concerns include **long-lived radioactive waste**, the risk of **severe accidents** (Chernobyl, Fukushima), **weapons proliferation**, and **high capital costs**. Proponents argue that these risks are manageable and that nuclear power is essential for decarbonising electricity grids at scale, particularly in regions where wind and solar resources are limited or where grid storage remains prohibitively expensive.

Understanding both fission and fusion is essential to forming an informed view on the role nuclear energy should play in the coming decades.`,
    },
  });

  // Lesson 2: How Nuclear Fission Works (fission subtopic)
  const lesson2 = await prisma.lesson.create({
    data: {
      title: "How Nuclear Fission Works",
      order: 1,
      difficultyLevel: 2,
      topicId: nuclearFission.id,
      content: `# How Nuclear Fission Works

Nuclear fission is the process by which a heavy atomic nucleus splits into two or more lighter nuclei, releasing a substantial amount of energy. This is the reaction at the heart of every operating nuclear power plant in the world.

## The Chain Reaction

When a **neutron** strikes a fissile nucleus such as uranium-235, the nucleus absorbs it and becomes unstable. It splits — typically into two mid-mass fragments (e.g., barium-141 and krypton-92) — and simultaneously releases:

- **2–3 free neutrons**, each capable of triggering another fission event
- **~200 MeV of energy** per fission, mostly as kinetic energy of the fragments
- **Gamma radiation** and **neutrinos**

If at least one of those released neutrons goes on to cause another fission, the reaction sustains itself. This is a **self-sustaining chain reaction**. When exactly one neutron per fission causes a subsequent fission on average, the reactor is said to be **critical** — a steady-state condition, not an emergency.

## Why Uranium?

Not all nuclei are fissile. The key requirements are:

- **Large, unstable nucleus** — heavy elements with many protons and neutrons are held together less tightly per nucleon
- **Susceptibility to thermal neutrons** — uranium-235 has a high cross-section (probability of interaction) for slow-moving neutrons
- **Natural availability** — uranium occurs in the Earth's crust at roughly 2–4 ppm, extractable from ore

Natural uranium is only **0.7% U-235** (the fissile isotope); the remainder is U-238. Most reactors require enrichment to 3–5% U-235. Weapons-grade material is enriched above 90%.

## Energy Released

The energy per fission (~200 MeV) translates to extraordinary energy density. Consider the comparison:

- **1 kg of natural uranium** (in a light-water reactor) yields approximately **45,000 kWh** of electricity
- **1 kg of coal** yields approximately **2.5 kWh** of electricity

That is roughly an **18,000-fold** difference in energy per unit mass.

## Controlling the Reaction

Reactors use several mechanisms to maintain precise control over the chain reaction:

- **Control rods** (boron, cadmium, or hafnium) — absorb neutrons to reduce the reaction rate; inserting them further slows or stops the chain reaction
- **Moderators** (water, heavy water, or graphite) — slow fast neutrons to thermal energies where fission cross-sections are highest
- **Coolant** (usually water) — transfers heat from the core to steam generators; also acts as a moderator in light-water reactors
- **Negative temperature coefficients** — in well-designed reactors, rising temperature naturally reduces reactivity, providing an inherent safety feedback

The interplay of these systems keeps the neutron population — and therefore the power output — stable and controllable.`,
    },
  });

  // Lesson 3: Nuclear Fusion: The Power of the Stars (fusion subtopic)
  const lesson3 = await prisma.lesson.create({
    data: {
      title: "Nuclear Fusion: The Power of the Stars",
      order: 1,
      difficultyLevel: 2,
      topicId: nuclearFusion.id,
      content: `# Nuclear Fusion: The Power of the Stars

Nuclear fusion is the process by which light atomic nuclei combine to form a heavier nucleus, releasing energy in the process. It is the mechanism that powers the Sun and all main-sequence stars, converting roughly **600 million tonnes of hydrogen into helium every second**.

## How Fusion Works

For two nuclei to fuse, they must overcome the **Coulomb barrier** — the electrostatic repulsion between their positively charged protons. This requires extreme conditions:

- **Temperatures above 100 million °C** (roughly six times hotter than the Sun's core — necessary on Earth because we cannot replicate the Sun's gravitational confinement pressure)
- **Sufficient plasma density** to ensure nuclei collide frequently
- **Adequate confinement time** so that the plasma stays hot and dense long enough for net energy gain

At these temperatures, matter exists as **plasma** — a state where electrons are stripped from atoms entirely. The most promising reaction for terrestrial fusion is:

**Deuterium (²H) + Tritium (³H) → Helium-4 (⁴He) + Neutron + 17.6 MeV**

This D-T reaction has the highest cross-section (reaction probability) at achievable temperatures and produces substantial energy per event.

## Fusion vs Fission

| Property | Fission | Fusion |
|---|---|---|
| Fuel | Uranium, plutonium | Hydrogen isotopes (D, T) |
| Fuel abundance | Limited ore deposits | Deuterium abundant in seawater; tritium bred from lithium |
| Waste | Long-lived actinides (thousands of years) | Activated structural materials (~100 years) |
| Meltdown risk | Possible without active cooling | Plasma disrupts and cools — no meltdown scenario |
| Weapons proliferation | Enrichment / reprocessing concerns | No fissile material produced |
| Current status | Commercially mature | Experimental / pre-commercial |

## Why Fusion Is Hard

The engineering challenges of fusion are formidable:

- **Plasma confinement** — maintaining a 100+ million degree plasma without it touching any material wall. Two main approaches exist: **magnetic confinement** (tokamaks, stellarators) using powerful magnetic fields, and **inertial confinement** using lasers to compress fuel pellets
- **Materials** — the reactor vessel must withstand intense neutron bombardment, which causes embrittlement, transmutation, and activation over time
- **Tritium breeding** — tritium has a half-life of ~12.3 years and does not occur naturally in useful quantities; it must be bred within the reactor using lithium blankets
- **Energy breakeven** — achieving **Q > 1** (more energy out than in) has only been demonstrated briefly; sustained Q > 10 is needed for a viable power plant

## The Promise

If the engineering challenges are solved, fusion offers a transformative energy source: fuel derived from seawater, no long-lived radioactive waste, no risk of meltdown, and no greenhouse gas emissions during operation. The global fusion research effort — including ITER, the National Ignition Facility, and a growing cohort of private ventures — represents one of the most ambitious scientific and engineering undertakings in human history.`,
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
