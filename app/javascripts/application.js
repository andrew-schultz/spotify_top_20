// ================================
//            variables
// ================================

var inHeight = window.innerHeight;

var token;
var authToken;
var refToken;
var localPlayerInstance;

var deviceId;
var mobileDevice = false;

var trackData = {};
var searchData = {};

var selectedSong = {
  selected: false
};

var mainContainer = document.getElementById( 'main-container' );
var audioPlayer = document.getElementById( 'audioPlayer' );

var artistListButton = document.getElementById( 'artist-list-button' );
var trackListButton = document.getElementById( 'track-list-button' );

var shortTermButton = document.getElementById( 'short-time-button' );
var mediumTermButton = document.getElementById( 'medium-time-button' );
var longTermButton = document.getElementById( 'long-time-button' );

var loginBottonContainer = document.getElementById( 'login-button-container' );
var loginButton = document.getElementById( 'loginButton' );

var listButtonContainerTop = document.getElementById( 'list-button-container-top' );
var listButtonContainerBottom = document.getElementById( 'list-button-container-bottom' );

var playListButton = document.getElementById( 'playlist-button-container' );

var activeList;
var activeTime = 'medium_term';

var currentPlaying;
var existingCookie;
var retryCounter = 0;
var userId;

var queriedTracks;
var newPlaylist;
var newPlaylistLink;

// ================================
//            functions
// ================================

var resize = function() {
  if ( window.innerWidth < 719 ) {
    var imgHeight = document.getElementById( 'pic' ).style.height;
    var lHeight = document.getElementById( 'left' ).style.height;
    var rHeight = document.getElementById( 'right' ).style.height;
    var nHeight = document.getElementById( 'name' ).style.height;

    document.getElementById( 'left' ).style.marginTop = imgHeight + nHeight+ "px";
    document.getElementById( 'name' ).style.top = imgHeight + 98 + "px";
    document.getElementById( 'right' ).style.height =  "100%";
  }

  if ( window.innerWidth > 719 ) {
    document.getElementById( 'right' ).style.height = window.innerHeight + "px";
  }
};

function getCookie( cookieName ) {
  var name = cookieName + '=';
  var decodedCookie = decodeURIComponent( document.cookie );
  var ca = decodedCookie.split(';');

  for ( var i = 0; i <ca.length; i++ ) {
    var c = ca[ i ];

    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }

    if ( c.indexOf( name ) == 0 ) {
      return c.substring( name.length, c.length );
    }
  }

  return null;
};

var isMobile = {
  Android: function() {
    return navigator.userAgent.match( /Android/i );
  },
  BlackBerry: function() {
    return navigator.userAgent.match( /BlackBerry/i );
  },
  iOS: function() {
    return navigator.userAgent.match( /iPhone|iPad|iPod/i );
  },
  Opera: function() {
    return navigator.userAgent.match( /Opera Mini/i );
  },
  Windows: function() {
    return navigator.userAgent.match( /IEMobile/i );
  },
  Chrome: function() {
    return navigator.userAgent.match( /Mobile/i );
  },
  any: function() {
    return ( isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows() || isMobile.Chrome() );
  }
};

// ================================
//            ImgBaseColor
// ================================

// var rgb = getAverageRGB(document.getElementById('i'));
//     document.body.style.backgroundColor = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';

var getAverageRGB = function( imgEl ) {

  var blockSize = 5, // only visit every 5 pixels
      defaultRGB = { r: 0, g: 0, b: 0 }, // for non-supporting envs
      canvas = document.createElement( 'canvas' ),
      context = canvas.getContext && canvas.getContext( '2d' ),
      data, width, height,
      i = -4,
      length,
      rgb = { r:0, g:0, b:0 },
      count = 0;

  if ( !context ) {
    return defaultRGB;
  }

  height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height || 300;
  width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width || 300;

  context.drawImage( imgEl, 0, 0 );

  try {
      data = context.getImageData( 0, 0, width, height );
  }
  catch( e ) {
      /* security error, img on diff domain */
      // alert('x');
    return defaultRGB;
  }

  length = data.data.length;

  while ( ( i += blockSize * 4 ) < length ) {
    ++count;
    rgb.r += data.data[ i ];
    rgb.g += data.data[ i + 1 ];
    rgb.b += data.data[ i + 2 ];
  }

  // ~~ used to floor values
  rgb.r = ~~( rgb.r/count );
  rgb.g = ~~( rgb.g/count );
  rgb.b = ~~( rgb.b/count );

  return rgb;

// // Found a great workaround for cross-origin restrictions:
// // just add img.crossOrigin = ''; before setting the src attribute.
};


