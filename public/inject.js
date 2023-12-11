const API_BASE_URL = "%API_BASE_URL%";

const languages = [
  {
    name: "EN",
    displayName: "English",
    iconName: "gb"
  },
  {
    name: "DE",
    displayName: "Deutsch",
    iconName: "de"
  }
];
const defaultLanguage = document.currentScript.getAttribute("default-lang") ?? languages[0].name;
const sourceLanguage = document.currentScript.getAttribute("source-lang") ?? defaultLanguage;
const formality = document.currentScript.getAttribute("formality") ?? "default";
const glossaryId = document.currentScript.getAttribute("glossary-id") ?? "";
const currentLanguageName = (localStorage.getItem("lang") ?? (navigator.language || navigator.userLanguage) ?? defaultLanguage)
  .toUpperCase()
  .split("-")[0];
const currentLanguage = languages.filter((languageObject) => languageObject.name === currentLanguageName)[0] ?? null;

if (currentLanguage != null) {
  window.addEventListener("load", () => {
    // desktop language selector
    const desktopLanguageSelector = document.createElement("div");

    const mobileCart = document.querySelector(".header-actions--right .showOnMobile");

    if (mobileCart) mobileCart.parentElement.insertBefore(desktopLanguageSelector, mobileCart);
    else document.querySelector(".header-actions--right").appendChild(desktopLanguageSelector);

    desktopLanguageSelector.outerHTML = `
      <div class="language-picker language-picker-desktop" id="multilingual-language-picker-desktop">
        <div class="current-language">
          <img 
            class="flag" 
            data-alt-text="Flag Symbol" 
            src="${API_BASE_URL}/${currentLanguage.iconName}.svg" 
            alt="${currentLanguage.displayName} Flag Symbol"
          />
          <span class="current-language-name">${currentLanguage.displayName}</span>
          <span class="chevron chevron--down"></span>
        </div>
        <div class="language-picker-content">
          ${languages
            .map(
              (languageObject) => `
                <div class="language-item">
                  <a href="#" data-lang-name="${languageObject.name}">
                    <img
                      class="flag icon--lg"
                      src="${API_BASE_URL}/${languageObject.iconName}.svg"
                      alt="${languageObject.displayName} Flag Symbol"
                    />
                    <span>${languageObject.displayName}</span>
                  </a>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;

    // mobile language selector
    let mobileLanguageSelector = document.createElement("div");
    document.querySelector(".header-menu-nav .header-menu-nav-folder").appendChild(mobileLanguageSelector);
    mobileLanguageSelector.outerHTML = `
      <div class="header-menu-actions language-picker language-picker-mobile">
        <a data-folder-id="language-picker" href="#">
          <div class="header-menu-nav-item-content current-language">
            <img class="flag icon--lg" src="${API_BASE_URL}/${currentLanguage.iconName}.svg" alt="${currentLanguage.displayName} Flag Symbol">
            <span class="current-language-name">${currentLanguage.displayName}</span>
            <span class="chevron chevron--right"></span>
          </div>
        </a>
      </div>
    `;

    let mobileLanguageSelectorPicker = document.createElement("div");
    document.querySelector(".header-menu-nav .header-menu-nav-list").appendChild(mobileLanguageSelectorPicker);
    mobileLanguageSelectorPicker.outerHTML = `
      <div id="multilingual-language-picker-mobile" class="header-menu-nav-folder" data-folder="language-picker">
        <div class="header-menu-nav-folder-content">
          <div class="header-menu-controls header-menu-nav-item">
            <a class="header-menu-controls-control header-menu-controls-control--active" data-action="back" href="/" tabindex="0">
                <span class="chevron chevron--left"></span>
                <span>Zurück</span>
            </a>
          </div>
          <div class="language-picker-content">
            ${languages
              .map(
                (languageObject) => `
                  <div class="header-menu-nav-item">
                    <a href="#" tabindex="0" data-lang-name="${languageObject.name}">
                      <img class="flag icon--lg" src="${API_BASE_URL}/${languageObject.iconName}.svg" alt="${languageObject.displayName} Flag Symbol">
                      <span>${languageObject.displayName}</span>
                    </a>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    // register event listeners
    setTimeout(() => {
      // desktop
      document
        .getElementById("multilingual-language-picker-desktop")
        .querySelectorAll(".language-item > a")
        .forEach((languageItem) => {
          languageItem.addEventListener("click", () => {
            localStorage.setItem("lang", languageItem.dataset.langName);
            window.location.reload();
          });
        });

      // mobile
      mobileLanguageSelectorPicker = document.getElementById("multilingual-language-picker-mobile");
      mobileLanguageSelectorPicker.querySelector('a[data-action="back"]').addEventListener("click", (event) => {
        mobileLanguageSelector.parentElement.classList.remove("header-menu-nav-folder--open");
        mobileLanguageSelector.querySelector('a[data-folder-id="language-picker"]').setAttribute("tabindex", "0");
        mobileLanguageSelectorPicker.classList.remove("header-menu-nav-folder--active");

        event.preventDefault();
      });
      mobileLanguageSelector = document.querySelector(".language-picker-mobile");
      mobileLanguageSelector.addEventListener("click", () => {
        mobileLanguageSelector.parentElement.classList.add("header-menu-nav-folder--open");
        mobileLanguageSelector.querySelector('a[data-folder-id="language-picker"]').setAttribute("tabindex", "-1");
        mobileLanguageSelectorPicker.classList.add("header-menu-nav-folder--active");
      });
      mobileLanguageSelectorPicker.querySelectorAll(".language-picker-content > .header-menu-nav-item > a").forEach((languageItem) => {
        languageItem.addEventListener("click", () => {
          localStorage.setItem("lang", languageItem.dataset.langName);
          window.location.reload();
        });
      });
    }, 25);

    // translate site
    if (currentLanguageName !== sourceLanguage) {
      const nodesToTranslate = [];
      const walk = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, null, false);
      let currentNode;

      while ((currentNode = walk.nextNode())) {
        const parentNodeName = currentNode.parentNode.nodeName;

        if (parentNodeName === "STYLE" || parentNodeName === "SCRIPT" || parentNodeName === "NOSCRIPT") continue;

        const nodeText = currentNode.textContent.trim();

        // must not be empty
        if (nodeText.length === 0) continue;

        // must contain a letter
        if (!/[a-zA-Z]/g.test(nodeText)) continue;

        nodesToTranslate.push(currentNode);
      }

      fetch(`${API_BASE_URL}/api/v1/translate`, {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          sourceLang: sourceLanguage,
          targetLang: currentLanguageName,
          texts: nodesToTranslate.map((node) => node.textContent),
          formality,
          glossaryId
        })
      })
        .then((response) => response.json())
        .then((body) => {
          if (!body.success) {
            console.error("Could not translate page: " + body.message);
            return;
          }

          let index = 0;

          for (let translatedText of body.translatedTexts) {
            nodesToTranslate[index].textContent = translatedText;

            index++;
          }
        });
    }
  });
}
