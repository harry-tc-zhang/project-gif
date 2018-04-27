var searchResultTemplate = undefined;
var bookmarkTableTemplate = undefined;

// Load and set up YouTube iFrame Player API
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var playSecs = 0;
var snippetPlaying = false;
var updateMaxSecs = false;

var youtubePlayer = undefined;

var savedSnippets = [];
var currentStart = 0;
var currentDuration = 2;

var updateSliderVal = (val) => {
    $('#video-slider').val(currentStart);
    $('#video-slider-display').val(val + 's');
}

function onPlayerStateChange(event) {
    console.log(event);
    if (event.data == 1) {
        if (updateMaxSecs) {
            console.log(youtubePlayer.getDuration());
            $("#video-slider").attr('max', parseInt(youtubePlayer.getDuration()));
            updateSliderVal(currentStart);
            $('#video-duration').val(currentDuration);
        }
        if (snippetPlaying) {
            setTimeout(() => {
                youtubePlayer.pauseVideo();
            }, playSecs * 1000);
            snippetPlaying = false;
        }
    }
}

function onYouTubeIframeAPIReady() {
    var wrapperWidth = $('#youtube-player-wrapper').width() - 20;
    var wrapperHeight = wrapperWidth / 16.0 * 9.0;
    youtubePlayer = new YT.Player('youtube-player', {
        width: wrapperWidth,
        height: wrapperHeight,
        events: {
            onReady: () => {youtubePlayer.mute();},
            onStateChange: onPlayerStateChange
        },
        playerVars: {
            controls: 0,
            disablekb: 1,
            cc_load_policy: 3,
            iv_load_policy: 3
        }
    });
}

var currentVideoId = '';
var currentVideoTitle = '';

var loadVideo = (videoId, videoTitle, cb=undefined) => {
    youtubePlayer.loadVideoById({
        'videoId': videoId,
        'suggestedQuality': 'large',
        'endSeconds': 0
    });
    currentVideoId = videoId;
    currentVideoTitle = videoTitle;
    currentStart = 0;
    updateMaxSecs = true;
    youtubePlayer.playVideo();
    setTimeout(() => {
        youtubePlayer.stopVideo();
        if(cb) {
            cb();
        }
    }, 1000);
}

var playSavedSnippet = (snippet) => {
    youtubePlayer.loadVideoById({
        'videoId': snippet.videoId,
        'suggestedQuality': 'large',
        'endSeconds': 0
    });
    updateMaxSecs = true;
    snippetPlaying = true;
    currentVideoId = snippet.videoId;
    currentStart = snippet.start;
    currentDuration = snippet.duration;
    $('#caption-input').val(snippet.caption);
    playVideoSegment(snippet.videoId, snippet.title, snippet.start, snippet.duration);
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
            loadVideo($(event.currentTarget).attr('videoId'), $(event.currentTarget).attr('videoTitle'));
        });

        var bookmarkTopOffet = $('#bookmark-section')[0].getBoundingClientRect().top;
        console.log(bookmarkTopOffet);
        $('#bookmark-section').height($(window).height() - bookmarkTopOffet);

        var searchResultTopOffset = $('#search-results')[0].getBoundingClientRect().top;
        $('#search-results').height($(window).height() - searchResultTopOffset);
    });
};

var playVideoSegment = (videoId, videoTitle, start, duration) => {
    if(videoId != currentVideoId) {
        loadVideo(videoId, videoTitle, () => {
            console.log('here is the callback ' + start + ' ' + duration);
            youtubePlayer.seekTo(start);
            snippetPlaying = true;
            playSecs = duration;
            youtubePlayer.playVideo();
        });
    } else {
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
    console.log(linktag);
    linktag.click();
    setTimeout(() => {linktag.remove()}, 500);
}

$(document).ready(() => {
    searchResultTemplate = Handlebars.compile($('#search-result-template').html());
    bookmarkTableTemplate = Handlebars.compile($('#bookmark-table-template').html());

    gapi.load('client', APILoaded);

    $('#play-btn').click(function () {
        playVideoSegment(currentVideoId, currentVideoTitle, currentStart, currentDuration);
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
                "caption": $('#caption-input').val()
            },
            success: (response) => {
                if (response != "Doesn't look like anything to me.") {
                    var gifurl = '/downloadgif/' + response;
                    showGIFPreview(gifurl);
                    /*
                    var linktag = document.createElement('a');
                    linktag.setAttribute('href', gifurl);
                    linktag.setAttribute('download', response);
                    console.log(linktag);
                    linktag.click();
                    */
                }
                //$('#progress-modal').modal('hide');
            }
        });
    });

    $('#video-slider').change(() => {
        console.log($('#video-slider').val());
        currentStart = parseFloat($('#video-slider').val());
        currentDuration = parseFloat($('#video-duration').val());
        playVideoSegment(currentVideoId, currentVideoTitle, currentStart, currentDuration);
    });

    $('#video-slider').on('input', () => {
       $('#video-slider-display').val($('#video-slider').val() + 's');
    });

    $('#duration-plus').click(() => {
        var currentVal = parseFloat($('#video-duration').val());
        $('#video-duration').val(currentVal + 1);
        currentStart = parseFloat($('#video-slider').val());
        currentDuration = parseFloat($('#video-duration').val());
        playVideoSegment(currentVideoId, currentVideoTitle, currentStart, currentDuration);
    });

    $('#duration-minus').click(() => {
        var currentVal = parseFloat($('#video-duration').val());
        if(currentVal > 0) {
            $('#video-duration').val(currentVal - 1);
        }
        currentStart = parseFloat($('#video-slider').val());
        currentDuration = parseFloat($('#video-duration').val());
        playVideoSegment(currentVideoId, currentVideoTitle, currentStart, currentDuration);
    });

    $('#video-duration').change(() => {
        currentStart = parseFloat($('#video-slider').val());
        currentDuration = parseFloat($('#video-duration').val());
        playVideoSegment(currentVideoId, currentVideoTitle, currentStart, currentDuration);
    });

    $('#bookmark-btn').click(() => {
        saveSnippet({
            title: currentVideoTitle,
            videoId: currentVideoId,
            start: currentStart,
            duration: currentDuration,
            caption: $('#caption-input').val()
        });
    });

    $('#caption-preview').width($('#caption-preview').parent().width());
    $('#caption-preview').height($('#caption-preview').parent().height());

    $('#caption-input').keyup(() => {
        $('#caption-text').html($('#caption-input').val());
    })
});