// ================
// Generation
// ================

var displayResults = function( results, type ) {
  var resultContainer = document.getElementById( `${ type }-container` );

  if ( type == 'artist' ) {
    while ( resultContainer.firstChild ) {
      resultContainer.removeChild( resultContainer.firstChild );
    }
  }

  results.items.forEach(
    function( result ) {
      buildDiv( result, type );
    }
  );
};

var transition = function( div, type ) {
  var container = document.getElementById( `${ type }-container` );
  var childrenArray = Array.from( container.children );

  childrenArray.forEach(
    function( child ) {
      if ( child.dataset.id !== div.dataset.id ) {
        removeDiv( child );
      }
    }
  );

  if ( type == 'artist' ) {
    getAlbums( div.dataset.id ).
    then(
      function( results ) {
        trackData.artist = filterData( div.dataset.id, 'artist' );
        displayResults( results, 'album' );
      }
    )
  }
  else if ( type == 'album' ) {
    getTracks( div.dataset.id ).
    then(
      function( results ) {
        trackData.album = filterData( div.dataset.id, 'album' );
        displayResults( results, 'track' );
      }
    );
  }
  else if ( type == 'track' ) {
    Promise.all( [ getTrackFeatures( div.dataset.id ), getTrackAnalysis( div.dataset.id ) ] ).
    then(
      function( results ) {
        trackData.features = results[ 0 ];
        trackData.analysis = results[ 1 ];
        trackData.track = filterData( div.dataset.id, 'track' );

        play( {
          playerInstance: localPlayerInstance,
          spotify_uri: [ trackData.track.uri ],
          param_key: 'uris'
        } );
      }
    )
  }
};

var removeDiv = function( div ) {
  var node = document.getElementById( div.id );
  node.outerHTML = "";
  delete node;
};

var buildDiv = function( data, type ) {
  var node = document.createElement( 'div' );
  node.dataset.id = data.id;
  node.classList.add( type, 'entry' );
  node.id = data.id;

  var titleNode = document.createElement( 'h2' );
  titleNode.textContent = data.name;

  node.appendChild( titleNode );

  document.getElementById( `${ type }-container` ).appendChild( node );
};

// ##################
// TOP STAT FUNCTIONS
// ##################

var pickImage = function( images ) {
  var image;

  images.forEach(
    function( img ) {
      if ( img.height > 350 && img.height < 450 ) {
        image = img;
      }
    }
  );

  if ( !image ) {
    image = images[ 0 ];
  }

  return image.url;
};

var fadeIn = function( element ) {
  var op = 0.1;  // initial opacity
  element.style.display = 'block';

  var timer = setInterval(
    function () {
      if ( op >= 1 ){
          clearInterval( timer);
      }
      element.style.opacity = op;
      element.style.filter = 'alpha(opacity=' + op * 100 + ")";
      op += op * 0.3;
    },
    10
  );
};

var playStat = function( e ) {
  // check to see if player is instantiated before attempting to play
  if ( localPlayerInstance && currentPlaying !== e.currentTarget.dataset.uri ) {
    var uri = e.currentTarget.dataset.uri;
    currentPlaying = e.currentTarget.dataset.uri;
    type = e.currentTarget.dataset.uriType;

    if ( type == 'uris' ) {
      uri = [ uri ];

      play( {
        playerInstance: localPlayerInstance,
        spotify_uri: uri,
        param_key: type
      } );
    }
    else {
      playArtist( {
        playerInstance: localPlayerInstance,
        spotify_uri: uri,
        param_key: type
      } )
    }
  }
};

