// Self-hosted at build time by next/font — visitors never contact Google.
import {
  Cormorant_Garamond, Jost, DM_Sans, DM_Serif_Display, Fraunces, Inter, Lora, Manrope, Montserrat, Nunito_Sans,
  Playfair_Display, Syne, Unbounded, Work_Sans,
} from "next/font/google";

// UI fonts (Celestial Garden): Jost for body/UI, Cormorant Garamond for headings.
const jost = Jost({ subsets: ["latin"], display: "swap", variable: "--font-jost", weight: ["300", "400", "500"], preload: true });
const inter = Inter({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-inter" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: true, weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-montserrat" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-playfair" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-dmserif" });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dmsans" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-fraunces" });
const workSans = Work_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-worksans" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-manrope" });
const syne = Syne({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-syne" });
const unbounded = Unbounded({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-unbounded" });
const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-lora" });
const nunito = Nunito_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-nunito" });

export const fontVariables = [jost, inter, cormorant, montserrat, playfair, dmSerif, dmSans, fraunces, workSans, manrope, syne, unbounded, lora, nunito]
  .map((f) => f.variable)
  .join(" ");
