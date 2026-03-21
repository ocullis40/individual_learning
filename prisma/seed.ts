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
      topicId: nuclearEnergy.id,
      content: `# What is Nuclear Energy?

Nuclear energy is the energy stored in the **nucleus** of an atom — the dense core at the center of every atom, held together by the strong nuclear force. When the configuration of an atom's nucleus changes, either by splitting apart or merging with another nucleus, a fraction of that binding energy is released as heat and radiation. The amounts involved are enormous: roughly **a million times** greater per reaction than typical chemical processes like burning coal or natural gas.

## Atoms and Binding Energy

All matter is composed of atoms, each consisting of a nucleus (protons and neutrons, collectively called **nucleons**) surrounded by a cloud of electrons. The key to nuclear energy lies in **binding energy** — the energy that holds nucleons together within the nucleus. This is governed by Einstein's famous equation **E = mc²**, which tells us that mass and energy are interchangeable.

When nucleons come together to form a nucleus, the resulting nucleus has slightly less mass than the sum of its individual parts. That "missing" mass has been converted into binding energy. The **binding energy per nucleon** varies across elements and peaks around **iron-56** (~8.8 MeV per nucleon). This curve has a critical consequence:

- **Elements heavier than iron** can release energy by splitting apart (fission)
- **Elements lighter than iron** can release energy by combining (fusion)

This is why uranium (element 92) is useful for fission and hydrogen (element 1) is the fuel for fusion.

## Two Paths to Nuclear Energy

There are two fundamental processes for extracting energy from atomic nuclei:

1. **Fission** — splitting a heavy nucleus (such as uranium-235 or plutonium-239) into lighter fragments, releasing energy and additional neutrons. A single fission event releases approximately **200 MeV** of energy.
2. **Fusion** — combining light nuclei (such as the hydrogen isotopes deuterium and tritium) into a heavier nucleus, releasing energy carried away primarily by neutrons and kinetic energy. A single D-T fusion event releases **17.6 MeV**.

All commercial nuclear power today relies on fission. Fusion remains an active area of research with no grid-connected power plants yet operational, though major milestones have been achieved in recent years.

## A Brief History of Nuclear Energy

The story of nuclear energy spans less than a century but has reshaped geopolitics, warfare, and energy production:

- **1938** — Otto Hahn and Fritz Strassmann achieve the first artificial nuclear fission in Berlin; Lise Meitner and Otto Frisch provide the theoretical explanation
- **1942** — Enrico Fermi's team achieves the first self-sustaining chain reaction at **Chicago Pile-1** (CP-1) beneath the University of Chicago's Stagg Field stadium on December 2
- **1945** — The **Manhattan Project** culminates in the Trinity test (July 16) and the atomic bombings of Hiroshima and Nagasaki (August 6 and 9), ending World War II
- **1951** — **Experimental Breeder Reactor I** (EBR-I) in Idaho produces the first usable electricity from nuclear fission, lighting four light bulbs on December 20
- **1954** — The Soviet Union's **Obninsk Nuclear Power Plant** becomes the first grid-connected nuclear power station, producing 5 MW of electrical power
- **1956** — Britain's **Calder Hall** becomes the first full-scale commercial nuclear power station
- **1957–1970s** — Rapid expansion of nuclear power worldwide; the United States, France, Japan, and the Soviet Union build hundreds of reactors
- **1979** — **Three Mile Island** accident (Pennsylvania, USA) — partial meltdown with no significant off-site radiation release, but it erodes public confidence
- **1986** — **Chernobyl** disaster (Ukraine, USSR) — the worst nuclear accident in history, caused by a flawed reactor design and operator error during a safety test
- **2011** — **Fukushima Daiichi** disaster (Japan) — three reactor meltdowns triggered by a magnitude 9.0 earthquake and subsequent tsunami

## Current Global Nuclear Landscape

Despite setbacks, nuclear power remains a significant component of the global energy mix:

| Metric | Value |
|---|---|
| Share of global electricity | ~10% |
| Operating reactors worldwide | ~440 |
| Reactors under construction | ~60 |
| Countries with nuclear power | 32 |
| Largest producer (by capacity) | United States (~95 GW) |
| Highest share of electricity | France (~70%) |
| Newest entrants | UAE (Barakah, 2020), Belarus (2020) |

France stands out as the most nuclear-dependent country, generating roughly **70%** of its electricity from 56 reactors. The United States has the largest fleet with **93 operating reactors** across 54 sites. China is the fastest-growing nuclear nation, with over **20 reactors under construction** as of 2024.

## Advantages and Disadvantages

**Advantages:**

- **Low carbon emissions** — lifecycle CO₂ emissions are comparable to wind and solar, roughly **10–20 g CO₂/kWh**, versus ~900 g for coal and ~450 g for natural gas
- **Extraordinary energy density** — a single fuel pellet (~7 g of UO₂) produces as much energy as approximately **1 tonne of coal**, **480 cubic meters of natural gas**, or **564 liters of oil**
- **Baseload reliability** — nuclear plants operate at capacity factors above **90%**, providing consistent output independent of weather or time of day
- **Land efficiency** — a 1 GW nuclear plant requires roughly **1–3 km²** of land, compared to 50–100 km² for equivalent solar capacity
- **Long operational lifespan** — modern reactors are licensed for 40–60 years, with some receiving extensions to 80 years

**Disadvantages:**

- **Radioactive waste** — spent fuel remains hazardous for thousands of years; no country has yet opened a permanent deep geological repository (Finland's Onkalo facility is closest, expected to begin operations in the mid-2020s)
- **High capital costs** — new nuclear plants cost **$6–12 billion** and take **10–15 years** to build in Western countries, though construction times are shorter in China and South Korea
- **Accident risk** — while statistically rare, severe accidents like Chernobyl and Fukushima have long-lasting environmental and public health consequences
- **Weapons proliferation** — nuclear technology and materials (particularly enriched uranium and plutonium from reprocessing) can potentially be diverted for weapons use
- **Public opposition** — nuclear energy faces significant public resistance in many countries, often driven by fear of radiation and distrust of the industry

## Common Misconceptions

Several widely held beliefs about nuclear energy are misleading or incorrect:

- **"Nuclear plants can explode like atomic bombs."** — This is physically impossible. Reactor fuel is enriched to 3–5% U-235; a nuclear weapon requires above 90%. The physics of a nuclear detonation cannot occur in a reactor.
- **"Nuclear waste glows green."** — This is a Hollywood myth. Radioactive materials do not glow green. Some highly radioactive materials can produce a faint blue glow (**Cherenkov radiation**) when submerged in water, caused by charged particles moving faster than light travels through water.
- **"Nuclear power kills more people than other energy sources."** — Per unit of energy produced, nuclear is among the **safest** energy sources. Studies estimate approximately **0.03 deaths per TWh** for nuclear, compared to **24.6 for coal** and **2.8 for natural gas** (Our World in Data, based on Markandya & Wilkinson and Sovacool et al.).
- **"We have no solution for nuclear waste."** — While no permanent repository is yet operational, the technical solutions (deep geological disposal in stable rock formations) are well understood. Finland, Sweden, and France are all actively constructing or licensing such facilities.

Understanding both fission and fusion is essential to forming an informed view on the role nuclear energy should play in the coming decades as the world confronts the twin challenges of growing energy demand and climate change.`,
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

