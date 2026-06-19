import {
  CreateStartUpPageContainer,
  OsEventTypeList,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge,
} from "@evenrealities/even_hub_sdk";

// --- 状態管理 ---
let isVisible = true;
let clockTimerId: number | null = null;
let weatherTimerId: number | null = null;
let currentWeatherText = "気温: 取得中..."; // 天気情報の初期テキスト

// --- ユーティリティ ---
// 半角数字を全角に変換して等幅表示にする（evenG2のUIテクニック）
function toFullwidth(str: string): string {
  return str.replace(/[0-9]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0xfee0),
  );
}

// --- API通信 ---
// Open-Meteo APIから気温を取得する関数
async function fetchWeather() {
  try {
    // 東京付近の緯度経度（必要に応じてご自身の地域に変更してください）
    const lat = 35.6895;
    const lon = 139.6917;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    const temp = data.current_weather.temperature;

    // 取得した気温を全角数字に変換してセット
    currentWeatherText = toFullwidth(`気温: ${temp}度`);
  } catch (error) {
    console.error("Weather fetch error:", error);
    currentWeatherText = "気温: 取得失敗";
  }
}

// --- 画面表示用文字列の生成 ---
// 時刻と天気を結合した文字列を返す
function getDisplayString(): string {
  if (!isVisible) return " "; // オフの時は空白

  const now = new Date();
  const dateStr = now.toLocaleDateString("ja-JP");
  const timeStr = now.toLocaleTimeString("ja-JP", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const timeFull = toFullwidth(`${dateStr}\n${timeStr}`);

  // 時計の下に天気を追加して返す
  return `${timeFull}\n${currentWeatherText}`;
}

// --- メインアプリケーション処理 ---
async function initApp() {
  const bridge = await waitForEvenAppBridge();

  // 1. 初回起動時に1度だけ天気を取得
  await fetchWeather();

  // 2. 画面の構築（テキストボックスを少し縦長に確保します）
  await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          containerID: 1,
          containerName: "dashboard",
          content: getDisplayString(),
          xPosition: 0,
          yPosition: 80, // 3行になるので少し上にずらす
          width: 576,
          height: 350, // 枠を広げる
          isEventCapture: 1,
          paddingLength: 20,
        }),
      ],
    }),
  );

  // 3. 定期実行（時計：1秒ごと）
  clockTimerId = window.setInterval(async () => {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: 1,
        containerName: "dashboard",
        content: getDisplayString(),
      }),
    );
  }, 1000);

  // 4. 定期実行（天気 API：10分 = 600,000ミリ秒ごと）
  weatherTimerId = window.setInterval(async () => {
    await fetchWeather();
  }, 600000);

  // 5. 入力イベント（クリック/ダブルクリック）のハンドリング
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
      // 終了時は両方のタイマーを安全に止める
      if (clockTimerId !== null) clearInterval(clockTimerId);
      if (weatherTimerId !== null) clearInterval(weatherTimerId);
      await bridge.shutDownPageContainer(1);
    }
  });
}

initApp().catch(console.error);
