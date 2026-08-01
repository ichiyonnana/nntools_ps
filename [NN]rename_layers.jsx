// ダイアログの作成
var dialog = new Window("dialog", "選択レイヤーの名称変更", undefined);

// テキストエリア
var textArea = dialog.add("edittext", undefined, "", { multiline: true, scrolling: true });
textArea.size = [300, 200];

// OKボタン
var okButton = dialog.add("button", undefined, "OK");
okButton.onClick = function () {
    renameSelectedLayers();
    dialog.close();
};

// Cancelボタン
var cancelButton = dialog.add("button", undefined, "Cancel");
cancelButton.onClick = function () {
    dialog.close();
};

// ダイアログ表示前にテキストエリアに選択レイヤーの名称をセット
setSelectedLayersNames();

// ダイアログ表示
dialog.show();

// 選択レイヤーの名称をテキストエリアにセットする関数
function setSelectedLayersNames() {
    var activeLayers = getSelectedLayers();
    if (activeLayers.length > 0) {
        var names = [];
        for (var i = 0; i < activeLayers.length; i++) {
            names.push(activeLayers[i].name);
        }
        textArea.text = names.join("\n");
    }
}

// 選択されたレイヤーの名称を指定した文字列で置き換える関数
function renameSelectedLayers() {
    var activeLayers = getSelectedLayers();
    if (activeLayers.length > 0) {
        var newNames = textArea.text.split("\n");
        for (var i = 0; i < activeLayers.length && i < newNames.length; i++) {
            activeLayers[i].name = newNames[i];
        }
    }
}

// 選択されたレイヤーを取得する関数
function getSelectedLayers() {
    var selectedLayers = [];
    try {
        var ref = new ActionReference();
        ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var desc = executeActionGet(ref);
        if (desc.hasKey(stringIDToTypeID("targetLayers"))) {
            desc = desc.getList(stringIDToTypeID("targetLayers"));
            for (var i = 0; i < desc.count; i++) {
                var index = desc.getReference(i).getIndex();
                var layerCount = app.activeDocument.layers.length;
                var adjustedIndex = layerCount - 1 - index;

                selectedLayers.push(app.activeDocument.layers[adjustedIndex]);
            }
        }
    } catch (e) {
        // エラーが発生した場合は何もしない
    }
    return selectedLayers;
}
