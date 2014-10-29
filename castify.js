/**
 * Created by Ali Najafizadeh
 * Castify.js 0.1.0
 * https://github.com/alinz/Castify.js.git
 *
 * License: MIT
 */

function Castify() {}

Castify.VERSION = "0.1.0";

Castify.__counter = (function () {
    var internalCount = 0;
    return function () {
       return internalCount++;
    };
}());

Castify.SESSION_INITIALIZED         = Castify.__counter();
Castify.SESSION_STARTED             = Castify.__counter();
Castify.SESSION_RECOVERED           = Castify.__counter();
Castify.SESSION_ERROR               = Castify.__counter();
Castify.SESSION_ENDED               = Castify.__counter();

Castify.MEDIA_IDLE                  = Castify.__counter();
Castify.MEDIA_LOADED                = Castify.__counter();
Castify.MEDIA_RECOVERED             = Castify.__counter();
Castify.MEDIA_BUFFERING             = Castify.__counter();
Castify.MEDIA_PLAYING               = Castify.__counter();
Castify.MEDIA_PAUSED                = Castify.__counter();
Castify.MEDIA_SEEK_UPDATED          = Castify.__counter();
Castify.MEDIA_STOPPED               = Castify.__counter();
Castify.MEDIA_ERROR                 = Castify.__counter();

Castify.MEDIA_VOLUME_CHNAGED        = Castify.__counter();
Castify.MEDIA_VOLUME_MUTED          = Castify.__counter();
Castify.MEDIA_VOLUME_UNMUTED        = Castify.__counter();

Castify.POLICY_SAME_URL_SAME_TAB    = Castify.__counter();
Castify.POLICY_SAME_URL             = Castify.__counter();
Castify.POLICY_RESTRICT             = Castify.__counter();

Castify.log = function (status) {
    switch (status) {
        case Castify.SESSION_INITIALIZED:
            status = "SESSION_INITIALIZED";
            break;
        case Castify.SESSION_STARTED:
            status = "SESSION_STARTED";
            break;
        case Castify.SESSION_RECOVERED:
            status = "SESSION_RECOVERED";
            break;
        case Castify.SESSION_ERROR:
            status = "SESSION_ERROR";
            break;
        case Castify.SESSION_ENDED:
            status = "SESSION_ENDED";
            break;
        case Castify.MEDIA_IDLE:
            status = "MEDIA_IDLE";
            break;
        case Castify.MEDIA_LOADED:
            status = "MEDIA_LOADED";
            break;
        case Castify.MEDIA_RECOVERED:
            status = "MEDIA_RECOVERED";
            break;
        case Castify.MEDIA_BUFFERING:
            status = "MEDIA_BUFFERING";
            break;
        case Castify.MEDIA_PLAYING:
            status = "MEDIA_PLAYING";
            break;
        case Castify.MEDIA_PAUSED:
            status = "MEDIA_PAUSED";
            break;
        case Castify.MEDIA_SEEK_UPDATED:
            status = "MEDIA_SEEK_UPDATED";
            break;
        case Castify.MEDIA_STOPPED:
            status = "MEDIA_STOPPED";
            break;
        case Castify.MEDIA_ERROR:
            status = "MEDIA_ERROR";
            break;
        case Castify.MEDIA_VOLUME_CHNAGED:
            status = "MEDIA_VOLUME_CHNAGED";
            break;
        case Castify.MEDIA_VOLUME_MUTED:
            status = "MEDIA_VOLUME_MUTED";
            break;
        case Castify.MEDIA_VOLUME_UNMUTED:
            status = "MEDIA_VOLUME_UNMUTED";
            break;
        default:
            status = "UNKNOWN_STATUS (" + status + ")";
    }
    console.log(status);
};

Castify.ready = function (cb) {
    var ref;
    if (window['__onGCastApiAvailable']) {
        ref = window['__onGCastApiAvailable'];
    }

    window['__onGCastApiAvailable'] = function(loaded, errorInfo) {
        if (ref) {
            ref(loaded, errorInfo);
        }
        cb(loaded, errorInfo);
    };
};

Castify.Session = function (appId, policy) {
    var that = this;

    that._appId = that._parseAppId(appId);
    that._policy = that._parsePolicy(policy);

    that._chromeCastSession = null;
    that.currentMedia = null;

    that.lastStatus = -1;
    that.lastError = null;

    that._intervalTimerId = 0;
    that.duration = { currentTime: 0, totalTime: 0 };

    that._init();
};

