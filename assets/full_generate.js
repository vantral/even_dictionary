const dict = document.getElementById("full");
for (el in data) {
  p = document.createElement("p");
  p.setAttribute("class", "word");
  word = document.createElement("span");
  word.setAttribute("id", el);
  word.innerHTML = el + " &ndash; ";
  definition = document.createElement("span");
  definition.innerText = data[el];
  p.appendChild(word);
  p.appendChild(definition);

  dict.appendChild(p);
}
