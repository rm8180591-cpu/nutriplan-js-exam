const API_BASE = "https://nutriplan-api.vercel.app/api";
const API_KEY_STORAGE = "nutriplan_usda_key";
const FOODLOG_KEY = "nutriplan_foodlog";

const GOALS = { calories: 2000, protein: 50, carbs: 250, fat: 65, fiber: 28, sugar: 50 };

const PAGES = {
  meals: { title: "Meals & Recipes", text: "Discover delicious and nutritious recipes tailored for you" },
  products: { title: "Product Scanner", text: "Search packaged foods by name or barcode and view their nutrition" },
  foodlog: { title: "Food Log", text: "Track and monitor your daily nutrition intake" },
};

const SECTION_IDS = {
  meals: ["search-filters-section", "meal-categories-section", "all-recipes-section"],
  details: ["meal-details"],
  products: ["products-section"],
  foodlog: ["foodlog-section"],
};

const CATEGORY_ICONS = {
  Beef: "fa-drumstick-bite",
  Chicken: "fa-drumstick-bite",
  Dessert: "fa-cake-candles",
  Lamb: "fa-drumstick-bite",
  Miscellaneous: "fa-utensils",
  Pasta: "fa-bowl-food",
  Pork: "fa-bacon",
  Seafood: "fa-fish",
  Side: "fa-cookie-bite",
  Starter: "fa-utensils",
  Vegan: "fa-leaf",
  Vegetarian: "fa-carrot",
  Breakfast: "fa-egg",
  Goat: "fa-paw",
};

const GRADE_COLORS = { a: "bg-green-500", b: "bg-lime-500", c: "bg-yellow-500", d: "bg-orange-500", e: "bg-red-500" };

const $ = (id) => document.getElementById(id);

class Utils {
  static escapeHtml(text) {
    return String(text === null || text === undefined ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  static toNumber(value) {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  static round1(value) {
    return Math.round(Utils.toNumber(value) * 10) / 10;
  }

  static dateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  static async ensureSwal() {
    if (typeof Swal !== "undefined") return;
    const urls = [
      "https://cdnjs.cloudflare.com/ajax/libs/limonte-sweetalert2/11.10.8/sweetalert2.all.min.js",
      "https://cdn.jsdelivr.net/npm/sweetalert2@11.10.8/dist/sweetalert2.all.min.js",
      "https://unpkg.com/sweetalert2@11.10.8/dist/sweetalert2.all.min.js",
    ];
    for (const url of urls) {
      const loaded = await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
      if (loaded && typeof Swal !== "undefined") return;
    }
    console.error("SweetAlert2 could not be loaded from any source");
  }

  static notify(title, icon, text) {
    if (typeof Swal === "undefined") {
      console.error("SweetAlert2 (Swal) is not loaded - check the <script> in index.html");
      alert(text ? title + "\n" + text : title);
      return;
    }
    Swal.fire({
      icon: icon || "success",
      title: title,
      text: text || "",
      confirmButtonText: "OK",
      confirmButtonColor: "#059669",
    });
  }

  static spinner() {
    return `<div class="flex items-center justify-center py-12" style="grid-column: 1 / -1">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>`;
  }

  static message(icon, title, text) {
    return `<div class="flex flex-col items-center justify-center py-12 text-center" style="grid-column: 1 / -1">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <i class="fa-solid ${icon} text-gray-400 text-2xl"></i>
      </div>
      <p class="text-gray-500 text-lg">${Utils.escapeHtml(title)}</p>
      <p class="text-gray-400 text-sm mt-2">${Utils.escapeHtml(text)}</p>
    </div>`;
  }
}

const { escapeHtml, toNumber, round1, spinner, message, notify } = Utils;

class ApiService {
  static async request(path, options) {
    const response = await fetch(API_BASE + path, options);
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
    if (!response.ok) {
      const err = new Error((data && data.message) || "Request failed");
      err.status = response.status;
      throw err;
    }
    return data;
  }

  static list(data) {
    if (data && Array.isArray(data.results)) return data.results;
    if (data && Array.isArray(data.result)) return data.result;
    if (data && data.result) return [data.result];
    return [];
  }

  static async getCategories() {
    return ApiService.list(await ApiService.request("/meals/categories"));
  }
  static async getAreas() {
    return ApiService.list(await ApiService.request("/meals/areas"));
  }
  static async getRandomMeals(count) {
    return ApiService.list(await ApiService.request(`/meals/random?count=${count}`));
  }
  static async searchMeals(text, limit) {
    return ApiService.list(await ApiService.request(`/meals/search?q=${encodeURIComponent(text)}&page=1&limit=${limit}`));
  }
  static async filterMeals(type, value, limit) {
    return ApiService.list(await ApiService.request(`/meals/filter?${type}=${encodeURIComponent(value)}&page=1&limit=${limit}`));
  }
  static async getMeal(id) {
    const data = await ApiService.request(`/meals/${encodeURIComponent(id)}`);
    return data ? data.result : null;
  }
  static analyzeNutrition(body, apiKey) {
    return ApiService.request("/nutrition/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body),
    });
  }
  static async searchProducts(text) {
    return ApiService.list(await ApiService.request(`/products/search?q=${encodeURIComponent(text)}&page=1&limit=24`));
  }
  static async getProductsByCategory(name) {
    return ApiService.list(await ApiService.request(`/products/category/${encodeURIComponent(name)}`));
  }
  static async getProductByBarcode(code) {
    const data = await ApiService.request(`/products/barcode/${code}`);
    return data && data.result ? [data.result] : [];
  }
}

class NutritionReader {
  static findBlocks(obj, path, found) {
    if (!obj || typeof obj !== "object") return;
    if (!Array.isArray(obj) && obj.calories !== undefined && obj.calories !== null && !isNaN(Number(obj.calories))) {
      found.push({ path: path, data: obj });
    }
    Object.keys(obj).forEach((key) => NutritionReader.findBlocks(obj[key], path + "." + key.toLowerCase(), found));
  }

  static findNumber(obj, keyName) {
    if (!obj || typeof obj !== "object") return 0;
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === keyName && Number(obj[keys[i]]) > 0) return Number(obj[keys[i]]);
    }
    for (let i = 0; i < keys.length; i++) {
      const inner = NutritionReader.findNumber(obj[keys[i]], keyName);
      if (inner > 0) return inner;
    }
    return 0;
  }

