// アクティブなドキュメントを取得
var doc = app.activeDocument;

// 保存オプションを設定
var pngOptions = new PNGSaveOptions();
pngOptions.compression = 9; // 最小サイズの設定

// 現在のドキュメントのパスを取得
var dirPath = doc.path;

// 選択されているレイヤーカンプを取得
var selectedLayerComps = [];
for (var i = 0; i < doc.layerComps.length; i++) {
    if (doc.layerComps[i].selected) {
        selectedLayerComps.push(doc.layerComps[i]);
    }
}

for (var j = 0; j < selectedLayerComps.length; j++) {
    var layerComp = selectedLayerComps[j];
    layerComp.apply(); // レイヤーカンプを適用

    // 保存先のファイルパスを設定
    var filePath = dirPath + "/" + layerComp.name + ".png";
    var file = new File(filePath);

    // 'Save a Copy' のようにドキュメントを保存
    doc.saveAs(file, pngOptions, true, Extension.LOWERCASE);
}

// 完了メッセージを表示
alert("書き出し完了｡");
