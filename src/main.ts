import {
  CreateStartUpPageContainer,
  OsEventTypeList,
  TextContainerProperty,
  TextContainerUpgrade,
  waitForEvenAppBridge,
} from "@evenrealities/even_hub_sdk";

// 状態管理
let isVisible = true;
let timerId: number | null = null;

// evenG2特有のテクニック: 半角数字を全角に変換して等幅表示にする
function toFullwidth(str: string): string {
  return str.replace(/[0-9]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0xfee0),
  );
}

// 現在時刻の文字列を生成する関数
function getCurrentTimeString(): string {
  if (!isVisible) {
    return " "; // 表示オフ時は空白1文字
  }

  const now = new Date();

  // YYYY/MM/DD と HH:MM:SS の形式で取得
  const dateStr = now.toLocaleDateString("ja-JP");
  const timeStr = now.toLocaleTimeString("ja-JP", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // 全角数字に変換して返す
  return toFullwidth(`${dateStr}\n${timeStr}`);
}

async function initClockApp() {
  const bridge = await waitForEvenAppBridge();

  // 1. 初回画面の構築
  await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          containerID: 1,
          containerName: "clock",
          content: getCurrentTimeString(),
          xPosition: 0,
          yPosition: 100,
          width: 576,
          height: 288,
          isEventCapture: 1, // ★入力イベントを受け取るために必須
          paddingLength: 20,
        }),
      ],
    }),
  );

  // 2. 毎秒時刻を更新
  timerId = window.setInterval(async () => {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID: 1,
        containerName: "clock",
        content: getCurrentTimeString(),
      }),
    );
  }, 1000);

  // 3. 入力イベントのハンドリング
  bridge.onEvenHubEvent(async (event) => {
    const eventType =
      event.listEvent?.eventType ??
      event.textEvent?.eventType ??
      event.sysEvent?.eventType ??
      event.jsonData?.eventType;

    // undefined は CLICK_EVENT(0) として扱われるバグへの対応
    const isClick =
      eventType === OsEventTypeList.CLICK_EVENT || eventType === undefined;
    const isDoubleClick = eventType === OsEventTypeList.DOUBLE_CLICK_EVENT;

    if (isClick) {
      isVisible = !isVisible; // オンオフ切り替え
      await bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: 1,
          containerName: "clock",
          content: getCurrentTimeString(),
        }),
      );
    }

    if (isDoubleClick) {
      // アプリ終了ダイアログを呼び出す（審査必須要件）
      if (timerId !== null) clearInterval(timerId);
      await bridge.shutDownPageContainer(1);
    }
  });
}

initClockApp().catch(console.error);
