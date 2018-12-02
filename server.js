var express = require( 'express' );
var path = require( 'path' );
var ejs = require( 'ejs' );
var requestPromise = require( 'request-promise' );
var bodyParser = require( 'body-parser' );
var cookieParser = require( 'cookie-parser' );
var querystring = require( 'querystring' );

if ( !process.env.NODE_ENV || process.env.NODE_ENV === 'development' ) {
  require( 'dotenv' ).load();
}

var CLIENT_ID = process.env.CLIENT_ID,
    CLIENT_SECRET = process.env.CLIENT_SECRET
    REDIRECT_URI = encodeURI( process.env.REDIRECT_URI );

let token;
let authToken;
let refreshToken;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function( length ) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt( Math.floor( Math.random() * possible.length ) );
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var buildPath = function( endpoint, payload ) {
  var path = "https://api.spotify.com/v1/" + endpoint;

  if ( payload.id ) {
    path = path + "/" + payload.id;
  }

  if ( payload.append ) {
    path = path + "/" + payload.append
  }

  return path
};

var buildPayload = function( request ) {
  var payload = {}

  if ( request.id ) {
    payload.id = request.id;
  }

  if ( request.append ) {
    payload.append = request.append;
  }

  if ( request.qs ) {
    payload.qs = request.qs;
  }

  return payload
};

var buildConnectPayload = function( request ) {
  var payload = {};

  if ( request.path ) {
    payload.path = request.path;
  }

  if ( request.qs ) {
    payload.qs = request.qs;
  }

  if ( request.method ) {
    payload.method = request.method;
  }

  if ( request.token ) {
    payload.token = request.token;
  }

  if ( request.body ) {
    payload.body = request.body;
  }

  return payload
};

var spotifyTokenRequest = function( path, payload, callback ) {
  var options = {
    method: "POST",
    uri: 'https://accounts.spotify.com/api/token',
    headers: {
      "Authorization": "Basic " + ( Buffer.from( CLIENT_ID  + ":" + CLIENT_SECRET ).toString( 'base64' ) )
    },
    form: payload,
    json: true
  };

  requestPromise( options).
  then( callback ).
  catch(
    function( error ) {
      console.log( 'its a token error' );
      console.log( error );
    }
  );
};

var spotifyMeRequest = function( path, payload, callback ) {
  var options = {
    method: 'GET',
    uri: 'https://api.spotify.com/v1/me/top/artists',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': "Bearer " + token
    },
    qs: { 'time_range': payload.time_period }
  };

  requestPromise( options ).
  then( callback ).
  catch(
    function( error ) {
      console.log( 'its a me error' );
      console.log( error.message );
      return error;
    }
  );
};

var spotifyRequest = function( path, payload, callback ) {
  var options = {
    method: 'GET',
    uri: buildPath( path, payload),
    headers: {
      'Authorization': "Bearer " + token
    },
    json: true
  };

  if ( payload.qs ) {
    options.qs = payload.qs;
  }

  requestPromise( options ).
  then( callback ).
  catch(
    function( error ) {
      console.log( 'its a query error' );
      console.log( error.message );
    }
  );
};

var spotifySearchRequest = function( path, payload, callback ) {
  var options = {
    method: 'GET',
    uri: "https://api.spotify.com/v1/" + path,
    qs: payload,
    headers: {
      'Authorization': "Bearer " + token
    },
    json: true
  };

  requestPromise( options ).
  then( callback ).
  catch(
    function( error ) {
      console.log( 'its a search error' );
      console.log( error.message );
    }
  );
};

var spotifyConnectRequest = function( payload, callback ) {
  var url;

  if ( payload.path !== null ) {
    url = "https://api.spotify.com/v1/me/player/" + payload.path;
  }
  else {
    url = "https://api.spotify.com/v1/me/player";
  }

  var options = {
    method: payload.method,
    uri: url,
    headers: {
      'Authorization': "Bearer " + payload.token,
    },
    json: true
  }

  if ( payload.qs ) {
    options.qs = payload.qs
  }

  if ( payload.body ) {
    options.body = payload.body
  }

  requestPromise( options ).
  then( callback ).
  catch(
    function( error ) {
      console.log( 'its a connect error' );
      console.log( error.message );
    }
  );
};

var app = express();

app.set( 'views', __dirname );
app.set( 'view engine', 'html' );
app.engine( 'html', require( 'ejs' ).renderFile );

app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( { extended: true } ) );

