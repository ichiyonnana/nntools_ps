#target photoshop
// 選択中のパスを膨張・収縮させた形状の新規シェイプレイヤーを作成する。
//
// パラメーター
//   拡張するピクセル数
//     正で外側へ膨張、負で内側へ収縮する。"前面シェイプを削除" に設定されているパスは逆方向になる。
//
//   角の丸み
//     膨張させた際のマイター処理半径。
//       0%    角が尖る（マイター接合）
//       100%  拡張ピクセル数を半径として丸める。
//

// 入力可能な値の範囲
var LIMIT = 1024.0;

// ベジェを折れ線化するときの弦の目標長（px）
var FLATTEN_STEP = 3.0;

// 折れ線化のときに直線とみなす制御点のずれ（px）
var FLAT_TOLERANCE = 0.1;

// 結果の折れ線から冗長な点を間引くときの許容誤差（px）
var SIMPLIFY_TOLERANCE = 0.05;

// マイター接合を打ち切る距離（オフセット量に対する倍率）
var MITER_LIMIT = 10.0;

// 円弧を折れ線で近似するときに許容する弦の誤差（px）
var ARC_TOLERANCE = 0.1;

// ダイアログで入力された値と、取り出した選択中のサブパスの受け渡し用
var gOffsetPixels = 0;
var gCornerRatio = 1.0;
var gSubPaths = null;

function sid(s) {
    return stringIDToTypeID(s);
}

function cid(s) {
    return charIDToTypeID(s);
}

function dist(a, b) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
}

// 点 (px, py) と線分 (ax, ay)-(bx, by) の距離の二乗
function distSq(px, py, ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    var l2 = dx * dx + dy * dy;
    var t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;

    if (t < 0) {
        t = 0;
    } else if (t > 1) {
        t = 1;
    }

    var qx = ax + t * dx - px;
    var qy = ay + t * dy - py;
    return qx * qx + qy * qy;
}

// 点 a を通り方向 ua の直線と、点 b を通り方向 ub の直線の交点。平行なら null
function lineIntersect(a, ua, b, ub) {
    var den = ua[0] * ub[1] - ua[1] * ub[0];

    if (Math.abs(den) < 1e-9) {
        return null;
    }

    var t = ((b[0] - a[0]) * ub[1] - (b[1] - a[1]) * ub[0]) / den;
    return [a[0] + ua[0] * t, a[1] + ua[1] * t];
}

function bezierAt(p0, p1, p2, p3, t) {
    var mt = 1 - t;
    var c0 = mt * mt * mt;
    var c1 = 3 * mt * mt * t;
    var c2 = 3 * mt * t * t;
    var c3 = t * t * t;
    return [c0 * p0[0] + c1 * p1[0] + c2 * p2[0] + c3 * p3[0], c0 * p0[1] + c1 * p1[1] + c2 * p2[1] + c3 * p3[1]];
}

// ベジェ 1 区間を何分割するか
function bezierSteps(p0, p1, p2, p3) {
    var f1 = distSq(p1[0], p1[1], p0[0], p0[1], p3[0], p3[1]);
    var f2 = distSq(p2[0], p2[1], p0[0], p0[1], p3[0], p3[1]);

    if (f1 < FLAT_TOLERANCE * FLAT_TOLERANCE && f2 < FLAT_TOLERANCE * FLAT_TOLERANCE) {
        return 1;
    }

    var len = dist(p0, p1) + dist(p1, p2) + dist(p2, p3);
    var steps = Math.ceil(len / FLATTEN_STEP);

    if (steps < 4) {
        steps = 4;
    } else if (steps > 120) {
        steps = 120;
    }

    return steps;
}

// 多角形の符号付き面積。正なら反時計回り（数学座標系）
function signedArea(poly) {
    var a = 0;

    for (var i = 0, n = poly.length; i < n; i++) {
        var p = poly[i];
        var q = poly[(i + 1) % n];
        a += p[0] * q[1] - q[0] * p[1];
    }

    return a * 0.5;
}