Nuclear fission is the process by which a heavy atomic nucleus splits into two or more lighter nuclei, releasing a substantial amount of energy. This is the reaction at the heart of every operating nuclear power plant in the world. Understanding fission requires grasping the chain reaction mechanism, the properties of nuclear fuel, reactor design, and the full fuel cycle from mine to waste storage.

## The Chain Reaction: Step by Step

A nuclear fission chain reaction proceeds through a precise sequence of events:

1. **Neutron absorption** — A free neutron strikes a fissile nucleus (e.g., uranium-235). The nucleus absorbs the neutron, momentarily becoming uranium-236 in a highly excited state.
2. **Nuclear deformation** — The excited nucleus begins to oscillate and elongate, resembling a wobbling liquid drop (as described by the **liquid drop model** developed by Niels Bohr and John Archibald Wheeler in 1939).
3. **Scission** — The electrostatic repulsion between protons in the elongated nucleus overcomes the strong nuclear force, and the nucleus splits into two **fission fragments** of unequal mass (e.g., barium-141 and krypton-92, or strontium-94 and xenon-140).
4. **Neutron emission** — The fission simultaneously releases **2–3 prompt neutrons** (on average 2.4 for U-235), each with kinetic energies of approximately 2 MeV.
5. **Energy release** — Approximately **200 MeV** of energy is released per fission event, distributed roughly as follows:
   - Kinetic energy of fission fragments: **~167 MeV**
   - Kinetic energy of prompt neutrons: **~5 MeV**
   - Prompt gamma rays: **~6 MeV**
   - Beta particles from fission product decay: **~8 MeV**
   - Gamma rays from fission product decay: **~7 MeV**
   - Neutrinos (not recoverable): **~12 MeV**
