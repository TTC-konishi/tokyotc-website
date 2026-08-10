(() => {
  const draftStorageKey = "ttc-assistant-page-drafts";
  const requestForm = document.getElementById("page-request-form");
  const requestInput = document.getElementById("page-request");
  const result = document.getElementById("assistant-result");
  const resultTitle = document.getElementById("assistant-result-title");
  const resultMessage = document.getElementById("assistant-result-message");
  const preview = document.getElementById("assistant-preview");
  const changeForm = document.getElementById("change-request-form");
  const changeInput = document.getElementById("change-request");
  const changeStatus = document.getElementById("change-status");
  const changeSubmit = document.getElementById("change-request-submit");
  const changeResponse = document.getElementById("change-response");
  const changeResponseBadge = document.getElementById("change-response-badge");
  const changeResponseTitle = document.getElementById("change-response-title");
  const changeResponseSummary = document.getElementById("change-response-summary");
  const changeResponseDone = document.getElementById("change-response-done");
  const changeResponsePending = document.getElementById("change-response-pending");
  const changeResponseNext = document.getElementById("change-response-next");
  const changeProposal = document.getElementById("change-proposal");
  const changeProposalNote = document.getElementById("change-proposal-note");
  const changeProposalBody = document.getElementById("change-proposal-body");
  const changeProposalSource = document.getElementById("change-proposal-source");
  const changeLivePreview = document.getElementById("change-live-preview");
  const changeLivePreviewTitle = document.getElementById("change-live-preview-title");
  const changeLivePreviewFrame = document.getElementById("change-live-preview-frame");
  const changeLivePreviewLink = document.getElementById("change-live-preview-link");
  const currentPageLink = document.getElementById("current-page-link");
  let catalog = [];
  let currentPage;

  const ibjJuly2026Proposal = {
    sourceUrl: "https://www.ibjapan.com/kaisetu/",
    sourceAsOf: "2026年7月",
    verifiedOn: "2026年8月8日",
    member: "110,420",
    partners: "4,818",
    omiaiMonth: "97,066",
    marriagesYear: "19,112",
    omiaiYear: "969,782",
    changes: [
      ["登録会員数", "104,673名（2025年11月）", "110,420名（2026年7月）"],
      ["加盟相談所数", "4,500社以上", "4,818社（2026年7月）"],
      ["月間お見合い数", "79,600件以上", "97,066件（2026年7月）"],
      ["年間成婚者数", "15,374名（2024年）", "19,112名（2025年）"],
      ["年間お見合い数", "記載なし", "969,782件（2025年）"]
    ]
  };

  function normalize(value) {
    return value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s\u3000。、・!?！？「」『』（）()]/g, "");
  }

  function findPage(query) {
    const normalizedQuery = normalize(query);
    return catalog
      .map(page => {
        const candidates = [page.title, ...page.aliases];
        const score = candidates.reduce((best, candidate) => {
          const normalizedCandidate = normalize(candidate);
          if (!normalizedCandidate || !normalizedQuery.includes(normalizedCandidate)) return best;
          return Math.max(best, normalizedCandidate.length);
        }, 0);
        return { page, score };
      })
      .sort((a, b) => b.score - a.score)[0];
  }

  function showPage(page) {
    currentPage = page;
    result.hidden = false;
    resultTitle.textContent = page.title;
    resultMessage.textContent = "こちらのページだと思います。下の画面を見ながら、変更したい内容をそのまま入力してください。";
    currentPageLink.href = page.url;
    preview.src = `${page.url}${page.url.includes("?") ? "&" : "?"}assistant=${Date.now()}`;
    changeInput.value = "";
    changeStatus.textContent = "変更内容を入力すると、反映可能な内容か確認して変更案を作ります。";
    changeResponse.hidden = true;
    changeProposal.hidden = true;
    changeLivePreview.hidden = true;
    changeLivePreviewFrame.removeAttribute("src");
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function readDrafts() {
    try {
      return JSON.parse(window.localStorage.getItem(draftStorageKey)) || {};
    } catch {
      return {};
    }
  }

  function saveDrafts(drafts) {
    window.localStorage.setItem(draftStorageKey, JSON.stringify(drafts));
  }

  function normalizedAmount(value) {
    const digits = value.normalize("NFKC").replace(/,/g, "");
    if (!/^\d+$/.test(digits)) return null;
    return `${Number(digits).toLocaleString("ja-JP")}円`;
  }

  function findPriceChanges(instruction) {
    const normalizedInstruction = instruction.normalize("NFKC");
    const labels = ["入会金", "登録料", "活動サポート費", "月会費", "お見合料", "ご成婚料", "成婚料"];
    const changes = {};

    labels.forEach(label => {
      const match = normalizedInstruction.match(new RegExp(`${label}[^0-9]{0,20}([0-9][0-9,]*)\\s*円`));
      if (!match) return;
      const amount = normalizedAmount(match[1]);
      if (amount) changes[label === "成婚料" ? "ご成婚料" : label] = amount;
    });

    return changes;
  }

  function findTextReplacements(instruction) {
    const replacements = [];
    const pattern = /[「『"](.+?)[」』"]\s*(?:を|から)\s*[「『"](.+?)[」』"]\s*(?:に|へ)/g;
    let match;

    while ((match = pattern.exec(instruction)) !== null) {
      if (match[1].length <= 200 && match[2].length <= 200) {
        replacements.push({ from: match[1], to: match[2] });
      }
    }

    return replacements;
  }

  function findSourceUrl(instruction) {
    const match = instruction.match(/https?:\/\/[^\s）)」』]+/i);
    if (!match) return null;

    try {
      return new URL(match[0]);
    } catch {
      return null;
    }
  }

  function findReferenceDate(instruction) {
    const match = instruction.normalize("NFKC").match(/20\d{2}年\s*\d{1,2}月(?:\s*末)?/);
    return match ? match[0].replace(/\s/g, "") : null;
  }

  function showChangeResponse({ ready = false, badge, title, summary, done, pending, next }) {
    changeResponse.classList.toggle("is-ready", ready);
    changeResponseBadge.textContent = badge;
    changeResponseTitle.textContent = title;
    changeResponseSummary.textContent = summary;
    changeResponseDone.textContent = done;
    changeResponsePending.textContent = pending;
    changeResponseNext.textContent = next;
    changeResponse.hidden = false;
    changeResponse.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showChangeProposal(proposal) {
    const rows = proposal.changes.map(([label, before, after]) => {
      const row = document.createElement("tr");
      [label, before, after].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      return row;
    });

    changeProposalBody.replaceChildren(...rows);
    changeProposalNote.textContent = `${proposal.sourceAsOf}表記のIBJ公式データ（${proposal.verifiedOn}確認）を使った公開前の変更案です。新規入会者数は参照ページにないため変更しません。`;
    changeProposalSource.href = proposal.sourceUrl;
    changeProposal.hidden = false;
  }

  function showLivePreview(page) {
    const previewUrl = `${page.url}${page.url.includes("?") ? "&" : "?"}proposal=${Date.now()}`;
    changeLivePreviewTitle.textContent = `「${page.title}」は、このように変わります`;
    changeLivePreviewFrame.src = previewUrl;
    changeLivePreviewLink.href = previewUrl;
    changeLivePreview.hidden = false;
    changeLivePreview.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function findVerifiedProposal(page, sourceUrl, referenceDate) {
    if (
      page.id === "konkatsu-data" &&
      /(^|\.)ibjapan\.com$/i.test(sourceUrl.hostname) &&
      (!referenceDate || referenceDate.startsWith("2026年7月"))
    ) {
      return ibjJuly2026Proposal;
    }

    return null;
  }

  requestForm.addEventListener("submit", event => {
    event.preventDefault();
    const match = findPage(requestInput.value);

    if (!match || match.score === 0) {
      result.hidden = false;
      resultTitle.textContent = "ページを特定できませんでした";
      resultMessage.textContent = "「保険相談」「料金」「お客様の声」のように、ページ名や内容をもう少し具体的に入力してください。";
      preview.removeAttribute("src");
      changeForm.hidden = true;
      return;
    }

    changeForm.hidden = false;
    showPage(match.page);
  });

  changeForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!currentPage) return;

    const instruction = changeInput.value.trim();
    if (!instruction) return;

    changeSubmit.disabled = true;
    changeSubmit.textContent = "内容を確認中";
    changeResponse.hidden = true;
    changeProposal.hidden = true;
    changeLivePreview.hidden = true;
    changeLivePreviewFrame.removeAttribute("src");

    const drafts = readDrafts();
    const pageDraft = drafts[currentPage.id] || { prices: {}, replacements: [], requests: [] };
    const priceChanges = currentPage.id === "konkatsu-plan" ? findPriceChanges(instruction) : {};
    const replacements = findTextReplacements(instruction);
    pageDraft.prices = { ...pageDraft.prices, ...priceChanges };
    pageDraft.replacements = [...pageDraft.replacements, ...replacements].slice(-20);
    pageDraft.requests = [...pageDraft.requests, instruction].slice(-20);
    drafts[currentPage.id] = pageDraft;
    saveDrafts(drafts);

    const applied = [
      ...Object.entries(priceChanges).map(([label, value]) => `${label}を${value}に変更`),
      ...replacements.map(item => `「${item.from}」を「${item.to}」に変更`)
    ];

    if (applied.length > 0 && currentPage.id.startsWith("konkatsu-")) {
      changeStatus.textContent = "変更案を作成し、確認画面へ反映しました。";
      showChangeResponse({
        ready: true,
        badge: "反映済み",
        title: applied.join("、"),
        summary: `${currentPage.title}の公開前プレビューとして、この端末内に保存しました。`,
        done: "指定された料金または文章を変更し、下の確認画面へ反映しました。",
        pending: "本番サイトへの公開は行っていません。",
        next: "表示を確認し、問題がなければ公開承認へ進みます。"
      });
      preview.src = `${currentPage.url}?assistant=${Date.now()}`;
      showLivePreview(currentPage);
    } else {
      const sourceUrl = findSourceUrl(instruction);
      const referenceDate = findReferenceDate(instruction);
      const verifiedProposal = sourceUrl ? findVerifiedProposal(currentPage, sourceUrl, referenceDate) : null;

      if (verifiedProposal) {
        pageDraft.dataUpdate = {
          sourceUrl: verifiedProposal.sourceUrl,
          sourceAsOf: verifiedProposal.sourceAsOf,
          verifiedOn: verifiedProposal.verifiedOn,
          member: verifiedProposal.member,
          partners: verifiedProposal.partners,
          omiaiMonth: verifiedProposal.omiaiMonth,
          marriagesYear: verifiedProposal.marriagesYear,
          omiaiYear: verifiedProposal.omiaiYear
        };
        drafts[currentPage.id] = pageDraft;
        saveDrafts(drafts);
        changeStatus.textContent = "IBJ公式データを使った変更案を作成し、確認画面へ反映しました。";
        showChangeResponse({
          ready: true,
          badge: "変更案あり",
          title: "2026年7月公表値を使った変更案です",
          summary: "現在の掲載値とIBJ公式ページの公表値を比較し、変更案を作りました。",
          done: "登録会員数、加盟相談所数、お見合い数、年間成婚者数の変更案を作り、確認画面へ反映しました。",
          pending: "新規入会者数は参照ページにないため変更していません。本番サイトにもまだ公開していません。",
          next: "依頼者が下の数値と上のプレビューを確認し、問題がなければ公開承認へ進みます。"
        });
        showChangeProposal(verifiedProposal);
        preview.src = `${currentPage.url}?assistant=${Date.now()}`;
        showLivePreview(currentPage);
      } else if (sourceUrl) {
        const timing = referenceDate ? `${referenceDate}時点` : "最新時点";
        changeStatus.textContent = "依頼を受け付けました。外部サイトの確認が必要なため、まだ変更案は作成していません。";
        showChangeResponse({
          badge: "要確認",
          title: "外部サイトの情報確認が必要な依頼です",
          summary: `${sourceUrl.hostname}を参照し、${timing}の情報へ更新する依頼として受け付けました。`,
          done: `対象ページ「${currentPage.title}」、参照先、更新時点、依頼文をこの端末内の下書きに保存しました。`,
          pending: "参照サイトの読み取り、数値の照合、ページ内容の変更はまだ実行していません。",
          next: "AIが参照元を確認して変更箇所と根拠を提示し、人が確認してから確認ページを作ります。"
        });
      } else {
        changeStatus.textContent = "依頼を受け付けました。現在の先行運用版では自動反映できない内容です。";
        showChangeResponse({
          badge: "受付済み",
          title: "依頼内容を下書きとして保存しました",
          summary: `${currentPage.title}への変更依頼として記録しました。`,
          done: "対象ページと依頼文を、この端末内の下書きに保存しました。",
          pending: "ページ内容への変更はまだ実行していません。",
          next: "自由記述を理解するAIが変更案を作り、人が確認してから確認ページへ反映します。"
        });
      }
    }

    changeSubmit.disabled = false;
    changeSubmit.textContent = "変更案を作る";
  });

  document.getElementById("assistant-reset").addEventListener("click", () => {
    if (!currentPage) return;
    const drafts = readDrafts();
    delete drafts[currentPage.id];
    saveDrafts(drafts);
    changeStatus.textContent = "このページの変更案を取り消しました。";
    changeResponse.hidden = true;
    changeProposal.hidden = true;
    changeLivePreview.hidden = true;
    changeLivePreviewFrame.removeAttribute("src");
    preview.src = `${currentPage.url}?assistant=${Date.now()}`;
  });

  document.getElementById("change-proposal-preview").addEventListener("click", () => {
    changeLivePreview.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  fetch("/content/page-catalog.json", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error();
      return response.json();
    })
    .then(pages => {
      catalog = pages;
      document.getElementById("page-request-submit").disabled = false;
      document.getElementById("assistant-ready-status").textContent = "準備できました。話しかけるように入力してください。";
    })
    .catch(() => {
      document.getElementById("assistant-ready-status").textContent = "ページ一覧を読み込めませんでした。画面を再読み込みしてください。";
    });
})();
