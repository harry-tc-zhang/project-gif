var searchResultTemplate = undefined;
var bookmarkTableTemplate = undefined;

// Load and set up YouTube iFrame Player API
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var playSecs = 0;
var snippetPlaying = false;
var updateVideoMetadata = false;

var youtubePlayer = undefined;

var savedSnippets = [];

var currentSecs = 0;
var currentStart = 0;
var currentDuration = 3;
var currentEnd = 0;
var currentSpeed = 1;
var restoreVideoSpeed = false;

var currentPlayCallback = undefined;

var INCREMENT_VAL = 0.2;

function onPlayerStateChange(event) {
    console.log(event);
    if (event.data == 1) {
        if (updateVideoMetadata) {
            setTimeout(() => {
                console.log('Updating metadata');
                youtubePlayer.stopVideo();
                updateVideoMetadata = false;
                // Sets the playback rate dropdown
                let rates = youtubePlayer.getAvailablePlaybackRates();
                let prevSpeed = $('#video-speed').val();
                $('#video-speed').html(rates.map((r) =>
                    ("<option value='" + r.toString() + "' " + ((r == 1) ? "selected" : "") + ">"
                        + r.toString() + "x"
                        + "</option>")
                ));
                if (restoreVideoSpeed) {
                    $('#video-speed').val(prevSpeed);
                    restoreVideoSpeed = false;
                }
                $('#loading-spinner').hide();
                if(currentPlayCallback) {
                    currentPlayCallback();
                    currentPlayCallback = undefined;
                }
            }, 2000);
        }
        else if (snippetPlaying) {
            setTimeout(() => {
                youtubePlayer.pauseVideo();
                snippetPlaying = false;
            }, playSecs / currentSpeed * 1000);
        } else {
            currentSpeed = 1;
            $('#video-speed').val(currentSpeed);
            youtubePlayer.setPlaybackRate(currentSpeed);
        }
    } else if (event.data == -1) {
        if(updateVideoMetadata) {
            youtubePlayer.playVideo();
        }
    }
}

var updateTimeInputs = (start, end, speed) => {
    currentDuration = end - start;
    $('#video-start').val(start.toFixed(2).toString() + "s");
    $('#video-duration').val((end - start).toFixed(2).toString() + "s");
    $('#video-end').val(end.toFixed(2).toString() + "s");
    $('#video-speed').val(speed);
    playVideoSegment(currentVideoId, currentVideoTitle, start, end - start, speed);
}

var pollCurrentTime = () => {
    if(youtubePlayer.getPlayerState() == 1) {
        currentSecs = youtubePlayer.getCurrentTime();
        if(!snippetPlaying) {
            if(currentSecs > currentDuration) {
                currentStart = currentSecs - currentDuration;
            } else {
                currentStart = 0;
            }
            currentEnd = currentSecs;
            revertControlStyle(false);
            $('#video-start').val(currentStart.toFixed(2).toString() + "s");
            $('#video-duration').val(currentDuration.toFixed(2).toString() + "s");
            $('#video-end').val(currentEnd.toFixed(2).toString() + "s");
        }
    }
    setTimeout(() => {pollCurrentTime();}, 200);
};

function onYouTubeIframeAPIReady() {
    var wrapperWidth = $('#youtube-player-wrapper').width() - 20;
    var wrapperHeight = wrapperWidth / 16.0 * 9.0;
    youtubePlayer = new YT.Player('youtube-player', {
        width: wrapperWidth,
        height: wrapperHeight,
        events: {
            onReady: () => {
                youtubePlayer.mute();
                pollCurrentTime();
                $('#caption-preview').width($('#youtube-player-wrapper').width());
                $('#caption-preview').height($('#youtube-player-wrapper').height());

                $('#loading-spinner').width($('#youtube-player-wrapper').width());
                $('#loading-spinner').height($('#youtube-player-wrapper').height() + 10);

                $('#loading-spinner').hide();
            },
            onStateChange: onPlayerStateChange
        },
        playerVars: {
            //controls: 0,
            disablekb: 1,
            cc_load_policy: 3,
            iv_load_policy: 3
        }
    });
}

var currentVideoId = '';
var currentVideoTitle = '';

var loadVideo = (videoId, videoTitle, cb=undefined) => {
    console.log('loadVideo() called');
    updateVideoMetadata = true;
    $('#loading-spinner').show();
    currentVideoId = videoId;
    currentVideoTitle = videoTitle;
    currentPlayCallback = cb;
    youtubePlayer.loadVideoById({
        'videoId': videoId,
        'suggestedQuality': 'large',
        'endSeconds': 3
    });
    //youtubePlayer.playVideo();
}

