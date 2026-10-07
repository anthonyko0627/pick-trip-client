import { createElement } from "react";

// 일반 UI 아이콘. 24x24 grid, 단일 path, fill=currentColor.
const FILL_ICON_PATHS = {
  bookmark: "M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  trash:
    "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  close:
    "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  wand: "M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5zM3 17l1 3 3 1-3 1-1 3-1-3-3-1 3-1zM19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z",
  calendar:
    "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
  clock:
    "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  more: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  search:
    "M15.5 14h-.79l-.28-.27a6.47 6.47 0 0 0 1.57-4.23 6.5 6.5 0 1 0-6.5 6.5 6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z",
  "chevron-left": "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  "chevron-right": "M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z",
  "chevron-down": "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",
  "chevron-up": "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
  pin: "M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H19v-2z",
  alert: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  user: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  moon: "M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36A6.5 6.5 0 0 1 13.36 3.1C12.92 3.04 12.46 3 12 3z",
  logout:
    "M10 17l1.41-1.41L8.83 13H20v-2H8.83l2.58-2.59L10 7l-5 5zM4 3h8v2H4v14h8v2H4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z",
  "external-link":
    "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
  expand:
    "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
  collapse:
    "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z",
  "trending-up":
    "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
} as const;

// SVG 자식 엘리먼트 하나(path/line/rect/circle/polygon)를 나타낸다.
// props는 그대로 createElement에 전달되는 camelCase SVG 속성.
interface StrokeIconElement {
  tag: "path" | "line" | "rect" | "circle" | "polygon";
  props: Record<string, string | number | undefined>;
}

interface StrokeIconDef {
  viewBox: string;
  elements: StrokeIconElement[];
}

const STROKE_DEFAULTS = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 32,
};

