const env = require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const ApiRoute = require("./ApiRoute");

class TranslateRoute extends ApiRoute {
  #cache;

  constructor() {
    super("POST", "/api/v1/translate");

    try {
      this.#cache = JSON.parse(fs.readFileSync("translations.json"));
    } catch (error) {
      this.#cache = {};
    }
  }

  async handleRequest(request) {
    if (!(request.body.texts && request.body.sourceLang && request.body.targetLang)) {
      return {
        success: false,
        message: "missing arguments"
      };
    }

    return {
      success: true,
      message: "ok",
      translatedTexts: await this.translateTexts(
        request.body.texts,
        request.body.sourceLang,
        request.body.targetLang,
        request.body.formality ?? "default"
      )
    };
  }

  async translateTexts(texts, sourceLang, targetLang, formality) {
    const translatedTexts = {};
    const translationIndexMap = {};
    const textsToTranslate = [];
    let index = 0;

    for (let text of texts) {
      const cacheResult = this.getFromCache(text, sourceLang, targetLang, formality);

      if (cacheResult) translatedTexts[index] = cacheResult;
      else {
        translationIndexMap[textsToTranslate.length] = index;
        textsToTranslate.push(text);
      }

      index++;
    }

    if (textsToTranslate.length > 0) {
      try {
        console.log(`Starting to translate ${textsToTranslate.length} texts with DeepL.`);

        const response = await axios.post(
          "https://api-free.deepl.com/v2/translate",
          textsToTranslate.map((text) => "text=" + encodeURIComponent(text)).join("&") +
            `&source_lang=${sourceLang}&target_lang=${targetLang}&formality=${formality}`,
          {
            headers: {
              Authorization: "DeepL-Auth-Key " + env.parsed.DEEPL_API_KEY,
              "Content-Type": "application/x-www-form-urlencoded"
            }
          }
        );

        let translationIndex = 0;

        for (let translation of response.data.translations) {
          this.saveInCache(textsToTranslate[translationIndex], sourceLang, targetLang, formality, translation.text);

          translatedTexts[translationIndexMap[translationIndex]] = translation.text;
          translationIndex++;
        }

        fs.writeFile(
          "translations.json",
          JSON.stringify(this.#cache, null, 2),
          {
            encoding: "utf8",
            flag: "w"
          },
          (error) => {
            if (error) console.log("Could not save cache");
          }
        );

        console.log(
          `Translated ${textsToTranslate.length} texts with a total of ${textsToTranslate
            .map((text) => text.length)
            .reduce((a, b) => a + b, 0)} characters with DeepL.`
        );
      } catch (error) {
        console.error("Could not load translations: " + error);
      }
    }

    return Object.keys(translatedTexts)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((index) => translatedTexts[index]);
  }

  getFromCache(text, sourceLang, targetLang, formality) {
    const sourceLangCache = this.#cache[`${sourceLang}/${formality}`];

    if (!sourceLangCache) return null;

    const textCache = sourceLangCache[text];

    if (!textCache) return null;

    return textCache[`${targetLang}/${formality}`] ?? null;
  }

  saveInCache(text, sourceLang, targetLang, formality, translatedText) {
    this.saveTranslationInCache(`${sourceLang}/${formality}`, targetLang, text, translatedText);
    this.saveTranslationInCache(`${targetLang}/${formality}`, sourceLang, translatedText, text);
  }

  saveTranslationInCache(key, translationLang, text, translatedText) {
    if (!this.#cache[key]) this.#cache[key] = {};
    if (!this.#cache[key][text]) this.#cache[key][text] = {};
    if (!this.#cache[key][text][translationLang]) this.#cache[key][text][translationLang] = translatedText;
  }
}

module.exports = TranslateRoute;