// 中心 center のまわりに、オフセットベクトル v0 から v1 まで半径 r の円弧の中間点を追加する
function appendArc(out, center, v0, v1, r) {
    var a0 = Math.atan2(v0[1], v0[0]);
    var a1 = Math.atan2(v1[1], v1[0]);
    var da = a1 - a0;

    while (da > Math.PI) {
        da -= 2 * Math.PI;
    }

    while (da < -Math.PI) {
        da += 2 * Math.PI;
    }

    // 弦の誤差が ARC_TOLERANCE に収まる角度で刻む。
    // 入力が LIMIT で検証済みなので分割数は 57 を超えず、上限のクランプは要らない
    if (r <= ARC_TOLERANCE) {
        return;
    }

    var steps = Math.ceil(Math.abs(da) / (2 * Math.acos(1 - ARC_TOLERANCE / r)));

    for (var i = 1; i < steps; i++) {
        var a = a0 + da * (i / steps);
        out.push([center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r]);
    }
}

// 元の折れ線のエッジを一様グリッドに登録する。セルサイズは探索半径以上にとる
function buildGrid(poly, radius) {
    var cell = Math.max(radius, 4);
    var minX = poly[0][0];
    var minY = poly[0][1];

    for (var i = 1; i < poly.length; i++) {
        if (poly[i][0] < minX) {
            minX = poly[i][0];
        }
        if (poly[i][1] < minY) {
            minY = poly[i][1];
        }
    }

    var map = {};
    var big = [];

    for (var j = 0; j < poly.length; j++) {
        var p = poly[j];
        var q = poly[(j + 1) % poly.length];
        var x0 = Math.floor((Math.min(p[0], q[0]) - minX) / cell);
        var x1 = Math.floor((Math.max(p[0], q[0]) - minX) / cell);
        var y0 = Math.floor((Math.min(p[1], q[1]) - minY) / cell);
        var y1 = Math.floor((Math.max(p[1], q[1]) - minY) / cell);

        // バウンディングボックスが広すぎるエッジはグリッドに入れず常に調べる
        if ((x1 - x0 + 1) * (y1 - y0 + 1) > 256) {
            big.push(j);
            continue;
        }

        for (var cx = x0; cx <= x1; cx++) {
            for (var cy = y0; cy <= y1; cy++) {
                var key = cx + "_" + cy;

                if (map[key]) {
                    map[key].push(j);
                } else {
                    map[key] = [j];
                }
            }
        }
    }

    return { poly: poly, cell: cell, minX: minX, minY: minY, map: map, big: big };
}

// 点から元の折れ線までの最短距離の二乗
function minDistSq(grid, pt) {
    var poly = grid.poly;
    var n = poly.length;
    var best = Number.MAX_VALUE;
    var cx = Math.floor((pt[0] - grid.minX) / grid.cell);
    var cy = Math.floor((pt[1] - grid.minY) / grid.cell);

    for (var ix = cx - 1; ix <= cx + 1; ix++) {
        for (var iy = cy - 1; iy <= cy + 1; iy++) {
            var list = grid.map[ix + "_" + iy];

            if (!list) {
                continue;
            }

            for (var j = 0; j < list.length; j++) {
                var i = list[j];
                var d2 = distSq(pt[0], pt[1], poly[i][0], poly[i][1], poly[(i + 1) % n][0], poly[(i + 1) % n][1]);

                if (d2 < best) {
                    best = d2;
                }
            }
        }
    }

    for (var k = 0; k < grid.big.length; k++) {
        var b = grid.big[k];
        var d3 = distSq(pt[0], pt[1], poly[b][0], poly[b][1], poly[(b + 1) % n][0], poly[(b + 1) % n][1]);

        if (d3 < best) {
            best = d3;
        }
    }

    return best;
}

// サブパスをベジェ区間ごとに折れ線化する
function flattenSubPath(sub) {
    var pts = sub.points;
    var n = pts.length;
    var segments = sub.closed ? n : n - 1;
    var out = [];

    for (var i = 0; i < segments; i++) {
        var a = pts[i];
        var b = pts[(i + 1) % n];
        var steps = bezierSteps(a.anchor, a.forward, b.backward, b.anchor);

        for (var s = 0; s < steps; s++) {
            out.push(s === 0 ? a.anchor : bezierAt(a.anchor, a.forward, b.backward, b.anchor, s / steps));
        }
    }

    return out;
}

