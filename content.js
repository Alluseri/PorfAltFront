/* jshint esversion: 11 */

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const id = document.getElementById.bind(document);

const DomUtils = {
	"GetValue": (Element) => Element.value || Element.innerText,
	"BuildElement": function (Tag, Characteristics, Inner, Callback) {
		var elem = document.createElement(Tag);
		for (let _ in (Characteristics || {})) {
			elem[_] = Characteristics[_];
		}
		for (let _ in (Inner || [])) {
			elem.appendChild(Inner[_]);
		}
		return (Callback || ((x) => x))(elem);
	}
};

var CurrentLog = {
	Log: 0,
	Generation: -1
};
var Logs = [{ Content: "", Generations: [] }];

var MemoryLength = 2500;
var ResponseLength = 30;

const SetStatus = function (Text, Color) {
	if (Text) {
		id("status").style.display = "block";
		id("status").innerText = Text;
		id("status").style.color = Color;
	} else {
		id("status").style.display = "none";
	}
};

const OnEdit = function (Event) {
	Locked = false;
	SetStatus();
	if (!Event.data && !['insertText', 'insertLineBreak', 'deleteContentBackward', 'deleteContentForward'].includes(Event.inputType))
		return;
	if (CurrentLog.Generation == -1) {
		GetLog().Content = this.value;
		return;
	}
	CurrentLog.Log = Logs.length;
	CurrentLog.Generation = -1;
	Logs.push({
		Content: this.value,
		Generations: []
	});
};

const LastChars = (String, Length) => (String.length > Length ? String.substring(String.length - Length) : String).trim();
const GetLog = () => Logs[CurrentLog.Log];
async function FastJSON(url, body) {
	return await (await fetch(url, body)).json();
}

var Locked = false;
const RunTransform = async function () {
	if (Locked) return;
	SetStatus("Нейросеть думает...", "#1A40CB");
	Locked = true;
	try {
		var Generation;
		for (var i = 1; i <= 5; i++) {
			try {
				if (Generation = (await FastJSON("https://pelevin.gpt.dobro.ai/generate/", { method: "POST", body: JSON.stringify({ "length": ResponseLength, prompt: LastChars(GetLog().Content, MemoryLength) }) })).replies[0]) // jshint ignore: line
					break;
			} catch { }
			SetStatus("Нейросеть не отвечает(х" + i + ")...", "#" + (51 * i).toString(16) + "0000");
		}
		if (!Generation) throw "Нейросеть не отвечает(х5)";
		CurrentLog.Generation = GetLog().Generations.length;
		GetLog().Generations.push(Generation);
		id("playzone").value = GetLog().Content.trim() + Generation;
	} catch (e) {
		SetStatus(e, "#FF0000");
	}
	SetStatus();
	Locked = false;
};
const RunUndo = function () {
	if (Locked) return;
	SetStatus();
	Locked = true;
	if (CurrentLog.Generation == -1) {
		if (CurrentLog.Log > 0) {
			CurrentLog.Log--;
			CurrentLog.Generation = GetLog().Generations.length - 1;
		} else return SetStatus("Некуда отменять!", "#FF0000");
	} else {
		CurrentLog.Generation--;
	}
	id("playzone").value = GetLog().Content + (GetLog().Generations[CurrentLog.Generation] || "");
	Locked = false;
};
const RunRedo = function () {
	if (Locked) return;
	SetStatus();
	Locked = true;
	if (++CurrentLog.Generation >= GetLog().Generations.length) {
		if (++CurrentLog.Log >= Logs.length) {
			CurrentLog.Log--;
			CurrentLog.Generation--;
			return SetStatus("Нечего повторять!", "#FF0000");
		}
		CurrentLog.Generation = -1;
	}
	id("playzone").value = GetLog().Content + (GetLog().Generations[CurrentLog.Generation] || "");
	Locked = false;
};
const RunSave = function () {
	if (Locked) return;
	SetStatus();
	Locked = true;
	localStorage.savedContent = id("playzone").value;
	localStorage.savedLogs = JSON.stringify(Logs);
	localStorage.savedCurrent = JSON.stringify(CurrentLog);
	localStorage.hasSaved = true;
	localStorage.savedMemorySize = MemoryLength;
	localStorage.savedOutputLength = ResponseLength;
	SetStatus("Текущий текст успешно сохранен.", "#00FF00");
	Locked = false;
};
const RunLoad = function () {
	if (Locked) return;
	SetStatus();
	Locked = true;
	if (!localStorage.hasSaved) return SetStatus("У вас нет сохраненного текста!", "#FF0000");
	id("playzone").value = localStorage.savedContent;
	Logs = JSON.parse(localStorage.savedLogs);
	CurrentLog = JSON.parse(localStorage.savedCurrent);
	id("cfg-memory-display").innerText = id("cfg-memory").value = MemoryLength = Number.parseInt(localStorage.savedMemorySize);
	id("cfg-response-display").innerText = id("cfg-response").value = ResponseLength = Number.parseInt(localStorage.savedOutputLength);
	SetStatus("Сохраненный текст успешно загружен.", "#00FF00");
	Locked = false;
};
document.addEventListener("DOMContentLoaded", () => {
	id("playzone").oninput = OnEdit;
	id("btn-transform").onclick = RunTransform;
	id("btn-undo").onclick = RunUndo;
	id("btn-redo").onclick = RunRedo;
	id("btn-save").onclick = RunSave;
	id("btn-load").onclick = RunLoad;
	id("cfg-memory").oninput = function () {
		id("cfg-memory-display").innerText = MemoryLength = Number.parseInt(this.value);
	}
	id("cfg-response").oninput = function () {
		id("cfg-response-display").innerText = ResponseLength = Number.parseInt(this.value);
	}
});