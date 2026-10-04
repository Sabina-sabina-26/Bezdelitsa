(function () {
  "use strict";

  var SHOP = window.SHOP;
  var PRODUCTS = window.PRODUCTS;
  var CATEGORIES = window.CATEGORIES;
  var TYPE_TITLE = { ring: "Кольцо", earrings: "Серьги", necklace: "Колье", bracelet: "Браслет" };

  // ---------- Телеграм ----------
  // Внутри Телеграма tg.platform не "unknown"; в обычном браузере SDK может не загрузиться вовсе.
  var tg = window.Telegram && window.Telegram.WebApp;
  var inTg = !!(tg && tg.platform && tg.platform !== "unknown");
  var root = document.documentElement;

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }
  function haptic(kind) {
    if (inTg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(kind || "light");
  }
  function applyTgTheme() {
    root.setAttribute("data-theme", tg.colorScheme === "light" ? "light" : "dark");
    try {
      tg.setHeaderColor(cssVar("--bg"));
      tg.setBackgroundColor(cssVar("--bg"));
      if (tg.setBottomBarColor) tg.setBottomBarColor(cssVar("--bg"));
    } catch (e) { /* старые версии Телеграма */ }
  }
  if (inTg) {
    root.classList.add("tg");
    tg.ready();
    tg.expand();
    applyTgTheme();
    tg.onEvent("themeChanged", function () { applyTgTheme(); syncMainButton(); });
  }

  // ---------- Корзина ----------
  var CART_KEY = "bezdelica-cart";
  var cart = load();

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(function (l) { return byId(l.id); }) : [];
    } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* без памяти — тоже работает */ }
  }
  function byId(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i];
    return null;
  }
  function cartCount() {
    return cart.reduce(function (n, l) { return n + l.qty; }, 0);
  }
  function cartTotal() {
    return cart.reduce(function (s, l) { return s + byId(l.id).price * l.qty; }, 0);
  }
  function addToCart(id, size) {
    var line = cart.find(function (l) { return l.id === id && l.size === size; });
    if (line) line.qty += 1;
    else cart.push({ id: id, size: size || null, qty: 1 });
    save();
    haptic("medium");
    renderBadge();
  }
  function changeQty(i, d) {
    cart[i].qty += d;
    if (cart[i].qty <= 0) cart.splice(i, 1);
    save();
    haptic();
    renderBadge();
  }

  // ---------- Мелочи ----------
  function money(n) {
    return n.toLocaleString("ru-RU").replace(/,/g, " ") + " " + SHOP.currency;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel) { return document.querySelector(sel); }

  // ---------- Рисунки изделий (пока нет фотографий) ----------
  function ellipseDots(cx, cy, rx, ry, from, to, n, r) {
    var out = "";
    for (var i = 0; i < n; i++) {
      var t = from + (to - from) * (i / (n - 1));
      out += '<circle cx="' + (cx + rx * Math.cos(t)).toFixed(1) + '" cy="' + (cy + ry * Math.sin(t)).toFixed(1) +
        '" r="' + r + '" fill="url(#stone)" stroke="url(#metal)" stroke-width=".6"/>';
    }
    return out;
  }
  function drop(x, y, h, w) {
    return '<path d="M' + x + " " + y + " C" + (x - w) + " " + (y + h * 0.45) + "," + (x - w * 0.7) + " " + (y + h * 0.85) + "," + x + " " + (y + h) +
      " C" + (x + w * 0.7) + " " + (y + h * 0.85) + "," + (x + w) + " " + (y + h * 0.45) + "," + x + " " + y +
      'Z" fill="url(#stone)" stroke="url(#metal)" stroke-width="1.4"/>';
  }
  function art(type) {
    var g = "";
    if (type === "ring") {
      g = '<ellipse cx="50" cy="62" rx="25" ry="23" fill="none" stroke="url(#metal)" stroke-width="5"/>' +
        ellipseDots(50, 36, 13, 13, 0, Math.PI * 2 - 0.5, 12, 1.8) +
        '<path d="M50 22 L60 34 L50 49 L40 34 Z" fill="url(#stone)" stroke="url(#metal)" stroke-width="1.4"/>' +
        '<path d="M40 34 H60 M50 22 V49" stroke="url(#metal)" stroke-width=".5" opacity=".7"/>';
    } else if (type === "earrings") {
      [33, 67].forEach(function (x) {
        g += '<circle cx="' + x + '" cy="14" r="4.5" fill="url(#stone)" stroke="url(#metal)" stroke-width="1.4"/>' +
          '<line x1="' + x + '" y1="18.5" x2="' + x + '" y2="30" stroke="url(#metal)" stroke-width="1.4"/>' +
          '<path d="M' + x + " 30 L" + (x + 4) + " 36 L" + x + " 42 L" + (x - 4) + ' 36 Z" fill="url(#stone)" stroke="url(#metal)" stroke-width="1.2"/>' +
          '<line x1="' + x + '" y1="42" x2="' + x + '" y2="50" stroke="url(#metal)" stroke-width="1.4"/>' +
          drop(x, 50, 36, 11);
      });
    } else if (type === "necklace") {
      g = '<path d="M12 12 C18 62, 82 62, 88 12" fill="none" stroke="url(#metal)" stroke-width="2"/>';
      for (var i = 1; i < 12; i++) {
        var t = i / 12, mt = 1 - t;
        var x = mt * mt * mt * 12 + 3 * mt * mt * t * 18 + 3 * mt * t * t * 82 + t * t * t * 88;
        var y = mt * mt * mt * 12 + 3 * mt * mt * t * 62 + 3 * mt * t * t * 62 + t * t * t * 12;
        g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.6" fill="url(#stone)" stroke="url(#metal)" stroke-width=".7"/>';
      }
      g += '<line x1="50" y1="50" x2="50" y2="58" stroke="url(#metal)" stroke-width="1.4"/>' + drop(50, 58, 30, 10);
    } else {
      g = '<ellipse cx="50" cy="52" rx="38" ry="16" fill="none" stroke="url(#metal)" stroke-width="6"/>' +
        '<ellipse cx="50" cy="52" rx="38" ry="16" fill="none" stroke="url(#metal)" stroke-width="1" opacity=".5" transform="translate(0 4)"/>' +
        ellipseDots(50, 52, 38, 16, 0.15, Math.PI - 0.15, 15, 2.6);
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' + g + "</svg>";
  }
  function heroGem() {
    // Вид сверху на камень круглой огранки: площадка, звёзды, рундист
    var pts = function (r, off) {
      var a = [];
      for (var i = 0; i < 8; i++) {
        var t = (Math.PI * 2 * i) / 8 + off;
        a.push([50 + r * Math.cos(t), 50 + r * Math.sin(t)]);
      }
      return a;
    };
    var outer = pts(46, Math.PI / 8), table = pts(22, Math.PI / 8), star = pts(34, 0);
    var poly = function (p) { return p.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" "); };
    var lines = "";
    for (var i = 0; i < 8; i++) {
      var s = star[i], a = table[i], b = table[(i + 7) % 8], o1 = outer[i], o2 = outer[(i + 7) % 8];
      lines += '<polyline points="' + poly([a, s, b]) + '"/><polyline points="' + poly([o2, s, o1]) + '"/>';
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="48" fill="none" stroke="url(#metal)" stroke-width=".6" opacity=".6"/>' +
      '<polygon points="' + poly(outer) + '" fill="url(#stone)" stroke="url(#metal)" stroke-width="1.2"/>' +
      '<g class="facets" fill="none" stroke="url(#metal)" stroke-width=".55">' + lines +
      '<polygon points="' + poly(table) + '" stroke-width=".9"/></g></svg>';
  }

  // ---------- Витрина ----------
  var filter = "all";

  function renderChips() {
    $("#chips").innerHTML = CATEGORIES.map(function (c) {
      return '<button class="chip" type="button" data-cat="' + c.id + '" aria-pressed="' + (c.id === filter) + '">' + esc(c.title) + "</button>";
    }).join("");
  }
  function renderGrid() {
    var list = PRODUCTS.filter(function (p) { return filter === "all" || p.type === filter; });
    $("#grid").innerHTML = list.map(function (p) {
      return '<button class="card" type="button" data-open="' + p.id + '">' +
        '<div class="plate"><span class="tag">' + esc(p.collection) + "</span>" + art(p.type) + "</div>" +
        '<div class="card-name">' + esc(p.name) + "</div>" +
        '<div class="card-meta"><span>' + TYPE_TITLE[p.type] + '</span><span class="price">' + money(p.price) + "</span></div></button>";
    }).join("");
  }
  function renderBadge() {
    var n = cartCount();
    var b = $("#badge");
    b.textContent = n;
    b.hidden = n === 0;
    var f = $("#floating-cart");
    f.hidden = n === 0 || stack.length > 0;
    f.textContent = "Корзина · " + money(cartTotal());
    syncMainButton();
  }

  // ---------- Шторка ----------
  // stack — путь по экранам: товар → корзина → оформление → готово
  var stack = [];
  var picked = null; // выбранный размер в карточке товара
  var lastOrder = null;
  var sheet = $("#sheet"), scrim = $("#scrim");

  function open(view) {
    stack.push(view);
    renderSheet();
  }
  function back() {
    stack.pop();
    if (stack.length) renderSheet();
    else close();
  }
  function close() {
    stack = [];
    sheet.classList.remove("open");
    scrim.classList.remove("open");
    setTimeout(function () {
      if (!stack.length) { sheet.hidden = true; scrim.hidden = true; }
    }, 320);
    document.body.style.overflow = "";
    if (inTg) tg.BackButton.hide();
    renderBadge();
  }

  function renderSheet() {
    var v = stack[stack.length - 1];
    var title = "", body = "";
    if (v.name === "product") {
      var p = byId(v.id);
      title = p.collection;
      if (picked && picked.id !== p.id) picked = null;
      var sizes = p.sizes ? '<div><div class="field"><label>Размер</label></div><div class="sizes" style="margin-top:8px">' +
        p.sizes.map(function (s) {
          return '<button class="size" type="button" data-size="' + esc(s) + '" aria-pressed="' + (picked && picked.size === s) + '">' + esc(s) + "</button>";
        }).join("") + '</div><p class="hint">Не знаете размер? Менеджер поможет подобрать.</p></div>' : "";
      var specs = [["Металл", "Серебро 925 пробы"], ["Покрытие", "Родий"], ["Вставки", p.stones], ["Вес", p.weight]];
      if (p.length) specs.push(["Длина", p.length]);
      body = '<div class="detail sheet-body">' +
        '<div class="plate">' + art(p.type) + "</div>" +
        '<div><div class="eyebrow">' + TYPE_TITLE[p.type] + "</div><h2>" + esc(p.name) + '</h2><div class="big-price">' + money(p.price) + "</div></div>" +
        '<p class="lead">' + esc(p.note) + "</p>" + sizes +
        '<dl class="specs">' + specs.map(function (s) { return "<dt>" + s[0] + "</dt><dd>" + esc(s[1]) + "</dd>"; }).join("") + "</dl>" +
        '<button class="btn block primary-action" type="button" data-add="' + p.id + '">В корзину</button></div>';
    } else if (v.name === "cart") {
      title = "Корзина";
      if (!cart.length) {
        body = '<div class="sheet-body"><p class="empty">В корзине пока ничего нет.<br>Выберите украшение в каталоге.</p>' +
          '<button class="btn ghost block" type="button" data-close>К каталогу</button></div>';
      } else {
        body = '<div class="sheet-body">' + cart.map(function (l, i) {
          var p = byId(l.id);
          return '<div class="line"><div class="plate">' + art(p.type) + "</div>" +
            '<div style="min-width:0"><div class="line-name">' + esc(p.name) + '</div><div class="line-sub">' +
            (l.size ? "Размер " + esc(l.size) + " · " : "") + money(p.price) + "</div></div>" +
            '<div class="qty"><button type="button" data-qty="' + i + ':-1" aria-label="Меньше">−</button><span>' + l.qty +
            '</span><button type="button" data-qty="' + i + ':1" aria-label="Больше">+</button></div></div>';
        }).join("") +
          '<div class="total"><span>Итого</span><span>' + money(cartTotal()) + "</span></div>" +
          '<p class="hint" style="margin:0">Доставку и примерку менеджер согласует после заказа.</p>' +
          '<button class="btn block primary-action" type="button" data-go="checkout">Оформить заказ</button></div>';
      }
    } else if (v.name === "checkout") {
      title = "Оформление";
      var u = inTg && tg.initDataUnsafe && tg.initDataUnsafe.user;
      var prefill = u ? [u.first_name, u.last_name].filter(Boolean).join(" ") : "";
      body = '<form class="sheet-body" id="order-form" novalidate>' +
        '<div class="field"><label for="f-name">Имя</label><input id="f-name" name="name" autocomplete="name" value="' + esc(prefill) + '"></div>' +
        '<div class="field"><label for="f-phone">Телефон</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+7"></div>' +
        '<div class="field"><label for="f-city">Город</label><input id="f-city" name="city" autocomplete="address-level2"></div>' +
        '<div class="field"><label for="f-note">Пожелания</label><textarea id="f-note" name="note" placeholder="Например: подарочная упаковка, нужно к субботе"></textarea></div>' +
        '<p class="error" id="form-error" hidden></p>' +
        '<div class="total"><span>К оплате</span><span>' + money(cartTotal()) + "</span></div>" +
        '<button class="btn block primary-action" type="submit">Отправить заказ</button></form>';
    } else if (v.name === "done") {
      title = "Заказ принят";
      var link = SHOP.managerUsername ? "https://t.me/" + SHOP.managerUsername : "";
      body = '<div class="sheet-body"><div><div class="eyebrow">Заказ ' + esc(lastOrder.no) + '</div><h2 class="section-title" style="margin-top:6px">Спасибо!</h2></div>' +
        "<p style=\"margin:0;color:var(--muted)\">" + (link
          ? "Отправьте этот текст менеджеру, и он свяжется с вами, чтобы подтвердить заказ и доставку."
          : "Скопируйте текст заказа. Когда мы подключим менеджера, заказы будут уходить ему автоматически.") + "</p>" +
        '<pre class="receipt" id="receipt">' + esc(lastOrder.text) + "</pre>" +
        '<div class="stack"><button class="btn ghost block" type="button" id="copy">Скопировать заказ</button>' +
        (link ? '<a class="btn block" href="' + link + '" target="_blank" rel="noopener" id="to-manager">Написать менеджеру</a>' : "") +
        '<button class="btn ghost block" type="button" data-close>Вернуться в каталог</button></div></div>';
    }

    sheet.innerHTML = '<div class="sheet-bar">' +
      (stack.length > 1 && !inTg ? '<button class="icon-btn" type="button" data-back aria-label="Назад" style="margin-left:-12px">' + ICON_BACK + "</button>" : "") +
      '<span class="eyebrow">' + esc(title) + '</span><button class="icon-btn" type="button" data-close aria-label="Закрыть">' + ICON_CLOSE + "</button></div>" + body;

    sheet.hidden = false;
    scrim.hidden = false;
    document.body.style.overflow = "hidden";
    sheet.scrollTop = 0;
    requestAnimationFrame(function () {
      sheet.classList.add("open");
      scrim.classList.add("open");
    });
    if (inTg) tg.BackButton.show();
    renderBadge();
  }

  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M15 5l-7 7 7 7"/></svg>';

  // ---------- Действия ----------
  function tryAdd(id) {
    var p = byId(id);
    if (p.sizes && !(picked && picked.id === id)) {
      var hint = sheet.querySelector(".hint");
      if (hint) { hint.textContent = "Выберите размер, чтобы добавить в корзину."; hint.style.color = "var(--danger)"; }
      if (inTg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("error");
      return;
    }
    addToCart(id, p.sizes ? picked.size : null);
    picked = null;
    stack = [];
    open({ name: "cart" });
  }

  function submitOrder() {
    var form = $("#order-form");
    var data = { name: form.name.value.trim(), phone: form.phone.value.trim(), city: form.city.value.trim(), note: form.note.value.trim() };
    var err = $("#form-error");
    if (!data.name || data.phone.replace(/\D/g, "").length < 10) {
      err.textContent = !data.name ? "Укажите имя." : "Укажите телефон полностью, например +7 900 123-45-67.";
      err.hidden = false;
      if (inTg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("error");
      return;
    }
    var no = "Б-" + String(Date.now()).slice(-6);
    var lines = cart.map(function (l) {
      var p = byId(l.id);
      return "• " + p.name + (l.size ? ", размер " + l.size : "") + " × " + l.qty + " — " + money(p.price * l.qty);
    });
    var tgUser = inTg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    lastOrder = {
      no: no,
      text: "Заказ " + no + "\n\n" + lines.join("\n") + "\n\nИтого: " + money(cartTotal()) +
        "\n\nИмя: " + data.name + "\nТелефон: " + data.phone +
        (data.city ? "\nГород: " + data.city : "") +
        (tgUser && tgUser.username ? "\nTelegram: @" + tgUser.username : "") +
        (data.note ? "\nПожелания: " + data.note : ""),
    };
    cart = [];
    save();
    if (inTg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
    stack = [];
    open({ name: "done" });
  }

  function copyOrder() {
    var btn = $("#copy");
    var done = function () { btn.textContent = "Скопировано"; };
    var fallback = function () {
      var r = document.createRange();
      r.selectNodeContents($("#receipt"));
      var s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
      btn.textContent = "Текст выделен, скопируйте его";
    };
    try {
      navigator.clipboard.writeText(lastOrder.text).then(done, fallback);
    } catch (e) { fallback(); }
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, a");
    if (!t) return;
    if (t.dataset.cat) { filter = t.dataset.cat; haptic(); renderChips(); renderGrid(); return; }
    if (t.dataset.open) { haptic(); picked = null; open({ name: "product", id: t.dataset.open }); return; }
    if (t.dataset.size) {
      picked = { id: stack[stack.length - 1].id, size: t.dataset.size };
      haptic();
      sheet.querySelectorAll(".size").forEach(function (b) { b.setAttribute("aria-pressed", b === t); });
      var hint = sheet.querySelector(".hint");
      if (hint) { hint.textContent = "Не знаете размер? Менеджер поможет подобрать."; hint.style.color = ""; }
      syncMainButton();
      return;
    }
    if (t.dataset.add) { tryAdd(t.dataset.add); return; }
    if (t.dataset.qty) {
      var q = t.dataset.qty.split(":");
      changeQty(+q[0], +q[1]);
      renderSheet();
      return;
    }
    if (t.dataset.go === "checkout") { open({ name: "checkout" }); return; }
    if (t.hasAttribute("data-back")) { back(); return; }
    if (t.hasAttribute("data-close")) { close(); return; }
    if (t.id === "open-cart" || t.id === "floating-cart") { haptic(); stack = []; open({ name: "cart" }); return; }
    if (t.id === "copy") { copyOrder(); return; }
    if (t.id === "to-manager" && inTg) { e.preventDefault(); tg.openTelegramLink(t.href); }
  });
  document.addEventListener("submit", function (e) {
    if (e.target.id === "order-form") { e.preventDefault(); submitOrder(); }
  });
  scrim.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && stack.length) back();
  });

  // ---------- Нижняя кнопка Телеграма ----------
  function syncMainButton() {
    if (!inTg) return;
    var mb = tg.MainButton;
    var v = stack[stack.length - 1];
    var text = null;
    if (!v) text = cart.length ? "Корзина · " + money(cartTotal()) : null;
    else if (v.name === "product") text = "В корзину · " + money(byId(v.id).price);
    else if (v.name === "cart") text = cart.length ? "Оформить заказ · " + money(cartTotal()) : null;
    else if (v.name === "checkout") text = "Отправить заказ";
    if (!text) { mb.hide(); return; }
    mb.setParams({ text: text, color: cssVar("--btn"), text_color: cssVar("--btn-ink"), is_visible: true, is_active: true });
  }
  if (inTg) {
    tg.MainButton.onClick(function () {
      var v = stack[stack.length - 1];
      if (!v) { stack = []; open({ name: "cart" }); }
      else if (v.name === "product") tryAdd(v.id);
      else if (v.name === "cart") open({ name: "checkout" });
      else if (v.name === "checkout") submitOrder();
    });
    tg.BackButton.onClick(back);
  }

  // ---------- Старт ----------
  $("#hero-gem").innerHTML = heroGem();
  $("#demo-note").hidden = !SHOP.demo;
  $("#foot-demo").hidden = !SHOP.demo;
  $("#year").textContent = new Date().getFullYear();
  renderChips();
  renderGrid();
  renderBadge();
})();