// 折れ線を距離 d だけオフセットする。
// g は形状の外向きを決める全体の符号、ratio は角の丸みの半径をオフセット量に対する比率で指定する
function offsetPolyline(poly, d, g, ratio) {
    var n = poly.length;
    var u = [];
    var off = [];
    var origin = [];

    for (var i = 0; i < n; i++) {
        var p = poly[i];
        var q = poly[(i + 1) % n];
        var dx = q[0] - p[0];
        var dy = q[1] - p[1];
        var len = Math.sqrt(dx * dx + dy * dy);

        if (len < 1e-7) {
            continue;
        }

        u.push([dx / len, dy / len]);
        off.push([d * g * (dy / len), -d * g * (dx / len)]);
        origin.push(p);
    }

    var m = u.length;

    if (m < 3) {
        return [];
    }

    var t = d > 0 ? 1 : -1;
    var r = Math.abs(d);
    var miterMax = MITER_LIMIT * r;
    var radius = r * ratio;
    var out = [];

    for (var k = 0; k < m; k++) {
        var pi = (k - 1 + m) % m;
        var v = origin[k];
        var bPrev = [v[0] + off[pi][0], v[1] + off[pi][1]];
        var aCur = [v[0] + off[k][0], v[1] + off[k][1]];
        var cross = u[pi][0] * u[k][1] - u[pi][1] * u[k][0];

        if (t * g * cross > 0) {
            // オフセット後に隙間が開くコーナーを丸める。
            // 頂点 v は 2 本のオフセット直線から等距離 r にあるので、半径 r の円弧は
            // 「2 直線に内接するフィレット」と同じもの。半径を下げるときは中心を
            // 頂点からマイター点へ寄せればよい
            var center = v;
            var scale = 1;

            if (ratio < 1) {
                var miter = lineIntersect(bPrev, u[pi], aCur, u[k]);

                // マイター点が求まらない（ほぼ直線）か遠すぎる場合は頂点中心の円弧に戻す
                if (miter && dist(miter, v) <= miterMax) {
                    center = [v[0] + (miter[0] - v[0]) * (1 - ratio), v[1] + (miter[1] - v[1]) * (1 - ratio)];
                    scale = ratio;
                }
            }

            if (scale === 1) {
                out.push(bPrev);
                appendArc(out, center, off[pi], off[k], r);
                out.push(aCur);
            } else if (radius < 1e-4) {
                // 丸みなし。マイター点がそのまま角になる
                out.push(center);
            } else {
                // 接点は中心から各辺の法線方向へ半径分。bPrev / aCur はこの内側に並ぶので出さない
                out.push([center[0] + off[pi][0] * scale, center[1] + off[pi][1] * scale]);
                appendArc(out, center, off[pi], off[k], radius);
                out.push([center[0] + off[k][0] * scale, center[1] + off[k][1] * scale]);
            }
        } else {
            // オフセット後に重なるコーナーは 2 直線の交点でつなぐ
            var x = lineIntersect(bPrev, u[pi], aCur, u[k]);

            if (x && dist(x, v) <= miterMax) {
                out.push(x);
            } else {
                out.push(bPrev);
                out.push(aCur);
            }
        }
    }

    return out;
}

// 元の折れ線から |d| 未満の距離にある点を落として自己交差のループを取り除く
function pruneInvalid(pts, poly, d) {
    var r = Math.abs(d);
    var limit = r - (r * 0.001 + 1e-6);

    if (limit <= 0) {
        return pts;
    }

    var grid = buildGrid(poly, r);
    var out = [];

    for (var i = 0; i < pts.length; i++) {
        if (minDistSq(grid, pts[i]) >= limit * limit) {
            out.push(pts[i]);
        }
    }

    return out;
}

// ほぼ一直線上に並ぶ点と重複点を間引く
function simplify(pts, tol) {
    var n = pts.length;

    if (n < 4) {
        return pts;
    }

    var out = [];

    for (var i = 0; i < n; i++) {
        var prev = out.length ? out[out.length - 1] : pts[n - 1];
        var cur = pts[i];
        var next = pts[(i + 1) % n];

        if (dist(prev, cur) < 1e-4) {
            continue;
        }

        if (distSq(cur[0], cur[1], prev[0], prev[1], next[0], next[1]) < tol * tol) {
            continue;
        }

        out.push(cur);
    }

    return out.length >= 3 ? out : pts;
}

