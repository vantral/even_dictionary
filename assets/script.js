stripWord = function (word) {
  word = word.toLowerCase().replaceAll(RegExp("[аяэеиыуюоёөӫ̄̇]", "g"), "");
  return word;
};

findVariants = function (query, dct) {
  possible_variants = Array();
  stripped_query = stripWord(query);

  for (key in dct) {
    if (stripWord(key).includes(stripped_query)) {
      possible_variants.push(key);
    }
  }

  return possible_variants;
};

const levenshteinDistance = (s, t) => {
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const arr = [];
  for (let i = 0; i <= t.length; i++) {
    arr[i] = [i];
    for (let j = 1; j <= s.length; j++) {
      arr[i][j] =
        i === 0
          ? j
          : Math.min(
              arr[i - 1][j] + 1,
              arr[i][j - 1] + 1,
              arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
            );
    }
  }
  return arr[t.length][s.length];
};

function makeSoundPattern(word) {
  word = word.replaceAll(RegExp("[аяэеиыуюоёөӫ]", "g"), "V");
  word = word.replaceAll(RegExp("[бвгджзйклмнпрстфхцчшщъьӈ]", "g"), "C");
  return word;
}

function makeRanging(query, listOfVariants) {
  rangings = {};

  for (variant of listOfVariants) {
    ed_variant = variant.toLowerCase().replaceAll(RegExp("[х̄̇]", "g"), "");

    dist_h_length = current_dist = levenshteinDistance(
      ed_variant.substring(0, query.length),
      query
    );

    ed_query = query
      .replaceAll(RegExp("[оу]", "g"), "ө")
      .replaceAll(RegExp("[ёю]", "g"), "ӫ");

    dist_o = levenshteinDistance(ed_variant, ed_query);

    if (dist_o > current_dist) {
      ed_query = query;
      current_dist = dist_h_length;
    }

    ed_front_variant = ed_variant.replaceAll("и", "ы");

    dist_front_high = levenshteinDistance(ed_front_variant, ed_query);

    if (dist_front_high < current_dist) {
      ed_variant = ed_front_variant;
      current_dist = dist_front_high;
    }

    ed_reduction_variant = ed_variant.replaceAll(RegExp("[аэ]", "g"), "ы");

    dist_reduction = levenshteinDistance(ed_reduction_variant, ed_query);

    if (stripWord(ed_variant).startsWith(stripWord(query))) {
      sw = 0;
    } else sw = 1;

    if (makeSoundPattern(ed_variant).startsWith(makeSoundPattern(query))) {
      sp = 0;
    } else sp = 1;

    rangings[variant] = [
      sw,
      sp,
      dist_h_length,
      dist_o,
      dist_front_high,
      dist_reduction,
      variant.length,
      variant,
    ];
  }

  return rangings;
}

function rangeVariants(rangings) {
  arrayToRange = [];
  entries = Object.entries(rangings);
  for (r in entries) {
    arrayToRange.push([entries[r][1], entries[r][0]]);
  }
  return arrayToRange.sort();
}

const input = document.getElementById("search");
const checkbox = document.getElementById("check");
const result = document.getElementById("result");

searchItems = function (e) {
  result.innerHTML = "";
  if (checkbox.checked) {
    ranged = [];
    for (key in data) {
      if (
        key.toLowerCase().includes(input.value.toLowerCase()) ||
        data[key]
          .join("")
          .toLowerCase()
          .replaceAll(RegExp("[х̄̇]", "g"), "")
          .includes(input.value.toLowerCase())
      ) {
        ranged.push(["", key]);
      }
    }
  } else {
    variants = findVariants(input.value, data);
    rangings = makeRanging(input.value, variants);
    ranged = rangeVariants(rangings);
    ranged = ranged.slice(0, 50);
  }

  for (el of ranged) {
    p = document.createElement("p");
    a = document.createElement("a");
    a.setAttribute("href", "./full.html#" + el[1]);
    a.setAttribute("target", "_blank");
    a.innerHTML = el[1];
    span = document.createElement("span");
    span.innerHTML = " &ndash; " + data[el[1]];
    p.appendChild(a);
    p.appendChild(span);
    result.appendChild(p);
  }

  if (input.value == "") {
    result.innerHTML = "";
  }
};


// ... (keep all existing functions and variable declarations) ...

// Add these new elements
const regexCheckbox = document.getElementById("regex-check");
const virtualKeyboard = document.getElementById("virtual-keyboard");

// Virtual keyboard functionality
virtualKeyboard.addEventListener("click", function(e) {
    if (e.target.classList.contains("virtual-key")) {
        input.value += e.target.textContent;
        input.focus();
        searchItems();
    }
});

function regexSearch(query) {
    let regexRanged = [];
    try {
        let regex = new RegExp(query, 'i'); 
        for (let key in data) {
            if (regex.test(key.replaceAll(RegExp("[х̄̇]", "g"), ""))) {  // Only test the key, not the definition
                regexRanged.push(["", key]);
            }
        }
    } catch (e) {
        // Invalid regex, return empty result
        console.error("Invalid regex:", e);
    }
    return regexRanged;
}

// Modify the existing searchItems function
searchItems = function (e) {
    result.innerHTML = "";
    let searchValue = input.value;

    let ranged;
    if (regexCheckbox.checked) {
        ranged = regexSearch(searchValue);
    } else {
        if (checkbox.checked) {
            ranged = [];
            for (key in data) {
                if (
                    key.toLowerCase().includes(searchValue.toLowerCase()) ||
                    data[key]
                        .join("")
                        .toLowerCase()
                        .replaceAll(RegExp("[х̄̇]", "g"), "")
                        .includes(searchValue.toLowerCase())
                ) {
                    ranged.push(["", key]);
                }
            }
        } else {
            let variants = findVariants(searchValue, data);
            let rangings = makeRanging(searchValue, variants);
            ranged = rangeVariants(rangings);
            ranged = ranged.slice(0, 50);
        }
    }

    for (let el of ranged) {
        let p = document.createElement("p");
        let a = document.createElement("a");
        a.setAttribute("href", "./full.html#" + el[1]);
        a.setAttribute("target", "_blank");
        a.innerHTML = el[1];
        let span = document.createElement("span");
        span.innerHTML = " &ndash; " + data[el[1]];
        p.appendChild(a);
        p.appendChild(span);
        result.appendChild(p);
    }

    if (input.value == "") {
        result.innerHTML = "";
    }
};

// Keep existing event listeners
input.addEventListener("input", searchItems);
checkbox.addEventListener("change", searchItems);

// Add new event listener for regex checkbox
regexCheckbox.addEventListener("change", searchItems);
