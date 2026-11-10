export const FLY = {
  head: { length: 0.0015, width: 0.0026, eye: 0.0013 },
  thorax: { length: 0.0025, width: 0.0028, height: 0.0024 },
  abdomen: { length: 0.0027, width: 0.0028, height: 0.0021 },
  wing: { length: 0.0058, spread: 0.55 },
  legs: { pairs: 3, upper: 0.0016, lower: 0.0018, radius: 0.00012 },
  reach: 0.007,
  colours: {
    eyes: "#8a2d1e",
    face: "#4f4c47",
    thorax: "#7a7873",
    stripes: "#3a3936",
    abdomen: "#93876a",
    patches: "#3b362c",
    legs: "#1d1c1b",
    wing: "#dfe5ec",
  },
  wingOpacity: 0.55,
} as const;