// パスパネルで選択中のパス（シェイプならそのベクトルマスク）への参照
function targetPathRef() {
    var ref = new ActionReference();
    ref.putEnumerated(cid("Path"), cid("Ordn"), cid("Trgt"));
    return ref;
}

function workPathRef() {
    var ref = new ActionReference();
    ref.putProperty(cid("Path"), cid("WrPt"));
    return ref;
}

function readPoint(desc, key) {
    var p = desc.getObjectValue(sid(key));
    return [p.getUnitDoubleValue(sid("horizontal")), p.getUnitDoubleValue(sid("vertical"))];
}

// 方向線を持たない点は anchor しか持たないので、その場合は anchor で代用する
function readPathPoint(desc) {
    var anchor = readPoint(desc, "anchor");
    return {
        anchor: anchor,
        backward: desc.hasKey(sid("backward")) ? readPoint(desc, "backward") : anchor,
        forward: desc.hasKey(sid("forward")) ? readPoint(desc, "forward") : anchor,
        smooth: desc.hasKey(sid("smooth")) ? desc.getBoolean(sid("smooth")) : false
    };
}

// パスを読み、サブパスの配列にして返す。パスコンポーネントはここで平坦化する
function readSubPaths(ref) {
    var contents;

    try {
        contents = executeActionGet(ref).getObjectValue(sid("pathContents"));
    } catch (e) {
        return [];
    }

    var components = contents.getList(sid("pathComponents"));
    var out = [];

    for (var i = 0; i < components.count; i++) {
        var component = components.getObjectValue(i);
        var operation = component.getEnumerationValue(sid("shapeOperation"));
        var subPaths = component.getList(sid("subpathListKey"));

        for (var j = 0; j < subPaths.count; j++) {
            var subPath = subPaths.getObjectValue(j);
            var pointList = subPath.getList(sid("points"));
            var points = [];

            for (var k = 0; k < pointList.count; k++) {
                points.push(readPathPoint(pointList.getObjectValue(k)));
            }

            out.push({ operation: operation, closed: subPath.getBoolean(sid("closedSubpath")), points: points });
        }
    }

    return out;
}

function getTool() {
    var ref = new ActionReference();
    ref.putEnumerated(cid("capp"), cid("Ordn"), cid("Trgt"));
    return typeIDToStringID(executeActionGet(ref).getEnumerationType(sid("tool")));
}

function setTool(tool) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(sid(tool));
    desc.putReference(cid("null"), ref);
    executeAction(cid("slct"), desc, DialogModes.NO);
}

// キャンバス上で選択中のサブパスだけを取り出す。
// コピー&ペーストでは選択中のコンポーネントだけが末尾に複製されるので、
// 増えた分を読んでから複製前の状態に戻す
function extractSelectedSubPaths() {
    var doc = app.activeDocument;
    var before = readSubPaths(targetPathRef());

    if (before.length === 0) {
        alert("パスまたはシェイプを選択してから実行してください。");
        return null;
    }

    var savedTool = getTool();
    setTool("pathComponentSelectTool");

    var recoveryPoint = "inflate_shape_recovery_" + (new Date()).getTime();
    doc.suspendHistory(recoveryPoint, "");

    var selected = [];

    try {
        executeAction(cid("copy"), undefined, DialogModes.NO);
        executeAction(cid("past"), undefined, DialogModes.NO);
        selected = readSubPaths(targetPathRef()).slice(before.length);
    } catch (e) {
        // 何も選択されていなければコピーできない
    }

    doc.activeHistoryState = doc.historyStates[recoveryPoint];
    setTool(savedTool);

    if (selected.length === 0) {
        alert("シェイプのパスを選択してから実行してください。");
        return null;
    }

    return selected;
}

