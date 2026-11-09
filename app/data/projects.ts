const projects: Project[] = [
   {
      id: 10,
      projectTitle: "AyosHub",
      featuredOrder: 0,
      projectKind: "Home services marketplace · In development",
      imageAlt:
         "AyosHub illustrative customer journey prototype showing home service categories and booking flow navigation",
      displaySummary:
         "AyosHub is a home services marketplace in development, with mobile apps for customers and service professionals, a web administration portal, and an ASP.NET Core backend. Its interactive prototype illustrates the customer booking journey.",
      projectDescription:
         "A home services marketplace in development, with an interactive prototype illustrating the customer booking journey.",
      category: "Full-Stack",
      toolsUsed: [
         "Expo",
         "React Native",
         "TypeScript",
         "Next.js",
         "ASP.NET Core",
         "PostgreSQL",
      ],
      projectImageBanner: "/images/project-image/ayoshub-banner.png",
      "live-link":
         "https://p.superdesign.dev/draft/05a75f6c-45d5-446b-9362-f990e69ecdea",
      liveLinkLabel: "Explore prototype",
      "github-link": "https://github.com/kamotekiddev/ayoshub-backend",
   },
   {
      id: 11,
      projectTitle: "BukidLink",
      featuredOrder: 1,
      projectKind: "Produce marketplace · In development",
      displaySummary:
         "BukidLink combines a mobile app with backend services for authentication, products, inventory, orders, and stores. The project uses PostgreSQL for data storage and RabbitMQ with MassTransit for communication between services.",
      projectDescription:
         "A produce marketplace in development with a React Native mobile app and ASP.NET Core microservices for authentication, product catalog, inventory, orders, and stores. PostgreSQL provides persistence; RabbitMQ and MassTransit support messaging.",
      category: "Full-Stack",
      toolsUsed: [
         "Expo",
         "React Native",
         "TypeScript",
         "NativeWind",
         "TanStack Query",
         "ASP.NET Core",
         "PostgreSQL",
         "RabbitMQ",
         "MassTransit",
      ],
      "github-link": "https://github.com/kamotekiddev/BukidlinkServices",
   },
];

export default projects;