  static normalize(block) {
    return {
      calories: toNumber(block.calories),
      protein: toNumber(block.protein !== undefined ? block.protein : block.proteins),
      carbs: toNumber(block.carbs !== undefined ? block.carbs : block.carbohydrates),
      fat: toNumber(block.fat !== undefined ? block.fat : block.totalFat),
      fiber: toNumber(block.fiber),
      sugar: toNumber(block.sugar !== undefined ? block.sugar : block.sugars),
    };
  }

  static read(data) {
    const found = [];
    NutritionReader.findBlocks(data, "", found);
    if (found.length === 0) return null;

    const perBlock = found.find((f) => f.path.includes("serving"));
    const totalBlock = found.find((f) => f.path.includes("total"));
    const servings = NutritionReader.findNumber(data, "servings");

    let perServing;
    if (perBlock) {
      perServing = NutritionReader.normalize(perBlock.data);
    } else if (totalBlock && servings > 0) {
      const total = NutritionReader.normalize(totalBlock.data);
      perServing = {};
      Object.keys(total).forEach((key) => (perServing[key] = total[key] / servings));
    } else {
      perServing = NutritionReader.normalize(found[0].data);
    }
    return { perServing: perServing, servings: servings };
  }
}

class FoodLog {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.items = this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }

  add(item) {
    const now = new Date();
    item.id = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    item.date = Utils.dateString(now);
    item.time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    this.items.push(item);
    this.save();
  }

  remove(id) {
    this.items = this.items.filter((item) => String(item.id) !== String(id));
    this.save();
  }

  clearToday() {
    const today = Utils.dateString(new Date());
    this.items = this.items.filter((item) => item.date !== today);
    this.save();
  }

  getItemsByDate(dateString) {
    return this.items.filter((item) => item.date === dateString);
  }

  getTotals(dateString) {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    this.getItemsByDate(dateString).forEach((item) => {
      totals.calories += toNumber(item.calories);
      totals.protein += toNumber(item.protein);
      totals.carbs += toNumber(item.carbs);
      totals.fat += toNumber(item.fat);
    });
    return totals;
  }
}

class FoodLogPage {
  constructor(foodLog) {
    this.foodLog = foodLog;
    this.list = $("logged-items-list");
    this.bindEvents();
  }

  addItem(item, successText) {
    this.foodLog.add(item);
    const today = this.foodLog.getTotals(Utils.dateString(new Date()));
    if (today.calories > GOALS.calories) {
      notify(successText, "warning", `You passed your daily calories goal (${GOALS.calories} kcal)!`);
    } else {
      notify(successText, "success");
    }
  }

  bindEvents() {
    this.list.addEventListener("click", (event) => {
      const button = event.target.closest(".remove-log-btn");
      if (!button) return;
      this.foodLog.remove(button.dataset.id);
      this.render();
    });

    $("clear-foodlog").addEventListener("click", async () => {
      const result = await Swal.fire({
        title: "Clear today's log?",
        text: "All items logged today will be removed.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Yes, clear all",
      });
      if (result.isConfirmed) {
        this.foodLog.clearToday();
        this.render();
      }
    });

    const quickButtons = document.querySelectorAll(".quick-log-btn");
    quickButtons[0].addEventListener("click", () => (location.hash = "#meals"));
    quickButtons[1].addEventListener("click", () => (location.hash = "#products"));
  }