var buildArtistStatDiv = function( data, index ) {
  var shell = document.createElement( 'div' );
  shell.classList.add( 'artist-stat-div' );

  var imgDiv = document.createElement( 'div' );
  imgDiv.classList.add( 'artist-stat-img-div' );

  var infoDiv = document.createElement( 'div' );
  infoDiv.classList.add( 'info-div' );
  if ( data.type == 'track' ) {
    infoDiv.classList.add( 'track-stat-info-div' );
  }
  else if ( data.type == 'artist' ) {
    infoDiv.classList.add( 'artist-stat-info-div' );
  }

  var img = document.createElement( 'img' );
  img.crossOrigin = '';

  var image;
  if ( data.type == 'track' ) {
    img.classList.add( 'track-stat-img' );
    image = pickImage( data.album.images );
    img.src = image;
  }
  else {
    img.classList.add( 'artist-stat-img' );
    image = pickImage( data.images );
    img.src = image;
  }

  imgDiv.appendChild( img );

  // ########################
  // blurred background start
  // ########################

  var subContainer = document.createElement( 'div' );
  subContainer.classList.add( 'sub-container' );

  var shellBackground = document.createElement( 'div' );
  shellBackground.classList.add( 'shell-background' );

  var backgroundImgContainer = document.createElement( 'div' );
  backgroundImgContainer.classList.add( 'shell-background-image-container' );

  var backgroundImg = document.createElement( 'img' );
  backgroundImg.src = image;

  backgroundImgContainer.appendChild( backgroundImg );

  var backgroundShadow = document.createElement( 'div' );
  backgroundShadow.classList.add( 'shell-shadow' );

  shellBackground.appendChild( backgroundImgContainer );
  // shellBackground.appendChild( backgroundShadow );
  subContainer.appendChild( shellBackground );

  // #########################
  // blurred background finish
  // #########################

  // img.addEventListener( 'load', function() {
  //   var rgb = getAverageRGB( img );
  //   shell.style.background = 'linear-gradient( -150deg, rgba( ' + rgb.r + ',' + rgb.g + ',' + rgb.b + ', 0.2 ), rgba( ' + rgb.r + ',' + rgb.g + ',' + rgb.b + ', 0.8 )';
  // } );

  var rankingDivContainer = document.createElement( 'div' );
  rankingDivContainer.classList.add( 'ranking-container' );

  if ( data.type == 'track' ) {
    rankingDivContainer.classList.add( 'ranking-track' );
  }

  var rankingDiv = document.createElement( 'div' );
  rankingDiv.classList.add( 'ranking-div' );

  var rankingNumber = document.createElement( 'p' );
  rankingNumber.classList.add( 'ranking-text')
  rankingNumber.textContent = index + 1;

  rankingDiv.appendChild( rankingNumber );
  rankingDivContainer.appendChild( rankingDiv );
  infoDiv.appendChild( rankingDivContainer );

  var subInfoDiv = document.createElement( 'div' );
  subInfoDiv.classList.add( 'sub-info-container' );

  var titleContainer = document.createElement( 'div' );
  titleContainer.classList.add( 'title-container' );

  var titleNode = document.createElement( 'h2' );
  var longTitle = false;

  if ( data.name.length > 40 ) {
    longTitle = true;
    titleNode.classList.add( 'artist-stat-title-small' );
  }
  else {
    titleNode.classList.add( 'artist-stat-title' );
  }

  titleNode.textContent = data.name;

  titleContainer.appendChild( titleNode );
  subInfoDiv.appendChild( titleContainer );

  if ( data.type == 'track' ) {
    var subTitleNode = document.createElement( 'p' );

    if ( longTitle ) {
      subTitleNode.classList.add( 'track-artist-title-small')
    }
    else {
      subTitleNode.classList.add( 'track-artist-title' );
    }

    subTitleNode.textContent = 'by ' + data.artists[ 0 ].name;
    subInfoDiv.appendChild( subTitleNode );
  }

  if ( localPlayerInstance && !mobileDevice ) {
    var listenDiv = document.createElement( 'div' );
    listenDiv.classList.add( 'listen-container' );

    var listenButton = document.createElement( 'div' );
    listenButton.classList.add( 'listen-button' );
    listenButton.id = data.uri;
    listenButton.dataset.uri = data.uri;

    if ( data.type == 'artist' ) {
      listenButton.dataset.uriType = 'uri_context'
    }
    else {
      listenButton.dataset.uriType = 'uris'
    }

    listenButton.onclick = playStat;

    var listenText = document.createElement( 'p' );
    listenText.classList.add( 'listen-text' );
    listenText.textContent = 'Listen Now';

    listenButton.append( listenText );
    listenDiv.append( listenButton );
    subInfoDiv.append( listenDiv );
  }

  infoDiv.appendChild( subInfoDiv );

  shell.appendChild( backgroundShadow );
  shell.appendChild( imgDiv );
  shell.appendChild( infoDiv );

  subContainer.appendChild( shell );
  mainContainer.appendChild( subContainer );

  return shell;
};

