(function () {
  "use strict";
  const engine = EvenDictionarySearch.createSearchEngine(dictionaryArticles);
  const input = document.getElementById("search");
  const result = document.getElementById("result");
  const status = document.getElementById("status");
  const hint = document.getElementById("mode-hint");
  const form = document.getElementById("search-form");
  const modes = Array.from(document.querySelectorAll('input[name="mode"]'));
  const aboutDialog = document.getElementById("about-dialog");
  let debounceTimer;

  function activeMode() { return modes.find(function (mode) { return mode.checked; })?.value || "headword"; }
  function updateHint() {
    hint.textContent = activeMode() === "translation"
      ? "Поиск только в переводе: обычный текст совпадает целиком, также можно вводить регулярное выражение. Результаты по алфавиту."
      : activeMode() === "regex"
        ? "Регулярное выражение применяется только к эвенским заголовкам."
        : "Обычный поиск по эвенскому заголовку с учётом диалектных вариантов.";
  }

  function render(searchResult) {
    result.replaceChildren();
    if (searchResult.error) { status.textContent = searchResult.error; return; }
    const fragment = document.createDocumentFragment();
    for (const item of searchResult.items) {
      const article = document.createElement("article");
      const heading = document.createElement("h2");
      const link = document.createElement("a");
      const definition = document.createElement("p");
      link.href = `./full.html#article-${item.article_id}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = item.headword;
      heading.appendChild(link);
      definition.className = "definition";
      definition.textContent = item.definitions.join("; ");
      article.append(heading, definition);
      fragment.appendChild(article);
    }
    result.appendChild(fragment);
    status.textContent = searchResult.total ? `Найдено: ${searchResult.total}` : "Ничего не найдено";
  }

  function searchItems() {
    const query = input.value.trim();
    if (!query) { result.replaceChildren(); status.textContent = ""; return; }
    const mode = activeMode();
    render(mode === "translation" ? engine.translationSearch(query, 200)
      : mode === "regex" ? engine.regexSearch(query, 200) : engine.rankedSearch(query, 50));
  }

  function scheduleSearch() { clearTimeout(debounceTimer); debounceTimer = setTimeout(searchItems, 80); }
  form.addEventListener("submit", function (event) { event.preventDefault(); clearTimeout(debounceTimer); searchItems(); });
  input.addEventListener("input", scheduleSearch);
  modes.forEach(function (checkbox) {
    checkbox.addEventListener("change", function () {
      if (checkbox.checked) modes.forEach(function (other) { if (other !== checkbox) other.checked = false; });
      updateHint();
      searchItems();
    });
  });
  document.getElementById("virtual-keyboard").addEventListener("click", function (event) {
    const letter = event.target.dataset.letter;
    if (!letter) return;
    input.setRangeText(letter, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length, "end");
    input.focus();
    scheduleSearch();
  });
  updateHint();
  document.getElementById("about-open").addEventListener("click", function () { aboutDialog.showModal(); });
})();
