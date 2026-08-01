#target photoshop
// サンプラーの平均色を計算して描画色に設定するスクリプト

var num_sampler = app.activeDocument.colorSamplers.length;
var avg_red = 0;
var avg_green = 0;
var avg_blue = 0;

// サンプラーの平均色を計算
for (var i = 0; i < num_sampler; i++) {
    avg_red += app.activeDocument.colorSamplers[i].color.rgb.red;
    avg_green += app.activeDocument.colorSamplers[i].color.rgb.green;
    avg_blue += app.activeDocument.colorSamplers[i].color.rgb.blue;
}

avg_red /= num_sampler;
avg_green /= num_sampler;
avg_blue /= num_sampler;

// 描画色に設定
var avg_color = new SolidColor();
avg_color.model = ColorModel.RGB;
avg_color.rgb.red = avg_red;
avg_color.rgb.green = avg_green;
avg_color.rgb.blue = avg_blue;

app.foregroundColor = avg_color;