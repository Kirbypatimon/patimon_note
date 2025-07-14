let fileCount = 0;
let lastTime = 0;

document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("status").innerText = "解析中…";
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const detector = await (await import("https://cdn.jsdelivr.net/npm/pitchy@2.0.2/+esm")).PitchDetector.forFloat32Array(sampleRate);

  const chunkSize = 1024;
  const hop = 2048;
  const threshold = 0.15;
  const notes = [];

  for (let i = 0; i < data.length - chunkSize; i += hop) {
    const slice = data.slice(i, i + chunkSize);
    const volume = Math.sqrt(slice.reduce((sum, val) => sum + val * val, 0) / chunkSize);
    if (volume > threshold) {
      const [pitch] = detector.findPitch(slice);
      if (pitch) {
        const press = Math.round(12 * Math.log2(pitch / 185));
        if (press >= 0 && press <= 24) {
          const nowTime = i / sampleRate;
          const delay = nowTime - lastTime;
          lastTime = nowTime;
          const ticks = Math.max(1, Math.min(4, Math.round(delay / 0.1)));
          notes.push({ press, ticks });
        }
        i += sampleRate * 0.1; // skip 0.1s to avoid duplicate detection
      }
    }
  }

  if (notes.length === 0) {
    document.getElementById("status").innerText = "音が検出できませんでした。";
    return;
  }

  document.getElementById("status").innerText = "解析完了！";
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";
  notes.forEach((n, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${i + 1}</td><td>${n.press}</td><td>${n.ticks}</td>`;
    tbody.appendChild(row);
  });

  // ダウンロード処理
  const text = notes.map(n => `${n.press},${n.ticks}`).join("\n");
  fileCount += 1;
  const paddedNum = String(fileCount).padStart(4, "0");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const btn = document.getElementById("downloadBtn");
  btn.style.display = "block";
  btn.onclick = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paddedNum}.txt`;
    a.click();
  };
});