var revertControlStyle = (isSaved) => {
    if(isSaved) {
        $('#control-card').addClass('border-success');
        $('#control-card').find('.card-header').text('Saved snippet');
    } else {
        $('#control-card').removeClass('border-success');
        $('#control-card').find('.card-header').text('You were just watching...');
    }
}

var playSavedSnippet = (snippet) => {
    currentStart = snippet.start;
    currentDuration = snippet.duration;
    currentEnd = snippet.start + snippet.duration;
    currentSpeed = snippet.speed;
    restoreVideoSpeed = true;
    updateTimeInputs(snippet.start, snippet.start + snippet.duration, snippet.speed);
    $('#caption-input').val(snippet.caption);
    $('#caption-text').text(snippet.caption);
    //console.log('data restore complete');
    revertControlStyle(true);
    playVideoSegment(snippet.videoId, snippet.title, snippet.start, snippet.duration, snippet.speed);
}

var searchAction = () => {
    gapi.client.youtube.search.list({
        'part': 'snippet',
        'maxResults': 25,
        'q': $('#search-input').val().toLowerCase(),
        'safesearch': 'none',
        'type': 'video'
    }).then((response) => {
        $('#search-results').html(searchResultTemplate(response.result));

        youtubePlayer.mute();
        $('#youtube-player-wrapper').show();
        loadVideo(response.result.items[0].id.videoId, response.result.items[0].snippet.title);

        $('#control-group').show();

        $('.youtube-card').click((event) => {
            //console.log($(event.currentTarget).attr('videoId'));
            currentStart = 0;
            loadVideo($(event.currentTarget).attr('videoId'), $(event.currentTarget).attr('videoTitle'));
        });

        var bookmarkTopOffet = $('#bookmark-section')[0].getBoundingClientRect().top;
        $('#bookmark-section').height($(window).height() - bookmarkTopOffet);

        var searchResultTopOffset = $('#search-results')[0].getBoundingClientRect().top;
        $('#search-results').height($(window).height() - searchResultTopOffset);
    });
};

var playVideoSegment = (videoId, videoTitle, start, duration, speed) => {
    if(videoId != currentVideoId) {
        loadVideo(videoId, videoTitle, () => {
            console.log('here is the callback ' + start + ' ' + duration);
            playVideoSegment(videoId, videoTitle, start, duration, speed);
        });
    } else {
        youtubePlayer.setPlaybackRate(speed);
        youtubePlayer.seekTo(start);
        snippetPlaying = true;
        playSecs = duration;
        youtubePlayer.playVideo();
    }
}

var videoInfoAction = () => {
    gapi.client.youtube.videos.list({
        'part': 'contentDetails',
        'id': currentVideoId
    }).then((response) => {
        console.log(response);
    });
}

var APILoaded = () => {
    gapi.client.init({
        'apiKey': api_key,
        'discoveryDocs': ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"],
    }).then(() => {
        $('#search-button').click(searchAction);
        $('#search-input').keyup((e) => {
            if(e.keyCode == 13) {
                if($('#search-input').val().length > 0) {
                    searchAction();
                }
            }
        });
    });
};

var saveSnippet = (snippetInfo) => {
    savedSnippets.push(snippetInfo);
    console.log(savedSnippets);
    $('#bookmark-section').html(bookmarkTableTemplate(savedSnippets))
    $('a.bookmark-play').click((event) => {
        var idx = parseInt($(event.target).parent().attr('forItemIdx'));
        playSavedSnippet(savedSnippets[idx]);
    });
};

var downloadGIFFromURL = (gifurl) => {
    var linktag = document.createElement('a');
    linktag.setAttribute('href', gifurl);
    linktag.setAttribute('download', "YourGIF.gif");
    linktag.click();
    setTimeout(() => {linktag.remove()}, 500);
}

