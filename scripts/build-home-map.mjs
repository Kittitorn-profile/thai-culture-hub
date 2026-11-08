// Rebuild after updating thailand-provinces.geojson. Keep projection aligned with the home SVG.
import { readFile, writeFile } from 'node:fs/promises';
import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
const source = JSON.parse(
  await readFile(
    new URL('../public/assets/maps/thailand-provinces.geojson', import.meta.url),
    'utf8'
  )
);
const path = geoPath(geoMercator().center([101.49, 13.04]).scale(3000).translate([480, 380]));
// Subpixel simplification (~0.2 screen pixels at this projection), retaining ring closure.
function simplifyRing(ring) {
  const keep = new Set([0, ring.length - 1]);
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    const [ax, ay] = ring[first];
    const dx = ring[last][0] - ax,
      dy = ring[last][1] - ay;
    let best = 0.003 ** 2,
      selected = -1;
    for (let i = first + 1; i < last; i++) {
      const t =
        dx || dy
          ? Math.max(
              0,
              Math.min(1, ((ring[i][0] - ax) * dx + (ring[i][1] - ay) * dy) / (dx * dx + dy * dy))
            )
          : 0;
      const distance = (ring[i][0] - ax - t * dx) ** 2 + (ring[i][1] - ay - t * dy) ** 2;
      if (distance > best) {
        best = distance;
        selected = i;
      }
    }
    if (selected >= 0) {
      keep.add(selected);
      stack.push([first, selected], [selected, last]);
    }
  }
  const simplified = [...keep].sort((a, b) => a - b).map((index) => ring[index]);
  return (simplified.length >= 4 ? simplified : ring).toReversed();
}
const reverse = (geometry) => ({
  ...geometry,
  coordinates:
    geometry.type === 'Polygon'
      ? geometry.coordinates.map(simplifyRing)
      : geometry.coordinates.map((polygon) => polygon.map(simplifyRing)),
});
const items = source.features.map((feature, index) => {
  const geo = { ...feature, geometry: reverse(feature.geometry) };
  const props = feature.properties;
  const [lng, lat] = geoCentroid(geo);
  return {
    id: String(feature.id ?? props.shapeID ?? props.shapeISO ?? index),
    pathData: path(geo)?.replace(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi, (value) =>
      String(+Number(value).toFixed(1))
    ),
    province: {
      name: String(props.shapeName ?? props.name).replace(/\s+Province$/, ''),
      id: props.shapeID,
      iso: props.shapeISO,
    },
    provinceCenter: { lat: +lat.toFixed(5), lng: +lng.toFixed(5) },
  };
});
if (items.length !== 77 || items.some((item) => !item.pathData || !item.province.iso))
  throw new Error('Invalid home map');
const output = JSON.stringify(items);
await writeFile(
  new URL('../public/assets/maps/thailand-home-paths.json', import.meta.url),
  output + '\n'
);
console.log(`Generated ${items.length} province paths: ${Buffer.byteLength(output)} bytes`);