  updateProgressCard(card, value, goal, unit) {
    const over = value > goal;
    const label = card.querySelector(".text-gray-500");
    const bar = card.lastElementChild.firstElementChild;
    label.textContent = `${Math.round(value)} / ${goal} ${unit}${over ? " (over limit)" : ""}`;
    label.style.color = over ? "#ef4444" : "";
    bar.style.width = `${Math.min(100, (value / goal) * 100)}%`;
    bar.style.backgroundColor = over ? "#ef4444" : "";
  }

  render() {
    const today = Utils.dateString(new Date());
    const items = this.foodLog.getItemsByDate(today);
    const totals = this.foodLog.getTotals(today);

    $("foodlog-date").textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const cards = document.querySelectorAll("#foodlog-today-section .grid.grid-cols-1 > div");
    this.updateProgressCard(cards[0], totals.calories, GOALS.calories, "kcal");
    this.updateProgressCard(cards[1], totals.protein, GOALS.protein, "g");
    this.updateProgressCard(cards[2], totals.carbs, GOALS.carbs, "g");
    this.updateProgressCard(cards[3], totals.fat, GOALS.fat, "g");

    document.querySelector("#foodlog-today-section h4").textContent = `Logged Items (${items.length})`;
    $("clear-foodlog").style.display = items.length > 0 ? "" : "none";

    if (items.length === 0) {
      this.list.innerHTML = `<div class="text-center py-8 text-gray-500">
        <i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i>
        <p class="font-medium">No meals logged today</p>
        <p class="text-sm">Add meals from the Meals page or scan products</p>
      </div>`;
    } else {
      this.list.innerHTML = items.map((item) => this.itemHtml(item)).join("");
    }

  }

  itemHtml(item) {
    const picture = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" class="w-14 h-14 rounded-lg object-cover bg-gray-100" />`
      : `<div class="w-14 h-14 rounded-lg bg-purple-100 flex items-center justify-center"><i class="fa-solid fa-pencil text-purple-600"></i></div>`;
    return `<div class="flex items-center gap-4 bg-gray-50 rounded-xl p-3">
      ${picture}
      <div class="flex-1" style="min-width: 0">
        <p class="font-semibold text-gray-900 truncate">${escapeHtml(item.name)}</p>
        <p class="text-xs text-gray-500">${escapeHtml(item.detail || item.type)} • ${escapeHtml(item.time)}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-emerald-600">${Math.round(toNumber(item.calories))} kcal</p>
        <p class="text-xs text-gray-500">P ${round1(item.protein)}g • C ${round1(item.carbs)}g • F ${round1(item.fat)}g</p>
      </div>
      <button class="remove-log-btn text-gray-400 hover:text-red-500 px-2" data-id="${escapeHtml(item.id)}" title="Remove"><i class="fa-solid fa-trash"></i></button>
    </div>`;
  }
}

class MealsPage {
  constructor(foodLogPage) {
    this.foodLogPage = foodLogPage;

    this.grid = $("recipes-grid");
    this.categoriesGrid = $("categories-grid");
    this.count = $("recipes-count");
    this.searchInput = $("search-input");
    this.areaChips = document.querySelector("#search-filters-section .overflow-x-auto");
    this.details = $("meal-details");
    this.nutritionBox = $("nutrition-facts-container");

    this.defaultMeals = [];
    this.allCategories = [];
    this.showAllCategories = false;
    this.selectedCategory = "";
    this.selectedArea = "";
    this.searchTimer = null;
    this.currentMeal = null;
    this.currentNutrition = null;

    this.bindEvents();
  }

  async init() {
    this.categoriesGrid.innerHTML = spinner();
    this.grid.innerHTML = spinner();
    this.count.textContent = "Loading recipes...";
    await Promise.all([this.loadCategories(), this.loadAreas(), this.loadDefaultMeals()]);
  }

