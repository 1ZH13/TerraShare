export const PROVINCE_CENTERS = {
  "Bocas del Toro": [9.1637, -82.0528],
  "Cocle": [8.4412, -80.3032],
  "Colón": [9.3106, -79.6527],
  "Darién": [7.9274, -77.4432],
  "Herrera": [7.9726, -80.6181],
  "Los Santos": [7.3824, -80.2691],
  "Panamá": [8.9824, -79.4849],
  "Panama Oeste": [8.8817, -79.6834],
  "Veraguas": [7.6411, -81.0435],
  "Chiriqui": [8.4268, -82.4409],
  "Chiriquí": [8.4268, -82.4409],
  "Comarca Emberá": [8.0543, -77.7925],
  "Comarca Kuna Yala": [9.0664, -77.4862],
  "Comarca Ngöbe Buglé": [8.1286, -81.6801],
};

export function getLandPosition(location) {
  if (location?.lat && location?.lng) {
    return [location.lat, location.lng];
  }
  if (location?.province) {
    // Try exact match first
    let coords = PROVINCE_CENTERS[location.province];
    // Try without accent
    if (!coords) {
      const normalized = location.province.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      coords = PROVINCE_CENTERS[normalized];
    }
    console.log("[getLandPosition]", location.province, "->", coords);
    return coords || null;
  }
  console.log("[getLandPosition] no location:", location);
  return null;
}