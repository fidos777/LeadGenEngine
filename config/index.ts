export const config = {
  app: {
    name: "LeadGenEngine",
    description: "Industrial B2B Prospecting Infrastructure",
  },
  zones: [
    "Shah Alam",
    "Klang",
    "Petaling Jaya",
    "Subang",
    "Puchong",
    "Rawang",
    "Sungai Buloh",
  ] as const,
} as const;

export type Zone = (typeof config.zones)[number];