  bindEvents() {
    this.searchInput.addEventListener("input", () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        const text = this.searchInput.value.trim();
        if (text === "") this.showAll();
        else this.search(text);
      }, 400);
    });

    this.categoriesGrid.addEventListener("click", (event) => {
      const card = event.target.closest(".category-card");
      if (!card) return;
      const name = card.dataset.category;
      if (name === this.selectedCategory) this.showAll();
      else this.filter("category", name);
    });

    const viewAllBtn = document.querySelector("#meal-categories-section button");
    viewAllBtn.addEventListener("click", () => {
      this.showAllCategories = !this.showAllCategories;
      viewAllBtn.innerHTML = this.showAllCategories
        ? 'Show Less <i class="fa-solid fa-chevron-up text-xs"></i>'
        : 'View All <i class="fa-solid fa-chevron-right text-xs"></i>';
      this.renderCategories();
    });

    this.areaChips.addEventListener("click", (event) => {
      const chip = event.target.closest(".area-chip");
      if (!chip) return;
      if (chip.dataset.area === "") this.showAll();
      else this.filter("area", chip.dataset.area);
    });

    this.grid.addEventListener("click", (event) => {
      const card = event.target.closest(".recipe-card");
      if (card) location.hash = "#meal/" + card.dataset.mealId;
    });

    $("back-to-meals-btn").addEventListener("click", () => (location.hash = "#meals"));
    $("log-meal-btn").addEventListener("click", () => this.logCurrentMeal());
  }

  async loadCategories() {
    try {
      this.allCategories = await ApiService.getCategories();
      this.renderCategories();
    } catch (error) {
      this.categoriesGrid.innerHTML = message("fa-triangle-exclamation", "Could not load categories", "Please check your connection and refresh");
    }
  }

  renderCategories() {
    const list = this.showAllCategories ? this.allCategories : this.allCategories.slice(0, 6);
    this.categoriesGrid.innerHTML = list
      .map((category) => {
        const icon = CATEGORY_ICONS[category.name] || "fa-utensils";
        const activeStyle = category.name === this.selectedCategory ? "box-shadow: 0 0 0 2px #10b981;" : "";
        return `<div class="category-card bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200 hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all group" data-category="${escapeHtml(category.name)}" style="${activeStyle}">
          <div class="flex items-center gap-2.5">
            <div class="text-white w-9 h-9 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div><h3 class="text-sm font-bold text-gray-900">${escapeHtml(category.name)}</h3></div>
          </div>
        </div>`;
      })
      .join("");
  }

  async loadAreas() {
    let areas = [];
    try {
      areas = await ApiService.getAreas();
    } catch (error) {
      areas = [];
    }
    const base = "px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all area-chip bg-gray-100 text-gray-700 hover:bg-gray-200";
    let html = `<button class="${base}" data-area="">All Recipes</button>`;
    areas.forEach((area) => {
      html += `<button class="${base}" data-area="${escapeHtml(area.name)}">${escapeHtml(area.name)}</button>`;
    });
    this.areaChips.innerHTML = html;
    this.updateAreaChips();
  }

  updateAreaChips() {
    document.querySelectorAll(".area-chip").forEach((chip) => {
      const isActive = chip.dataset.area === "" ? this.selectedArea === "" && this.selectedCategory === "" : chip.dataset.area === this.selectedArea;
      chip.className =
        "px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all area-chip " +
        (isActive ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200");
    });
  }

  recipeCardHtml(meal) {
    const firstStep = Array.isArray(meal.instructions) ? meal.instructions[0] : meal.instructions;
    const category = meal.category ? escapeHtml(meal.category) : "";
    const area = meal.area ? escapeHtml(meal.area) : "";
    return `<div class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-meal-id="${escapeHtml(meal.id)}">
      <div class="relative h-48 overflow-hidden">
        <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${escapeHtml(meal.thumbnail)}" alt="${escapeHtml(meal.name)}" loading="lazy" />
        <div class="absolute bottom-3 left-3 flex gap-2">
          ${category ? `<span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-gray-700">${category}</span>` : ""}
          ${area ? `<span class="px-2 py-1 bg-emerald-500 text-xs font-semibold rounded-full text-white">${area}</span>` : ""}
        </div>
      </div>
      <div class="p-4">
        <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">${escapeHtml(meal.name)}</h3>
        <p class="text-xs text-gray-600 mb-3 line-clamp-2">${escapeHtml(firstStep || "Delicious recipe to try!")}</p>
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-gray-900"><i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>${category || "Meal"}</span>
          <span class="font-semibold text-gray-500"><i class="fa-solid fa-globe text-blue-500 mr-1"></i>${area || "International"}</span>
        </div>
      </div>
    </div>`;
  }

  render(meals, title) {
    document.querySelector("#all-recipes-section h2").textContent = title || "All Recipes";
    if (meals.length === 0) {
      this.count.textContent = "Showing 0 recipes";
      this.grid.innerHTML = message("fa-search", "No recipes found", "Try searching for something else");
      return;
    }
    this.count.textContent = `Showing ${meals.length} recipes`;
    this.grid.innerHTML = meals.map((meal) => this.recipeCardHtml(meal)).join("");
  }

  showError(title, error) {
    this.count.textContent = "Showing 0 recipes";
    this.grid.innerHTML = message("fa-triangle-exclamation", title, error.message);
  }

  async loadDefaultMeals() {
    this.grid.innerHTML = spinner();
    try {
      let meals = [];
      try {
        meals = await ApiService.getRandomMeals(25);
      } catch (error) {
        meals = [];
      }
      if (meals.length === 0) meals = await ApiService.searchMeals("chicken", 25);
      this.defaultMeals = meals;
      this.render(this.defaultMeals, "All Recipes");
    } catch (error) {
      this.showError("Could not load recipes", error);
    }
  }

  showAll() {
    this.selectedCategory = "";
    this.selectedArea = "";
    this.searchInput.value = "";
    this.renderCategories();
    this.updateAreaChips();
    if (this.defaultMeals.length > 0) this.render(this.defaultMeals, "All Recipes");
    else this.loadDefaultMeals();
  }

  async filter(type, value) {
    this.selectedCategory = type === "category" ? value : "";
    this.selectedArea = type === "area" ? value : "";
    this.searchInput.value = "";
    this.renderCategories();
    this.updateAreaChips();

    this.grid.innerHTML = spinner();
    try {
      this.render(await ApiService.filterMeals(type, value, 25), `${value} Recipes`);
    } catch (error) {
      if (error.status === 404) this.render([], `${value} Recipes`);
      else this.showError("Could not load recipes", error);
    }
  }

  async search(text) {
    this.selectedCategory = "";
    this.selectedArea = "";
    this.renderCategories();
    this.updateAreaChips();

    this.grid.innerHTML = spinner();
    try {
      this.render(await ApiService.searchMeals(text, 25), `Results for "${text}"`);
    } catch (error) {
      if (error.status === 404) this.render([], `Results for "${text}"`);
      else this.showError("Search failed", error);
    }
  }

  async showMealDetails(id) {
    this.currentMeal = null;
    this.currentNutrition = null;
    this.nutritionBox.innerHTML = spinner();
    $("hero-calories").textContent = "Calculating...";

    try {
      const meal = await ApiService.getMeal(id);
      if (!meal) throw new Error("Meal not found");
      this.currentMeal = meal;
      this.fillDetails(meal);

      const ownNutrition = NutritionReader.read(meal);
      if (ownNutrition) {
        this.currentNutrition = ownNutrition;
        this.renderNutrition(ownNutrition);
      } else {
        this.loadNutrition(meal);
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "Could not load this meal", text: error.message });
      location.hash = "#meals";
    }
  }

  stopVideo() {
    const iframe = this.details.querySelector("iframe");
    if (iframe && iframe.getAttribute("src")) iframe.src = "";
  }

  youtubeEmbed(url) {
    if (!url) return "";
    let videoId = "";
    if (url.includes("v=")) videoId = url.split("v=")[1].split("&")[0];
    else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1].split("?")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  }

  fillDetails(meal) {
    const details = this.details;
    const image = details.querySelector("img");
    image.src = meal.thumbnail;
    image.alt = meal.name;
    details.querySelector("h1").textContent = meal.name;

    const badges = [];
    if (meal.category) badges.push(`<span class="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">${escapeHtml(meal.category)}</span>`);
    if (meal.area) badges.push(`<span class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">${escapeHtml(meal.area)}</span>`);
    if (meal.tags && meal.tags.length > 0) badges.push(`<span class="px-3 py-1 bg-purple-500 text-white text-sm font-semibold rounded-full">${escapeHtml(meal.tags[0])}</span>`);
    details.querySelector(".flex.items-center.gap-3.mb-3").innerHTML = badges.join("");

    details.querySelector(".gap-6 > span:first-child").style.display = "none";
    $("hero-servings").parentElement.style.display = "none";
    $("hero-calories").parentElement.style.display = "";

    const ingredients = meal.ingredients || [];
    details.querySelector("h2 span.ml-auto").textContent = `${ingredients.length} items`;
    details.querySelector(".md\\:grid-cols-2").innerHTML = ingredients
      .map(
        (item) => `<label class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer">
          <input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300" />
          <span class="text-gray-700"><span class="font-medium text-gray-900">${escapeHtml(item.measure)}</span> ${escapeHtml(item.ingredient)}</span>
        </label>`
      )
      .join("");

    let steps = meal.instructions || [];
    if (typeof steps === "string") steps = steps.split("\n").filter((s) => s.trim() !== "");
    details.querySelector(".lg\\:col-span-2 .space-y-4").innerHTML = steps
      .map(
        (step, index) => `<div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
          <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">${index + 1}</div>
          <p class="text-gray-700 leading-relaxed pt-2">${escapeHtml(step)}</p>
        </div>`
      )
      .join("");

    const iframe = details.querySelector("iframe");
    const videoCard = iframe.closest(".bg-white");
    const embedUrl = this.youtubeEmbed(meal.youtube);
    iframe.src = embedUrl;
    videoCard.style.display = embedUrl ? "" : "none";
  }

  async loadNutrition(meal) {
    const apiKey = localStorage.getItem(API_KEY_STORAGE);
    if (!apiKey) {
      this.showApiKeyForm("");
      return;
    }

    this.nutritionBox.innerHTML = spinner();
    const body = {
      recipeName: meal.name,
      ingredients: (meal.ingredients || []).map((item) => `${item.measure} ${item.ingredient}`.trim()),
    };

    try {
      const data = await ApiService.analyzeNutrition(body, apiKey);
      if (!this.currentMeal || this.currentMeal.id !== meal.id) return;

      this.currentNutrition = NutritionReader.read(data);
      if (!this.currentNutrition) {
        this.nutritionBox.innerHTML = message("fa-circle-info", "Nutrition data not available", "The API did not return nutrition values for this recipe");
        $("hero-calories").textContent = "N/A";
        return;
      }
      this.renderNutrition(this.currentNutrition);
    } catch (error) {
      if (!this.currentMeal || this.currentMeal.id !== meal.id) return;
      $("hero-calories").textContent = "N/A";
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem(API_KEY_STORAGE);
        this.showApiKeyForm("Invalid API key. Please enter a valid USDA key.");
      } else {
        this.nutritionBox.innerHTML = message("fa-triangle-exclamation", "Could not analyze nutrition", error.message);
      }
    }
  }

  showApiKeyForm(errorText) {
    $("hero-calories").textContent = "N/A";
    this.nutritionBox.innerHTML = `<p class="text-sm text-gray-600 mb-3">Enter your USDA API key to analyze this recipe's nutrition.</p>
      ${errorText ? `<p class="text-sm text-red-500 mb-3">${escapeHtml(errorText)}</p>` : ""}
      <input id="usda-key-input" type="text" placeholder="USDA API key" class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none mb-3" />
      <button id="usda-key-btn" class="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all">Analyze Nutrition</button>`;

    $("usda-key-btn").addEventListener("click", () => {
      const key = $("usda-key-input").value.trim();
      if (key === "") {
        notify("Please enter the API key", "warning");
        return;
      }
      localStorage.setItem(API_KEY_STORAGE, key);
      this.loadNutrition(this.currentMeal);
    });
  }

  nutrientRowHtml(label, value, goal, colorName) {
    const percent = Math.min(100, Math.round((value / goal) * 100));
    return `<div class="flex items-center justify-between">
        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-${colorName}-500"></div><span class="text-gray-700">${label}</span></div>
        <span class="font-bold text-gray-900">${round1(value)}g</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-2"><div class="bg-${colorName}-500 h-2 rounded-full" style="width: ${percent}%"></div></div>`;
  }

  renderNutrition(nutrition) {
    const n = nutrition.perServing;
    const calories = Math.round(n.calories);

    this.nutritionBox.innerHTML = `<p class="text-sm text-gray-500 mb-4">Per serving</p>
      <div class="text-center py-4 mb-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl">
        <p class="text-sm text-gray-600">Calories per serving</p>
        <p class="text-4xl font-bold text-emerald-600">${calories}</p>
      </div>
      <div class="space-y-4">
        ${this.nutrientRowHtml("Protein", n.protein, GOALS.protein, "emerald")}
        ${this.nutrientRowHtml("Carbs", n.carbs, GOALS.carbs, "blue")}
        ${this.nutrientRowHtml("Fat", n.fat, GOALS.fat, "purple")}
        ${this.nutrientRowHtml("Fiber", n.fiber, GOALS.fiber, "orange")}
        ${this.nutrientRowHtml("Sugar", n.sugar, GOALS.sugar, "pink")}
      </div>`;

    $("hero-calories").textContent = `${calories} cal/serving`;
    if (nutrition.servings > 0) {
      $("hero-servings").textContent = `${nutrition.servings} servings`;
      $("hero-servings").parentElement.style.display = "";
    }
  }

  async logCurrentMeal() {
    try {
      await this.askAndLogMeal();
    } catch (error) {
      console.error("Log This Meal failed:", error);
      alert("Could not log this meal: " + error.message);
    }
  }

  async askAndLogMeal() {
    if (!this.currentMeal) {
      notify("The meal is still loading, please try again", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Log this meal",
      text: this.currentNutrition ? "How many servings did you eat?" : "Nutrition data is not available, so calories will be saved as 0. How many servings?",
      input: "number",
      inputValue: 1,
      inputAttributes: { min: 0.25, step: 0.25 },
      showCancelButton: true,
      confirmButtonText: "Add to Food Log",
      confirmButtonColor: "#2563eb",
      inputValidator: (value) => (!value || Number(value) <= 0 ? "Please enter a number greater than 0" : null),
    });
    if (!result.isConfirmed) return;

    const servings = Number(result.value);
    const n = this.currentNutrition ? this.currentNutrition.perServing : { calories: 0, protein: 0, carbs: 0, fat: 0 };
    this.foodLogPage.addItem(
      {
        type: "meal",
        name: this.currentMeal.name,
        image: this.currentMeal.thumbnail,
        detail: `${servings} serving${servings === 1 ? "" : "s"}`,
        calories: n.calories * servings,
        protein: n.protein * servings,
        carbs: n.carbs * servings,
        fat: n.fat * servings,
      },
      "Meal added to your Food Log"
    );
  }
}