var toggleListButtons = function( term ) {
  artistListButton.classList.toggle( 'inactive' );
  trackListButton.classList.toggle( 'inactive' );
};

var toggleTimeButtons = function( time ) {
  var timeButtons = [
    'shortTermButton',
    'mediumTermButton',
    'longTermButton'
  ];

  var period = time.split( '_' );

  timeButtons.forEach(
    function( button ) {
      var button_split = button.split( /(?=[A-Z])/ );
      var element = window[ button ];

      if ( button_split[ 0 ] !== period[ 0 ] ) {
        element.classList.add( 'inactive' );
      }
      else {
        if ( element.classList.contains( 'inactive' ) ) {
          element.classList.remove( 'inactive' );
        }
      }
    }
  );
};

var setTime = function( time ) {
  if ( activeTime !== time ) {
    activeTime = time;

    getTopList( activeList ).then(
      function( results ) {
        // remove any existing stat containers
        while ( mainContainer.hasChildNodes() ) {
          mainContainer.removeChild( mainContainer.lastChild );
        };

        toggleTimeButtons( time );

        results.items.forEach(
          function( result, index ) {
            var newDiv = buildArtistStatDiv( result, index );
            fadeIn( newDiv );
          }
        );
      }
    );
  }
};

var queryStats = function( term ) {
  if ( activeList !== term ) {
    getTopList( term ).then(
      function( results ) {
        if ( results === 'retry' ) {
          queryStats( term )
        }
        else {
          // remove any existing stat containers
          while ( mainContainer.hasChildNodes() ) {
            mainContainer.removeChild( mainContainer.lastChild );
          };

          activeList = term;
          toggleListButtons( term );

          results.items.forEach(
            function( result, index ) {
              var newDiv = buildArtistStatDiv( result, index );
              fadeIn( newDiv );
            }
          );
        }
      }
    );
  }
};

var populatePlaylist = function( playlist ) {
  return new Promise( ( resolve, reject ) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( 'POST', `https://api.spotify.com/v1/playlists/${ playlist.id }/tracks`, true );
    xmlHttp.setRequestHeader( 'Accept', 'application/json' );
    xmlHttp.setRequestHeader( 'Content-Type', 'application/json' );
    xmlHttp.setRequestHeader( 'Authorization', `Bearer ${ authToken }` )
    xmlHttp.onreadystatechange = function() {
      if ( xmlHttp.readyState == 4 && ( xmlHttp.status == 200 || xmlHttp.status == 201 ) ) {
        var results = JSON.parse( xmlHttp.response );
        resolve( results );
      }
    };

    var trackUris = queriedTracks.map( track => track.uri );

    var data = {
      uris: trackUris
    };

    xmlHttp.send( JSON.stringify( data ) );
  } );
};

