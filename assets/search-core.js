(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EvenDictionarySearch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VOWELS = /[аяэеиыуюоёөӫ]/g;
  const CONSONANTS = /[бвгджзйклмнпрстфхцчшщъьӈ]/g;
  const REMOVABLE_MARKS = /[\u0304\u0307]/g;
  const TRANSLATION_BOUNDARY = "0-9a-zа-яё";
  const collator = new Intl.Collator("ru", { sensitivity: "base" });

  function removeDictionaryMarks(value) {
    return String(value || "").normalize("NFD").replace(REMOVABLE_MARKS, "").normalize("NFC").toLowerCase();
  }

  function normalizeHeadword(value) {
    return removeDictionaryMarks(value).trim().replace(/^х/, "");
  }

  function dialectEquivalent(value) {
    return value.replace(/лр/g, "лл").replace(/мр/g, "мн").replace(/ӈр/g, "ӈн").replace(/ш/g, "с")
      .replace(/йэ/g, "е").replace(/йе/g, "е")
      .replace(/йа/g, "я").replace(/йо/g, "ё").replace(/йу/g, "ю");
  }

  function translationExpression(value) {
    const normalized = removeDictionaryMarks(value);
    new RegExp(normalized, "iu");
    return new RegExp(`(?:^|[^${TRANSLATION_BOUNDARY}])(?:${normalized})(?![${TRANSLATION_BOUNDARY}])`, "iu");
  }

  function stripVowels(value) { return value.replace(VOWELS, ""); }
  function soundPattern(value) { return value.replace(VOWELS, "V").replace(CONSONANTS, "C"); }
  function roundedVowels(value) { return value.replace(/[оу]/g, "ө").replace(/[ёю]/g, "ӫ"); }
  function makeForms(value) {
    return [value, roundedVowels(value), value.replace(/и/g, "ы"), value.replace(/[аэ]/g, "ы")];
  }

  function levenshteinDistance(left, right) {
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;
    if (left.length > right.length) [left, right] = [right, left];
    let previous = new Uint16Array(left.length + 1);
    let current = new Uint16Array(left.length + 1);
    for (let index = 0; index <= left.length; index += 1) previous[index] = index;
    for (let row = 1; row <= right.length; row += 1) {
      current[0] = row;
      for (let column = 1; column <= left.length; column += 1) {
        current[column] = Math.min(current[column - 1] + 1, previous[column] + 1,
          previous[column - 1] + (left[column - 1] === right[row - 1] ? 0 : 1));
      }
      [previous, current] = [current, previous];
    }
    return previous[left.length];
  }

  function minimumFormDistance(entryForms, queryForms, prefixOnly) {
    let minimum = Number.POSITIVE_INFINITY;
    for (let index = 0; index < entryForms.length; index += 1) {
      const entry = prefixOnly ? entryForms[index].slice(0, queryForms[index].length) : entryForms[index];
      minimum = Math.min(minimum, levenshteinDistance(entry, queryForms[index]));
    }
    return minimum;
  }

  function compareScores(left, right) {
    for (let index = 0; index < left.score.length; index += 1) {
      if (left.score[index] !== right.score[index]) return left.score[index] - right.score[index];
    }
    return collator.compare(left.article.headword, right.article.headword);
  }

  function createSearchEngine(articles) {
    const entries = articles.map(function (article, articleId) {
      const normalized = normalizeHeadword(article.headword);
      const equivalent = dialectEquivalent(normalized);
      return {
        article: article,
        articleId: articleId,
        normalized: normalized,
        initialH: removeDictionaryMarks(article.headword).trim().startsWith("х"),
        consonants: stripVowels(equivalent),
        pattern: soundPattern(equivalent),
        forms: makeForms(equivalent),
        translationText: removeDictionaryMarks(article.glosses.join(" ")),
      };
    });

    function item(entry) {
      return { article_id: entry.articleId, headword: entry.article.headword, definitions: entry.article.definitions };
    }

    function rankedSearch(rawQuery, limit) {
      const query = normalizeHeadword(rawQuery);
      if (!query) return { items: [], total: 0 };
      const queryEquivalent = dialectEquivalent(query);
      const queryConsonants = stripVowels(queryEquivalent);
      const queryPattern = soundPattern(queryEquivalent);
      const queryForms = makeForms(queryEquivalent);
      const queryInitialH = removeDictionaryMarks(rawQuery).trim().startsWith("х");
      const candidates = entries.filter(function (entry) {
        return queryConsonants ? entry.consonants.includes(queryConsonants) : entry.forms[0].includes(queryEquivalent);
      });
      const ranked = candidates.map(function (entry) {
        const equivalent = entry.forms.some(function (form, index) { return form === queryForms[index]; });
        return { article: entry.article, entry: entry, score: [
          entry.normalized === query ? 0 : 1,
          entry.initialH === queryInitialH ? 0 : 1,
          equivalent ? 0 : 1,
          entry.normalized.startsWith(query) ? 0 : 1,
          entry.forms[0].startsWith(queryForms[0]) ? 0 : 1,
          entry.consonants.startsWith(queryConsonants) ? 0 : 1,
          entry.pattern.startsWith(queryPattern) ? 0 : 1,
          minimumFormDistance(entry.forms, queryForms, true),
          minimumFormDistance(entry.forms, queryForms, false),
          Math.abs(entry.normalized.length - query.length), entry.normalized.length,
        ] };
      });
      ranked.sort(compareScores);
      return { items: ranked.slice(0, limit).map(function (rank) { return item(rank.entry); }), total: ranked.length };
    }

    function translationSearch(rawQuery, limit) {
      if (!rawQuery.trim()) return { items: [], total: 0 };
      let expression;
      try { expression = translationExpression(rawQuery); }
      catch (_) { return { items: [], total: 0, error: "Некорректное регулярное выражение" }; }
      const matches = entries.filter(function (entry) { return expression.test(entry.translationText); });
      matches.sort(function (left, right) { return collator.compare(left.article.headword, right.article.headword); });
      return { items: matches.slice(0, limit).map(item), total: matches.length };
    }

    function regexSearch(rawQuery, limit) {
      if (!rawQuery) return { items: [], total: 0 };
      let expression;
      try { expression = new RegExp(rawQuery, "iu"); }
      catch (_) { return { items: [], total: 0, error: "Некорректное регулярное выражение" }; }
      const matches = entries.filter(function (entry) { return expression.test(entry.normalized); });
      matches.sort(function (left, right) { return collator.compare(left.article.headword, right.article.headword); });
      return { items: matches.slice(0, limit).map(item), total: matches.length };
    }

    return { rankedSearch: rankedSearch, translationSearch: translationSearch, regexSearch: regexSearch };
  }

  return { createSearchEngine: createSearchEngine, normalizeHeadword: normalizeHeadword, levenshteinDistance: levenshteinDistance };
});