class ProductsPage {
  constructor(foodLogPage) {
    this.foodLogPage = foodLogPage;
    this.grid = $("products-grid");
    this.count = $("products-count");
    this.products = [];
    this.selectedGrade = "";
    this.bindEvents();
  }

  init() {
    this.grid.innerHTML = message("fa-barcode", "Search for products", "Type a product name or enter a barcode above");
    this.count.textContent = "Search for products to see results";
  }

  bindEvents() {
    $("search-product-btn").addEventListener("click", () => this.search());
    $("lookup-barcode-btn").addEventListener("click", () => this.lookupBarcode());
    $("product-search-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.search();
    });
    $("barcode-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.lookupBarcode();
    });
    document.querySelectorAll(".product-category-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.loadCategory(btn));
    });
    document.querySelectorAll(".nutri-score-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedGrade = btn.dataset.grade;
        this.updateGradeButtons();
        if (this.products.length > 0) this.render();
      });
    });
    this.grid.addEventListener("click", (event) => {
      const card = event.target.closest(".product-card");
      if (card) this.openProduct(card.dataset.barcode);
    });
  }

  cardHtml(product) {
    const n = product.nutrients || {};
    const grade = String(product.nutritionGrade || "unknown").toLowerCase();
    const gradeColor = GRADE_COLORS[grade] || "bg-gray-400";
    const gradeText = GRADE_COLORS[grade] ? `Nutri-Score ${grade}` : "Nutri-Score ?";
    const imageHtml = product.image
      ? `<img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />`
      : `<i class="fa-solid fa-image text-gray-300 text-4xl"></i>`;

    return `<div class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-barcode="${escapeHtml(product.barcode)}">
      <div class="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        ${imageHtml}
        <div class="absolute top-2 left-2 ${gradeColor} text-white text-xs font-bold px-2 py-1 rounded uppercase">${gradeText}</div>
      </div>
      <div class="p-4">
        <p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${escapeHtml(product.brand || "Unknown brand")}</p>
        <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">${escapeHtml(product.name)}</h3>
        <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span><i class="fa-solid fa-fire mr-1"></i>${Math.round(toNumber(n.calories))} kcal/100g</span>
        </div>
        <div class="grid grid-cols-4 gap-1 text-center">
          <div class="bg-emerald-50 rounded p-1.5"><p class="text-xs font-bold text-emerald-700">${round1(n.protein)}g</p><p class="text-[10px] text-gray-500">Protein</p></div>
          <div class="bg-blue-50 rounded p-1.5"><p class="text-xs font-bold text-blue-700">${round1(n.carbs)}g</p><p class="text-[10px] text-gray-500">Carbs</p></div>
          <div class="bg-purple-50 rounded p-1.5"><p class="text-xs font-bold text-purple-700">${round1(n.fat)}g</p><p class="text-[10px] text-gray-500">Fat</p></div>
          <div class="bg-orange-50 rounded p-1.5"><p class="text-xs font-bold text-orange-700">${round1(n.sugar)}g</p><p class="text-[10px] text-gray-500">Sugar</p></div>
        </div>
      </div>
    </div>`;
  }

  render() {
    const list = this.products.filter((p) => this.selectedGrade === "" || String(p.nutritionGrade).toLowerCase() === this.selectedGrade);
    if (list.length === 0) {
      this.count.textContent = "0 products found";
      this.grid.innerHTML = message("fa-box-open", "No products found", this.selectedGrade ? "Try another Nutri-Score filter" : "Try another name, category or barcode");
      return;
    }
    this.count.textContent = `${list.length} product${list.length === 1 ? "" : "s"} found`;
    this.grid.innerHTML = list.map((p) => this.cardHtml(p)).join("");
  }

  async load(request) {
    this.grid.innerHTML = spinner();
    this.count.textContent = "Loading...";
    try {
      this.products = await request();
      this.render();
    } catch (error) {
      this.products = [];
      this.count.textContent = "0 products found";
      if (error.status === 404) this.render();
      else this.grid.innerHTML = message("fa-triangle-exclamation", "Could not load products", error.message);
    }
  }

  search() {
    const text = $("product-search-input").value.trim();
    if (text === "") {
      notify("Please type a product name first", "warning");
      return;
    }
    this.clearCategoryStyle();
    this.load(() => ApiService.searchProducts(text));
  }

  lookupBarcode() {
    const code = $("barcode-input").value.trim();
    if (!/^\d{8,14}$/.test(code)) {
      notify("Barcode must be 8 to 14 digits", "warning");
      return;
    }
    this.clearCategoryStyle();
    this.load(() => ApiService.getProductByBarcode(code));
  }

  loadCategory(button) {
    this.clearCategoryStyle();
    button.style.boxShadow = "0 0 0 2px #10b981";
    const name = button.textContent.trim().toLowerCase();
    this.load(() => ApiService.getProductsByCategory(name));
  }

  clearCategoryStyle() {
    document.querySelectorAll(".product-category-btn").forEach((btn) => (btn.style.boxShadow = ""));
  }

  updateGradeButtons() {
    document.querySelectorAll(".nutri-score-filter").forEach((btn) => {
      const isActive = btn.dataset.grade === this.selectedGrade;
      if (btn.dataset.grade === "") {
        btn.className =
          "nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all " +
          (isActive ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200");
      }
      btn.style.boxShadow = isActive && btn.dataset.grade !== "" ? "0 0 0 2px currentColor" : "";
    });
  }

  async openProduct(barcode) {
    const product = this.products.find((p) => String(p.barcode) === String(barcode));
    if (!product) return;
    const n = product.nutrients || {};

    const result = await Swal.fire({
      title: escapeHtml(product.name),
      imageUrl: product.image || undefined,
      imageHeight: 140,
      html: `<p style="color:#059669;font-weight:600;margin-bottom:8px">${escapeHtml(product.brand || "Unknown brand")}</p>
        <p style="font-size:13px;color:#6b7280;margin-bottom:6px">Nutrition per 100g</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:13px;margin-bottom:14px">
          <div><b>${Math.round(toNumber(n.calories))}</b><br>kcal</div>
          <div><b>${round1(n.protein)}g</b><br>Protein</div>
          <div><b>${round1(n.carbs)}g</b><br>Carbs</div>
          <div><b>${round1(n.fat)}g</b><br>Fat</div>
          <div><b>${round1(n.sugar)}g</b><br>Sugar</div>
          <div><b>${round1(n.fiber)}g</b><br>Fiber</div>
        </div>
        <label for="swal-grams" style="font-size:13px">Amount eaten (grams)</label>
        <input id="swal-grams" type="number" min="1" value="100" class="swal2-input" style="margin-top:6px">`,
      showCancelButton: true,
      confirmButtonText: "Add to Food Log",
      confirmButtonColor: "#059669",
      preConfirm: () => {
        const grams = Number($("swal-grams").value);
        if (!grams || grams <= 0) {
          Swal.showValidationMessage("Please enter a valid amount in grams");
          return false;
        }
        return grams;
      },
    });
    if (!result.isConfirmed) return;

    const grams = result.value;
    const ratio = grams / 100;
    this.foodLogPage.addItem(
      {
        type: "product",
        name: product.name,
        image: product.image || "",
        detail: `${grams}g${product.brand ? " • " + product.brand : ""}`,
        calories: toNumber(n.calories) * ratio,
        protein: toNumber(n.protein) * ratio,
        carbs: toNumber(n.carbs) * ratio,
        fat: toNumber(n.fat) * ratio,
      },
      "Product added to your Food Log"
    );
  }
}