var createEmptyPlaylist = function() {
  return new Promise( ( resolve, reject ) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( 'POST', `https://api.spotify.com/v1/users/${ userId }/playlists`, true );
    xmlHttp.setRequestHeader( 'Accept', 'application/json' );
    xmlHttp.setRequestHeader( 'Content-Type', 'application/json' );
    xmlHttp.setRequestHeader( 'Authorization', `Bearer ${ authToken }` )
    xmlHttp.onreadystatechange = function() {
      if ( xmlHttp.readyState == 4 && ( xmlHttp.status == 200 || xmlHttp.status == 201 ) ) {
        var results = JSON.parse( xmlHttp.response );
        resolve( results );
      }
    };

    var data = {
      name: 'My Top 20'
    };

    xmlHttp.send( JSON.stringify( data ) );
  } );
};

var buildEmbed = function( link, playlist ) {
  var promptContainer = document.getElementById( 'playlist-prompt-div' );
  var playlistButtonContainer = document.getElementById( 'playlist-prompt-button-container' );
  var playlistText = document.getElementById( 'playlist-prompt-text' );
  var cancel = document.getElementById( 'playlist-cancel' );

  var iframe = document.createElement( 'iframe' );
  iframe.classList.add( 'playlist-iframe' );
  var url = playlist.uri.replace( /spotify:/, '' );
  formattedUrl = url.replace( /:/g, '/' );

  iframe.src = `https://open.spotify.com/embed/${ formattedUrl }`;
  iframe.width = '100';
  iframe.height = '200';
  iframe.frameborder = '0';
  iframe.allowtransparency = 'true';
  iframe.allow = 'encrypted-media';

  iframe.style.transition = 'width: 0.2s', 'height: 0.2s';

  playlistText.textContent = "Here's your Top 20 playlist!";
  cancel.textContent = 'Close';
  promptContainer.classList.add( 'expanded-prompt-container' );
  cancel.classList.add( 'cancel-padding' );
  promptContainer.removeChild( playlistButtonContainer );
  // add a spinner, set a timeout before inserting

  promptContainer.insertBefore( iframe, cancel );  
};

var buildNewPlaylist = function() {
  getUserId().then(
    function( results ) {
      userId = results.id;

      // check to see if a playlist exists, i guess use the title?
      createEmptyPlaylist().then(
        function( playlist ) {
          newPlaylist = playlist;
          newPlaylistLink = playlist.external_urls.spotify;

          populatePlaylist( playlist ).then(
            function( results ) {
              buildEmbed( newPlaylistLink, newPlaylist );
            }
          );
        }
      );

    }
  );
};

var closePlaylistPrompt = function () {
  var body = document.getElementsByTagName( 'body' )[0];
  var generalContainer = document.getElementById( 'general-container' );
  var promptContainer = document.getElementById( 'playlist-prompt-container' );

  generalContainer.removeChild( promptContainer );
  body.style.overflow = 'auto';
};

var buildNewPlaylistPrompt = function() {
  var generalContainer = document.getElementById( 'general-container' );
  var playlistPromptContainer = document.createElement( 'div' );
  var body = document.getElementsByTagName( 'body' )[0];

  playlistPromptContainer.classList.add( 'playlist-prompt-container' );
  playlistPromptContainer.id = 'playlist-prompt-container';

  var playlistPromptDiv = document.createElement( 'div' );
  playlistPromptDiv.id = 'playlist-prompt-div';
  playlistPromptDiv.classList.add( 'playlist-prompt-div' );
  playlistPromptContainer.appendChild( playlistPromptDiv );

  var playlistPromptText = document.createElement( 'p' );
  playlistPromptText.id = 'playlist-prompt-text';
  playlistPromptText.classList.add( 'playlist-prompt-text' );
  playlistPromptText.textContent = 'Create a playlist of your Top 20 to share and listen to whenever you like?';
  playlistPromptDiv.appendChild( playlistPromptText );

  var createPlaylistButtonContainer = document.createElement( 'div' );
  createPlaylistButtonContainer.id = 'playlist-prompt-button-container';
  createPlaylistButtonContainer.classList.add( 'playlist-button-container' );

  var createPlaylistButton = document.createElement( 'div' );
  createPlaylistButton.classList.add( 'button', 'playlist-button' );
  createPlaylistButton.addEventListener( 'click', buildNewPlaylist );

  var playlistButtonText = document.createElement( 'p' );
  playlistButtonText.textContent = 'Create Playlist';
  createPlaylistButton.appendChild( playlistButtonText );

  createPlaylistButtonContainer.appendChild( createPlaylistButton );
  playlistPromptDiv.appendChild( createPlaylistButtonContainer );

  var cancelButton = document.createElement( 'p' );
  cancelButton.id = 'playlist-cancel';
  cancelButton.classList.add( 'playlist-cancel' );
  cancelButton.textContent = 'Cancel'
  cancelButton.addEventListener( 'click', closePlaylistPrompt );

  playlistPromptDiv.appendChild( cancelButton );

  generalContainer.appendChild( playlistPromptContainer );
  body.style.overflow = 'hidden';
};

