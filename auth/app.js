require('dotenv').config({ path: './database.env' }); // keep all this stuff in one env file that;s in the root directory
const { MongoClient, ServerApiVersion } = require('mongodb');
const crypto = require('crypto');
const http = require('http');

const clientId = process.env.SPOTIFY_CLIENT_ID;
const redirectUrl = 'http://localhost:5173/callback';
const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = 'user-read-private user-read-email user-top-read';

const mongoUser = process.env.CLIENT_USER;
const mongoPass = process.env.CLIENT_PWD;
const uri = `mongodb+srv://${mongoUser}:${mongoPass}@lmcluster.bthj2ac.mongodb.net/?retryWrites=true&w=majority&appName=lmcluster`;

const currentToken = {
  access_token: null,
  refresh_token: null,
  
  save: function(response) {
    this.access_token = response.access_token;
    this.refresh_token = response.refresh_token;
  },

  clear: function() {
    this.access_token = null;
    this.refresh_token = null;
  }
};

async function redirectToSpotifyAuthorize() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomString = Array(64).fill(0)
    .map(() => possible[Math.floor(Math.random() * possible.length)])
    .join('');

  const code_verifier = randomString;
  const data = new TextEncoder().encode(code_verifier);
  const hashed = await crypto.subtle.digest('SHA-256', data);
  const code_challenge_base64 = Buffer.from(hashed).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const authUrl = new URL(authorizationEndpoint);
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    code_challenge_method: 'S256',
    code_challenge: code_challenge_base64,
    redirect_uri: redirectUrl,
  }).toString();
  return authUrl.toString();
}

async function getToken(code, code_verifier) {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUrl,
      code_verifier: code_verifier,
    }),
  });

  return await response.json();
}

async function refreshToken() {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: currentToken.refresh_token
    }),
  });

  return await response.json();
}