Castify.Session.prototype = {
    constructor: Castify.Session,
    _setStatus: function (status) {
        var that = this;
        if ((that.lastStatus == Castify.SESSION_RECOVERED && status == Castify.SESSION_ERROR) ||
            (status == Castify.SESSION_ERROR && that._chromeCastSession)) {
            //ignore this error
            that.lastStatus = -1;
            return;
        }

        if (status == Castify.SESSION_ENDED) {
            that.currentMedia = null;
            that._chromeCastSession = null;
            that._appId = null;
            that._policy = null;
            that.lastError = null;

            clearInterval(that._intervalTimerId);
            if (that.duration) {
                that.duration.currentTime = 0;
                that.duration.totalTime = 0;
            }
        }

        that.status(status);
        that.lastStatus = status;
    },
    _sessionActiveStatus: function (isAlive) {
        if (!isAlive) {
            this._setStatus(Castify.SESSION_ENDED);
        }
    },
    _parseAppId: function (appId) {
        if (typeof appId === "undefined") {
            appId = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
        }
        return appId;
    },
    _parsePolicy: function (policy) {
        var that = this;
        switch (policy) {
            case Castify.POLICY_RESTRICT: //no auto join
                that._policy = chrome.cast.AutoJoinPolicy.PAGE_SCOPED;
                break;
            case Castify.POLICY_SAME_URL_SAME_TAB: //same appID, same URL, same tab
                that._policy = chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED;
                break;
            case Castify.POLICY_SAME_URL: //same appID and same origin URL
                that._policy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;
                break;
            default:
                that._policy = chrome.cast.AutoJoinPolicy.PAGE_SCOPED;
        }
    },
    _init: function () {
        var that = this,
            sessionRequest = new chrome.cast.SessionRequest(that._appId),
            apiConfig = new chrome.cast.ApiConfig(
                sessionRequest,
                //sessionListener
                function (chromeCastSession) {
                    that._chromeCastSession = chromeCastSession;
                    chromeCastSession.addUpdateListener(that._sessionActiveStatus.bind(that));
                    that._setStatus(Castify.SESSION_RECOVERED);
                    if (chromeCastSession.media && chromeCastSession.media.length > 0) {
                        that.currentMedia = chromeCastSession.media[0];
                        that._setStatus(Castify.MEDIA_RECOVERED);
                        that._seekUpdater();
                    }
                },
                //receiverListener
                function (chromeCastEvent) {
                    if (chromeCastEvent === chrome.cast.ReceiverAvailability.AVAILABLE) {
                        chrome.cast.requestSession(function (chromeCastSession) {
                            that._chromeCastSession = chromeCastSession;
                            that._setStatus(Castify.SESSION_STARTED);
                            chromeCastSession.addUpdateListener(that._sessionActiveStatus.bind(that));
                        },
                        function (err) {
                            that.lastError = err;
                            that._setStatus(Castify.SESSION_ERROR);
                        });
                    } else {
                        //not connected.
                    }
                },
                that._policy
            );

        chrome.cast.initialize(
            apiConfig,
            //onInitialSuccess
            function () {
                that._setStatus(Castify.SESSION_INITIALIZED);
            },
            //onInitialError
            function (err) {
                that.lastError = err;
                that._setStatus(Castify.SESSION_ERROR);
            }
        );
    },
    _seekUpdater: function () {
        var that = this;
        that._intervalTimerId = setInterval(function () {
            if (that.currentMedia && that.currentMedia.media && that.currentMedia.media.duration != null) {
                var cTime = that.currentMedia.getEstimatedTime();
                that.duration.currentTime = cTime;
                that.duration.totalTime = that.currentMedia.media.duration;
                that._setStatus(Castify.MEDIA_SEEK_UPDATED);
            }
            else {
                if (that._intervalTimerId) {
                    clearInterval(that._intervalTimerId);
                }
            }
        }, 1000);
    },
    load: function (media) {
        var that = this;
        if (that._chromeCastSession) {
            that._setStatus(Castify.MEDIA_BUFFERING);
            that._chromeCastSession.loadMedia(
                media.request,
                function (chromeCastMedia) {
                    that.currentMedia = chromeCastMedia;
                    that._setStatus(Castify.MEDIA_LOADED);

                    chromeCastMedia.addUpdateListener(function (value) {
                        if (value) {
                            that._setStatus(Castify.MEDIA_PLAYING);

                            that._seekUpdater();
                        }
                    });
                },
                function (err) {
                    that.currentMedia = null;
                    that.lastError = err;
                    that._setStatus(Castify.MEDIA_ERROR);
                }
            );
        }
    },
    play: function () {
        var that = this;
        that.currentMedia.play(
            null,
            function () {
                that._setStatus(Castify.MEDIA_PLAYING);
                that._seekUpdater();
            },
            function (err) {
                that.lastError = err;
                that._setStatus(Castify.MEDIA_ERROR);
            }
        );
    },
    stop: function () {
        var that = this;
        that.currentMedia.stop(
            null,
            function () {
                that._setStatus(Castify.MEDIA_STOPPED);
            },
            function (err) {
                that.lastError = err;
                that._setStatus(Castify.MEDIA_ERROR);
            }
        );
    },
    pause: function () {
        var that = this;
        that.currentMedia.pause(
            null,
            function () {
                clearInterval(that._intervalTimerId);
                that._setStatus(Castify.MEDIA_PAUSED);
            },
            function (err) {
                that.lastError = err;
                that._setStatus(Castify.MEDIA_ERROR);
            }
        );
    },
    seek: function (value) {
        var that = this,
            seekRequest = new chrome.cast.media.SeekRequest();

        clearInterval(this._intervalTimerId);

        seekRequest.currentTime = value * that.currentMedia.media.duration / 100;
        currentMedia.seek(
            seekRequest,
            function () {
                that._seekUpdater();
            },
            function (err) {
                that.lastError = err;
                that._setStatus(Castify.MEDIA_ERROR);
            }
        );
    },
    mute: function (enabled) {
        chrome.cast.Volume(null, !!enabled);
        this._setStatus(enabled? Castify.MEDIA_VOLUME_MUTED : Castify.MEDIA_VOLUME_UNMUTED);
    },
    end: function () {
        var that = this;
        if (that._chromeCastSession) {
            that._chromeCastSession.stop(
                //onSuccess
                function () {
                    //No need to call 'Castify.SESSION_ENDED' explicitly. Since _sessionActiveStatus method
                    //will be called once the termination is done.
                    //that._setStatus(Castify.SESSION_ENDED);
                },
                //onError
                function (err) {
                    this.lastError = err;
                    that._setStatus(Castify.SESSION_ERROR);
                }
            );
        }
    },
    status: function(status) {
        Castify.log(status);
        if (status == Castify.SESSION_ERROR) {
            console.log(this.lastError);
        }
    }
};

