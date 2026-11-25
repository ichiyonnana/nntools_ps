const { app, core, imaging, constants, action } = require("photoshop");
const { spreadBlur, spreadReach } = require("./spread.js");

const COMMAND_NAME = "拡散ぼかし";
const STORAGE_KEY = "spreadBlur.params";

// 入力欄の定義（範囲外の値は範囲内に収める）
const FIELDS = [
  { key: "exponent", label: "指数", min: 1, max: 5, initial: 2 },
  { key: "across", label: "ボケ幅 (直交方向)", min: 0, max: 2, initial: 1 },
  { key: "along", label: "ボケ幅 (進行方向)", min: 0, max: 2, initial: 1 },
];

class CancelError extends Error {}

// 入力欄を作り、前回の値を入れておく
const initial = loadParams();
document.getElementById("fields").innerHTML = FIELDS.map((f) => `
  <div class="row">
    <sp-label>${f.label} [${f.min.toFixed(1)}, ${f.max.toFixed(1)}]</sp-label>
    <sp-textfield id="${f.key}"></sp-textfield>
  </div>`).join("");
for (const f of FIELDS) document.getElementById(f.key).value = initial[f.key].toFixed(1);

for (const button of document.querySelectorAll("sp-button[data-dir]")) {
  button.addEventListener("click", () => run(button.dataset.dir));
}

async function run(dir) {
  try {
    const useMask = await checkDocument();
    const params = readParams(loadParams());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    for (const f of FIELDS) document.getElementById(f.key).value = params[f.key].toFixed(1);
    await core.executeAsModal((executionContext) => apply(executionContext, dir, params, useMask), { commandName: COMMAND_NAME });
  } catch (e) {
    if (e instanceof CancelError) return;
    await app.showAlert(e.message);
  }
}

// 対象を確認し、レイヤーマスクが対象なら true を返す
async function checkDocument() {
  const doc = app.activeDocument;
  if (!doc) throw new Error("ドキュメントが開かれていません。");
  if (doc.mode !== constants.DocumentMode.RGB) throw new Error("RGB モードのドキュメントのみ対応しています。");
  if (doc.bitsPerChannel !== constants.BitsPerChannelType.EIGHT) throw new Error("8bit/チャンネルのドキュメントのみ対応しています。");
  if (doc.activeLayers.length !== 1) throw new Error("レイヤーを1つだけ選択してください。");
  if (await isMaskTargeted()) return true;
  const layer = doc.activeLayers[0];
  if (layer.kind !== constants.LayerKind.NORMAL) throw new Error("通常のピクセルレイヤーかレイヤーマスクを選択してください。");
  if (layer.isBackgroundLayer) throw new Error("背景レイヤーには使えません。");
  return false;
}

// 選択中のチャンネルが、選択中のレイヤーのレイヤーマスクかどうか
async function isMaskTargeted() {
  const [target, mask] = await action.batchPlay([
    { _obj: "get", _target: [{ _ref: "channel", _enum: "ordinal", _value: "targetEnum" }] },
    { _obj: "get", _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }] },
  ], {});
  if (!target || !mask || target._obj === "error" || mask._obj === "error") return false;
  return target.channelName !== undefined && target.channelName === mask.channelName;
}

// キャンバス全体の対象（ピクセルまたはレイヤーマスク）を RGBA で読む。
// レイヤーマスクは黒を透明として扱うため、値をアルファにした (255, 255, 255, g) にする
async function readTarget(doc, layer, useMask) {
  const width = doc.width;
  const height = doc.height;
  const bounds = { left: 0, top: 0, right: width, bottom: height };
  const full = new Uint8Array(width * height * 4);
  // レイヤーマスクのデータがない部分は白とみなす（暫定）
  if (useMask) full.fill(255);
  const got = useMask
    ? await imaging.getLayerMask({ documentID: doc.id, layerID: layer.id, kind: "user", sourceBounds: bounds })
    : await imaging.getPixels({ documentID: doc.id, layerID: layer.id, sourceBounds: bounds, componentSize: 8, colorSpace: "RGB" });
  const colorProfile = got.imageData.colorProfile;
  try {
    const data = await got.imageData.getData({ chunky: true });
    const comps = got.imageData.components;
    const b = got.sourceBounds;
    const bw = b.right - b.left;
    for (let y = b.top; y < b.bottom; y++) {
      for (let x = b.left; x < b.right; x++) {
        const s = ((y - b.top) * bw + (x - b.left)) * comps;
        const d = (y * width + x) * 4;
        if (comps === 1) {
          full[d] = full[d + 1] = full[d + 2] = 255;
          full[d + 3] = data[s];
        } else {
          full[d] = data[s];
          full[d + 1] = data[s + 1];
          full[d + 2] = data[s + 2];
          full[d + 3] = comps === 4 ? data[s + 3] : 255;
        }
      }
    }
  } finally {
    got.imageData.dispose();
  }
  return { full, colorProfile };
}