async function main() {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
    
    const database = client.db('terptunes');
    const topTracks = database.collection('tracks');
    const topArtists = database.collection('artists');

    // Authenticate with Spotify (this part would typically be in a web flow)
    const authUrl = await redirectToSpotifyAuthorize();
    console.log("Authorization URL:", authUrl);

    // You would normally redirect to this URL and handle the callback
    // For this example, you'd need to manually get the code and code_verifier
    // const token = await getToken(code, code_verifier);
    // currentToken.save(token);

    // Mock token for demonstration
    currentToken.save({
      access_token: 'your_spotify_access_token',
      refresh_token: 'your_refresh_token'
    });

    await insertUserArtists(client, topArtists, currentToken.access_token);
    await insertUserTracks(client, topTracks, currentToken.access_token);

    const overallTopTracks = await topOverallTracks(client, topTracks);
    const overallTopArtists = await topOverallArtists(client, topArtists);

    console.log('Top Tracks:', overallTopTracks);
    console.log('Top Artists:', overallTopArtists);

    const percentTracks = await compareTracksToOverall(client, currentToken.access_token, overallTopTracks);
    const percentArtists = await compareArtistsToOverall(client, currentToken.access_token, overallTopArtists);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

// returns array of uris
async function topOverallTracks(client, topTracks) {
  const pipeline = [
    { $unwind: "$items" },
    { $group: { _id: "$items.uri", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ];

  const topTracksCursor = topTracks.aggregate(pipeline);
  return await topTracksCursor.toArray();
}

// returns array of uris
async function topOverallArtists(client, topArtists){
  const pipeline = [
    { $unwind: "$items" },
    { $group: { _id: "$items.uri", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ];

  const topArtistsCursor = topArtists.aggregate(pipeline);
  return await topArtistsCursor.toArray();
}

async function insertUserTracks(client, topTracks, token) {
  const response = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=20", {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  });

  const data = await response.json();
  const userExists = await topTracks.findOne({ id: data.id });
  
  if (!userExists) {
    await topTracks.insertOne(data);
    console.log("Inserted new tracks data");
  }
}

async function insertUserArtists(client, topArtists, token) {
  const response = await fetch("https://api.spotify.com/v1/me/top/artists?limit=20", {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  });

  const data = await response.json();
  const userExists = await topArtists.findOne({ id: data.id });
  
  if (!userExists) {
    await topArtists.insertOne(data);
    console.log("Inserted new artists data");
  }
}

// return number out of 100
async function compareTracksToOverall(client, token, ) {
  
}

// return number out of 100
async function compareArtistsToOverall(client, token, overall) {
  const response = await fetch("https://api.spotify.com/v1/me/top/artists?limit=20", {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  });

  const data = await response.json();

  // creates array of uris from current user
  const userUris = data.items.map(item => item.uri);
  const pipeline = [
    { $unwind: "$items" },
    { $match: { "items.uri": { $in: userUris } } },
    { $group: { _id: "$items.uri", count: { $sum: 1 } } },
    { $match: { count: { $gt: 0 } } }
  ];

  const compareArtistsCursor = data.aggregate(pipeline);
  const numMatching = await compareArtistsCursor.toArray().size();
  
  
}

main().catch(console.error);
/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code with PKCE oAuth2 flow to authenticate 
 * against the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */

const clientId = '1ce721f84142477b9efce55e0ed4bd5f'; // your clientId
const redirectUrl = 'http://127.0.0.1:8080';        // your redirect URL - must be localhost URL and/or HTTPS

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = 'user-read-private user-read-email';

// Data structure that manages the current active token, caching it in localStorage
const currentToken = {
  get access_token() { return localStorage.getItem('access_token') || null; },
  get refresh_token() { return localStorage.getItem('refresh_token') || null; },
  get expires_in() { return localStorage.getItem('refresh_in') || null },
  get expires() { return localStorage.getItem('expires') || null },

  save: function (response) {
    const { access_token, refresh_token, expires_in } = response;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('expires_in', expires_in);

    const now = new Date();
    const expiry = new Date(now.getTime() + (expires_in * 1000));
    localStorage.setItem('expires', expiry);
  }
};

// On page load, try to fetch auth code from current browser search URL
const args = new URLSearchParams(window.location.search);
const code = args.get('code');

// If we find a code, we're in a callback, do a token exchange
if (code) {
  const token = await getToken(code);
  currentToken.save(token);

  // Remove code from URL so we can refresh correctly.
  const url = new URL(window.location.href);
  url.searchParams.delete("code");

  const updatedUrl = url.search ? url.href : url.href.replace('?', '');
  window.history.replaceState({}, document.title, updatedUrl);
}

// If we have a token, we're logged in, so fetch user data and render logged in template
if (currentToken.access_token) {
  const userData = await getUserData();
  renderTemplate("main", "logged-in-template", userData);
  renderTemplate("oauth", "oauth-template", currentToken);
}

// Otherwise we're not logged in, so render the login template
if (!currentToken.access_token) {
  renderTemplate("main", "login");
}

async function redirectToSpotifyAuthorize() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  const randomString = randomValues.reduce((acc, x) => acc + possible[x % possible.length], "");

  const code_verifier = randomString;
  const data = new TextEncoder().encode(code_verifier);
  const hashed = await crypto.subtle.digest('SHA-256', data);

  const code_challenge_base64 = btoa(String.fromCharCode(...new Uint8Array(hashed)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  window.localStorage.setItem('code_verifier', code_verifier);

  const authUrl = new URL(authorizationEndpoint)
  const params = {
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    code_challenge_method: 'S256',
    code_challenge: code_challenge_base64,
    redirect_uri: redirectUrl,
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString(); // Redirect the user to the authorization server for login
}

// Soptify API Calls
async function getToken(code) {
  const code_verifier = localStorage.getItem('code_verifier');

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUrl,
      code_verifier: code_verifier,
    }),
  });

  return await response.json();
}

async function refreshToken() {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: currentToken.refresh_token
    }),
  });

  return await response.json();
}

async function getUserData() {
  const response = await fetch("https://api.spotify.com/v1/me", {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + currentToken.access_token },
  });

  return await response.json();
}

// Click handlers
async function loginWithSpotifyClick() {
  await redirectToSpotifyAuthorize();
}

async function logoutClick() {
  localStorage.clear();
  window.location.href = redirectUrl;
}

async function refreshTokenClick() {
  const token = await refreshToken();
  currentToken.save(token);
  renderTemplate("oauth", "oauth-template", currentToken);
}

// HTML Template Rendering with basic data binding - demoware only.
function renderTemplate(targetId, templateId, data = null) {
  const template = document.getElementById(templateId);
  const clone = template.content.cloneNode(true);

  const elements = clone.querySelectorAll("*");
  elements.forEach(ele => {
    const bindingAttrs = [...ele.attributes].filter(a => a.name.startsWith("data-bind"));

    bindingAttrs.forEach(attr => {
      const target = attr.name.replace(/data-bind-/, "").replace(/data-bind/, "");
      const targetType = target.startsWith("onclick") ? "HANDLER" : "PROPERTY";
      const targetProp = target === "" ? "innerHTML" : target;

      const prefix = targetType === "PROPERTY" ? "data." : "";
      const expression = prefix + attr.value.replace(/;\n\r\n/g, "");

      // Maybe use a framework with more validation here ;)
      try {
        ele[targetProp] = targetType === "PROPERTY" ? eval(expression) : () => { eval(expression) };
        ele.removeAttribute(attr.name);
      } catch (ex) {
        console.error(`Error binding ${expression} to ${targetProp}`, ex);
      }
    });
  });

  const target = document.getElementById(targetId);
  target.innerHTML = "";
  target.appendChild(clone);
}