/* Port UI localization only. Authored game translations/fonts remain source data. */
(function(global){
'use strict';
const DEFAULT_LANGUAGE='en',SUPPORTED_LANGUAGES=Object.freeze(['en','zhCN','zhTW','ja']);
// Original @PROMPT_TEXT/@TITLE_H1 families with the same native-default/
// approved last-resort chain as the renderer, available before large data scripts.
const shellFonts={
  "en": {
    "body": "\"font_eb7a408a4fcd3d3448750f4f02f415ff\",\"font_8236ff6e03b3b99489024de271743911\",\"font_86bd6de5592a4934aaed14824743fe95\"",
    "title": "\"font_66d4c354dd8ffed4ab692ed144737e1a\",\"font_d90d2b1a10f9f7849bf769d1c893229e\",\"font_8236ff6e03b3b99489024de271743911\",\"font_86bd6de5592a4934aaed14824743fe95\""
  },
  "zhCN": {
    "body": "\"font_8236ff6e03b3b99489024de271743911\",\"font_86bd6de5592a4934aaed14824743fe95\"",
    "title": "\"font_a711281556357c045a6ac699242a9065\",\"font_8236ff6e03b3b99489024de271743911\",\"font_86bd6de5592a4934aaed14824743fe95\""
  },
  "zhTW": {
    "body": "\"font_8236ff6e03b3b99489024de271743911\",\"font_86bd6de5592a4934aaed14824743fe95\",\"font_22102305dfdd7fc49a54f66055a4acd1\"",
    "title": "\"font_a711281556357c045a6ac699242a9065\",\"font_8236ff6e03b3b99489024de271743911\",\"font_86bd6de5592a4934aaed14824743fe95\",\"font_22102305dfdd7fc49a54f66055a4acd1\""
  },
  "ja": {
    "body": "\"font_22102305dfdd7fc49a54f66055a4acd1\",\"font_8236ff6e03b3b99489024de271743911\",\"font_86bd6de5592a4934aaed14824743fe95\"",
    "title": "\"font_4fa326f0fe1639c449addaa58e5bf370\",\"font_8236ff6e03b3b99489024de271743911\",\"font_86bd6de5592a4934aaed14824743fe95\""
  }
};
const messages={
  "原版女术士 Live2D 模型": {"en":"Original witch Live2D model","zhTW":"原版女術士 Live2D 模型","ja":"オリジナルの魔女 Live2D モデル"},
  "原版苏丹牌盒 Live2D 模型": {"en":"Original Sultan card box Live2D model","zhTW":"原版蘇丹牌盒 Live2D 模型","ja":"オリジナルのスルタンカード箱 Live2D モデル"},"当前全局进度备份失败，未应用导入。":{"en":"Cannot back up current global progress; import was not applied.","zhTW":"目前全域進度備份失敗，未套用匯入。","ja":"現在の全体進行データをバックアップできなかったため、インポートは適用されませんでした。"},"全局进度格式不兼容":{"en":"Global progress format is incompatible.","zhTW":"全域進度格式不相容。","ja":"全体進行データの形式に互換性がありません。"},"原资源缺失: ": {"en": "Original resource missing: "}, "本地资源无法载入: ": {"en": "Local resource could not be loaded: "}, "本地资源未正确注册: ": {"en": "Local resource did not register correctly: "},
 "苏丹的游戏": {
  "en": "Sultan’s Game",
  "zhTW": "蘇丹的遊戲",
  "ja": "スルタンのゲーム"
 },
 "梅姬祈祷中…": {
  "en": "Mehri is praying…",
  "zhTW": "梅姬祈禱中…",
  "ja": "メヘリは祈っています…"
 },
 "正在载入原始资源…": {
  "en": "Loading original resources…",
  "zhTW": "正在載入原始資源…",
  "ja": "オリジナルのリソースを読み込み中…"
 },
 "原始资源载入失败：": {
  "en": "Original resources could not be loaded: ",
  "zhTW": "原始資源載入失敗：",
  "ja": "オリジナルのリソースを読み込めませんでした："
 },
 "重试": {
  "en": "Retry",
  "zhTW": "重試",
  "ja": "再試行"
 },
 "原始资源就绪检查不可用": {
  "en": "Original resource readiness checks are unavailable.",
  "zhTW": "原始資源就緒檢查不可用",
  "ja": "オリジナルのリソースの準備状態を確認できません。"
 },
 "浏览器未能保存最新进度。请先导出存档，再关闭页面。": {
  "en": "The browser could not save your latest progress. Export a save before closing this page.",
  "zhTW": "瀏覽器未能儲存最新進度。請先匯出存檔，再關閉頁面。",
  "ja": "最新の進行状況を保存できませんでした。ページを閉じる前にセーブをエクスポートしてください。"
 },
 "导出当前存档": {
  "en": "Export current save",
  "zhTW": "匯出目前存檔",
  "ja": "現在のセーブをエクスポート"
 },
 "检测到损坏存档，原始数据已保留。": {
  "en": "A damaged save was detected. Its original data has been preserved.",
  "zhTW": "偵測到損壞存檔，原始資料已保留。",
  "ja": "破損したセーブを検出しました。元のデータは保存されています。"
 },
 "选择原始存档备份": {
  "en": "Select an original save backup",
  "zhTW": "選擇原始存檔備份",
  "ja": "元のセーブのバックアップを選択"
 },
 "导出原始备份": {
  "en": "Export original backup",
  "zhTW": "匯出原始備份",
  "ja": "元のバックアップをエクスポート"
 },
 "原始备份不可用": {
  "en": "The original backup is unavailable.",
  "zhTW": "原始備份不可用",
  "ja": "元のバックアップを利用できません。"
 },
 "关闭提示": {
  "en": "Dismiss",
  "zhTW": "關閉提示",
  "ja": "閉じる"
 },
 "游戏规则正在载入，请稍候": {
  "en": "Game rules are loading. Please wait.",
  "zhTW": "遊戲規則正在載入，請稍候",
  "ja": "ゲームのルールを読み込み中です。お待ちください。"
 },
 "游戏已保存。可以关闭这个浏览器标签页。": {
  "en": "Game saved. You can close this browser tab.",
  "zhTW": "遊戲已儲存。可以關閉這個瀏覽器分頁。",
  "ja": "ゲームを保存しました。このタブを閉じられます。"
 },
 "尚待恢复的原版流程": {
  "en": "Original flow not yet restored",
  "zhTW": "尚待還原的原版流程",
  "ja": "未復元のオリジナルの進行"
 },
 "流程类型：": {
  "en": "Flow type: ",
  "zhTW": "流程類型：",
  "ja": "進行の種類："
 },
 "关闭": {
  "en": "Close",
  "zhTW": "關閉",
  "ja": "閉じる"
 },
 "此备份包含命运点数、命运商店和故事进度。是否同时恢复全局进度？取消仅载入本轮游戏。": {
  "en": "This backup includes Fate points, Fate Shop and story progress. Restore global progress too? Cancel loads only this playthrough.",
  "zhTW": "此備份包含命運點數、命運商店和故事進度。是否同時還原全域進度？取消僅載入本輪遊戲。",
  "ja": "このバックアップには運命ポイント、運命ショップ、物語の進行も含まれています。共通の進行状況も復元しますか？キャンセルすると今回のプレイのみを読み込みます。"
 },
 "读取自动存档": {
  "en": "Load autosave",
  "zhTW": "讀取自動存檔",
  "ja": "オートセーブをロード"
 },
 "导入离线存档": {
  "en": "Import offline save",
  "zhTW": "匯入離線存檔",
  "ja": "オフラインセーブをインポート"
 },
 "已保存": {
  "en": "Saved",
  "zhTW": "已儲存",
  "ja": "保存しました"
 },
 "导出离线存档": {
  "en": "Export offline save",
  "zhTW": "匯出離線存檔",
  "ja": "オフラインセーブをエクスポート"
 },
 "设置": {
  "en": "Settings",
  "zhTW": "設定",
  "ja": "設定"
 },
 "音乐音量": {
  "en": "Music volume",
  "zhTW": "音樂音量",
  "ja": "音楽の音量"
 },
 "音效音量": {
  "en": "Sound volume",
  "zhTW": "音效音量",
  "ja": "効果音の音量"
 },
 "故事": {
  "en": "Stories",
  "zhTW": "故事",
  "ja": "物語"
 },
 "图鉴": {
  "en": "Gallery",
  "zhTW": "圖鑑",
  "ja": "図鑑"
 },
 "图鉴内容来自原版配置。": {
  "en": "Gallery content comes from the original game data.",
  "zhTW": "圖鑑內容來自原版設定。",
  "ja": "図鑑の内容はオリジナルのゲームデータを使用しています。"
 },
 "命运商店": {
  "en": "Fate Shop",
  "zhTW": "命運商店",
  "ja": "運命ショップ"
 },
 "命运商店内容来自原版配置。": {
  "en": "Fate Shop content comes from the original game data.",
  "zhTW": "命運商店內容來自原版設定。",
  "ja": "運命ショップの内容はオリジナルのゲームデータを使用しています。"
 },
 "制作人员": {
  "en": "Credits",
  "zhTW": "製作人員",
  "ja": "クレジット"
 },
 "资源准备已取消。": {
  "en": "Resource preparation was cancelled.",
  "zhTW": "資源準備已取消。",
  "ja": "リソースの準備をキャンセルしました。"
 },
 "资源准备失败。": {
  "en": "Resource preparation failed.",
  "zhTW": "資源準備失敗。",
  "ja": "リソースの準備に失敗しました。"
 },
 " 请重新加载页面后再试。": {
  "en": " Reload this page to try again.",
  "zhTW": " 請重新載入頁面後再試。",
  "ja": " ページを再読み込みして再試行してください。"
 },
 "重新加载页面": {
  "en": "Reload page",
  "zhTW": "重新載入頁面",
  "ja": "ページを再読み込み"
 },
 "准备完整原始资源：": {
  "en": "Preparing all original resources: ",
  "zhTW": "準備完整原始資源：",
  "ja": "すべてのオリジナルのリソースを準備中："
 },
 "名称": {
  "en": "Name",
  "zhTW": "名稱",
  "ja": "名前"
 },
 "保存失败，请导出备份后再退出。": {
  "en": "Save failed. Export a backup before exiting.",
  "zhTW": "儲存失敗，請匯出備份後再退出。",
  "ja": "保存に失敗しました。終了する前にバックアップをエクスポートしてください。"
 },
 "语言设置已保存。": {
  "en": "Language preference saved.",
  "zhTW": "語言設定已儲存。",
  "ja": "言語設定を保存しました。"
 },
 "语言设置已应用，但未能保存到浏览器。": {
  "en": "Language applied, but the browser could not save the preference.",
  "zhTW": "語言設定已套用，但未能儲存到瀏覽器。",
  "ja": "言語を変更しましたが、設定をブラウザーに保存できませんでした。"
 },
 "浏览器窗口决定显示分辨率": {
  "en": "Display resolution follows the browser window.",
  "zhTW": "瀏覽器視窗決定顯示解析度",
  "ja": "表示解像度はブラウザーのウィンドウサイズに従います。"
 },
 "离线浏览器版本不会发送游戏数据。": {
  "en": "This offline browser version does not send game data.",
  "zhTW": "離線瀏覽器版本不會傳送遊戲資料。",
  "ja": "このオフラインブラウザー版はゲームデータを送信しません。"
 },
 "此显示选项尚未移植；原版内容保持完整。": {
  "en": "This display option has not been ported; the original content remains intact.",
  "zhTW": "此顯示選項尚未移植；原版內容保持完整。",
  "ja": "この表示設定は未移植です。オリジナルの内容は保持されています。"
 },
 "存档保存失败，请导出备份。": {
  "en": "Could not save. Please export a backup.",
  "zhTW": "存檔儲存失敗，請匯出備份。",
  "ja": "保存できませんでした。バックアップをエクスポートしてください。"
 },
 "存档保存在此浏览器中。请导出备份，避免清理浏览器数据时丢失。": {
  "en": "Saves are stored in this browser. Export a backup before clearing browser data.",
  "zhTW": "存檔儲存在此瀏覽器中。請匯出備份，避免清理瀏覽器資料時遺失。",
  "ja": "セーブはこのブラウザーに保存されます。ブラウザーのデータを削除する前にバックアップをエクスポートしてください。"
 },
 "自动存档": {
  "en": "Autosave",
  "zhTW": "自動存檔",
  "ja": "オートセーブ"
 },
 "无法保存可恢复备份，原存档保留。": {
  "en": "A recoverable backup could not be saved. The original save was kept.",
  "zhTW": "無法儲存可還原備份，原存檔保留。",
  "ja": "復元用のバックアップを保存できませんでした。元のセーブは保持されています。"
 },
 "从 JSON 文件恢复游戏进度": {
  "en": "Restore game progress from a JSON file",
  "zhTW": "從 JSON 檔案還原遊戲進度",
  "ja": "JSONファイルからゲームの進行を復元"
 },
 "保存备份文件到你的电脑": {
  "en": "Save a backup file to your computer",
  "zhTW": "儲存備份檔案到你的電腦",
  "ja": "バックアップファイルをコンピューターに保存"
 },
 "离线存档": {
  "en": "Offline save",
  "zhTW": "離線存檔",
  "ja": "オフラインセーブ"
 },
 "尚未满足购买条件": {
  "en": "Purchase requirements have not been met.",
  "zhTW": "尚未滿足購買條件",
  "ja": "購入条件を満たしていません。"
 },
 "只能在新开局时更改激活状态": {
  "en": "Activation can only be changed before starting a new game.",
  "zhTW": "只能在新開局時變更啟用狀態",
  "ja": "有効状態は新しいゲームを始める前にのみ変更できます。"
 },
 "教程结束需要主程序切换至正式游戏。": {
  "en": "The main application must switch to the full game after the tutorial.",
  "zhTW": "教學結束需要主程式切換至正式遊戲。",
  "ja": "チュートリアル後はメインアプリケーションで本編に切り替える必要があります。"
 },
 "存档文件过大": {
  "en": "The save file is too large.",
  "zhTW": "存檔檔案過大",
  "ja": "セーブファイルが大きすぎます。"
 },
 "这不是兼容的离线存档": {
  "en": "This is not a compatible offline save.",
  "zhTW": "這不是相容的離線存檔",
  "ja": "互換性のあるオフラインセーブではありません。"
 }
};
function normalizeLanguage(value){return SUPPORTED_LANGUAGES.includes(value)?value:DEFAULT_LANGUAGE;}
function normalizeSettings(value){const saved=value&&typeof value==='object'&&!Array.isArray(value)?value:{};return {...{language:DEFAULT_LANGUAGE,textSpeed:1,autoText:false,harmonious:false,mobileUI:false},...saved,language:normalizeLanguage(saved.language)};}
let language=DEFAULT_LANGUAGE;const loadingBindings=new WeakMap();
function setLoadingMessage(value,doc=global.document){const loading=doc?.getElementById('loading-text');if(!loading)return;loadingBindings.set(loading,value);loading.textContent=String((typeof value==='function'?value():value)??'');}
function refreshLoading(doc){const loading=doc?.getElementById('loading-text');if(!loading)return;if(loadingBindings.has(loading)){const value=loadingBindings.get(loading);loading.textContent=String((typeof value==='function'?value():value)??'');}else if(SUPPORTED_LANGUAGES.some(locale=>loading.textContent===text('梅姬祈祷中…',locale)))setLoadingMessage(()=>text('梅姬祈祷中…'),doc);
 for(const [id,key]of [['resource-retry','重试'],['resident-boot-reload','重新加载页面']]){const button=doc.getElementById(id);if(button)button.textContent=text(key);}}
function text(source,locale=language){locale=normalizeLanguage(locale);return locale==='zhCN'?source:messages[source]?.[locale]??messages[source]?.en??source;}
function applyDocument(locale,doc=global.document){language=normalizeLanguage(locale);if(!doc)return language;doc.documentElement.lang={en:'en',zhCN:'zh-CN',zhTW:'zh-TW',ja:'ja'}[language];doc.title=text('苏丹的游戏');const game=doc.getElementById('game'),title=doc.querySelector('.loading-title');game?.setAttribute('aria-label',doc.title);if(title)title.textContent=doc.title;
 const faces=shellFonts[language];doc.documentElement.style.setProperty('--sddyx-shell-font',faces.body);doc.documentElement.style.setProperty('--sddyx-shell-title-font',faces.title);

 refreshLoading(doc);return language;
}
function bootstrap(settings,doc=global.document){const normalized=normalizeSettings(settings);applyDocument(normalized.language,doc);setLoadingMessage(()=>text('梅姬祈祷中…'),doc);return normalized;}
const api={DEFAULT_LANGUAGE,SUPPORTED_LANGUAGES,normalizeLanguage,normalizeSettings,text,applyDocument,bootstrap,setLoadingMessage,messages,get language(){return language;}};global.SDDYXLocalization=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