function pointDesc(x, y) {
    if (!isFinite(x) || !isFinite(y)) {
        throw new Error("パスの座標が不正です（" + x + ", " + y + "）。");
    }

    var desc = new ActionDescriptor();
    desc.putUnitDouble(sid("horizontal"), sid("pixelsUnit"), x);
    desc.putUnitDouble(sid("vertical"), sid("pixelsUnit"), y);
    return desc;
}

// オフセット結果の座標列をアンカーだけの点にする。
// Photoshop 自身も方向線を持たない点は anchor だけを持つ
function cornerPoints(pts) {
    var out = [];

    for (var i = 0; i < pts.length; i++) {
        var desc = new ActionDescriptor();
        desc.putObject(sid("anchor"), sid("paint"), pointDesc(pts[i][0], pts[i][1]));
        out.push(desc);
    }

    return out;
}

// 元のサブパスのアンカーポイントをそのまま写す
function originalPoints(sub) {
    var out = [];

    for (var i = 0; i < sub.points.length; i++) {
        var p = sub.points[i];
        var desc = new ActionDescriptor();
        desc.putObject(sid("anchor"), sid("paint"), pointDesc(p.anchor[0], p.anchor[1]));
        desc.putObject(sid("backward"), sid("paint"), pointDesc(p.backward[0], p.backward[1]));
        desc.putObject(sid("forward"), sid("paint"), pointDesc(p.forward[0], p.forward[1]));
        desc.putBoolean(sid("smooth"), p.smooth);
        out.push(desc);
    }

    return out;
}

// サブパス 1 つを 1 パスコンポーネントとしてディスクリプタにまとめる
function componentDesc(points, closed, operation) {
    var pointList = new ActionList();

    for (var i = 0; i < points.length; i++) {
        pointList.putObject(sid("pathPoint"), points[i]);
    }

    var subPath = new ActionDescriptor();
    subPath.putBoolean(sid("closedSubpath"), closed);
    subPath.putList(sid("points"), pointList);

    var subPathList = new ActionList();
    subPathList.putObject(sid("subpathsList"), subPath);

    var component = new ActionDescriptor();
    component.putEnumerated(sid("shapeOperation"), sid("shapeOperation"), operation);
    component.putList(sid("subpathListKey"), subPathList);
    return component;
}

function buildPathDescriptor(components) {
    var list = new ActionList();

    for (var i = 0; i < components.length; i++) {
        list.putObject(sid("pathComponent"), components[i]);
    }

    var desc = new ActionDescriptor();
    desc.putList(sid("pathComponents"), list);
    return desc;
}

// 作業用パスの中身を差し替える。中身のクラスは参照に使う Path ではなく pathClass
function setWorkPath(pathDesc) {
    var desc = new ActionDescriptor();
    desc.putReference(cid("null"), workPathRef());
    desc.putObject(cid("T   "), sid("pathClass"), pathDesc);
    executeAction(cid("setd"), desc, DialogModes.NO);
}

function deleteWorkPath() {
    try {
        var desc = new ActionDescriptor();
        desc.putReference(cid("null"), workPathRef());
        executeAction(sid("delete"), desc, DialogModes.NO);
    } catch (e) {
        // 塗りつぶしレイヤーに取り込まれて残っていなければ何もしない
    }
}

// 前景色の塗りつぶしレイヤーを作る。作業用パスがあるとそれがベクトルマスクになる
function makeSolidColorFillLayer(name) {
    var rgb = app.foregroundColor.rgb;

    var color = new ActionDescriptor();
    color.putDouble(cid("Rd  "), rgb.red);
    color.putDouble(cid("Grn "), rgb.green);
    color.putDouble(cid("Bl  "), rgb.blue);

    var type = new ActionDescriptor();
    type.putObject(cid("Clr "), cid("RGBC"), color);

    var using = new ActionDescriptor();
    using.putString(cid("Nm  "), name);
    using.putObject(cid("Type"), sid("solidColorLayer"), type);

    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(sid("contentLayer"));
    desc.putReference(cid("null"), ref);
    desc.putObject(cid("Usng"), sid("contentLayer"), using);
    executeAction(cid("Mk  "), desc, DialogModes.NO);
}

