(() => {
  const storageKey = "ttc-konkatsu-feature-draft";
  const form = document.getElementById("feature-editor-form");
  const reasonsEditor = document.getElementById("reasons-editor");
  const status = document.getElementById("save-status");
  let originalContent;

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function readSavedDraft() {
    try {
      const draft = window.localStorage.getItem(storageKey);
      return draft ? JSON.parse(draft) : null;
    } catch {
      return null;
    }
  }

  function createReasonEditor(reason, index) {
    const card = document.createElement("article");
    card.className = "reason-editor";
    card.dataset.image = reason.image;
    card.innerHTML = `
      <h3>理由 ${index + 1}</h3>
      <label class="field">
        <span>見出し</span>
        <input class="reason-heading" type="text" required>
      </label>
      <label class="field">
        <span>説明文</span>
        <textarea class="reason-paragraphs" required></textarea>
        <small>段落を分ける場合は、間に空行を入れてください。</small>
      </label>
      <div class="image-row">
        <img class="reason-image-preview" alt="">
        <label class="field">
          <span>写真を替える</span>
          <input class="reason-image-input" type="file" accept="image/jpeg,image/png,image/webp">
          <small>大きな写真は自動的にウェブ用の大きさへ整えます。</small>
        </label>
      </div>
      <label class="field">
        <span>写真の説明</span>
        <input class="reason-image-alt" type="text">
      </label>
    `;

    card.querySelector(".reason-heading").value = reason.heading;
    card.querySelector(".reason-paragraphs").value = reason.paragraphs.join("\n\n");
    card.querySelector(".reason-image-preview").src = reason.image;
    card.querySelector(".reason-image-preview").alt = reason.imageAlt || "";
    card.querySelector(".reason-image-alt").value = reason.imageAlt || "";

    card.querySelector(".reason-image-input").addEventListener("change", async event => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const image = await prepareImage(file);
        card.dataset.image = image;
        card.querySelector(".reason-image-preview").src = image;
        setStatus(`理由 ${index + 1} の写真を変更しました。下書きを保存してください。`);
      } catch (error) {
        event.target.value = "";
        setStatus(error.message, true);
      }
    });

    return card;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("写真を読み込めませんでした。別の写真を選んでください。"));
        image.src = reader.result;
      };
      reader.onerror = () => reject(new Error("写真を読み込めませんでした。別の写真を選んでください。"));
      reader.readAsDataURL(file);
    });
  }

  async function prepareImage(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("JPEG、PNG、WebPの写真を選んでください。");
    }

    const image = await loadImage(file);
    const maxWidth = 1400;
    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

    if (dataUrl.length > 1600000) {
      throw new Error("写真の容量が大きすぎます。もう少し小さい写真を選んでください。");
    }

    return dataUrl;
  }

  function render(content) {
    document.getElementById("page-title").value = content.title;
    document.getElementById("page-lead").value = content.lead;
    reasonsEditor.replaceChildren(...content.reasons.map(createReasonEditor));
  }

  function collectContent() {
    const reasons = [...reasonsEditor.querySelectorAll(".reason-editor")].map(card => ({
      heading: card.querySelector(".reason-heading").value.trim(),
      paragraphs: card.querySelector(".reason-paragraphs").value
        .split(/\n\s*\n/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean),
      image: card.dataset.image,
      imageAlt: card.querySelector(".reason-image-alt").value.trim()
    }));

    return {
      title: document.getElementById("page-title").value.trim(),
      lead: document.getElementById("page-lead").value.trim(),
      reasons
    };
  }

  function saveDraft() {
    if (!form.reportValidity()) return false;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(collectContent()));
      setStatus("下書きを保存しました。本番サイトにはまだ公開されていません。");
      return true;
    } catch {
      setStatus("下書きを保存できませんでした。写真を小さくして、もう一度お試しください。", true);
      return false;
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    saveDraft();
  });

  document.getElementById("open-preview").addEventListener("click", () => {
    if (saveDraft()) {
      window.location.href = `/konkatsu/feature/index.html?draft=${Date.now()}`;
    }
  });

  document.getElementById("reset-draft").addEventListener("click", () => {
    window.localStorage.removeItem(storageKey);
    render(originalContent);
    setStatus("元の内容に戻しました。");
  });

  fetch("/content/konkatsu/feature.json", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then(content => {
      originalContent = content;
      const savedDraft = readSavedDraft();
      render(savedDraft || originalContent);
      setStatus(savedDraft ? "前回保存した下書きを開きました。" : "編集する項目を選んでください。");
    })
    .catch(() => setStatus("編集内容を読み込めませんでした。画面を再読み込みしてください。", true));
})();
