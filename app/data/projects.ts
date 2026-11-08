const projects: Project[] = [
   {
      id: 10,
      projectTitle: "AyosHub",
      featuredOrder: 0,
      projectKind: "Home services · In development",
      imageAlt:
         "AyosHub illustrative customer journey prototype showing home service categories and booking flow navigation",
      displaySummary:
         "A home services marketplace in development, spanning customer and professional mobile apps, a web admin, and an ASP.NET Core backend. Explore the illustrative customer booking prototype.",
      projectDescription:
         "A home services marketplace in development. Booking and matching are represented by interactive prototypes.",
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
         "A produce marketplace in development with an Expo mobile app and an ASP.NET Core microservices backend. Separate authentication, product catalog, inventory, order, and store services use PostgreSQL, with RabbitMQ messaging through MassTransit.",
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
