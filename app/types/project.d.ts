interface Project {
   id: number;
   projectTitle: string;
   projectDescription: string;
   category: string;
   toolsUsed: string[];
   projectImageBanner: string;
   projectImages: string[];
   "github-link": string;
   "live-link"?: string;
}
