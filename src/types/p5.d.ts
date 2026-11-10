declare module 'p5' {
  interface P5Constructor {
    new (sketch: (p: unknown) => void): unknown;
  }
  const p5: P5Constructor;
  export default p5;
}
