// Easy Block for X - Content Script

(function() {
  'use strict';

  // Get CSRF token from cookies
  function getCsrfToken() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'ct0') {
        return value;
      }
    }
    return null;
  }

  // Get Bearer token - captured by early interceptor
  function getBearerToken() {
    return window.__easyBlockBearerToken || null;
  }

  // Wait for bearer token with retry
  async function waitForBearerToken(maxAttempts = 20, delay = 250) {
    for (let i = 0; i < maxAttempts; i++) {
      const token = getBearerToken();
      if (token) {
        return token;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return null;
  }

  // Get auth headers for API requests
  async function getAuthHeaders() {
    const csrfToken = getCsrfToken();
    let bearerToken = getBearerToken();
    
    // If no token yet, wait for X to make a request
    if (!bearerToken) {
      console.log('Easy Block: Waiting for Bearer token...');
      bearerToken = await waitForBearerToken();
    }
    
    if (!csrfToken) {
      throw new Error('Could not get CSRF token - are you logged in?');
    }
    
    if (!bearerToken) {
      throw new Error('Could not get Bearer token - try scrolling or refreshing');
    }

    return {
      'authorization': bearerToken,
      'x-csrf-token': csrfToken,
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': document.documentElement.lang || 'en'
    };
  }

  // Get user ID from username via GraphQL API
  async function getUserIdFromUsername(username) {
    const headers = await getAuthHeaders();

    const variables = { screenName: username };
    const params = new URLSearchParams({
      variables: JSON.stringify(variables)
    });

    const response = await fetch(`https://x.com/i/api/graphql/vqu78dKcEkW-UAYLw5rriA/useFetchProfileSections_canViewExpandedProfileQuery?${params}`, {
      method: 'GET',
      headers: {
        ...headers,
        'content-type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Easy Block: profile query response:', text);
      throw new Error('Failed to fetch user info');
    }

    const data = await response.json();
    console.log('Easy Block: API response:', JSON.stringify(data, null, 2));
    
    // Extract user ID from the response
    // The ID might be base64 encoded like "VXNlcjoyMjgxMDA1NTEw" which decodes to "User:2281005510"
    let userId = data.data?.user_result_by_screen_name?.result?.rest_id || 
                 data.data?.user_result_by_screen_name?.result?.id ||
                 data.data?.user?.result?.rest_id ||
                 data.data?.user?.rest_id;
    
    // If the ID is base64 encoded (starts with VXNlc = "User"), decode it
    if (userId && userId.startsWith('VXNlc')) {
      try {
        const decoded = atob(userId);
        // Format is "User:NUMERIC_ID"
        const numericId = decoded.split(':')[1];
        if (numericId) {
          userId = numericId;
        }
      } catch (e) {
        console.error('Easy Block: Failed to decode user ID:', e);
      }
    }
    
    console.log('Easy Block: Extracted user ID:', userId);
    return userId;
  }

  // Block user by ID
  async function blockUser(userId) {
    const headers = await getAuthHeaders();

    const response = await fetch('https://x.com/i/api/1.1/blocks/create.json', {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/x-www-form-urlencoded'
      },
      credentials: 'include',
      body: `user_id=${userId}`
    });

    if (!response.ok) {
      throw new Error('Failed to block user');
    }

    return await response.json();
  }

  // Create block button that matches X's native button style
  function createBlockButton() {
    const button = document.createElement('button');
    button.className = 'css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l easy-block-btn';
    button.setAttribute('aria-label', 'Block user');
    button.setAttribute('role', 'button');
    button.setAttribute('type', 'button');
    button.innerHTML = `
      <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q" style="color: rgb(113, 118, 123);">
        <div class="css-175oi2r r-xoduu5">
          <div class="css-175oi2r r-xoduu5 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-1niwhzg r-sdzlij r-xf4iuw r-o7ynqc r-6416eg r-1ny4l3l"></div>
          <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi easy-block-icon">
            <g>
              <path d="M12 3.75c-4.55 0-8.25 3.69-8.25 8.25 0 1.92.66 3.68 1.75 5.08L17.09 5.5C15.68 4.4 13.92 3.75 12 3.75zm6.5 3.17L6.92 18.5c1.4 1.1 3.16 1.75 5.08 1.75 4.56 0 8.25-3.69 8.25-8.25 0-1.92-.65-3.68-1.75-5.08zM1.75 12C1.75 6.34 6.34 1.75 12 1.75S22.25 6.34 22.25 12 17.66 22.25 12 22.25 1.75 17.66 1.75 12z"></path>
            </g>
          </svg>
        </div>
      </div>
    `;
    return button;
  }

  // Add block button next to the caret button (no layout shift)
  function addBlockButton(caretButton, tweetArticle) {
    // Check if button already exists in this context
    const parentContainer = caretButton.parentElement;
    if (!parentContainer || parentContainer.querySelector('.easy-block-btn')) {
      return;
    }

    const button = createBlockButton();
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Find username from the tweet
      const userLinks = tweetArticle.querySelectorAll('a[href^="/"]');
      let username = null;
      
      for (const link of userLinks) {
        const href = link.getAttribute('href');
        // Look for profile links (not status links)
        if (href && !href.includes('/status/') && !href.includes('/photo/') && 
            !href.includes('/likes') && !href.includes('/retweets') &&
            href.match(/^\/[a-zA-Z0-9_]+$/)) {
          username = href.substring(1);
          break;
        }
      }

      if (!username) {
        console.error('Easy Block: Could not find username');
        showFeedback(button, 'error');
        return;
      }

      try {
        button.classList.add('loading');
        
        // Get user ID from username
        const userId = await getUserIdFromUsername(username);
        if (!userId) {
          throw new Error('Could not get user ID');
        }

        // Block the user
        await blockUser(userId);
        
        showFeedback(button, 'success');
        console.log(`Easy Block: Blocked @${username} (${userId})`);
      } catch (error) {
        console.error('Easy Block: Error blocking user:', error);
        showFeedback(button, 'error');
      } finally {
        button.classList.remove('loading');
      }
    });

    // Insert before the caret button (same container, no layout shift)
    caretButton.parentElement.insertBefore(button, caretButton);
  }

  // Show visual feedback
  function showFeedback(button, type) {
    button.classList.remove('success', 'error');
    button.classList.add(type);
    
    setTimeout(() => {
      button.classList.remove(type);
    }, 2000);
  }

  // Find and process tweet nav containers
  function processTweets() {
    // Find all tweet articles
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    
    tweets.forEach(tweet => {
      // Find the caret (more) button
      const caretButton = tweet.querySelector('button[data-testid="caret"]');
      if (caretButton) {
        addBlockButton(caretButton, tweet);
      }
    });
  }

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initialize observer for dynamic content
  function init() {
    // Process existing tweets
    processTweets();

    // Watch for new tweets being added
    const observer = new MutationObserver(debounce(() => {
      processTweets();
    }, 100));

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('Easy Block for X initialized');
    
    // Log token status
    const token = getBearerToken();
    if (token) {
      console.log('Easy Block: Bearer token ready');
    } else {
      console.log('Easy Block: Bearer token will be captured on first X API request');
    }
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
