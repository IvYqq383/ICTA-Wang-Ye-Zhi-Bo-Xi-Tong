(function() {
  'use strict';

  var WIDGET_VERSION = '1.0.0';

  function getBaseUrl() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf('livecast-widget.js') !== -1) {
        return src.replace(/\/livecast-widget\.js.*$/, '');
      }
    }
    return '';
  }

  var BASE_URL = getBaseUrl();

  function createOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'livecast-overlay';
    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:999999;justify-content:center;align-items:center;';

    var modal = document.createElement('div');
    modal.style.cssText = 'position:relative;background:#fff;border-radius:12px;width:90%;max-width:460px;max-height:90vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:24px;cursor:pointer;color:#666;z-index:10;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50;line-height:1;';
    closeBtn.onclick = function() {
      overlay.style.display = 'none';
      var iframe = modal.querySelector('iframe');
      if (iframe) iframe.src = '';
    };

    var iframe = document.createElement('iframe');
    iframe.id = 'livecast-popup-iframe';
    iframe.style.cssText = 'width:100%;height:500px;border:none;border-radius:12px;';

    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.style.display = 'none';
        iframe.src = '';
      }
    });

    return overlay;
  }

  function openPopup(webinarId) {
    var overlay = document.getElementById('livecast-overlay') || createOverlay();
    var iframe = document.getElementById('livecast-popup-iframe');
    iframe.src = BASE_URL + '/embed/register/' + webinarId;
    overlay.style.display = 'flex';
  }

  function initButtons() {
    var buttons = document.querySelectorAll('[data-livecast-register]');
    for (var i = 0; i < buttons.length; i++) {
      (function(btn) {
        if (btn.getAttribute('data-livecast-initialized')) return;
        btn.setAttribute('data-livecast-initialized', 'true');
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var webinarId = btn.getAttribute('data-livecast-register');
          openPopup(webinarId);
        });
      })(buttons[i]);
    }
  }

  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'livecast-registered') {
      var overlay = document.getElementById('livecast-overlay');
      setTimeout(function() {
        if (overlay) {
          overlay.style.display = 'none';
        }
      }, 3000);
    }
  });

  window.LiveCast = {
    version: WIDGET_VERSION,
    openRegister: openPopup,
    init: initButtons,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButtons);
  } else {
    initButtons();
  }
})();