$(document).ready(() => {
    searchResultTemplate = Handlebars.compile($('#search-result-template').html());
    bookmarkTableTemplate = Handlebars.compile($('#bookmark-table-template').html());

    Handlebars.registerHelper('roundTo2', (val) => {
       return parseFloat(val).toFixed(2).toString();
    });

    gapi.load('client', APILoaded);

    $('#play-btn').click(function () {
        playVideoSegment(currentVideoId, currentVideoTitle, currentStart, currentDuration, parseFloat($('#video-speed').val()));
    });

    $('#progress-modal').modal('hide');

    var showProgressModal = () => {
        $('#progress-title').text('Making your GIF...');
        $('#progress-bar').show();
        $('#gif-preview').hide();
        $('#gif-preview-img').empty();
        $('#gif-preview-actions').hide();
        $('#progress-modal').modal('show');
    }

    var showGIFPreview = (gifurl) => {
        $('#progress-title').text('Here is your GIF');
        $('#progress-bar').hide();
        $('#gif-preview-img').html('<img style="width:100%" src="' + gifurl + '" />');
        $('#gif-download-btn').click(() => {downloadGIFFromURL(gifurl)});
        $('#gif-preview').show();
        $('#gif-preview-actions').show();
        $('#progress-modal').modal('show');
    }

    $('#gif-btn').click(() => {
        showProgressModal();
        $.ajax({
            method: 'POST',
            url: '/makegif',
            data: {
                "videoId": currentVideoId,
                "start": currentStart,
                "duration": currentDuration,
                "caption": $('#caption-input').val(),
                "speed": parseFloat($('#video-speed').val()),
            },
            success: (response) => {
                if (response != "Doesn't look like anything to me.") {
                    var gifurl = '/downloadgif/' + response;
                    showGIFPreview(gifurl);
                }
            }
        });
    });

    $('#video-duration').change(() => {
        //currentStart = parseFloat($('#video-slider').val());
        currentDuration = parseFloat($('#video-duration').val());
        updateTimeInputs(currentStart, currenStart + currentDuration, currentSpeed);
        revertControlStyle(false);
    });

    $('#duration-plus').click(() => {
        var currentVal = parseFloat($('#video-duration').val());
        currentDuration = currentVal + INCREMENT_VAL;
        //currentStart = parseFloat($('#video-slider').val());
        updateTimeInputs(currentStart, currentStart + currentDuration, currentSpeed);
        revertControlStyle(false);
    });

    $('#duration-minus').click(() => {
        var currentVal = parseFloat($('#video-duration').val());
        if(currentVal >= INCREMENT_VAL) {
            currentDuration = currentVal - INCREMENT_VAL;
        } else {
            currentDuration = 0;
        }
        updateTimeInputs(currentStart, currentStart + currentDuration, currentSpeed);
        revertControlStyle(false);
    });

    $('#video-start').change(() => {
        currentStart = parseFloat($('#video-start').val());
        updateTimeInputs(currentStart, currentEnd, currentSpeed);
        revertControlStyle(false);
    });

    $('#start-plus').click(() => {
        var currentVal = parseFloat($('#video-start').val());
        currentStart = currentVal + INCREMENT_VAL;
        updateTimeInputs(currentStart, currentEnd, currentSpeed);
        revertControlStyle(false);
    });

    $('#start-minus').click(() => {
        var currentVal = parseFloat($('#video-start').val());
        currentStart = (currentVal >= INCREMENT_VAL) ? (currentVal - INCREMENT_VAL) : 0;
        updateTimeInputs(currentStart, currentEnd, currentSpeed);
        revertControlStyle(false);
    });

    $('#video-end').change(() => {
        currentEnd = parseFloat($('#video-end').val());
        updateTimeInputs(currentStart, currentEnd, currentSpeed);
        revertControlStyle(false);
    });

    $('#end-plus').click(() => {
        var currentVal = parseFloat($('#video-end').val());
        currentEnd = currentVal + INCREMENT_VAL;
        updateTimeInputs(currentStart, currentEnd, currentSpeed);
        revertControlStyle(false);
    });

    $('#end-minus').click(() => {
        var currentVal = parseFloat($('#video-end').val());
        currentEnd = (currentVal > (currentStart + INCREMENT_VAL)) ? (currentVal - INCREMENT_VAL) : currentStart;
        updateTimeInputs(currentStart, currentEnd, currentSpeed);
        revertControlStyle(false);
    });

    $('#video-speed').change(() => {
       currentSpeed = parseFloat($('#video-speed').val());
       updateTimeInputs(currentStart, currentEnd, currentSpeed);
       revertControlStyle(false);
    });

    $('#bookmark-btn').click(() => {
        saveSnippet({
            title: currentVideoTitle,
            videoId: currentVideoId,
            start: currentStart,
            duration: currentDuration,
            end: currentStart + currentDuration,
            speed: currentSpeed,
            caption: $('#caption-input').val()
        });
        revertControlStyle(true);
    });

    $('#caption-input').keyup(() => {
        $('#caption-text').html($('#caption-input').val());
    });
});