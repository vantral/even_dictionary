(function () {
  "use strict";
  const container = document.getElementById("full");
  const status = document.getElementById("dictionary-status");
  const previousLink = document.getElementById("previous-context");
  const nextLink = document.getElementById("next-context");
  const radius = 25;

  function currentId() {
    const match = window.location.hash.match(/^#article-(\d+)$/);
    const parsed = match ? Number(match[1]) : 0;
    return Number.isInteger(parsed) && parsed >= 0 && parsed < dictionaryArticles.length ? parsed : 0;
  }

  function renderContext() {
    const targetId = currentId();
    const start = Math.max(0, targetId - radius);
    const end = Math.min(dictionaryArticles.length, targetId + radius + 1);
    const fragment = document.createDocumentFragment();
    let selectedElement;
    for (let index = start; index < end; index += 1) {
      const entry = dictionaryArticles[index];
      const article = document.createElement("article");
      const heading = document.createElement("h2");
      const permalink = document.createElement("a");
      const definition = document.createElement("p");
      article.id = `article-${index}`;
      if (index === targetId) { article.className = "selected-entry"; selectedElement = article; }
      permalink.href = `#article-${index}`;
      permalink.target = "_blank";
      permalink.rel = "noopener";
      permalink.textContent = entry.headword;
      heading.appendChild(permalink);
      definition.className = "definition";
      definition.textContent = entry.definitions.join("; ");
      article.append(heading, definition);
      fragment.appendChild(article);
    }
    container.replaceChildren(fragment);
    status.textContent = `Статьи ${start + 1}–${end} из ${dictionaryArticles.length}`;
    previousLink.href = `#article-${Math.max(0, start - 1)}`;
    previousLink.hidden = start === 0;
    nextLink.href = `#article-${Math.min(dictionaryArticles.length - 1, end)}`;
    nextLink.hidden = end === dictionaryArticles.length;
    document.title = `${dictionaryArticles[targetId].headword} — Эвенский словарь`;
    requestAnimationFrame(function () { selectedElement.scrollIntoView({ block: "center" }); });
  }

  window.addEventListener("hashchange", renderContext);
  renderContext();
})();
