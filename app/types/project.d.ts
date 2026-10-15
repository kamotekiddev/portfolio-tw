interface Project {
   id: number;
   projectTitle: string;
   projectDescription: string;
   category: string;
   toolsUsed: string[];
   projectImageBanner: string;
   imageAlt: string;
   featuredOrder?: number;
   displaySummary?: string;
   projectKind?: string;
   "github-link": string;
   "live-link"?: string;
}
