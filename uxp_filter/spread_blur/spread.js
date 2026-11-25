// 選択範囲内のピクセルを、指定した方向へ向かって大きくなるガウスぼかしで拡散する（Photoshop 非依存）
//
// - ボケの大きさは選択範囲のバウンディングボックスを基準に、始まりの端で 0、方向の先の端で最大になる（位置の exponent 乗で変化）
// - 最大のボケ幅（±3σ の直径）は、方向と直交する向きのバウンディングボックスの長さ。
//   進行方向は along 倍、直交方向は across 倍する（異方性）
// - 各ピクセルがそれぞれの σ のガウス形に広がる（散布型）。そのため選択範囲の外にもはみ出す
// - ソースは選択範囲内のみ（選択の値を割合として使う）
// - 制限: 選択範囲の中の元のピクセルは取り除かれ、範囲外からは何も届かないので、先の端の近くは届くアルファが不足して透明になる。
//   不透明なピクセルに囲まれた領域には向かない
// - ガウスは幅 2k+1 の箱型フィルタを3回かけたもので近似する。σ² = k(k+1)。
//   非整数の k は、k と k+1 の2つのカーネルを比率で混ぜて表す
// - 箱型3回のカーネルは3階差分にすると4つのインパルスになるので、差分配列にインパルスを足してから3回累積和をとる。
//   ピクセルごとの σ が異なっても、1ピクセルあたり定数時間で済む

const DIRECTIONS = ["up", "down", "left", "right"];

// 最大の k（非整数）。D は方向と直交する向きのバウンディングボックスの長さ
function maxK(D) {
  return (D - 1) / 6;
}

// バウンディングボックスから、ボケがはみ出す最大のピクセル数を返す
function spreadReach(bboxWidth, bboxHeight, dir, params) {
  const D = dir === "up" || dir === "down" ? bboxWidth : bboxHeight;
  return 3 * (Math.floor(maxK(D) * Math.max(params.along, params.across)) + 1);
}

// 正規化した座標（列 u, 行 v。v が増える向きにボケが大きくなる）から元のピクセル番号への対応表を作る
function orient(width, height, dir) {
  const vertical = dir === "up" || dir === "down";
  const cw = vertical ? width : height;
  const ch = vertical ? height : width;
  const map = new Int32Array(cw * ch);
  for (let v = 0; v < ch; v++) {
    for (let u = 0; u < cw; u++) {
      let x, y;
      if (dir === "down") { x = u; y = v; }
      else if (dir === "up") { x = u; y = height - 1 - v; }
      else if (dir === "right") { x = v; y = u; }
      else { x = width - 1 - v; y = u; }
      map[v * cw + u] = y * width + x;
    }
  }
  return { cw, ch, map };
}

// 中心 p、幅 2k+1 の箱型3回カーネルの3階差分を、重み weight で差分配列（4チャンネル）に足す
function addKernel(arr, p, k, weight, v) {
  const w = 2 * k + 1;
  const s = weight / (w * w * w);
  const pos = [p - 3 * k, p - k + 1, p + k + 2, p + 3 * k + 3];
  const coef = [s, -3 * s, 3 * s, -s];
  for (let n = 0; n < 4; n++) {
    const i = pos[n] * 4;
    const c = coef[n];
    arr[i] += c * v[0];
    arr[i + 1] += c * v[1];
    arr[i + 2] += c * v[2];
    arr[i + 3] += c * v[3];
  }
}

// 非整数の k を、k0 と k0+1 のカーネルの混合として足す
function addMixedKernel(arr, p, kf, v) {
  const k0 = Math.floor(kf);
  const f = kf - k0;
  addKernel(arr, p, k0, 1 - f, v);
  if (f > 0) addKernel(arr, p, k0 + 1, f, v);
}

// 差分配列に3回累積和をとって、値に戻す
function integrate3(arr, len) {
  for (let ch = 0; ch < 4; ch++) {
    let s1 = 0, s2 = 0, s3 = 0;
    for (let i = 0; i < len; i++) {
      s1 += arr[i * 4 + ch];
      s2 += s1;
      s3 += s2;
      arr[i * 4 + ch] = s3;
    }
  }
}

