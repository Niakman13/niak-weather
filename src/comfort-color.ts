/** Same stops as the temperature rail. Color represents temperature, not an alert. */
export function comfortColor(value: number, min = -5, max = 45): string {
  const stops = [[0,74,127,208],[.2,77,182,172],[.38,102,187,106],[.58,242,201,76],[.78,244,162,89],[1,244,105,102]];
  const position = Math.max(0,Math.min(1,(value-min)/(max-min)));
  const right = stops.findIndex(s=>s[0]>=position);
  if (right <= 0) return stops[0].slice(1).join(',');
  const a=stops[right-1], b=stops[right], ratio=(position-a[0])/(b[0]-a[0]);
  return a.slice(1).map((n,i)=>Math.round(n+(b[i+1]-n)*ratio)).join(',');
}
