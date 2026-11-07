export type MapBounds=readonly number[];
export type MapGeometry={type:string;coordinates:number[][][]|number[][][][]};
const mercator=(latitude:number)=>Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360));
/** One shared projection for every polygon. No feature is scaled independently. */
export function projectPoint(point:readonly number[],bounds:MapBounds):[number,number]{
 const [west,south,east,north]=bounds;
 const x0=west*Math.PI/180,x1=east*Math.PI/180,y0=mercator(south),y1=mercator(north);
 const scale=Math.min(320/(x1-x0),260/(y1-y0));
 return [180+(point[0]*Math.PI/180-(x0+x1)/2)*scale,150-(mercator(point[1])-(y0+y1)/2)*scale];
}
export function geometryPath(geometry:MapGeometry,bounds:MapBounds):string{
 const polygons=geometry.type==='Polygon'?[geometry.coordinates as number[][][]]:geometry.coordinates as number[][][][];
 return polygons.map(polygon=>polygon.map(ring=>ring.map((point,index)=>{
  const [x,y]=projectPoint(point,bounds);
  return `${index?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`;
 }).join('')+'Z').join('')).join('');
}
