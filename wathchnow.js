(function () {
    'use strict';

    function hideFirstRow() {
        // Шукаємо перший .items-line на сторінці
        var firstRow = $('.items-line').first();
        
        if (firstRow.length) {
            // Приховуємо його
            firstRow.css({
                'visibility': 'hidden',
                'display': 'none'
            });
            console.log('[Categories] First row hidden');
        }
    }

    // Слухаємо завантаження головного екрану
    Lampa.Listener.follow('activity', function (e) {
        if (e.type == 'main') {
            // Затримка, щоб DOM встиг відрендеритися
            setTimeout(function() {
                hideFirstRow();
            }, 500);
        }
    });

    // Якщо вже на головній
    setTimeout(function() {
        var active = Lampa.Activity.active();
        if (active && active.component === 'main') {
            hideFirstRow();
        }
    }, 1000);

    // Також перевіряємо через інтервал
    var checkInterval = setInterval(function() {
        var rows = $('.items-line');
        if (rows.length > 0) {
            hideFirstRow();
            clearInterval(checkInterval);
        }
    }, 500);
})();