// pick-trip-app(Ionicons)과 모양을 맞춘 카테고리 아이콘. 원본은
// ionic-team/ionicons의 outline SVG를 그대로 옮긴 것(512x512 grid,
// stroke 기반). 채워진 점/원처럼 stroke 없이 그대로 채워지는 부분은
// fill: "currentColor"로 표시했다.
const STROKE_ICONS = {
  "map-outline": {
    viewBox: "0 0 512 512",
    elements: [
      {
        tag: "path",
        props: {
          ...STROKE_DEFAULTS,
          d: "M313.27,124.64,198.73,51.36a32,32,0,0,0-29.28.35L56.51,127.49A16,16,0,0,0,48,141.63v295.8a16,16,0,0,0,23.49,14.14l97.82-63.79a32,32,0,0,1,29.5-.24l111.86,73a32,32,0,0,0,29.27-.11l115.43-75.94a16,16,0,0,0,8.63-14.2V74.57a16,16,0,0,0-23.49-14.14l-98,63.86A32,32,0,0,1,313.27,124.64Z",
        },
      },
      {
        tag: "line",
        props: { ...STROKE_DEFAULTS, x1: 328, y1: 128, x2: 328, y2: 464 },
      },
      {
        tag: "line",
        props: { ...STROKE_DEFAULTS, x1: 184, y1: 48, x2: 184, y2: 384 },
      },
    ],
  },
  "restaurant-outline": {
    viewBox: "0 0 512 512",
    elements: [
      {
        tag: "path",
        props: {
          ...STROKE_DEFAULTS,
          strokeLinecap: undefined,
          d: "M57.49,47.74,425.92,416.17a37.28,37.28,0,0,1,0,52.72h0a37.29,37.29,0,0,1-52.72,0l-90-91.55A32,32,0,0,1,274,354.91v-5.53a32,32,0,0,0-9.52-22.78l-11.62-10.73a32,32,0,0,0-29.8-7.44h0A48.53,48.53,0,0,1,176.5,295.8L91.07,210.36C40.39,159.68,21.74,83.15,57.49,47.74Z",
        },
      },
      {
        tag: "path",
        props: {
          ...STROKE_DEFAULTS,
          d: "M400,32l-77.25,77.25A64,64,0,0,0,304,154.51v14.86a16,16,0,0,1-4.69,11.32L288,192",
        },
      },
      {
        tag: "path",
        props: {
          ...STROKE_DEFAULTS,
          d: "M320,224l11.31-11.31A16,16,0,0,1,342.63,208h14.86a64,64,0,0,0,45.26-18.75L480,112",
        },
      },
      {
        tag: "line",
        props: { ...STROKE_DEFAULTS, x1: 440, y1: 72, x2: 360, y2: 152 },
      },
      {
        tag: "path",
        props: {
          ...STROKE_DEFAULTS,
          d: "M200,368,100.28,468.28a40,40,0,0,1-56.56,0h0a40,40,0,0,1,0-56.56L128,328",
        },
      },
    ],
  },
  "sparkles-outline": {
    viewBox: "0 0 512 512",
    elements: [
      {
        tag: "path",
        props: {
          ...STROKE_DEFAULTS,
          d: "M259.92,262.91,216.4,149.77a9,9,0,0,0-16.8,0L156.08,262.91a9,9,0,0,1-5.17,5.17L37.77,311.6a9,9,0,0,0,0,16.8l113.14,43.52a9,9,0,0,1,5.17,5.17L199.6,490.23a9,9,0,0,0,16.8,0l43.52-113.14a9,9,0,0,1,5.17-5.17L378.23,328.4a9,9,0,0,0,0-16.8L265.09,268.08A9,9,0,0,1,259.92,262.91Z",
        },
      },
      {
        tag: "polygon",
        props: {
          ...STROKE_DEFAULTS,
          points:
            "108 68 88 16 68 68 16 88 68 108 88 160 108 108 160 88 108 68",
        },
      },
      {
        tag: "polygon",
        props: {
          ...STROKE_DEFAULTS,
          points:
            "426.67 117.33 400 48 373.33 117.33 304 144 373.33 170.67 400 240 426.67 170.67 496 144 426.67 117.33",
        },
      },
    ],
  },
  "compass-outline": {
    viewBox: "0 0 512 512",
    elements: [
      {
        tag: "path",
        props: {
          fill: "none",
          stroke: "currentColor",
          strokeMiterlimit: 10,
          strokeWidth: 32,
          d: "M448,256c0-106-86-192-192-192S64,150,64,256s86,192,192,192S448,362,448,256Z",
        },
      },
      {
        tag: "path",
        props: {
          fill: "currentColor",
          d: "M350.67,150.93l-117.2,46.88a64,64,0,0,0-35.66,35.66l-46.88,117.2a8,8,0,0,0,10.4,10.4l117.2-46.88a64,64,0,0,0,35.66-35.66l46.88-117.2A8,8,0,0,0,350.67,150.93ZM256,280a24,24,0,1,1,24-24A24,24,0,0,1,256,280Z",
        },
      },
    ],
  },
  "library-outline": {
    viewBox: "0 0 512 512",
    elements: [
      {
        tag: "rect",
        props: {
          ...STROKE_DEFAULTS,
          strokeLinecap: undefined,
          x: 32,
          y: 96,
          width: 64,
          height: 368,
          rx: 16,
          ry: 16,
        },
      },
      {
        tag: "line",
        props: { ...STROKE_DEFAULTS, x1: 112, y1: 224, x2: 240, y2: 224 },
      },
      {
        tag: "line",
        props: { ...STROKE_DEFAULTS, x1: 112, y1: 400, x2: 240, y2: 400 },
      },
      {
        tag: "rect",
        props: {
          ...STROKE_DEFAULTS,
          strokeLinecap: undefined,
          x: 112,
          y: 160,
          width: 128,
          height: 304,
          rx: 16,
          ry: 16,
        },
      },
      {
        tag: "rect",
        props: {
          ...STROKE_DEFAULTS,
          strokeLinecap: undefined,
          x: 256,
          y: 48,
          width: 96,
          height: 416,
          rx: 16,
          ry: 16,
        },
      },
      {
        tag: "path",
        props: {
          ...STROKE_DEFAULTS,
          strokeLinecap: undefined,
          d: "M422.46,96.11l-40.4,4.25c-11.12,1.17-19.18,11.57-17.93,23.1l34.92,321.59c1.26,11.53,11.37,20,22.49,18.84l40.4-4.25c11.12-1.17,19.18-11.57,17.93-23.1L445,115C443.69,103.42,433.58,94.94,422.46,96.11Z",
        },
      },
    ],
  },
  "leaf-outline": {
    viewBox: "0 0 512 512",
    elements: [
      {
        tag: "path",
        props: {
          ...STROKE_DEFAULTS,
          d: "M321.89,171.42C233,114,141,155.22,56,65.22c-19.8-21-8.3,235.5,98.1,332.7C231.89,468.92,352,461,392.5,392S410.78,228.83,321.89,171.42Z",
        },
      },
      {
        tag: "path",
        props: { ...STROKE_DEFAULTS, d: "M173,253c86,81,175,129,292,147" },
      },
    ],
  },
  "color-palette-outline": {
    viewBox: "0 0 512 512",
    elements: [
      {
        tag: "path",
        props: {
          fill: "none",
          stroke: "currentColor",
          strokeMiterlimit: 10,
          strokeWidth: 32,
          d: "M430.11,347.9c-6.6-6.1-16.3-7.6-24.6-9-11.5-1.9-15.9-4-22.6-10-14.3-12.7-14.3-31.1,0-43.8l30.3-26.9c46.4-41,46.4-108.2,0-149.2-34.2-30.1-80.1-45-127.8-45-55.7,0-113.9,20.3-158.8,60.1-83.5,73.8-83.5,194.7,0,268.5,41.5,36.7,97.5,55,152.9,55.4h1.7c55.4,0,110-17.9,148.8-52.4C444.41,382.9,442,359,430.11,347.9Z",
        },
      },
      {
        tag: "circle",
        props: { fill: "currentColor", cx: 144, cy: 208, r: 32 },
      },
      {
        tag: "circle",
        props: { fill: "currentColor", cx: 152, cy: 311, r: 32 },
      },
      {
        tag: "circle",
        props: { fill: "currentColor", cx: 224, cy: 144, r: 32 },
      },
      {
        tag: "circle",
        props: { fill: "currentColor", cx: 256, cy: 367, r: 48 },
      },
      {
        tag: "circle",
        props: { fill: "currentColor", cx: 328, cy: 144, r: 32 },
      },
    ],
  },
} as const satisfies Record<string, StrokeIconDef>;

export type IconName = keyof typeof FILL_ICON_PATHS | keyof typeof STROKE_ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: IconProps) {
  if (name in STROKE_ICONS) {
    const { viewBox, elements } =
      STROKE_ICONS[name as keyof typeof STROKE_ICONS];
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        className={className}
        aria-hidden="true"
      >
        {elements.map((el, index) =>
          createElement(el.tag, { key: index, ...el.props }),
        )}
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={FILL_ICON_PATHS[name as keyof typeof FILL_ICON_PATHS]} />
    </svg>
  );
}
