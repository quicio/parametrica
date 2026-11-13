declare module 'd3-delaunay' {
  export interface Voronoi {
    cellPolygons(): Iterable<Array<[number, number]>>;
  }

  export class Delaunay {
    static from(points: ArrayLike<[number, number]>): Delaunay;
    triangles: Uint32Array;
    halfedges: Int32Array;
    points: Float64Array;
    voronoi(bounds: [number, number, number, number]): Voronoi;
  }
}
