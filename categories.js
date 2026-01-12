(function () {
    'use strict';

    var HomeCleaner = {
        // Список категорій, які ми хочемо контролювати поіменно
        blackList: [
            "Зараз дивляться",
            "Сьогодні у тренді",
            "У тренді за тиждень",
            "Дивіться у кінозалах",
            "Популярні фільми",
            "Популярні серіали",
            "Топ фільми",
            "Топ серіали"
        ],
        
        // Ключ для "всіх інших" блоків
        keyRecommendations: 'other_recommendations',

        init: function () {
            // 1. Реєструємо налаштування в меню "Канали"
            this.registerSettings();

            // 2. Слідкуємо за головним екраном
            Lampa.Listener.follow('activity', function (e) {
                if (e.type == 'main') {
                    // Використовуємо $() для перетворення DOM-елемента в jQuery
                    HomeCleaner.clean($(e.object.activity));
                }
            });

            // Якщо плагін завантажився, а ми вже на головній
            var active = Lampa.Activity.active();
            if (active && active.component === 'main') {
                HomeCleaner.clean($(active.activity));
            }
        },

        clean: function ($activity) {
            // Згідно з твоїми скріншотами, структура: scroll__body -> items-line
            var content = $activity.find('.scroll__body');
            
            // Якщо не знайшли .scroll__body, шукаємо ширше (на випадок змін)
            if (!content.length) content = $activity.find('.scroll__content > div');

            if (!content.length) return;

            // Шукаємо всі рядки контенту
            var rows = content.find('.items-line');

            rows.each(function () {
                var $node = $(this);
                
                // Отримуємо заголовок
                var titleEl = $node.find('.items-line__title');
                
                // .text() витягне текст навіть якщо там є іконки (як на скріншоті з вогником)
                var title = titleEl.text().trim(); 

                if (title) {
                    HomeCleaner.processRow($node, title);
                }
            });
        },

        processRow: function ($node, title) {
            var isSpecificCategory = this.blackList.indexOf(title) !== -1;
            var hide = false;

            if (isSpecificCategory) {
                // Це одна з 8 конкретних категорій
                // Генеруємо ключ налаштування
                var key = 'hide_cat_' + btoa(unescape(encodeURIComponent(title))).replace(/[^a-zA-Z0-9]/g, '');
                // Отримуємо налаштування (true = приховувати)
                hide = Lampa.Storage.get(key, false);
            } else {
                // Це щось інше (рекомендації або системні)
                
                // Перевіряємо, чи це не системні блоки, які не треба чіпати
                var safeTitles = ["Продовжити перегляд", "Trakt UpNext", "Меню", "Закладки"];
                var isSafe = safeTitles.some(function(t) { return title.indexOf(t) !== -1; });

                if (!isSafe) {
                    // Вважаємо це "Рекомендацією" (ті самі 7 блоків)
                    hide = Lampa.Storage.get(this.keyRecommendations, false);
                    
                    // Для дебагу (можна потім прибрати)
                    // console.log('[HomeCleaner] Found generic block:', title, 'Hidden:', hide);
                }
            }

            // Застосовуємо видимість
            if (hide) {
                if ($node.css('display') !== 'none') $node.hide();
            } else {
                if ($node.css('display') === 'none') $node.show();
            }
        },

        registerSettings: function () {
            // Додаємо параметр для кожної конкретної категорії
            this.blackList.forEach(function (title) {
                var safeKey = 'hide_cat_' + btoa(unescape(encodeURIComponent(title))).replace(/[^a-zA-Z0-9]/g, '');
                
                Lampa.SettingsApi.addParam({
                    component: 'home', // Меню "Канали"
                    param: {
                        name: safeKey,
                        type: 'trigger',
                        default: false
                    },
                    field: {
                        name: title,
                        description: 'Приховати цю категорію'
                    },
                    onChange: function (value) {
                        // Пересканувати, якщо ми на головній
                        HomeCleaner.triggerUpdate();
                    }
                });
            });

            // Додаємо ОДИН загальний параметр для всіх інших рекомендацій
            Lampa.SettingsApi.addParam({
                component: 'home',
                param: {
                    name: HomeCleaner.keyRecommendations,
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: 'Інші рекомендації',
                    description: 'Приховати всі додаткові блоки рекомендацій (7 блоків)'
                },
                onChange: function (value) {
                    HomeCleaner.triggerUpdate();
                }
            });
        },

        triggerUpdate: function() {
            var active = Lampa.Activity.active();
            if (active && active.component === 'main') {
                HomeCleaner.clean($(active.activity));
            }
        }
    };

    if (window.Lampa) {
        HomeCleaner.init();
    }
})();
