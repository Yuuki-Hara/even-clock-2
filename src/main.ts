import {
  CreateStartUpPageContainer,
  ImageContainerProperty,
  ImageRawDataUpdate,
  OsEventTypeList,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge,
} from "@evenrealities/even_hub_sdk";

// --- 状態管理 ---
let isVisible = true;
let clockTimerId: number | null = null;
let weatherTimerId: number | null = null;
let currentWeatherText = "気温: 取得中...";

// アニメーションを見据えた犬の座標・サイズ管理
let dogX = 250; // 画面中央付近からスタート
let dogY = 220; // 画面の下の方
const DOG_WIDTH = 64;
const DOG_HEIGHT = 64;

// --- ユーティリティ ---
function toFullwidth(str: string): string {
  return str.replace(/[0-9]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0xfee0),
  );
}

// Canvasの画像をPNGのバイト配列に変換する関数
async function canvasToPng(canvas: HTMLCanvasElement): Promise<number[]> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Failed to create blob from canvas");
  const arrayBuffer = await blob.arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer));
}

// ドット絵の犬をCanvasに描画して返す関数
function generateDogCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = DOG_WIDTH;
  canvas.height = DOG_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // 背景を黒で塗りつぶす（スマートグラス上では黒＝発光なしの透明扱いになる）
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, DOG_WIDTH, DOG_HEIGHT);

  // 白（グラス上では緑の最大輝度）でドット絵を描く
  ctx.fillStyle = "white";

  // 簡易的な犬のドットパターン（空白は黒、Xは白）
  const pixels = ["  X     ", " XXX  XX", "XXXXXXX ", " XXXXX  ", "  X  X  "];

  const dotSize = 8; // 1ドットの大きさ
  for (let y = 0; y < pixels.length; y++) {
    for (let x = 0; x < pixels[y].length; x++) {
      if (pixels[y][x] === "X") {
        // (x, y)の位置に四角を描画
        ctx.fillRect(x * dotSize, 10 + y * dotSize, dotSize, dotSize);
      }
    }
  }

  return canvas;
}

// --- API通信 ---
async function fetchWeather() {
  try {
    const lat = 35.6895;
    const lon = 139.6917;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Network error");

    const data = await response.json();
    currentWeatherText = toFullwidth(
      `気温: ${data.current_weather.temperature}度`,
    );
  } catch (error) {
    currentWeatherText = "気温: 取得失敗";
  }
}

function getDisplayString(): string {
  if (!isVisible) return " ";

  const now = new Date();
  const dateStr = now.toLocaleDateString("ja-JP");
  const timeStr = now.toLocaleTimeString("ja-JP", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return `${toFullwidth(`${dateStr}\n${timeStr}`)}\n${currentWeatherText}`;
}

// --- メインアプリケーション処理 ---
async function initApp() {
  const bridge = await waitForEvenAppBridge();
  await fetchWeather();

  // 1. 画面の構築
  // テキストと画像の「2つ」のコンテナを配置します
  await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 2, // テキスト用と画像用の合計2つ
      textObject: [
        new TextContainerProperty({
          containerID: 1,
          containerName: "dashboard",
          content: getDisplayString(),
          xPosition: 0,
          yPosition: 60,
          width: 576,
          height: 150, // 犬の画像と被らないように少し高さを縮める
          isEventCapture: 1,
          paddingLength: 20,
        }),
      ],
      imageObject: [
        new ImageContainerProperty({
          containerID: 2,
          containerName: "dog_img",
          xPosition: dogX, // ここで変数を使用
          yPosition: dogY, // ここで変数を使用
          width: DOG_WIDTH,
          height: DOG_HEIGHT,
        }),
      ],
    }),
  );

  // 2. プレースホルダーとして作った画像コンテナに、実際のドット絵データを流し込む
  const dogCanvas = generateDogCanvas();
  const dogPngBytes = await canvasToPng(dogCanvas);

  await bridge.updateImageRawData(
    new ImageRawDataUpdate({
      containerID: 2,
      containerName: "dog_img",
      imageData: dogPngBytes,
    }),
  );

  // 3. 定期実行（時計）
  clockTimerId = window.setInterval(async () => {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: 1,
        containerName: "dashboard",
        content: getDisplayString(),
      }),
    );
  }, 1000);

  // 4. 定期実行（天気）
  weatherTimerId = window.setInterval(fetchWeather, 600000);

  // 5. 入力イベント
  bridge.onEvenHubEvent(async (event) => {
    const eventType =
      event.listEvent?.eventType ??
      event.textEvent?.eventType ??
      event.sysEvent?.eventType ??
      event.jsonData?.eventType;

    const isClick =
      eventType === OsEventTypeList.CLICK_EVENT || eventType === undefined;
    const isDoubleClick = eventType === OsEventTypeList.DOUBLE_CLICK_EVENT;

    if (isClick) {
      isVisible = !isVisible;
      await bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: 1,
          containerName: "dashboard",
          content: getDisplayString(),
        }),
      );
    }

    if (isDoubleClick) {
      if (clockTimerId !== null) clearInterval(clockTimerId);
      if (weatherTimerId !== null) clearInterval(weatherTimerId);
      await bridge.shutDownPageContainer(1);
    }
  });
}

initApp().catch(console.error);
