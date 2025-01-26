require('dotenv').config({ path: './database.env' });
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

    await insertUserArtists(topArtists, currentToken.access_token);
    await insertUserTracks(topTracks, currentToken.access_token);

    const overallTopTracks = await topOverallTracks(topTracks, 20);
    const overallTopArtists = await topOverallArtists(topArtists, 20);

    console.log('Top Tracks:', overallTopTracks);
    console.log('Top Artists:', overallTopArtists);

    const percentTracks = await compareTracksToOverall(currentToken.access_token, overallTopTracks);
    const percentArtists = await compareArtistsToOverall(currentToken.access_token, overallTopArtists);

    const similarity = getBlend(percentArtists, percentTracks);
    console.log(similarity);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

async function fetchTracks(token) {
  const response = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=20", {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  });

  return await response.json();
}

async function fetchArtists(token) {
  const response = await fetch("https://api.spotify.com/v1/me/top/artists?limit=20", {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  });

  return await response.json();

}

async function insertUserTracks(topTracks, token) {
  const data = fetchTracks(token);

  const userExists = await topTracks.findOne({ id: data.id });
  
  if (!userExists) {
    await topTracks.insertOne(data);
    console.log("Inserted new tracks data");
  }
}

async function insertUserArtists(topArtists, token) {
  const data = fetchArtists(token);

  const userExists = await topArtists.findOne({ id: data.id });
  
  if (!userExists) {
    await topArtists.insertOne(data);
    console.log("Inserted new artists data");
  }
}

// returns array of ids
async function topOverallTracks(topTracks, limit) {
  const pipeline = [
    { $unwind: "$items" },
    { $group: { _id: "$items.id", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ];

  const topTracksCursor = topTracks.aggregate(pipeline);
  return await topTracksCursor.toArray();
}

// returns array of ids
async function topOverallArtists(topArtists, limit){
  const pipeline = [
    { $unwind: "$items" },
    { $group: { _id: "$items.id", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ];

  const topArtistsCursor = topArtists.aggregate(pipeline);
  return await topArtistsCursor.toArray();
}

// return number out of 100
async function compareTracksToOverall(token, overall) {
  const data = fetchTracks(token);

  const userIDs = data.items ? data.items.map(item => item.id) : [];

  return compareSimilarity(overall, userIDs);
}

// return number out of 100
async function compareArtistsToOverall(token, overall) {
  const data = fetchArtists(token);

  // creates array of uris from current user
  const userIDs = data.items ? data.items.map(item => item.id) : [];

  return compareSimilarity(overall, userIDs);  
}

// returns the percent similarity between the school's top music and the user's 
function getBlend(artistSimilarity, tracksSimilarity){
  const percent = (artistSimilarity + tracksSimilarity)/2;
  return Math.floor(percent);
}

// returns the percent similarity of two lists 
function compareSimilarity(schoolList, userList){
  const schoolSet = new Set(schoolList);
  const userSet = new Set(userList);

  const intersection = new Set([...schoolSet].filter(x => userSet.has(x)));
  const union = new Set([...schoolSet, ...userSet]);

  const similarity = (intersection.size / union.size) * 100;
  return similarity;
}

// for use in frontend
async function fetchArtistInfo(token, id) {
  const response = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  });

  return await response.json();
}

async function fetchTrackInfo(token, id) {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  });

  return await response.json();
}

main().catch(console.error);