6. **Propagation** — If at least one of the released neutrons is absorbed by another fissile nucleus and causes another fission, the chain reaction sustains itself.

When exactly one neutron per fission causes a subsequent fission on average, the reactor is said to be **critical** — a steady-state condition, not an emergency. If fewer than one neutron propagates, the reaction is **subcritical** and dies out. If more than one propagates, it is **supercritical** — a condition used briefly during reactor startup but dangerous if uncontrolled.

## Why Uranium-235 Is Fissile

Not all nuclei can sustain a fission chain reaction. The key properties that make U-235 special:

- **Neutron cross-section** — U-235 has a thermal neutron fission cross-section of approximately **585 barns** (1 barn = 10⁻²⁴ cm²). This is the effective "target area" the nucleus presents to slow-moving neutrons. By comparison, U-238 has a thermal fission cross-section of essentially zero — it only fissions with fast neutrons above ~1 MeV.
- **Odd neutron number** — U-235 has 143 neutrons (odd). When it absorbs one more, it becomes U-236 with 144 neutrons (even). The pairing energy gained by completing a neutron pair provides enough excitation energy to overcome the fission barrier without needing additional kinetic energy from the incoming neutron.
- **Natural occurrence** — Uranium is found in Earth's crust at roughly **2–4 parts per million**, comparable to tin. However, natural uranium is only **0.7% U-235**; the rest is U-238.

**The enrichment process** increases the U-235 concentration from 0.7% to the desired level:

- **Reactor fuel**: 3–5% U-235 (low-enriched uranium, or LEU)
- **Research reactors**: up to 20% U-235 (high-assay LEU, or HALEU)
- **Naval reactors**: typically >90% U-235 (highly enriched uranium, or HEU)
- **Weapons-grade**: >90% U-235

Modern enrichment uses **gas centrifuges**: uranium hexafluoride (UF₆) gas is spun at extreme speeds, and the slightly heavier U-238 molecules migrate outward while lighter U-235 molecules concentrate toward the center. Thousands of centrifuges arranged in cascades progressively increase enrichment.

## Energy Calculations

The energy per fission (~200 MeV) translates to extraordinary energy density:

| Fuel | Energy per kg | Equivalent in coal |
|---|---|---|
| Natural uranium (LWR) | ~45,000 kWh | ~18 tonnes |
| Enriched uranium (3.5%) | ~50,000 kWh | ~20 tonnes |
| Uranium with reprocessing | ~650,000 kWh | ~260 tonnes |
| Coal | ~2.5 kWh | 1 kg |
| Natural gas | ~5.5 kWh | ~2.2 kg |

A single **uranium fuel pellet** — roughly the size of a pencil eraser (~1 cm diameter, ~1.5 cm tall, weighing ~7 g) — contains as much energy as **1 tonne of coal**, **480 m³ of natural gas**, or **564 liters of oil**. This extraordinary density is why nuclear plants require so little fuel: a typical 1 GW reactor consumes only about **200 tonnes** of natural uranium per year.