// ===========
// filter data
// ===========

var filterData = function( id, type ) {
  var result;

  searchData[ type ].forEach(
    function( item ) {
      if ( item.id == id ) {
        result = item;
      }
    }
  );

  return result;
};

// ================================
//             queries
// ================================

var getAlbums = function( id ) {
  return new Promise( ( resolve, reject ) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( 'POST', '/query', true );
    xmlHttp.setRequestHeader( 'Content-Type', 'application/json;charset=UTF-8' );
    xmlHttp.onreadystatechange = function() {
      if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
        var results = JSON.parse( xmlHttp.response );
        searchData.album = results.items;
        resolve( results );
      }
    };

    var data = {
      id: id,
      path: 'artists',
      append: 'albums',
      qs: {
        album_type: 'album,single',
        market: 'US'
      }
    };

    xmlHttp.send( JSON.stringify( data ) );
  } );
};

var getTracks = function( id ) {
  return new Promise( ( resolve, reject ) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( 'POST', '/query', true );
    xmlHttp.setRequestHeader( 'Content-Type', 'application/json;charset=UTF-8' );
    xmlHttp.onreadystatechange = function() {
      if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
        var results = JSON.parse( xmlHttp.response );
        searchData.track = results.items;
        resolve( results );
      }
    };

    var data = {
      id: id,
      path: 'albums',
      append: 'tracks',
      qs: { country: 'US' }
    };

    xmlHttp.send( JSON.stringify( data ) );
  } );
};

var getTrackFeatures = function( id ) {
  return new Promise( ( resolve, reject ) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( 'POST', '/query', true );
    xmlHttp.setRequestHeader( 'Content-Type', 'application/json;charset=UTF-8' );
    xmlHttp.onreadystatechange = function() {
      if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
        var results = JSON.parse( xmlHttp.response );
        resolve( results );
      }
    };

    var data = {
      id: id,
      path: 'audio-features',
    };

    xmlHttp.send( JSON.stringify( data ) );
  } );
}

var getTrackAnalysis = function( id ) {
  return new Promise( ( resolve, reject ) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( 'POST', '/query', true );
    xmlHttp.setRequestHeader( 'Content-Type', 'application/json;charset=UTF-8' );
    xmlHttp.onreadystatechange = function() {
      if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
        var results = JSON.parse( xmlHttp.response );
        resolve( results );
      }
    };

    var data = {
      id: id,
      path: 'audio-analysis',
    };

    xmlHttp.send( JSON.stringify( data ) );
  } );
}

var search = function( term ) {
  if ( token && token.length > 0 ) {
    return new Promise( ( resolve, reject ) => {
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open( 'POST', '/search', true );
      xmlHttp.setRequestHeader( 'Content-Type', 'application/json;charset=UTF-8' );
      xmlHttp.onreadystatechange = function() {
        if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
          var results = JSON.parse( xmlHttp.response );

          if ( results.artists.items[ 0 ] ) {
            searchData.artist = results.artists.items;
            resolve( results.artists );
          }
        }
      };

      var data = { name: term };

      xmlHttp.send( JSON.stringify( data ) );
    } );
  }
  else {
    initialize( term );
  }
};

