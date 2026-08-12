const http = require('http');
const https = require('https');

async function fetchWithCookies(url, options = {}, cookies = {}) {
  const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const headers = { ...options.headers, 'Cookie': cookieHeader };
  
  return fetch(url, { ...options, headers, redirect: 'manual' });
}

async function login(email, password) {
  const baseUrl = 'https://devtrack-weld.vercel.app';
  
  // Get CSRF
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  
  let cookies = {};
  csrfRes.headers.forEach((val, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const parts = val.split(';')[0].split('=');
      cookies[parts[0]] = parts[1];
    }
  });

  // Login
  const loginBody = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${baseUrl}/`
  });
  
  const loginRes = await fetchWithCookies(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: loginBody
  }, cookies);

  loginRes.headers.forEach((val, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      // Multiple set-cookies might be tricky with fetch API, 
      // but in Node 18+ we can use getSetCookie()
      const setCookies = loginRes.headers.getSetCookie();
      for (const sc of setCookies) {
        const parts = sc.split(';')[0].split('=');
        cookies[parts[0]] = parts.slice(1).join('=');
      }
    }
  });
  
  return cookies;
}

async function checkRoute(cookies, path) {
  const res = await fetchWithCookies(`https://devtrack-weld.vercel.app${path}`, {}, cookies);
  return res.status; // 200 = OK, 307/302 = Redirect, 403 = Forbidden
}

async function main() {
  console.log('Testing CEO...');
  const ceoCookies = await login('admin@example.com', 'password123');
  console.log('CEO Dashboard:', await checkRoute(ceoCookies, '/ceo/dashboard'));
  console.log('CEO Users:', await checkRoute(ceoCookies, '/ceo/users'));
  
  console.log('Testing PM...');
  const pmCookies = await login('pm@test.com', 'password123');
  console.log('PM Dashboard:', await checkRoute(pmCookies, '/pm/dashboard'));
  console.log('PM -> CEO Users:', await checkRoute(pmCookies, '/ceo/users'));

  console.log('Testing Dev...');
  const devCookies = await login('testdev1@test.com', 'password123');
  console.log('Dev Dashboard:', await checkRoute(devCookies, '/developer/dashboard'));
  console.log('Dev -> CEO Users:', await checkRoute(devCookies, '/ceo/users'));

  console.log('Testing Tester...');
  const testerCookies = await login('tester1@tets.com', 'password123');
  console.log('Tester Dashboard:', await checkRoute(testerCookies, '/tester/dashboard'));
  console.log('Tester -> CEO Users:', await checkRoute(testerCookies, '/ceo/users'));
}

main().catch(console.error);