## Reactor Components in Detail

A nuclear reactor is an engineered system designed to sustain a controlled chain reaction and convert the released heat into electricity:

- **Fuel rods** — Uranium dioxide (UO₂) ceramic pellets are stacked inside thin tubes made of **zirconium alloy** (chosen for its low neutron absorption cross-section and corrosion resistance). A typical pressurized water reactor core contains **40,000–50,000 fuel rods** arranged in **150–250 fuel assemblies**.
- **Control rods** — Rods made of neutron-absorbing materials (**boron carbide**, **silver-indium-cadmium alloy**, or **hafnium**) are inserted into or withdrawn from the core to regulate the neutron population. Fully inserted, they shut the reactor down (a condition called **scram** or **trip**).
- **Moderator** — Slows fast neutrons (born at ~2 MeV) to thermal energies (~0.025 eV) where the fission cross-section is highest. In **light-water reactors** (the most common type), ordinary water serves as both moderator and coolant. **Heavy-water reactors** (like CANDU) use D₂O, which absorbs fewer neutrons, allowing the use of natural (unenriched) uranium. **Graphite-moderated** reactors use solid carbon blocks.
- **Coolant** — Carries heat from the core to the steam generators or turbines. In PWRs, pressurized water (~155 bar, ~315°C) circulates in a closed primary loop. In BWRs, water boils directly in the core.
- **Containment** — A massive reinforced concrete and steel structure (typically **1–1.5 meters thick**) surrounds the reactor vessel. It is designed to withstand internal pressure from a loss-of-coolant accident and to prevent release of radioactive material to the environment.

## Types of Reactors

| Reactor Type | Moderator | Coolant | Fuel | Share of Global Fleet |
|---|---|---|---|---|
| **PWR** (Pressurized Water) | Light water | Pressurized light water | Enriched UO₂ (3–5%) | ~70% |
| **BWR** (Boiling Water) | Light water | Boiling light water | Enriched UO₂ (3–5%) | ~15% |
| **PHWR/CANDU** | Heavy water | Heavy water | Natural UO₂ (0.7%) | ~7% |
| **Fast Breeder (FBR)** | None | Liquid sodium | MOX or enriched U | ~1% |
| **RBMK** | Graphite | Light water | Enriched UO₂ (2%) | ~3% (Russia only) |
| **AGR** | Graphite | CO₂ gas | Enriched UO₂ | ~2% (UK only) |

The **PWR** dominates globally because of its inherent safety characteristics: if coolant is lost, moderation stops, and the chain reaction ceases (a negative void coefficient). The **CANDU** design, developed in Canada, is notable for using natural uranium, eliminating the need for enrichment facilities.

## The Nuclear Fuel Cycle

The journey of nuclear fuel from mine to final disposal involves multiple stages:

1. **Mining and milling** — Uranium ore is extracted (open-pit, underground, or in-situ leaching) and processed into **yellowcake** (U₃O₈), a concentrated uranium oxide powder
2. **Conversion** — Yellowcake is converted to uranium hexafluoride (UF₆) gas for enrichment
3. **Enrichment** — Gas centrifuges increase U-235 concentration from 0.7% to 3–5%
4. **Fuel fabrication** — Enriched UF₆ is converted to uranium dioxide (UO₂) powder, pressed into ceramic pellets, sintered at ~1700°C, and loaded into zirconium alloy fuel rods
5. **Reactor operation** — Fuel assemblies spend **3–5 years** in the reactor core, undergoing periodic reshuffling to optimize burn-up
6. **Spent fuel cooling** — Removed fuel assemblies are stored in **spent fuel pools** (water-filled basins adjacent to the reactor) for 5–10 years to allow short-lived isotopes to decay and heat output to decrease
7. **Interim storage** — After cooling, spent fuel may be transferred to **dry cask storage** — sealed steel and concrete containers that rely on passive air cooling
8. **Reprocessing (optional)** — Countries like France, Russia, and Japan chemically separate reusable uranium and plutonium from spent fuel to fabricate **MOX fuel** (mixed oxide), reducing waste volume by ~75%
9. **Final disposal** — Spent fuel or high-level waste is intended for **deep geological repositories** in stable rock formations hundreds of meters underground