// 正規化した座標で、行 ra..rb・列 ca..cb のソースを拡散する。
// source(r, c, v) は v に premultiplied の RGBA を入れ、ソースがなければ false を返す。
// 結果は列ごとに sink(c, vd) で渡す（vd[(r + pad) * 4 + n]。ソースが届かない列は呼ばない）
async function scatter(o) {
  const { cw, ch, ra, rb, ca, cb, pad, source, kOf, along, across, sink, tick, p0, p1 } = o;
  const nr = rb - ra + 1;
  const v = new Float64Array(4);

  // 横方向: 行ごとに σ が一定なので、行ごとに横へ拡散する
  const tmp = new Float32Array(nr * cw * 4);
  const rowUsed = new Uint8Array(nr);
  const hd = new Float64Array((cw + 2 * pad) * 4);
  for (let j = 0; j < nr; j++) {
    if (j % 32 === 0) await tick(p0 + ((p1 - p0) * 0.3 * j) / nr);
    const r = ra + j;
    const kf = kOf(r) * across;
    hd.fill(0);
    for (let c = ca; c <= cb; c++) {
      if (!source(r, c, v)) continue;
      rowUsed[j] = 1;
      addMixedKernel(hd, c + pad, kf, v);
    }
    if (!rowUsed[j]) continue;
    integrate3(hd, cw + pad);
    tmp.set(hd.subarray(pad * 4, (pad + cw) * 4), j * cw * 4);
  }

  // 縦方向: 列ごとに、各行をその行の σ で縦へ拡散する
  const vd = new Float64Array((ch + 2 * pad) * 4);
  for (let c = 0; c < cw; c++) {
    if (c % 32 === 0) await tick(p0 + (p1 - p0) * (0.3 + (0.7 * c) / cw));
    vd.fill(0);
    let any = false;
    for (let j = 0; j < nr; j++) {
      if (!rowUsed[j]) continue;
      const t = (j * cw + c) * 4;
      if (!tmp[t + 3]) continue;
      any = true;
      v[0] = tmp[t]; v[1] = tmp[t + 1]; v[2] = tmp[t + 2]; v[3] = tmp[t + 3];
      addMixedKernel(vd, ra + j + pad, kOf(ra + j) * along, v);
    }
    if (!any) continue;
    integrate3(vd, ch + pad);
    sink(c, vd);
  }
}

// rgba: 領域の RGBA（Uint8, chunky）、mask: 領域の選択範囲（Uint8, 0..255）
// params: { exponent, along, across }（指数、進行方向と直交方向のボケ幅の倍率）
// tick(progress) は途中で await される（進行状況の表示や中断に使う）
// 戻り値: 領域の新しい RGBA。選択範囲が空なら null
async function spreadBlur(rgba, mask, width, height, dir, params, tick) {
  if (!DIRECTIONS.includes(dir)) throw new Error(`不明な方向: ${dir}`);
  const { cw, ch, map } = orient(width, height, dir);

  // 正規化した座標での選択範囲のバウンディングボックス
  let c0 = cw, c1 = -1, r0 = ch, r1 = -1;
  for (let r = 0; r < ch; r++) {
    for (let c = 0; c < cw; c++) {
      if (!mask[map[r * cw + c]]) continue;
      if (c < c0) c0 = c;
      if (c > c1) c1 = c;
      if (r < r0) r0 = r;
      if (r > r1) r1 = r;
    }
  }
  if (c1 < 0) return null;

  const bh = r1 - r0 + 1;
  const kmax = maxK(c1 - c0 + 1);
  const pad = 3 * (Math.floor(kmax * Math.max(params.along, params.across)) + 1) + 4;
  const kOf = (r) => (bh > 1 ? ((r - r0) / (bh - 1)) ** params.exponent * kmax : 0);

  // 選択範囲内のソースを拡散し、ソースの分を取り除いた元の画像の上に重ねる
  const out = new Uint8Array(rgba);
  await scatter({
    cw, ch, pad, kOf, along: params.along, across: params.across, tick, ra: r0, rb: r1, ca: c0, cb: c1, p0: 0, p1: 1,
    source: (r, c, v) => {
      const i = map[r * cw + c];
      const m = mask[i];
      if (!m) return false;
      const a = (rgba[i * 4 + 3] * m) / (255 * 255);
      if (!a) return false;
      v[0] = rgba[i * 4] * a;
      v[1] = rgba[i * 4 + 1] * a;
      v[2] = rgba[i * 4 + 2] * a;
      v[3] = a;
      return true;
    },
    sink: (c, vd) => {
      for (let r = 0; r < ch; r++) {
        const s = (r + pad) * 4;
        // 重なりでアルファの合計が 1 を超えたところは、色も同じ比率で割って平均にする
        // 累積和の誤差で残る極小の値は 0 とみなす
        const rawA = vd[s + 3] < 1e-6 ? 0 : vd[s + 3];
        const norm = rawA > 1 ? 1 / rawA : 1;
        const sa = rawA * norm;
        const i = map[r * cw + c];
        const m = mask[i];
        if (sa === 0 && !m) continue;
        const p = i * 4;
        const k = (rgba[p + 3] / 255) * (1 - m / 255) * (1 - sa);
        const outA = sa + k;
        if (outA <= 0) {
          out[p] = out[p + 1] = out[p + 2] = out[p + 3] = 0;
          continue;
        }
        for (let n = 0; n < 3; n++) {
          const val = (Math.max(0, vd[s + n]) * norm + rgba[p + n] * k) / outA;
          out[p + n] = Math.min(255, Math.round(val));
        }
        out[p + 3] = Math.round(outA * 255);
      }
    },
  });
  await tick(1);
  return out;
}

module.exports = { spreadBlur, spreadReach, DIRECTIONS };
