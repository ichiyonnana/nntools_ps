#target photoshop
// サンプラーが配置されているピクセルの色をもとに仮テクスチャ用のカラーグリッドを塗りつぶしレイヤーで作成する。

// 指定の領域が塗りつぶされた塗りつぶしレイヤーを作成する
function fillRect(x, y, width, height, r, g, b, layerName) {
    // =======================================================
    var idsetd = charIDToTypeID("setd");
    var desc250 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref1 = new ActionReference();
    var idChnl = charIDToTypeID("Chnl");
    var idfsel = charIDToTypeID("fsel");
    ref1.putProperty(idChnl, idfsel);
    desc250.putReference(idnull, ref1);
    var idT = charIDToTypeID("T   ");

    var desc251 = new ActionDescriptor();

    var idTop = charIDToTypeID("Top ");
    var idPxl = charIDToTypeID("#Pxl");
    desc251.putUnitDouble(idTop, idPxl, y);

    var idLeft = charIDToTypeID("Left");
    var idPxl = charIDToTypeID("#Pxl");
    desc251.putUnitDouble(idLeft, idPxl, x);

    var idBtom = charIDToTypeID("Btom");
    var idPxl = charIDToTypeID("#Pxl");
    desc251.putUnitDouble(idBtom, idPxl, y + height);

    var idRght = charIDToTypeID("Rght");
    var idPxl = charIDToTypeID("#Pxl");
    desc251.putUnitDouble(idRght, idPxl, x + width);

    var idRctn = charIDToTypeID("Rctn");
    desc250.putObject(idT, idRctn, desc251);
    executeAction(idsetd, desc250, DialogModes.NO);

    // =======================================================
    var idMk = charIDToTypeID("Mk  ");
    var desc260 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref2 = new ActionReference();
    var idcontentLayer = stringIDToTypeID("contentLayer");
    ref2.putClass(idcontentLayer);
    desc260.putReference(idnull, ref2);
    var idUsng = charIDToTypeID("Usng");
    var desc261 = new ActionDescriptor();
    var idNm = charIDToTypeID("Nm  ");
    desc261.putString(idNm, layerName);
    var idType = charIDToTypeID("Type");
    var desc262 = new ActionDescriptor();
    var idClr = charIDToTypeID("Clr ");
    var desc263 = new ActionDescriptor();
    var idRd = charIDToTypeID("Rd  ");
    desc263.putDouble(idRd, r);
    var idGrn = charIDToTypeID("Grn ");
    desc263.putDouble(idGrn, g);
    var idBl = charIDToTypeID("Bl  ");
    desc263.putDouble(idBl, b);
    var idRGBC = charIDToTypeID("RGBC");
    desc262.putObject(idClr, idRGBC, desc263);
    var idsolidColorLayer = stringIDToTypeID("solidColorLayer");
    desc261.putObject(idType, idsolidColorLayer, desc262);
    var idcontentLayer = stringIDToTypeID("contentLayer");
    desc260.putObject(idUsng, idcontentLayer, desc261);
    executeAction(idMk, desc260, DialogModes.NO);
}

// index 番目の塗りつぶし領域矩形を取得する
function getCellRect(width, height, index, div) {
    var div = 16;

    var xIndex = index % div;
    var yIndex = Math.floor(index / div);

    var xUnit = width / div;
    var yUnit = height / div;

    var ret = {};

    ret.x = xIndex * xUnit;
    ret.y = (div - (yIndex + 1) * 2) * yUnit;
    ret.w = xUnit;
    ret.h = yUnit * 2;

    return ret;
}

// レイヤー名のプリフィックス
var layerPrefix = "TTCFillLayer";
// レイヤー名のパターン
var layerPattern = new RegExp("^" + layerPrefix + "\\d+$")

// このスクリプトで作成された塗りつぶしレイヤー名
function layerName(i) {
    return layerPrefix + i.toString();
}

// 現在のドキュメントに存在する最後に作成された塗りつぶしレイヤーのIDを取得する
function getLastIndex() {
    var ret = -1;

    for (var i = 0; i < app.activeDocument.layers.length; i++) {
        var layer = app.activeDocument.layers[i];
        if (layer.name.match(layerPattern)) {
            var index = parseInt(layer.name.match(/\d+/)[0]);
            if (index > ret) {
                ret = index;
            }
        }
    }

    return ret;
}

var documentWidth = app.activeDocument.width; // ドキュメントの X ピクセル数
var documentHeight = app.activeDocument.height; // ドキュメントの Y ピクセル数
var num_sampler = app.activeDocument.colorSamplers.length; // サンプラーの数

var colors = Array(); // サンプラーの色

// サンプラーの色を保存
for (var i = 0; i < num_sampler; i++) {
    colors[i] = {};
    colors[i].red = app.activeDocument.colorSamplers[i].color.rgb.red;
    colors[i].green = app.activeDocument.colorSamplers[i].color.rgb.green;
    colors[i].blue = app.activeDocument.colorSamplers[i].color.rgb.blue;
}

// 作成済みレイヤーの最終ID
var lastId = getLastIndex()

// 塗りつぶしレイヤー作成
for (var i = 0; i < num_sampler; i++) {
    var currentId = lastId + 1 + i;

    var rect = getCellRect(documentWidth, documentHeight, currentId);

    fillRect(rect.x, rect.y, rect.w, rect.h, colors[i].red, colors[i].green, colors[i].blue, layerName(currentId));
}