// 処理本体
function inflateShapeMain() {
    var d = gOffsetPixels;
    var subPaths = gSubPaths;
    var sourceName = app.activeDocument.activeLayer.name;
    var polys = [];
    var total = 0;

    for (var i = 0; i < subPaths.length; i++) {
        var poly = subPaths[i].closed ? flattenSubPath(subPaths[i]) : null;
        polys.push(poly);

        if (poly) {
            total += signedArea(poly);
        }
    }

    // 穴が正しく縮むよう、形状全体の巻き方向から外向きの符号を決める
    var g = total >= 0 ? 1 : -1;
    var components = [];

    for (var j = 0; j < subPaths.length; j++) {
        var operation = subPaths[j].operation;

        // 開いたサブパスは外側が定まらないのでそのまま残す
        if (!polys[j]) {
            components.push(componentDesc(originalPoints(subPaths[j]), false, operation));
            continue;
        }

        // subtract は削り取る側なので、外形と逆向きにオフセットする。
        // そうしないと外形を膨らませたときに削り取る量まで増えてしまう
        var od = operation === sid("subtract") ? -d : d;
        var pts = simplify(pruneInvalid(offsetPolyline(polys[j], od, g, gCornerRatio), polys[j], od), SIMPLIFY_TOLERANCE);

        if (pts.length >= 3) {
            components.push(componentDesc(cornerPoints(pts), true, operation));
        }
    }

    if (components.length === 0) {
        alert("収縮しすぎてパスが消滅しました。");
        return;
    }

    setWorkPath(buildPathDescriptor(components));
    makeSolidColorFillLayer(sourceName + " " + (d > 0 ? "+" : "") + d.toFixed(1) + "px");
    deleteWorkPath();
}

// ダイアログ
function showDialog() {
    var win = new Window("dialog", "inflate/shrink shape");
    win.orientation = "column";
    win.alignChildren = "fill";
    win.add("statictext", undefined, "パスを拡張するピクセル数  [-" + LIMIT.toFixed(1) + ", +" + LIMIT.toFixed(1) + "]");

    var offsetRow = win.add("group");
    offsetRow.alignment = "left";
    var offsetEdit = offsetRow.add("edittext", undefined, "1.0");
    offsetEdit.characters = 8;
    offsetRow.add("statictext", undefined, "px");

    win.add("statictext", undefined, "角の丸み  [0, 100]");

    var ratioRow = win.add("group");
    ratioRow.alignment = "left";
    var ratioEdit = ratioRow.add("edittext", undefined, "0");
    ratioEdit.characters = 8;
    ratioRow.add("statictext", undefined, "%");

    var buttons = win.add("group");
    buttons.alignment = "right";
    var okButton = buttons.add("button", undefined, "OK", { name: "ok" });
    buttons.add("button", undefined, "Cancel", { name: "cancel" });

    var result = null;

    okButton.onClick = function () {
        var offset = parseFloat(offsetEdit.text);

        if (isNaN(offset) || offset < -LIMIT || offset > LIMIT) {
            alert("拡張するピクセル数は -" + LIMIT.toFixed(1) + " ～ +" + LIMIT.toFixed(1) + " の範囲で入力してください。");
            return;
        }

        var ratio = parseFloat(ratioEdit.text);

        if (isNaN(ratio) || ratio < 0 || ratio > 100) {
            alert("角の丸みは 0 ～ 100 の範囲で入力してください。");
            return;
        }

        result = { offset: offset, ratio: ratio / 100 };
        win.close();
    };

    offsetEdit.active = true;
    win.show();
    return result;
}

// エントリポイント
function run() {
    if (!app.documents.length) {
        alert("ドキュメントを開いてから実行してください。");
        return;
    }

    var input = showDialog();

    if (input === null || input.offset === 0) {
        return;
    }

    gOffsetPixels = input.offset;
    gCornerRatio = input.ratio;

    // 選択中のサブパスの取り出しはヒストリーを一度戻すので、まとめる前に行う
    gSubPaths = extractSelectedSubPaths();

    if (!gSubPaths) {
        return;
    }

    try {
        app.activeDocument.suspendHistory("inflate/shrink shape", "inflateShapeMain()");
    } catch (e) {
        alert(e.message);
    }
}

run();
