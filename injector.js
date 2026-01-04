// Injector - runs at document_start to inject scripts into page world
(function() {
  'use strict';
  
  // Inject the interceptor first (captures Bearer token)
  const interceptorScript = document.createElement('script');
  interceptorScript.src = chrome.runtime.getURL('interceptor.js');
  interceptorScript.onload = function() {
    this.remove();
    
    // Then inject the main content script
    const mainScript = document.createElement('script');
    mainScript.src = chrome.runtime.getURL('content.js');
    mainScript.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(mainScript);
  };
  (document.head || document.documentElement).appendChild(interceptorScript);
})();
