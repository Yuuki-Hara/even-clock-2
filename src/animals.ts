export const ANIMAL_WIDTH = 64;
export const ANIMAL_HEIGHT = 64;

export type AnimalType = "dog" | "cat" | "sheep";

const emojiMap: Record<AnimalType, string> = {
  dog: "🐕",
  cat: "🐈",
  sheep: "🐑",
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

  ctx.save();

  // キャンバスの「中心」を基準にするため、座標を中央に移動
  ctx.translate(ANIMAL_WIDTH / 2, ANIMAL_HEIGHT / 2);

  // 右に進むときは反転
  if (direction === 1) {
    ctx.scale(-1, 1);
  }

  // ★ 足を動かせない代わりの「ヨチヨチ歩き（回転）」アニメーション
  // フレーム0と1で、体を前後に10度ずつ傾ける
  const angleDegree = frame === 0 ? 10 : -10;
  ctx.rotate((angleDegree * Math.PI) / 180);

  ctx.font = "45px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // すでに中心に移動しているので (0, 0) を基準に描画
  // (少し下にズレる絵文字のベースラインを補正するためにYに+5しています)
  ctx.fillText(emojiMap[type], 0, 5);

  ctx.restore();

  return canvas;
}
