export const C = {
  accent: "#E8A04B",
  accentDim: "#C8873A",
  sidebar: "#1A1A22",
  surface: "#F7F6F3",
  card: "#FFFFFF",
  text1: "#1C1C24",
  text2: "#6B6B7A",
  text3: "#9B9BA8",
  border: "#E4E3E0",
  tag: "#F0EFE9",
  success: "#1D9E75",
  danger: "#E24B4A",
  warning: "#E8A04B",
  infoBg: "#EAF3DE",
  infoText: "#3B6D11",
};

export const fmt = (n) =>
  new Intl.NumberFormat("fr-DZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n) + " DA";