/**
 * create or recover session
 * {
 *      appId: "",
 *      policy: ""
 * }
 * @param options
 * @returns {Castify.Session}
 */
Castify.createSession = function (options) {
    options = options || {};
    return new Castify.Session(
        options.appId,
        options.policy
    );
};

/**
 *
 * @param url [Required] is a string contains url stream to media content
 * @param type [Required] is a string that defines type of stream. possible values are audio/mp3 video/mp4
 * @param cover [Optional] is an object contains url and title fields
 * @param subtitles [Optional] is and array of subtitle object. Each subtitle object contains name, language and url
 * @param autoPlay [Optional] is a boolean value indicating whether content needs to play upon load or not.
 * @param startTime [Optional] is an integer value indicates the start point of media
 *
 */
Castify.Media = function (url, type, cover, subtitles, autoPlay, startTime) {
    var mediaInfo = new chrome.cast.media.MediaInfo(url);
    mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;

    if (cover) {
        if (cover.title) {
            mediaInfo.metadata.title = cover.title;
        }
        if (cover.url) {
            mediaInfo.metadata.images = [
                { url: cover.url }
            ];
        }
    }

    mediaInfo.contentType = type;

    if (typeof autoPlay === "undefined") {
        autoPlay = true;
    }

    if (typeof startTime === "undefined") {
        startTime = 0;
    }

    var request = new chrome.cast.media.LoadRequest(mediaInfo);

    request.autoplay = autoPlay;
    request.currentTime = startTime;

    this.request = request;
};

Castify.createMedia = function (options) {
    options = options || {};
    return new Castify.Media(
        options.url,
        options.type,
        options.cover,
        options.subtitles,
        options.autoPlay,
        options.startTime
    );
};
