#target photoshop
// 選択中のレイヤーを塗りつぶしレイヤーに変換するスクリプト

// レイヤー名に含まれるカラーコードのパターン
var COLOR_CODE_PATTERN = /#([0-9A-Fa-f]{6})/;

// 通過から通常へ変更したかどうか
var passThroughConverted = false;

function sid(s) {
    return stringIDToTypeID(s);
}

// アクティブレイヤーのディスクリプタを取得する
function getActiveLayerDescriptor() {
    var ref = new ActionReference();
    ref.putEnumerated(sid("layer"), sid("ordinal"), sid("targetEnum"));
    return executeActionGet(ref);
}

// シェイプレイヤー・塗りつぶしレイヤーの単色を取得する。単色を持たない場合は null
function getSolidColorOfActiveLayer() {
    var desc = getActiveLayerDescriptor();

    if (!desc.hasKey(sid("adjustment"))) {
        return null;
    }

    var adjustment = desc.getList(sid("adjustment")).getObjectValue(0);

    if (!adjustment.hasKey(sid("color"))) {
        return null;
    }

    var rgb = adjustment.getObjectValue(sid("color"));
    var color = new SolidColor();
    color.rgb.red = rgb.getDouble(sid("red"));
    color.rgb.green = rgb.getDouble(sid("grain"));
    color.rgb.blue = rgb.getDouble(sid("blue"));
    return color;
}

// レイヤー名に含まれるカラーコードを色として取得する。含まれない場合は null
function getColorFromName(name) {
    var matched = name.match(COLOR_CODE_PATTERN);

    if (!matched) {
        return null;
    }

    var hex = matched[1];
    var color = new SolidColor();
    color.rgb.red = parseInt(hex.substr(0, 2), 16);
    color.rgb.green = parseInt(hex.substr(2, 2), 16);
    color.rgb.blue = parseInt(hex.substr(4, 2), 16);
    return color;
}

// アクティブレイヤーをグループで囲む
function groupActiveLayer() {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(sid("layerSection"));
    desc.putReference(sid("null"), ref);

    var fromRef = new ActionReference();
    fromRef.putEnumerated(sid("layer"), sid("ordinal"), sid("targetEnum"));
    desc.putReference(sid("from"), fromRef);

    executeAction(sid("make"), desc, DialogModes.NO);
}

// アクティブレイヤーの不透明部分から選択範囲を作成する
function selectTransparency() {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(sid("channel"), sid("selection"));
    desc.putReference(sid("null"), ref);

    var toRef = new ActionReference();
    toRef.putEnumerated(sid("channel"), sid("channel"), sid("transparencyEnum"));
    desc.putReference(sid("to"), toRef);

    executeAction(sid("set"), desc, DialogModes.NO);
}

// 現在の選択範囲をマスクにしたベタ塗りの塗りつぶしレイヤーを作成する
function makeSolidColorFillLayer(color) {
    var colorDesc = new ActionDescriptor();
    colorDesc.putDouble(sid("red"), color.rgb.red);
    colorDesc.putDouble(sid("grain"), color.rgb.green);
    colorDesc.putDouble(sid("blue"), color.rgb.blue);

    var typeDesc = new ActionDescriptor();
    typeDesc.putObject(sid("color"), sid("RGBColor"), colorDesc);

    var usingDesc = new ActionDescriptor();
    usingDesc.putObject(sid("type"), sid("solidColorLayer"), typeDesc);

    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(sid("contentLayer"));
    desc.putReference(sid("null"), ref);
    desc.putObject(sid("using"), sid("contentLayer"), usingDesc);

    executeAction(sid("make"), desc, DialogModes.NO);
}

function convertIntoFillLayer() {
    var doc = app.activeDocument;
    var sourceLayer = doc.activeLayer;

    // 元のレイヤーの設定を取得
    var name = sourceLayer.name;
    var opacity = sourceLayer.opacity;
    var blendMode = sourceLayer.blendMode;

    // 通過モードだった場合の警告フラグ
    passThroughConverted = blendMode == BlendMode.PASSTHROUGH;

    if (passThroughConverted) {
        blendMode = BlendMode.NORMAL;
    }

    // 色はレイヤー名のカラーコードを最優先、次にレイヤー自身の単色、どちらも無ければ描画色
    var color = getColorFromName(name);

    if (!color) {
        color = getSolidColorOfActiveLayer();
    }

    if (!color) {
        color = app.foregroundColor;
    }

    // 結合結果に合成設定が焼き込まれないよう通常・100% にする
    sourceLayer.blendMode = BlendMode.NORMAL;
    sourceLayer.opacity = 100;

    // グループで囲ってから結合してペイントレイヤーにする
    groupActiveLayer();
    var pixelLayer = doc.activeLayer.merge();
    doc.activeLayer = pixelLayer;

    // ペイントレイヤーの不透明部分から塗りつぶしレイヤーを作成
    selectTransparency();
    makeSolidColorFillLayer(color);
    doc.selection.deselect();

    var fillLayer = doc.activeLayer;
    pixelLayer.remove();

    // 元のレイヤーの設定を引き継ぐ
    fillLayer.name = name;
    fillLayer.blendMode = blendMode;
    fillLayer.opacity = opacity;
}

if (app.documents.length === 0) {
    // ドキュメントが開かれていない場合は何もしない

} else {
    // ヒストリーを一つにまとめる
    app.activeDocument.suspendHistory("Convert Into Fill Layer", "convertIntoFillLayer()");

    if (passThroughConverted) {
        alert("描画モードが「通過」だったため「通常」に変更しました。\n見た目が維持されているか確認してください。");
    }
}