app.use( function( request, response, next ) {
  response.set( 'Access-Control-Allow-Origin', '*' );
  response.set( 'Access-Control-Allow-Headers', '*' );

  next();
} );

app.use( express.static( path.join( __dirname + '/app' )  ) );
app.use( cookieParser() );

// dynamic query
app.post( '/query', function( request, response ) {
  response.set( 'Cache-Control', 'no-cache' );
  spotifyRequest(
    request.body.path,
    buildPayload( request.body ),
    function( results ) {
      response.send( results );
    }
  )
} );

// search by artist name request
app.post( '/search', function( request, response ) {
  response.set( 'Cache-Control', 'no-cache' );
  spotifySearchRequest(
    'search',
    {
      q: request.body.name,
      type: 'artist'
    },
    function( results ) {
      response.send( results );
    }
  )
} );

// get logged in users top tracks or artists ( both? )
app.post( '/me', function( request, response ) {
  response.set( 'Cache-Control', 'no-cache' );

  spotifyMeRequest(
    request.body.path,
    { time_period: request.body.period },
    function( results ) {
      response.send( results );
    }
  );
} );

// connect api interactions
app.post( '/connect', function( request, response ) {
  response.set( 'Cache-Control', 'no-cache' );
  spotifyConnectRequest(
    buildConnectPayload( request.body ),
    function( results ) {
      console.log( results );
      response.send( results );
    }
  );
} );

// user authorization token request
app.get( '/authorize', function( request, response ) {
  var authCode;
  var state = generateRandomString( 16 );
  response.cookie( stateKey, state );

  // var scope = ["streaming", "user-read-birthdate", "user-read-email", "user-read-private"];
  var scopes = "streaming user-top-read user-read-birthdate user-read-email user-read-private playlist-modify-public";
  // var scope = [ "user-read-currently-playing", "streaming", "user-read-playback-state", "user-read-birthdate", "user-read-email", "user-read-private", "user-modify-playback-state" ];

  response.redirect( 'https://accounts.spotify.com/authorize?' +
    'response_type=code' +
    '&client_id=' + CLIENT_ID +
    '&scope=' + encodeURIComponent( scopes ) +
    '&redirect_uri=' + encodeURIComponent( REDIRECT_URI ) +
    '&state=' + state
  );
} );

app.get( '/tokencallback', function( request, response ) {
  var code = request.query.code || null;
  var state = request.query.state || null;
  var storedState = request.cookies ? request.cookies[ stateKey ] : null;

  if ( state == null || state !== storedState ) {
    response.redirect( '/#' +
      querystring.stringify( {
        error: 'state_mismatch'
      } )
    );
  }
  else {
    response.clearCookie( stateKey );
    spotifyTokenRequest(
      'https://accounts.spotify.com/api/token',
      {
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      function( results ) {
        token = results.access_token;
        authToken = results.access_token;
        refreshToken = results.refresh_token;

        response.cookie(
          'accessToken',
          token,
          { expires: new Date( Date.now() + results.expires_in ) }
        );

        response.cookie( 
          'refreshToken',
          refreshToken,
          { expires: new Date( Date.now() + results.expires_in ) }
        );

        response.redirect( '/' );
      }
    );
  }
} );

// requesting access token from refresh token
app.post( '/refresh_token', function( request, response ) {
  spotifyTokenRequest(
    'https://accounts.spotify.com/api/token',
    {
      'grant_type': 'refresh_token',
      'refresh_token': refreshToken
    },
    function( results ) {
      token = results.access_token;
      authToken = results.access_token;

      response.cookie(
        'accessToken',
        token,
        { expires: new Date( Date.now() + results.expires_in ) }
      );

      response.send( { access_token: results.access_token } );
    }
  );
} );

// client token request
app.post( '/token', function( request, response ) {
  response.set( 'Cache-Control', 'no-cache' );
  spotifyTokenRequest(
    'https://accounts.spotify.com/api/token',
    { 'grant_type': 'client_credentials' },
    function( results ) {
      token = results.access_token;
      response.send( results );
    }
  );
} );

app.get( '/', function ( req, res ) {
  res.sendFile( path.join( __dirname + '/index.html' ) );
} );

app.get( '*', function( request, response ) {
  response.set( 'Cache-Control', 'no-cache' );
  response.render( 'index.html', function( res, req ) {
  } );
} );

app.listen( ( process.env.PORT || 3000 ), function () {
  console.log( 'Top 20 listening on port', ( process.env.PORT || 3000 ) );
} );
