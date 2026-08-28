import { ELEMENT_NAMES } from "./atomPhysics";

export interface ElementInfo {
  description?: string;
  uses?: string;
  natural_occurrence?: string;
  history?: string;
  isotopes?: Record<string, { name?: string; info?: string; uses?: string; natural_occurrence?: string }>;
}

// Embedded element data for first 20 elements
const ELEMENT_DATA: Record<string, ElementInfo> = {
  "1": { description: "The lightest and most abundant element in the universe. Forms stars and fuels nuclear fusion.", uses: "Fuel cells, ammonia production, rocket fuel, petroleum refining.", natural_occurrence: "Most abundant element — found in water, organic compounds, and stars.", history: "Recognized as a distinct element by Henry Cavendish in 1766." },
  "2": { description: "A colorless, odorless, inert noble gas. Second lightest element.", uses: "Cryogenics, MRI machines, airships, party balloons.", natural_occurrence: "Second most abundant element in the universe; rare on Earth.", history: "First detected in the solar spectrum in 1868 by Pierre Janssen." },
  "3": { description: "Soft, silver-white alkali metal. Lightest metal element.", uses: "Lithium-ion batteries, psychiatric medications, alloys.", natural_occurrence: "Found in pegmatitic minerals; mined from brines.", history: "Discovered in 1817 by Johan August Arfwedson." },
  "4": { description: "Lightweight, stiff alkaline earth metal. Very high melting point.", uses: "Aerospace alloys, X-ray windows, nuclear reactors.", natural_occurrence: "Found in beryl and chrysoberyl minerals.", history: "Isolated in 1828 by Friedrich Wöhler and Antoine Bussy." },
  "5": { description: "Metalloid with high melting point. Essential plant micronutrient.", uses: "Borosilicate glass, insulation fiberglass, semiconductors.", natural_occurrence: "Found in borax and boric acid deposits.", history: "Isolated in 1808 by Humphry Davy and Gay-Lussac." },
  "6": { description: "Basis of all known life. Forms more compounds than any other element.", uses: "Fuels, plastics, pharmaceuticals, diamonds, graphene.", natural_occurrence: "Found in all living organisms, coal, oil, and natural gas.", history: "Known since antiquity in forms of charcoal and diamond." },
  "7": { description: "Colorless, odorless gas making up 78% of Earth's atmosphere.", uses: "Fertilizers (ammonia), explosives, cryogenics.", natural_occurrence: "Dominant gas in Earth's atmosphere.", history: "Isolated in 1772 by Daniel Rutherford." },
  "8": { description: "Essential for respiration and combustion. Third most abundant in the universe.", uses: "Steel production, water treatment, medical oxygen therapy.", natural_occurrence: "21% of Earth's atmosphere; abundant in oceans and crust.", history: "Discovered in 1774 by Carl Wilhelm Scheele and Joseph Priestley." },
  "9": { description: "Most reactive and electronegative element. Pale yellow diatomic gas.", uses: "Toothpaste (fluoride), PTFE (Teflon), uranium enrichment.", natural_occurrence: "Found in fluorite and cryolite minerals.", history: "Isolated in 1886 by Henri Moissan." },
  "10": { description: "Noble gas; colorless, odorless, inert. Glows orange-red in electric discharge.", uses: "Neon signs, lasers, cryogenic refrigerant.", natural_occurrence: "Trace amounts in Earth's atmosphere; abundant in universe.", history: "Discovered in 1898 by William Ramsay and Morris Travers." },
  "11": { description: "Soft, silver alkali metal. Highly reactive with water.", uses: "Table salt (NaCl), paper production, soap, streetlights.", natural_occurrence: "Found in seawater and salt deposits as NaCl.", history: "Isolated in 1807 by Humphry Davy." },
  "12": { description: "Lightweight alkaline earth metal. Essential biological element.", uses: "Structural alloys, flares, antacids, chlorophyll.", natural_occurrence: "Eighth most abundant element in Earth's crust.", history: "Isolated in 1808 by Humphry Davy." },
  "13": { description: "Lightweight, silvery-white post-transition metal.", uses: "Aircraft, packaging, electrical wiring, cooking foil.", natural_occurrence: "Most abundant metal in Earth's crust (8.2%).", history: "Isolated in 1825 by Hans Christian Ørsted." },
  "14": { description: "Semiconductor metalloid. Second most abundant in Earth's crust.", uses: "Microchips, solar cells, glass, concrete.", natural_occurrence: "Found as silica (SiO₂) and in silicate minerals.", history: "Isolated in 1824 by Jöns Jacob Berzelius." },
  "15": { description: "Non-metal essential for DNA, ATP, and cell membranes.", uses: "Fertilizers, detergents, matches, nerve agents.", natural_occurrence: "Found in phosphate rocks; essential in living cells.", history: "Discovered in 1669 by Hennig Brand." },
  "16": { description: "Non-metal with a distinctive smell. Essential for proteins.", uses: "Sulfuric acid production, vulcanized rubber, fungicides.", natural_occurrence: "Found near volcanic regions and in sulfide minerals.", history: "Known since antiquity as brimstone." },
  "17": { description: "Greenish-yellow toxic gas. Highly reactive halogen.", uses: "Water purification, PVC production, bleach.", natural_occurrence: "Found in seawater and halite (NaCl) deposits.", history: "Identified as an element in 1810 by Humphry Davy." },
  "18": { description: "Noble gas; colorless, odorless, inert. Third most abundant gas in atmosphere.", uses: "Welding shielding gas, incandescent bulbs, scuba diving mixtures.", natural_occurrence: "0.93% of Earth's atmosphere.", history: "Discovered in 1894 by Lord Rayleigh and William Ramsay." },
  "19": { description: "Soft, silvery alkali metal. Highly reactive with water.", uses: "Fertilizers, soap, gunpowder, food additive.", natural_occurrence: "Found in sylvite and carnallite minerals.", history: "Isolated in 1807 by Humphry Davy." },
  "20": { description: "Reactive alkaline earth metal. Essential for bones and biological signaling.", uses: "Steel production, cement, biological systems, calcium supplements.", natural_occurrence: "Fifth most abundant element in Earth's crust.", history: "Isolated in 1808 by Humphry Davy." },
};

export function getElementInfo(protons: number, neutrons: number, electrons: number) {
  const elem = ELEMENT_DATA[String(protons)];
  const baseName = ELEMENT_NAMES[protons] ?? `Element Z=${protons}`;
  const stability = (Math.abs(protons - neutrons) <= 2 && Math.abs(protons - electrons) <= 5 && protons >= 1 && electrons >= 1)
    ? "Stable" : "Unstable";
  return { elem, baseName, stability, massNumber: protons + neutrons };
}
