#target photoshop

// 選択範囲の形のシェイプを作成する
// 描画色の塗りつぶしレイヤーを新規作成する

var PATH_TOLERANCE = 2;

function cTID(s) { return charIDToTypeID(s); }
function sTID(s) { return stringIDToTypeID(s); }

function hasSelection() {
    var ref = new ActionReference();
    ref.putProperty(cTID("Prpr"), sTID("selection"));
    ref.putEnumerated(cTID("Dcmn"), cTID("Ordn"), cTID("Trgt"));
    return executeActionGet(ref).hasKey(sTID("selection"));
}

// 選択範囲から作業用パスを作成する (選択範囲は解除される)
function makeWorkPathFromSelection() {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(cTID("Path"));
    desc.putReference(cTID("null"), ref);
    var fromRef = new ActionReference();
    fromRef.putProperty(cTID("csel"), cTID("fsel"));
    desc.putReference(cTID("From"), fromRef);
    desc.putUnitDouble(cTID("Tlrn"), cTID("#Pxl"), PATH_TOLERANCE);
    executeAction(cTID("Mk  "), desc, DialogModes.NO);
}

function workPathRef() {
    var ref = new ActionReference();
    ref.putProperty(cTID("Path"), cTID("WrPt"));
    return ref;
}

function deleteWorkPath() {
    var desc = new ActionDescriptor();
    desc.putReference(cTID("null"), workPathRef());
    executeAction(cTID("Dlt "), desc, DialogModes.NO);
}

// アクティブなパスをベクトルマスクとした描画色の塗りつぶしレイヤーを作成する
function makeSolidFillLayer() {
    var fg = app.foregroundColor.rgb;
    var rgb = new ActionDescriptor();
    rgb.putDouble(cTID("Rd  "), fg.red);
    rgb.putDouble(cTID("Grn "), fg.green);
    rgb.putDouble(cTID("Bl  "), fg.blue);
    var color = new ActionDescriptor();
    color.putObject(cTID("Clr "), cTID("RGBC"), rgb);
    var layer = new ActionDescriptor();
    layer.putObject(cTID("Type"), sTID("solidColorLayer"), color);

    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(sTID("contentLayer"));
    desc.putReference(cTID("null"), ref);
    desc.putObject(cTID("Usng"), sTID("contentLayer"), layer);
    executeAction(cTID("Mk  "), desc, DialogModes.NO);
}

function main() {
    makeWorkPathFromSelection();
    makeSolidFillLayer();
    deleteWorkPath();
}

if (app.documents.length == 0) {
    alert("ドキュメントが開かれていません");
} else if (!hasSelection()) {
    alert("選択範囲がありません");
} else {
    app.activeDocument.suspendHistory("選択範囲からシェイプ", "main()");
}
