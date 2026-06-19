export const DOG_WIDTH = 64;
export const DOG_HEIGHT = 64;

// フレーム0：足を開いて歩いている状態
// (空白は黒、Xは白として描画。デフォルトは左向きにデザインしています)
const dogFrame0 = [
  "                ",
  "                ",
  "      XX        ", // 耳
  "     XXXX       ", // 頭
  "    XX X X      ", // 目と鼻 (隙間を空けて表現)
  "    XXXXXX  X   ", // 首〜背中、しっぽの先
  "   XXXXXXXXXXX  ", // 胴体、しっぽ
  "   XXXXXXXXXXXX ", // 胴体
  "    XXXXXXXXXX  ", // お腹
  "     XXX   XXX  ", // 足の付け根
  "     XX     XX  ", // 足 (開いている)
  "                ",
  "                ",
  "                ",
  "                ",
  "                ",
];

// フレーム1：足を閉じた状態
const dogFrame1 = [
  "                ",
  "                ",
  "      XX        ",
  "     XXXX       ",
  "    XX X X      ",
  "    XXXXXX  X   ",
  "   XXXXXXXXXXX  ",
  "   XXXXXXXXXXXX ",
  "    XXXXXXXXXX  ",
  "      XX   XX   ", // 足の付け根
  "      XX   XX   ", // 足 (閉じている)
  "                ",
  "                ",
  "                ",
  "                ",
  "                ",
];

export function generateDogCanvas(
  frame: number,
  direction: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = DOG_WIDTH;
  canvas.height = DOG_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // 背景を黒（透過扱い）で塗りつぶす
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, DOG_WIDTH, DOG_HEIGHT);

  // ドットの色（白＝グラス上では緑の最大輝度）
  ctx.fillStyle = "white";

  // デザインが左向きなので、右へ進む時(direction === 1)は反転させる
  if (direction === 1) {
    ctx.translate(DOG_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  const pixels = frame === 0 ? dogFrame0 : dogFrame1;

  // 16x16の配列を64x64のキャンバスに描画するため、1ドットを4pxとして描画
  const dotSize = 4;

  // キャンバスの少し下の方に描画されるよう、Y軸のオフセット(10px)を追加
  const yOffset = 10;

  for (let y = 0; y < pixels.length; y++) {
    for (let x = 0; x < pixels[y].length; x++) {
      if (pixels[y][x] === "X") {
        ctx.fillRect(x * dotSize, yOffset + y * dotSize, dotSize, dotSize);
      }
    }
  }

  return canvas;
}