// キャンバス全体の RGBA を対象に書き戻す。レイヤーマスクにはアルファを書く
async function writeTarget(doc, layer, useMask, full, colorProfile) {
  const width = doc.width;
  const height = doc.height;
  if (useMask) {
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) gray[i] = full[i * 4 + 3];
    const imageData = await imaging.createImageDataFromBuffer(gray, { width, height, components: 1, chunky: true, colorSpace: "Grayscale" });
    try {
      await imaging.putLayerMask({ documentID: doc.id, layerID: layer.id, kind: "user", imageData, replace: true, targetBounds: { left: 0, top: 0 } });
    } finally {
      imageData.dispose();
    }
    return;
  }
  const imageData = await imaging.createImageDataFromBuffer(full, { width, height, components: 4, chunky: true, colorSpace: "RGB", colorProfile });
  try {
    await imaging.putPixels({ documentID: doc.id, layerID: layer.id, imageData, replace: true, targetBounds: { left: 0, top: 0 } });
  } finally {
    imageData.dispose();
  }
}

// 前回の入力値（なければ初期値）
function loadParams() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    saved = {};
  }
  const params = {};
  for (const f of FIELDS) params[f.key] = Number.isFinite(saved[f.key]) ? saved[f.key] : f.initial;
  return params;
}

// 入力値を読む。数値でなければ前回の値、範囲外なら範囲内に収める
function readParams(previous) {
  const params = {};
  for (const f of FIELDS) {
    const v = parseFloat(document.getElementById(f.key).value);
    params[f.key] = Number.isFinite(v) ? Math.min(f.max, Math.max(f.min, v)) : previous[f.key];
  }
  return params;
}

// batchPlay の矩形（ピクセル単位）
function rectangle(b) {
  const px = (v) => ({ _unit: "pixelsUnit", _value: v });
  return { _obj: "rectangle", top: px(b.top), left: px(b.left), bottom: px(b.bottom), right: px(b.right) };
}

async function apply(executionContext, dir, params, useMask) {
  const doc = app.activeDocument;
  const layer = doc.activeLayers[0];
  const width = doc.width;
  const height = doc.height;

  // キャンバス全体の選択範囲（0..255）
  const fullMask = new Uint8Array(width * height);
  const sel = await imaging.getSelection({ documentID: doc.id, sourceBounds: { left: 0, top: 0, right: width, bottom: height } });
  try {
    const data = await sel.imageData.getData({ chunky: true });
    const b = sel.sourceBounds;
    const bw = b.right - b.left;
    for (let y = b.top; y < b.bottom; y++) {
      for (let x = b.left; x < b.right; x++) fullMask[y * width + x] = data[(y - b.top) * bw + (x - b.left)];
    }
  } finally {
    sel.imageData.dispose();
  }

  // 選択範囲のバウンディングボックス
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!fullMask[y * width + x]) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) throw new Error("選択範囲を作成してください。");

  // ボケがはみ出す分を広げた処理領域（キャンバス内に収める）
  const reach = spreadReach(right - left + 1, bottom - top + 1, dir, params);
  const region = { left: Math.max(0, left - reach), top: Math.max(0, top - reach), right: Math.min(width, right + 1 + reach), bottom: Math.min(height, bottom + 1 + reach) };
  const rw = region.right - region.left;
  const rh = region.bottom - region.top;

  const mask = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++) mask.set(fullMask.subarray((region.top + y) * width + region.left, (region.top + y) * width + region.right), y * rw);

  // put の replace は全体を置き換えるので、キャンバス全体を読んでおく（レイヤーのない部分は透明のまま）
  const { full, colorProfile } = await readTarget(doc, layer, useMask);

  const rgba = new Uint8Array(rw * rh * 4);
  for (let y = 0; y < rh; y++) rgba.set(full.subarray(((region.top + y) * width + region.left) * 4, ((region.top + y) * width + region.right) * 4), y * rw * 4);

  const tick = async (value) => {
    if (executionContext.isCancelled) throw new CancelError();
    executionContext.reportProgress({ value });
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  const out = await spreadBlur(rgba, mask, rw, rh, dir, params, tick);
  for (let y = 0; y < rh; y++) full.set(out.subarray(y * rw * 4, (y + 1) * rw * 4), ((region.top + y) * width + region.left) * 4);

  // 実行後の選択範囲: 元の選択範囲とピクセルを変更した部分を含む矩形（くり返し実行したとき、はみ出した部分もソースにするため）
  const next = { left, top, right: right + 1, bottom: bottom + 1 };
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const i = (y * rw + x) * 4;
      if (out[i + 3] === 0 && rgba[i + 3] === 0) continue;
      if (out[i] === rgba[i] && out[i + 1] === rgba[i + 1] && out[i + 2] === rgba[i + 2] && out[i + 3] === rgba[i + 3]) continue;
      next.left = Math.min(next.left, region.left + x);
      next.top = Math.min(next.top, region.top + y);
      next.right = Math.max(next.right, region.left + x + 1);
      next.bottom = Math.max(next.bottom, region.top + y + 1);
    }
  }

  const suspensionID = await executionContext.hostControl.suspendHistory({ documentID: doc.id, name: COMMAND_NAME });
  let committed = false;
  try {
    await action.batchPlay([{ _obj: "set", _target: [{ _ref: "channel", _property: "selection" }], to: rectangle(next) }], {});
    await writeTarget(doc, layer, useMask, full, colorProfile);
    committed = true;
  } finally {
    await executionContext.hostControl.resumeHistory(suspensionID, committed);
  }
}
