export const ANIMAL_WIDTH = 64;
export const ANIMAL_HEIGHT = 64;

export type AnimalType = "dog" | "cat" | "sheep";

// --- 犬 (Dog) ---
const dogFrame0 = [
  "                ",
  "      XX        ",
  "     XXXX       ",
  "    XX X X      ",
  "    XXXXXX  X   ",
  "   XXXXXXXXXXX  ",
  "   XXXXXXXXXXXX ",
  "    XXXXXXXXXX  ",
  "     XXX   XXX  ",
  "     XX     XX  ",
  "                ",
];
const dogFrame1 = [
  "                ",
  "      XX        ",
  "     XXXX       ",
  "    XX X X      ",
  "    XXXXXX  X   ",
  "   XXXXXXXXXXX  ",
  "   XXXXXXXXXXXX ",
  "    XXXXXXXXXX  ",
  "      XX   XX   ",
  "      XX   XX   ",
  "                ",
];

// --- 猫 (Cat) ---
const catFrame0 = [
  "                ",
  "      X   X     ",
  "     XXXXXXX    ",
  "    XX X X XX   ",
  "    XXXXXXXXX   ",
  "    XXXXXXXX    ",
  "   XXXXXXXXXXX  ",
  "   XXXXXXXXXX X ",
  "     XXX   XXX  ",
  "     XX     XX  ",
  "                ",
];
const catFrame1 = [
  "                ",
  "      X   X     ",
  "     XXXXXXX    ",
  "    XX X X XX   ",
  "    XXXXXXXXX   ",
  "    XXXXXXXX    ",
  "   XXXXXXXXXXX  ",
  "   XXXXXXXXXX   ",
  "      XX   XX X ",
  "      XX   XX   ",
  "                ",
];

// --- 羊 (Sheep) ---
const sheepFrame0 = [
  "                ",
  "      XXXX      ",
  "     XXXXXX     ",
  "    XX X X XX   ",
  "   XXXXXXXXXXX  ",
  "  XXXXXXXXXXXXX ",
  "  XXXXXXXXXXXXX ",
  "   XXXXXXXXXXX  ",
  "     XX    XX   ",
  "     X      X   ",
  "                ",
];
const sheepFrame1 = [
  "                ",
  "      XXXX      ",
  "     XXXXXX     ",
  "    XX X X XX   ",
  "   XXXXXXXXXXX  ",
  "  XXXXXXXXXXXXX ",
  "  XXXXXXXXXXXXX ",
  "   XXXXXXXXXXX  ",
  "      X    X    ",
  "      X    X    ",
  "                ",
];

const sprites: Record<AnimalType, string[][]> = {
  dog: [dogFrame0, dogFrame1],
  cat: [catFrame0, catFrame1],
  sheep: [sheepFrame0, sheepFrame1],
};

export function generateAnimalCanvas(
  type: AnimalType,
  frame: number,
  direction: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = ANIMAL_WIDTH;
  canvas.height = ANIMAL_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ANIMAL_WIDTH, ANIMAL_HEIGHT);

  ctx.fillStyle = "white";

  if (direction === 1) {
    ctx.translate(ANIMAL_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  const pixels = sprites[type][frame];
  const dotSize = 4;
  const yOffset = 15;

  for (let y = 0; y < pixels.length; y++) {
    for (let x = 0; x < pixels[y].length; x++) {
      if (pixels[y][x] === "X") {
        ctx.fillRect(x * dotSize, yOffset + y * dotSize, dotSize, dotSize);
      }
    }
  }

  return canvas;
}
