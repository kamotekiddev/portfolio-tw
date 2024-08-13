import { IconType } from "react-icons";
import { FaCss3, FaGitAlt, FaGithub, FaHtml5 } from "react-icons/fa";
import { GrReactjs } from "react-icons/gr";
import { RiNextjsFill, RiTailwindCssFill } from "react-icons/ri";
import {
   SiChakraui,
   SiFramer,
   SiJavascript,
   SiMantine,
   SiPrisma,
   SiStyledcomponents,
   SiTypescript,
} from "react-icons/si";

export type Stack = { name: string; icon: IconType };

const techstacks: Stack[] = [
   { name: "React Js", icon: GrReactjs },
   { name: "Next Js", icon: RiNextjsFill },
   { name: "Typescript", icon: SiTypescript },
   { name: "Tailwind Css", icon: RiTailwindCssFill },
   { name: "Mantine", icon: SiMantine },
   { name: "Prisma", icon: SiPrisma },
   { name: "Javascript", icon: SiJavascript },
   { name: "Framer Motion", icon: SiFramer },
   { name: "Styled-Components", icon: SiStyledcomponents },
   { name: "Chakra UI", icon: SiChakraui },
   { name: "Git", icon: FaGitAlt },
   { name: "Github", icon: FaGithub },
   { name: "HTML 5", icon: FaHtml5 },
   { name: "CSS 3", icon: FaCss3 },
];

export default techstacks;
