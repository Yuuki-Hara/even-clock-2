import {
  CreateStartUpPageContainer,
  ImageContainerProperty,
  ImageRawDataUpdate,
  OsEventTypeList,
  RebuildPageContainer,
  TextContainerProperty,
  waitForEvenAppBridge,
} from "@evenrealities/even_hub_sdk";

import {
  ANIMAL_HEIGHT,
  ANIMAL_WIDTH,
  AnimalType,
  generateAnimalCanvas,
} from "./animals";

// --- 状態管理 ---
let isVisible = true;
let lastVisibleState = true;
let mainTimerId: number | null = null;
let weatherTimerId: number | null = null;
let currentWeatherText = "気温: 取得中...";

// スマホ側で選択されている動物の状態
let currentAnimal: AnimalType = "dog";

const animalY = 220;
let animalX = 0;
let animalDirection = 1;
let animalFrame = 0;

let bridgeInstance: any = null;
let isUpdating = false;

function toFullwidth(str: string): string {
  return str.replace(/[0-9]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0xfee0),
  );
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

// 📱 【新規追加】スマホ側の画面（WebView）にUIを描画する関数
function setupSmartphoneUI() {
  const appDiv = document.getElementById("app");
  if (!appDiv) return;

  // ボタンを含むHTMLを画面に注入
  appDiv.innerHTML = `
    <div style="background: #222; padding: 20px; border-radius: 12px; margin-top: 20px;">
      <h2 style="color: #4CAF50; margin-bottom: 20px;">ペットを選択</h2>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="btn-dog" style="padding: 12px 24px; font-size: 18px; border-radius: 8px; border: none; cursor: pointer; background: #eee;">🐕 犬</button>
        <button id="btn-cat" style="padding: 12px 24px; font-size: 18px; border-radius: 8px; border: none; cursor: pointer; background: #eee;">🐈 猫</button>
        <button id="btn-sheep" style="padding: 12px 24px; font-size: 18px; border-radius: 8px; border: none; cursor: pointer; background: #eee;">🐑 羊</button>
      </div>
    </div>
  `;

  // 各ボタンをクリックした時の処理（状態を書き換える）
  document.getElementById("btn-dog")?.addEventListener("click", () => {
    currentAnimal = "dog";
  });
  document.getElementById("btn-cat")?.addEventListener("click", () => {
    currentAnimal = "cat";
  });
  document.getElementById("btn-sheep")?.addEventListener("click", () => {
    currentAnimal = "sheep";
  });
}

async function tick() {
  if (!bridgeInstance || isUpdating) return;
  isUpdating = true;

  try {
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

    animalX += animalDirection * 15;
    if (animalX > 576 - ANIMAL_WIDTH) {
      animalX = 576 - ANIMAL_WIDTH;
      animalDirection = -1;
    } else if (animalX < 0) {
      animalX = 0;
      animalDirection = 1;
    }
    animalFrame = animalFrame === 0 ? 1 : 0;
    lastVisibleState = isVisible;

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
            containerName: "animal_img",
            xPosition: animalX,
            yPosition: animalY,
            width: ANIMAL_WIDTH,
            height: ANIMAL_HEIGHT,
          }),
        ],
      }),
    );

    // ★ 選択されている動物(currentAnimal)の画像を生成する
    const canvas = generateAnimalCanvas(
      currentAnimal,
      animalFrame,
      animalDirection,
    );
    const base64Data = canvas.toDataURL("image/png").split(",")[1];

    await bridgeInstance.updateImageRawData(
      new ImageRawDataUpdate({
        containerID: 2,
        containerName: "animal_img",
        imageData: base64Data as any,
      }),
    );
  } finally {
    isUpdating = false;
  }
}

async function initApp() {
  // 📱 グラス側の初期化の前にスマホ側のUIを表示
  setupSmartphoneUI();

  bridgeInstance = await waitForEvenAppBridge();
  await fetchWeather();

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
          containerName: "animal_img",
          xPosition: animalX,
          yPosition: animalY,
          width: ANIMAL_WIDTH,
          height: ANIMAL_HEIGHT,
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

    if (isClick) isVisible = !isVisible;

    if (isDoubleClick) {
      if (mainTimerId !== null) clearInterval(mainTimerId);
      if (weatherTimerId !== null) clearInterval(weatherTimerId);
      await bridgeInstance.shutDownPageContainer(1);
    }
  });
}

initApp().catch(console.error);
