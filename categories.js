(function () {
    'use strict';

    // Список категорій для окремого контролю
    var CATEGORIES = [
        "Зараз дивляться",
        "Сьогодні у тренді",
        "У тренді за тиждень",
        "Дивіться у кінозалах",
        "Популярні фільми",
        "Популярні серіали",
        "Топ фільми",
        "Топ серіали"
    ];

    // Системні блоки, які не треба приховувати
    var SAFE_TITLES = ["Продовжити перегляд", "Trakt UpNext", "Меню", "Закладки"];

    /**
     * Генерує ключ для налаштування
     */
    function getCategoryKey(title) {
        return 'home_hide_' + btoa(unescape(encodeURIComponent(title))).replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Отримує текст заголовка з рядка
     */
    function getRowTitle($row) {
        var titleEl = $row.find('.items-line_title');
        if (!titleEl.length) {
            titleEl = $row.find('.items-line__title');
        }
        if (!titleEl.length) {
            return '';
        }
        var title = titleEl.text().trim();
        // Якщо не знайшли через text(), спробуємо через html
        if (!title && titleEl.length) {
            title = titleEl.html().trim();
            title = title.replace(/<[^>]*>/g, '').trim();
        }
        return title;
    }

    /**
     * Перевіряє, чи треба приховати рядок
     */
    function shouldHideRow(title) {
        // Перевіряємо конкретні категорії
        if (CATEGORIES.indexOf(title) !== -1) {
            var key = getCategoryKey(title);
            return Lampa.Storage.field(key, false);
        }
        
        // Перевіряємо рекомендації (все інше, крім системних)
        var isSafe = SAFE_TITLES.some(function(t) { 
            return title.indexOf(t) !== -1; 
        });
        
        if (!isSafe && title) {
            return Lampa.Storage.field('home_hide_recommendations', false);
        }
        
        return false;
    }

    /**
     * Обробляє всі рядки на головній
     */
    function processRows() {
        var active = Lampa.Activity.active();
        if (!active || active.component !== 'main') {
            return;
        }

        var rows = $('.items-line');
        
        if (rows.length === 0) {
            return;
        }
        
        rows.each(function () {
            var $row = $(this);
            
            // Пропускаємо вже оброблені елементи (якщо вони не змінилися)
            if ($row.data('category-processed') && $row.data('category-title')) {
                var oldTitle = $row.data('category-title');
                var currentTitle = getRowTitle($row);
                if (oldTitle === currentTitle) {
                    // Перевіряємо, чи не змінилося налаштування
                    var shouldHide = shouldHideRow(currentTitle);
                    var isHidden = $row.css('display') === 'none' || $row.css('visibility') === 'hidden';
                    if (shouldHide === isHidden) {
                        return; // Стан не змінився, пропускаємо
                    }
                }
            }
            
            var title = getRowTitle($row);
            
            if (title && shouldHideRow(title)) {
                $row.css({
                    'visibility': 'hidden',
                    'display': 'none'
                });
                $row.data('category-processed', true);
                $row.data('category-title', title);
            } else if (title) {
                $row.css({
                    'visibility': 'visible',
                    'display': ''
                });
                $row.data('category-processed', true);
                $row.data('category-title', title);
            }
        });
    }

    /**
     * Оновлює головний екран
     */
    function updateMainScreen() {
        var active = Lampa.Activity.active();
        if (active && active.component === 'main') {
            setTimeout(function() {
                processRows();
            }, 500);
        }
    }

    /**
     * Реєструє налаштування для кожної категорії
     */
    function registerCategorySettings() {
        CATEGORIES.forEach(function (title) {
            var key = getCategoryKey(title);
            
            Lampa.SettingsApi.addParam({
                component: 'home',
                param: {
                    name: key,
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: title,
                    description: 'Приховати цю категорію'
                },
                onChange: function (value) {
                    Lampa.Storage.set(key, value);
                    updateMainScreen();
                }
            });
        });
    }

    /**
     * Реєструє налаштування для рекомендацій
     */
    function registerRecommendationsSetting() {
        Lampa.SettingsApi.addParam({
            component: 'home',
            param: {
                name: 'home_hide_recommendations',
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Рекомендації',
                description: 'Приховати всі додаткові блоки рекомендацій (7 блоків)'
            },
            onChange: function (value) {
                Lampa.Storage.set('home_hide_recommendations', value);
                updateMainScreen();
            }
        });
    }

    // Ініціалізація
    function init() {
        // Реєструємо налаштування
        registerCategorySettings();
        registerRecommendationsSetting();

        var lastComponent = '';
        var processTimeout = null;

        // Функція для обробки з дебаунсом
        function debouncedProcess() {
            clearTimeout(processTimeout);
            processTimeout = setTimeout(function() {
                var active = Lampa.Activity.active();
                if (active && active.component === 'main') {
                    processRows();
                }
            }, 100);
        }

        // Слухаємо завантаження головного екрану
        Lampa.Listener.follow('activity', function (e) {
            if (e.type == 'main') {
                lastComponent = 'main';
                setTimeout(function() {
                    processRows();
                }, 300);
            } else {
                lastComponent = e.type || '';
            }
        });

        // Постійно перевіряємо головну сторінку (кожні 500мс)
        setInterval(function() {
            var active = Lampa.Activity.active();
            if (active && active.component === 'main') {
                processRows();
            }
        }, 500);

        // MutationObserver для відстеження змін DOM
        if (window.MutationObserver) {
            var observer = new MutationObserver(function(mutations) {
                var active = Lampa.Activity.active();
                if (active && active.component === 'main') {
                    debouncedProcess();
                }
            });
            
            setTimeout(function() {
                if (document.body) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: false
                    });
                }
            }, 1000);
        }

        // Якщо вже на головній
        setTimeout(function() {
            updateMainScreen();
        }, 1000);
    }

    if (window.Lampa) {
        init();
    }
})();