## Safety Systems and Defense in Depth

Modern nuclear reactors employ a philosophy called **defense in depth** — multiple independent layers of protection so that no single failure can lead to a release of radioactivity:

- **Layer 1: Prevention** — High-quality design, construction, and operations to prevent abnormal conditions
- **Layer 2: Monitoring** — Instrumentation and control systems detect deviations early and correct them automatically
- **Layer 3: Engineered safety systems** — Emergency core cooling systems (ECCS), containment spray systems, and backup power supplies activate if normal systems fail
- **Layer 4: Containment** — The physical barrier contains radioactive material even in severe accident scenarios
- **Layer 5: Emergency response** — Off-site emergency plans, evacuation procedures, and environmental monitoring provide the final layer of public protection

Generation III+ reactor designs (such as the **AP1000** and **EPR**) incorporate **passive safety systems** that rely on natural forces — gravity, natural circulation, and compressed gas — rather than active pumps and operator action. These systems can cool the reactor for **72 hours or more** without any operator intervention or external power supply, a direct lesson from the Fukushima accident.`,
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

Nuclear fusion is the process by which light atomic nuclei combine to form a heavier nucleus, releasing energy in the process. It is the mechanism that powers the Sun and all main-sequence stars, converting roughly **600 million tonnes of hydrogen into helium every second**. If harnessed on Earth, fusion could provide an effectively limitless, clean energy source for civilization. The challenge is that replicating stellar conditions in a laboratory is one of the most difficult engineering problems ever attempted.

## How the Sun Works: The Proton-Proton Chain

In the Sun's core, fusion occurs through the **proton-proton (p-p) chain**, a multi-step process operating at approximately **15 million °C** and immense gravitational pressure (~250 billion atmospheres):

1. Two protons fuse to form a **deuteron** (deuterium nucleus), releasing a positron and a neutrino
2. The deuteron fuses with another proton to form **helium-3**, releasing a gamma ray
3. Two helium-3 nuclei fuse to form **helium-4**, releasing two protons

The net result: **four protons become one helium-4 nucleus**, releasing **26.7 MeV** of energy. The Sun accomplishes this despite relatively "low" temperatures because its enormous gravitational pressure gives particles many opportunities to interact over billions of years — a luxury we do not have on Earth.

On Earth, we cannot replicate the Sun's gravitational confinement. Instead, we rely on the **deuterium-tritium (D-T) reaction**, which has the highest cross-section at achievable temperatures:

**²H + ³H → ⁴He (3.5 MeV) + n (14.1 MeV)**

This reaction requires temperatures of **100–200 million °C** — roughly **6–13 times hotter** than the Sun's core — because we must compensate for the lack of gravitational confinement with sheer thermal energy.

## Plasma Physics Basics

At fusion temperatures, matter exists as **plasma** — the fourth state of matter, where electrons are completely stripped from atomic nuclei. Plasma is not merely a hot gas; it has unique properties:

- **Electrically conductive** — Plasma responds to electric and magnetic fields, which is the basis for magnetic confinement
- **Collective behavior** — Charged particles interact over long distances through electromagnetic forces, leading to complex wave phenomena and instabilities
- **Quasi-neutral** — Despite containing free charges, plasma is electrically neutral on macroscopic scales
- **Self-organizing** — Plasmas can form filaments, vortices, and other structures spontaneously

The fundamental challenge of fusion is maintaining the **Lawson criterion** — a combination of plasma temperature, density, and confinement time that must exceed a threshold for the fusion reactions to produce more energy than is needed to sustain the plasma:

**n × T × τ > 3 × 10²¹ keV·s/m³** (approximate threshold for D-T fusion)

Where **n** is plasma density, **T** is temperature in keV (1 keV ≈ 11.6 million °C), and **τ** is energy confinement time.

## Detailed Fusion vs Fission Comparison

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

## Magnetic Confinement Fusion

The leading approach to fusion uses powerful magnetic fields to confine the hot plasma in a toroidal (doughnut-shaped) geometry, preventing it from touching any material wall.

### Tokamaks

The **tokamak** (a Russian acronym for "toroidal chamber with magnetic coils") is the most advanced magnetic confinement concept. It uses a combination of toroidal and poloidal magnetic fields to create helical field lines that confine the plasma:

- **JET (Joint European Torus)** — Located in Culham, UK. Operational since 1983. Holds the record for fusion energy output: **59 megajoules** over 5 seconds in December 2021, achieving a peak fusion power of **~12.5 MW**. JET ceased operations in December 2023 after 40 years of pioneering research.
- **ITER (International Thermonuclear Experimental Reactor)** — Under construction in Cadarache, France. A collaboration of 35 nations (EU, US, Russia, China, India, Japan, South Korea). Designed to produce **500 MW of fusion power** from 50 MW of heating input (**Q = 10**) for pulses of 400–600 seconds. The tokamak will be the world's largest, with a plasma volume of **840 m³**. First plasma is currently targeted for the early 2030s, with full D-T operations later in the decade.
- **SPARC** — Being built by **Commonwealth Fusion Systems** (a spin-off from MIT) in Devens, Massachusetts. Uses revolutionary **high-temperature superconducting (HTS) magnets** made from REBCO tape, enabling a much more compact design. Aims to achieve **Q > 2** (net energy gain) with a machine roughly **1/40th the volume** of ITER. Construction is underway with first plasma targeted around 2026.

### Stellarators

The **stellarator** takes a different approach: instead of using a plasma current to generate the poloidal field (as in a tokamak), the entire confining field is produced by external coils with complex, twisted geometries. This eliminates the risk of plasma disruptions but requires extremely precise coil manufacturing.

- **Wendelstein 7-X** — Operated by the Max Planck Institute in Greifswald, Germany. The world's largest stellarator, it achieved a milestone in 2023 by sustaining plasma for **8 minutes** and demonstrated the viability of its optimized magnetic field configuration.

## Inertial Confinement Fusion

The alternative approach to magnetic confinement is **inertial confinement fusion (ICF)**, which uses intense energy beams to compress and heat a tiny fuel capsule so rapidly that fusion occurs before the fuel can fly apart.

- **NIF (National Ignition Facility)** — Located at Lawrence Livermore National Laboratory in California. Uses **192 laser beams** delivering up to **2.05 megajoules** of ultraviolet light onto a hohlraum (a gold cylinder the size of a pencil eraser) containing a pea-sized capsule of D-T fuel. On **December 5, 2022**, NIF achieved a historic milestone: **scientific breakeven (ignition)**, producing **3.15 MJ** of fusion energy from **2.05 MJ** of laser energy (**Q = ~1.54**). This was the first time in history that a controlled fusion experiment produced more energy than was delivered to the fuel.
- **Laser Mégajoule (LMJ)** — A French facility near Bordeaux with similar capabilities to NIF, primarily serving France's nuclear deterrent program but also conducting fusion research.

It is important to note that while NIF achieved Q > 1 relative to laser energy on target, the total "wall plug" energy to power the lasers was roughly **300 MJ** — so the overall system efficiency remains far below breakeven. ICF is primarily a scientific tool and weapons simulation platform; most commercial fusion efforts focus on magnetic confinement.

## Engineering Challenges

Even with a working plasma, several formidable engineering challenges remain before fusion can become a power source:

- **Materials** — The reactor's first wall and blanket must withstand intense **14.1 MeV neutron bombardment**, which causes atomic displacements, embrittlement, swelling, and transmutation. No existing material has been tested under the full neutron fluence expected in a commercial reactor. Candidates include **reduced-activation ferritic-martensitic (RAFM) steels**, **silicon carbide composites**, and **tungsten alloys**.
- **Tritium breeding** — Tritium does not occur naturally in useful quantities (global inventory is only ~20 kg, mostly from CANDU reactors). A fusion power plant must **breed its own tritium** by surrounding the plasma with a **lithium blanket**: when the 14.1 MeV fusion neutrons strike lithium-6, they produce tritium and helium. Achieving a **tritium breeding ratio > 1** (producing more tritium than consumed) is essential and has never been demonstrated at scale.
- **Plasma instabilities** — Tokamak plasmas are prone to **disruptions** — sudden losses of confinement that dump the plasma's thermal and magnetic energy onto the vessel walls in milliseconds, potentially causing severe damage. Types include **edge-localized modes (ELMs)**, **neoclassical tearing modes (NTMs)**, and **vertical displacement events (VDEs)**. Mitigation systems using massive gas injection or pellet injection are under active development.
- **Heat exhaust** — The plasma exhaust must pass through a **divertor** at the bottom of the tokamak, where heat fluxes can reach **10–20 MW/m²** — comparable to the surface of the Sun. Managing this thermal load is one of the most difficult engineering challenges in fusion.
- **Superconducting magnets** — ITER's toroidal field coils use **niobium-tin (Nb₃Sn)** superconductors cooled to 4.5 K (−269°C). Next-generation devices like SPARC use **high-temperature superconductors (HTS)** that operate at 10–20 K, enabling stronger magnetic fields in more compact designs.

## Timeline and Milestones

| Year | Milestone |
|---|---|
| **1920** | Arthur Eddington proposes that stars are powered by nuclear fusion |
| **1952** | First thermonuclear weapon (Ivy Mike) demonstrates uncontrolled fusion |
| **1958** | First tokamak (T-1) built in Moscow |
| **1968** | Soviet T-3 tokamak achieves record plasma temperatures, validating the tokamak concept |
| **1978** | Princeton Large Torus (PLT) reaches 60 million °C |
| **1991** | JET produces the first controlled D-T fusion reactions, generating 1.7 MW |
| **1997** | JET sets fusion power record of 16 MW (Q ≈ 0.67) |
| **2021** | JET produces 59 MJ over 5 seconds, setting a new energy record |
| **2022** | NIF achieves scientific ignition (Q ≈ 1.54 relative to laser energy on target) |
| **2025–2026** | SPARC targets first plasma; multiple private fusion companies aim for key milestones |
| **Early 2030s** | ITER targets first plasma |
| **Late 2030s** | ITER targets full D-T operations (Q = 10) |
| **2040s–2050s** | **DEMO** (Demonstration Power Plant) — planned successor to ITER, intended as the first fusion device to generate electricity for the grid |

## Why Fusion Is the "Holy Grail" of Energy

Fusion is often called the holy grail because it promises to solve multiple energy challenges simultaneously:

- **Virtually unlimited fuel** — Deuterium from seawater and lithium from Earth's crust could power civilization for **billions of years**. One gallon of seawater contains enough deuterium to produce the energy equivalent of **300 gallons of gasoline**.
- **Zero carbon emissions** — No greenhouse gases produced during operation
- **No long-lived waste** — Activated structural materials have half-lives measured in decades, not millennia. After approximately **100 years**, fusion waste would be no more radioactive than the coal ash produced by a coal plant of equivalent output.
- **Inherent safety** — The plasma contains only a few grams of fuel at any time. If confinement is lost, the plasma cools within milliseconds and reactions stop. There is no physical mechanism for a runaway reaction or meltdown.
- **No proliferation risk** — Fusion does not produce weapons-usable fissile material (plutonium or highly enriched uranium)
- **Baseload capable** — Unlike solar and wind, a fusion plant could operate continuously, providing reliable baseload power independent of weather or geography

The global fusion research effort — spanning ITER, NIF, and a rapidly growing cohort of over **40 private fusion companies** (including Commonwealth Fusion Systems, TAE Technologies, Helion Energy, General Fusion, and Zap Energy) that have collectively raised over **$6 billion** in private funding — represents one of the most ambitious scientific and engineering undertakings in human history. Whether fusion power arrives in the 2040s, 2050s, or later, the potential reward — clean, safe, abundant energy for all of humanity — makes the pursuit one of the defining challenges of our era.`,
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
