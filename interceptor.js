// Early interceptor - captures Bearer token from X's API requests
(function() {
  'use strict';
  
  window.__easyBlockBearerToken = null;
  
  // Intercept fetch immediately
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, options] = args;
    if (options?.headers) {
      const headers = options.headers;
      let authHeader = null;
      
      if (headers instanceof Headers) {
        authHeader = headers.get('authorization');
      } else if (typeof headers === 'object') {
        authHeader = headers.authorization || headers.Authorization;
      }
      
      if (authHeader && authHeader.includes('AAAAAAA')) {
        window.__easyBlockBearerToken = authHeader;
      }
    }
    return originalFetch.apply(this, args);
  };
  
  // Also intercept XHR
  const originalXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (name.toLowerCase() === 'authorization' && value && value.includes('AAAAAAA')) {
      window.__easyBlockBearerToken = value;
    }
    return originalXHRSetHeader.apply(this, arguments);
  };
})();