var getCurrentState = function() {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open( 'POST', '/connect', true );
  xmlHttp.setRequestHeader( 'Content-Type', 'application/json;charset=UTF-8' );
  xmlHttp.onreadystatechange = function() {
    if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
      // var results = JSON.parse( xmlHttp.response );
      generateNowPlayingStats( results );
    }
  };

  var data = {
    path: 'currently-playing',
    method: 'GET',
    token: authToken
  };

  xmlHttp.send( JSON.stringify( data ) );
};

var getUserId = function() {
  return new Promise( ( resolve, reject ) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( 'GET', 'https://api.spotify.com/v1/me', true );
    xmlHttp.setRequestHeader( 'Accept', 'application/json' );
    xmlHttp.setRequestHeader( 'Content-Type', 'application/json' );
    xmlHttp.setRequestHeader( 'Authorization', `Bearer ${ authToken }` )
    xmlHttp.onreadystatechange = function() {
      if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
        var results = JSON.parse( xmlHttp.response );
        resolve( results );
      }
    };

    xmlHttp.send();
  } );
};

var refreshToken = function( type ) {
  return new Promise( ( resolve, reject ) => {
    retryCounter += 1;

    if ( retryCounter < 3 ) {
      var xmlHttp = new XMLHttpRequest();

      xmlHttp.open( 'POST', '/refresh_token', true );
      xmlHttp.setRequestHeader( 'Content-Type', 'application/json;charset=UTF-8' );
      xmlHttp.onreadystatechange = function() {
        if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
          var results = JSON.parse( xmlHttp.response );

          var authExpire = new Date();
          authExpire.setTime( authExpire.getTime() + ( 60 * 1000 ) );
          var expires = "expires="+ authExpire.toUTCString();

          document.cookie = 'auth_token=' + results.access_token + ';' + expires;
          authToken = results.access_token;

          resolve( 'retry' );
        }
        else if ( xmlHttp.readyState == 4 && xmlHttp.status != 200 ) {
          console.log( 'error' );
          resolve( refreshToken( type ) );
        }
      };

      var data = {
        'refresh_token': refToken
      };

      xmlHttp.send( JSON.stringify( data ) );

    }
    else {
      resolve( 'nope' );
    }
  } );
};

var getTopList = function( type ) {
  return new Promise( ( resolve, reject ) => {
    var xmlHttp = new XMLHttpRequest();
    var dateParam = '?time_range=' + encodeURIComponent( activeTime );

    xmlHttp.open( 'GET', 'https://api.spotify.com/v1/me/top/' + type + dateParam, true );
    xmlHttp.setRequestHeader( 'Accept', 'application/json' );
    xmlHttp.setRequestHeader( 'Content-Type', 'application/json' );
    xmlHttp.setRequestHeader( 'Authorization', `Bearer ${ authToken }` )
    xmlHttp.onreadystatechange = function() {
      if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
        var results = JSON.parse( xmlHttp.response );

        if ( type == 'tracks' ) {
          queriedTracks = results.items;
        }
        resolve( results );
      }
      else if ( xmlHttp.readyState == 4 && xmlHttp.status != 200 ) {
        console.log( 'error' );
        resolve( refreshToken() );
      }
    };

    xmlHttp.send( );
  } );
};

// ================================
//            listeners
// ================================


// ================================
//         player controls
// ================================

var togglePlay = function() {
  localPlayerInstance.togglePlay().then(() => {
    console.log('Toggled playback!');
  });
};