class Router {
  constructor(mealsPage, productsPage, foodLogPage) {
    this.meals = mealsPage;
    this.products = productsPage;
    this.foodLogPage = foodLogPage;
  }

  start() {
    const navHashes = ["#meals", "#products", "#foodlog"];
    document.querySelectorAll("#sidebar .nav-link").forEach((link, index) => {
      link.setAttribute("href", navHashes[index]);
    });

    window.addEventListener("hashchange", () => this.route());
    $("header-menu-btn").addEventListener("click", () => this.openSidebar());
    $("sidebar-close-btn").addEventListener("click", () => this.closeSidebar());
    $("sidebar-overlay").addEventListener("click", () => this.closeSidebar());

    this.route();
  }

  route() {
    const hash = location.hash.replace("#", "");

    if (hash.startsWith("meal/")) {
      this.showPage("details");
      this.meals.showMealDetails(hash.replace("meal/", ""));
    } else if (hash === "products") {
      this.showPage("products");
    } else if (hash === "foodlog") {
      this.showPage("foodlog");
      this.foodLogPage.render();
    } else {
      this.showPage("meals");
    }
    this.closeSidebar();
  }

  showPage(page) {
    Object.keys(SECTION_IDS).forEach((name) => {
      SECTION_IDS[name].forEach((id) => {
        $(id).style.display = name === page ? "" : "none";
      });
    });

    if (page !== "details") this.meals.stopVideo();

    const headerPage = page === "details" ? "meals" : page;
    document.querySelector("#header h1").textContent = PAGES[headerPage].title;
    document.querySelector("#header p").textContent = PAGES[headerPage].text;

    const order = ["meals", "products", "foodlog"];
    document.querySelectorAll("#sidebar .nav-link").forEach((link, index) => {
      const isActive = order[index] === headerPage;
      link.className =
        "nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all " +
        (isActive ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50");
      link.querySelector("span").className = isActive ? "font-semibold" : "font-medium";
    });

    window.scrollTo(0, 0);
  }

  openSidebar() {
    $("sidebar").classList.add("open");
    $("sidebar-overlay").classList.add("active");
  }

  closeSidebar() {
    $("sidebar").classList.remove("open");
    $("sidebar-overlay").classList.remove("active");
  }
}

class App {
  constructor() {
    this.overlay = $("app-loading-overlay");
    this.foodLog = new FoodLog(FOODLOG_KEY);
    this.foodLogPage = new FoodLogPage(this.foodLog);
    this.mealsPage = new MealsPage(this.foodLogPage);
    this.productsPage = new ProductsPage(this.foodLogPage);
    this.router = new Router(this.mealsPage, this.productsPage, this.foodLogPage);
  }

  async init() {
    await Utils.ensureSwal();
    this.overlay.classList.remove("loading");
    this.productsPage.init();
    this.router.start();
    await this.mealsPage.init();
    this.overlay.classList.add("loading");
  }
}

new App().init();
