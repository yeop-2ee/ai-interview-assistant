declare module "dom-to-image-more" {
  interface Options {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
    quality?: number;
    bgcolor?: string;
    imagePlaceholder?: string;
    cacheBust?: boolean;
    useCredentials?: boolean;
    filter?: (node: Node) => boolean;
  }
  const domtoimage: {
    toPng(node: Node, options?: Options): Promise<string>;
    toJpeg(node: Node, options?: Options): Promise<string>;
    toSvg(node: Node, options?: Options): Promise<string>;
    toBlob(node: Node, options?: Options): Promise<Blob>;
    toPixelData(node: Node, options?: Options): Promise<Uint8ClampedArray>;
  };
  export default domtoimage;
}