const play = (
  {
    spotify_uri,
    playerInstance: {
      _options: {
        getOAuthToken,
        id
      }
    }
  }
) => {
  getOAuthToken( access_token => {
    fetch( `https://api.spotify.com/v1/me/player/play?device_id=${ id }`, {
      method: 'PUT',
      body: JSON.stringify( { uris: spotify_uri } ),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ authToken }`
      },
    } );
  } );
};

const playArtist = (
  {
    spotify_uri,
    playerInstance: {
      _options: {
        getOAuthToken,
        id
      }
    }
  }
) => {
  getOAuthToken( access_token => {
    fetch( `https://api.spotify.com/v1/me/player/play?device_id=${ id }`, {
      method: 'PUT',
      body: JSON.stringify( { context_uri: spotify_uri } ),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ authToken }`
      },
    } );
  } );
};

// ================================
//            initialize
// ================================

window.onSpotifyWebPlaybackSDKReady = () => {
  const token = authToken;
  const player = new Spotify.Player( {
    name: 'Band Browser Player',
    getOAuthToken: cb => {
     cb( token );
    }
  });

  localPlayerInstance = player;
  // Error handling
  player.addListener( 'initialization_error', ( { message } ) => { console.error( message ); } );
  player.addListener( 'authentication_error', ( { message } ) => { console.error( message ); } );
  player.addListener( 'account_error', ( { message } ) => { console.error( message ); } );
  player.addListener( 'playback_error', ( { message } ) => { console.error( message ); } );

  // Playback status updates
  player.addListener( 'player_state_changed', state => { console.log( state ); } );

  // Ready
  player.addListener( 'ready', ( { device_id } ) => {
    deviceId = device_id;
    console.log( 'Ready with Device ID', device_id );
  } );

  // Connect to the player!
  player.connect().then(
    function( success ) {
      if ( success ){
        console.log( 'The Web Playback SDK successfully connected to Spotify!' );
      }
    }
  );
};

var initialRender = function( ready ) {
  if ( ready ) {
    spinner.style.display = 'none';

    loginBottonContainer.style.display = 'none';
    loginButton.style.display = 'none';

    listButtonContainerTop.style.display = 'flex';
    listButtonContainerBottom.style.display = 'flex';
    playListButton.style.display = 'flex';

    if ( refToken && !authToken ) {
      refreshToken().then(
        function() {
          queryStats( 'artists' );
        }
      );
    }
    else {
      queryStats( 'artists' );
    }
  }
  else {
    spinner.style.display = 'none';

    loginBottonContainer.style.display = 'flex';
    loginButton.style.display = 'block';

    listButtonContainerTop.style.display = 'none';
    listButtonContainerBottom.style.display = 'none';
    playListButton.style.display = 'none';
  }
};

var collectCookies = function() {
  existingCookie = getCookie( 'accessToken' );
  authCookie = getCookie( 'auth_token' );
  refreshCookie = getCookie( 'refresh_token' );
  existingRefreshCookie = getCookie( 'refreshToken' );

  mobileDevice = isMobile.any();

  var authExpire = new Date();
  authExpire.setTime( authExpire.getTime() + ( 60 * 1000 ) );
  var expires = "expires="+ authExpire.toUTCString();

  if ( existingCookie || authCookie || refreshCookie || existingRefreshCookie ) {
    if ( existingCookie ) {
      document.cookie = 'auth_token=' + existingCookie + ';' + expires;
    }
    else if ( authCookie) {
      document.cookie = 'auth_token=' + authCookie + ';' + expires;
    }

    if ( refreshCookie || existingRefreshCookie ) {
      if ( existingRefreshCookie ) {
        document.cookie = 'refresh_token=' + existingRefreshCookie;
      }
      else if ( refreshCookie ) {
        document.cookie = 'refresh_token=' + refreshCookie;
      }
    }

    authToken = existingCookie || authCookie;
    refToken = existingRefreshCookie || refreshCookie;

    initialRender( true );
  }
  else {
    // uh oh, somethings wrong
    console.log( 'we aint got no cookies ' )
    initialRender();
    console.log( 'please log out and try again?' );
  }
};

var initialize = function( query ) {
  if ( token ) {
    console.log( 'we got a token' );
    collectCookies();
  }
  else {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( 'POST', '/token', true ); // true for asynchronous
    xmlHttp.onreadystatechange = function() {
      if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 ) {
        var results = JSON.parse( xmlHttp.response );
        token = results.access_token;

        if ( refToken && !authToken ) {
          refreshToken();
        }
        else {
          collectCookies();
        }
      }
    };

    xmlHttp.send();
  }
};

initialize();
