// MFY poligonlari (GeoJSON). Koordinatalar [lng, lat] tartibida (GeoJSON standarti).
export interface MfyZone {
  name: string;
  region: string;
  district: string;
  geojson: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export const MFY_ZONES: MfyZone[] = [
  {
    name: 'Chamanazor',
    region: 'Namangan viloyati',
    district: 'Namangan shahri',
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [71.6650, 40.9950], [71.6750, 40.9950], [71.6800, 41.0000],
        [71.6800, 41.0050], [71.6750, 41.0100], [71.6650, 41.0100],
        [71.6600, 41.0050], [71.6600, 40.9950], [71.6650, 40.9950],
      ]],
    },
  },
  {
    name: 'Olvalzor',
    region: 'Namangan viloyati',
    district: 'Namangan shahri',
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [71.6680, 40.9780], [71.6820, 40.9780], [71.6860, 40.9830],
        [71.6840, 40.9890], [71.6760, 40.9910], [71.6660, 40.9880],
        [71.6640, 40.9820], [71.6680, 40.9780],
      ]],
    },
  },
  {
    name: 'Baxt',
    region: 'Namangan viloyati',
    district: 'Namangan shahri',
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [71.6600, 40.9980], [71.6700, 40.9980], [71.6750, 41.0020],
        [71.6750, 41.0060], [71.6700, 41.0100], [71.6600, 41.0100],
        [71.6550, 41.0060], [71.6550, 40.9980], [71.6600, 40.9980],
      ]],
    },
  },
  {
    name: 'Yangihayot',
    region: 'Namangan viloyati',
    district: 'Namangan shahri',
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [71.6780, 40.9920], [71.6900, 40.9920], [71.6950, 40.9970],
        [71.6930, 41.0030], [71.6850, 41.0060], [71.6760, 41.0020],
        [71.6740, 40.9960], [71.6780, 40.9920],
      ]],
    },
  },
  {
    name: 'Mustaqillik',
    region: 'Toshkent viloyati',
    district: 'Chirchiq shahri',
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [69.5750, 41.4450], [69.5900, 41.4450], [69.5950, 41.4520],
        [69.5900, 41.4580], [69.5780, 41.4600], [69.5680, 41.4550],
        [69.5680, 41.4480], [69.5750, 41.4450],
      ]],
    },
  },
  {
    name: "Do'stlik",
    region: 'Samarqand viloyati',
    district: 'Samarqand shahri',
    geojson: {
      type: 'Polygon',
      coordinates: [[
        [66.9650, 39.6480], [66.9800, 39.6480], [66.9850, 39.6540],
        [66.9800, 39.6600], [66.9680, 39.6620], [66.9580, 39.6570],
        [66.9580, 39.6500], [66.9650, 39.6480],
      ]],
    },
  },
];

// MFY nomidan poligon topish (qisman moslik)
export function findZone(mfyName: string): MfyZone | null {
  if (!mfyName.trim()) return null;
  const q = mfyName.trim().toLowerCase();
  return MFY_ZONES.find((z) => z.name.toLowerCase().includes(q)) || null;
}