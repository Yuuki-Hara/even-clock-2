import {
  CreateStartUpPageContainer,
  ImageContainerProperty,
  ImageRawDataUpdate,
  OsEventTypeList,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge,
} from "@evenrealities/even_hub_sdk";

import { DOG_HEIGHT, DOG_WIDTH, generateDogCanvas } from "./dog";

// --- 状態管理 ---
let isVisible = true;
let lastVisibleState = true;
let mainTimerId: number | null = null;
let weatherTimerId: number | null = null;
let currentWeatherText = "気温: 取得中...";

// コンテナ自体のサイズと配置
const CONTAINER_WIDTH = 288;
const CONTAINER_X = 144; // 画面の中央付近に配置 (576 - 288) / 2 = 144
const dogY = 220;

// 犬の相対座標（288pxのCanvas内での位置）
let dogX = 0;
let dogDirection = 1;
let dogFrame = 0;

let bridgeInstance: any = null;

function toFullwidth(str: string): string {
  return str.replace(/[0-9]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0xfee0),
  );
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<number[]> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Failed to create blob from canvas");
  const arrayBuffer = await blob.arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer));
}

async function fetchWeather() {
  try {
    const lat = 35.6895;
    const lon = 139.6917;
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
    );
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

async function tick() {
  if (!bridgeInstance) return;

  if (!isVisible) {
    if (lastVisibleState !== isVisible) {
      await bridgeInstance.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 1,
          textObject: [
            new TextContainerProperty({
              containerID: 1,
              containerName: "dashboard",
              content: " ",
              xPosition: 0,
              yPosition: 0,
              width: 576,
              height: 288,
              isEventCapture: 1,
              paddingLength: 0,
            }),
          ],
        }),
      );
      lastVisibleState = isVisible;
    }
    return;
  }

  // 表示オフからオンへの復帰時のみレイアウト再構築
  if (lastVisibleState !== isVisible) {
    await bridgeInstance.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: 2,
        textObject: [
          new TextContainerProperty({
            containerID: 1,
            containerName: "dashboard",
            content: getDisplayString(),
            xPosition: 0,
            yPosition: 60,
            width: 576,
            height: 150,
            isEventCapture: 1,
            paddingLength: 20,
          }),
        ],
        imageObject: [
          new ImageContainerProperty({
            containerID: 2,
            containerName: "dog_img",
            xPosition: CONTAINER_X,
            yPosition: dogY,
            width: CONTAINER_WIDTH,
            height: DOG_HEIGHT,
          }),
        ],
      }),
    );
    lastVisibleState = isVisible;
  }

  // 1. 犬の座標更新（288pxの枠内で動かす）
  dogX += dogDirection * 15;
  if (dogX > CONTAINER_WIDTH - DOG_WIDTH) {
    dogX = CONTAINER_WIDTH - DOG_WIDTH;
    dogDirection = -1;
  } else if (dogX < 0) {
    dogX = 0;
    dogDirection = 1;
  }
  dogFrame = dogFrame === 0 ? 1 : 0;

  // 2. 時計の更新（rebuildPageContainerを使わず、テキストのみ部分更新）
  await bridgeInstance.textContainerUpgrade(
    new TextContainerUpgrade({
      containerID: 1,
      containerName: "dashboard",
      content: getDisplayString(),
    }),
  );

  // 3. 幅288pxの「親キャンバス」を作り、そこに犬をズラして描き込む
  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = CONTAINER_WIDTH;
  frameCanvas.height = DOG_HEIGHT;
  const ctx = frameCanvas.getContext("2d")!;

  // 背景は透過（黒）
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, CONTAINER_WIDTH, DOG_HEIGHT);

  // 先ほど作った犬のドット絵を、X座標をずらしてスタンプのように押す
  const dogImage = generateDogCanvas(dogFrame, dogDirection);
  ctx.drawImage(dogImage, dogX, 0);

  // 4. 画像データの送信
  const frameBytes = await canvasToPng(frameCanvas);
  await bridgeInstance.updateImageRawData(
    new ImageRawDataUpdate({
      containerID: 2,
      containerName: "dog_img",
      imageData: frameBytes,
    }),
  );
}

async function initApp() {
  bridgeInstance = await waitForEvenAppBridge();
  await fetchWeather();

  // 初回構築時は枠（コンテナ）を288pxで作る
  await bridgeInstance.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 2,
      textObject: [
        new TextContainerProperty({
          containerID: 1,
          containerName: "dashboard",
          content: getDisplayString(),
          xPosition: 0,
          yPosition: 60,
          width: 576,
          height: 150,
          isEventCapture: 1,
          paddingLength: 20,
        }),
      ],
      imageObject: [
        new ImageContainerProperty({
          containerID: 2,
          containerName: "dog_img",
          xPosition: CONTAINER_X,
          yPosition: dogY,
          width: CONTAINER_WIDTH,
          height: DOG_HEIGHT,
        }),
      ],
    }),
  );

  mainTimerId = window.setInterval(tick, 500);
  weatherTimerId = window.setInterval(fetchWeather, 600000);

  bridgeInstance.onEvenHubEvent(async (event: any) => {
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
    }

    if (isDoubleClick) {
      if (mainTimerId !== null) clearInterval(mainTimerId);
      if (weatherTimerId !== null) clearInterval(weatherTimerId);
      await bridgeInstance.shutDownPageContainer(1);
    }
  });
}

initApp().catch(console.error);
