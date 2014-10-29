# Castify.js

## Introduction

I know you don't have much time to read this doc, so do I (just kidding) :D, so I made it dead simple. If you answer `YES` to at least one of the following questions, seriously, you should continue reading this doc.

1. Do you have a ChromeCast device and you would like to talk to it with your browser?
2. You read the google dev and provided examples are just too confusing... because you just want to do a simple thing only
3. You just want to play a video or music but ...

.
.
.
.

Ahaaa! You are still here and reading. So I guess you are interested in what I am going to say in this doc. Please continue reading...

`Castify` is a wrapper around `Google ChromeCast sender api` which makes it a lot easier to work with ChromeCast's apis. I'm planning to add more features as time goes by, but at the moment the following things are supported.

1. Supports playback video and music
2. Supports cover image and title for both video and music
3. Supports realtime update about every state of Chorme Cast
	* Session is started
	* Session is terminated
	* Session is recovered
	* many more
4. Supports play, stop, pause and seek feature for media player
5. No more multiple callbacks.
6. Proper error handling which dead simple! :D

## Usage

Enough impressing you, let's see some actions.

First, add the following script tags right after google's api sender script.

```js
<script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js"></script>
<script src="castify.js"><script>
```

Second, use `Castify.ready()` function to register your main function.

```js
function myMain() {
	...
}

Castify.ready(function (loaded, err) {
	if (loaded) {
		myMain();
	} else {
		console.log(err);
	}	
});
``` 

`Castify.ready` makes sure that everything is ready before calling your main function.

Third, Create a session, so we can talk to Chrome Cast device. **AND THAT'S IT!**

```js
function myMain() {
	var session = Castify.createSession({
		appId: "your app id", //optional
		policy: Castify.POLICY_SAME_URL //optional
	});
	session.status = function (status) {
		...
	};
}
```

So in order to create a session, we need to create one. `Castify.createSession` is a helper function which creates a session and binds all sort of callbacks.

`createSession` function accept one argument, `options`. `options` has 2 fields, `appId` and `policy`.

`appId` is a string which you get from Google Chrome Cast once you are registering with them. **However**, if you simply want to stream something to your ChromeCast device, you don't need to have one. If you omit this field, `Castify` will use the default app id.

> **Note** You can check the Google Dev site to see the difference between default and registered app ids.

 
`policy` is also an optional field. `policy` is defined by ChormeCast api which has `3` possibilities which I wrapped them with `Castify` static variables.

> **Note** The definition of each policies are copied from Google Doc directly.

1. Castify.POLICY_RESTRICT
> No automatic connection.
	
2. Castify.POLICY_SAME_URL
> Automatically connects when the session was started with the same appId and the same page origin (regardless of tab).
    
3. Castify.POLICY_SAME_URL_SAME_TAB
> Automatically connects when the session was started with the same appId, in the same tab and page origin.

After that, we register a function to `session.status`. This function is called by `Castify` to notify your application about any changes in ChromeCast apis. Here's the list of status that you might get

| Name | Description |
|:-----|:------------|
|*Castify.SESSION_INITIALIZED*| Once session is created successfully and waits for user interaction|
|*Castify.SESSION_STARTED*    |Once a ChromeCast device is selected from plugin list|
|*Castify.SESSION_RECOVERED*  |Once the page is refreshed and an active session is found|
|*Castify.SESSION_ERROR*      |Once there is a error in session. Use `session.lastError` to exam the problem|
|*Castify.SESSION_ENDED*      |Once the session is terminated successfully|
|*Castify.MEDIA_IDLE*         |If player is in no state|
|*Castify.MEDIA_LOADED*       |Once the player receives a media to load|
|*Castify.MEDIA_RECOVERED*    |Once the player is playing and browser is refreshed|
|*Castify.MEDIA_BUFFERING*    |Once the player is buffering the stream content|
|*Castify.MEDIA_PLAYING*      |Once the player is started to play the content|
|*Castify.MEDIA_PAUSED*       |Once the player is successfully paused|
|*Castify.MEDIA_SEEK_UPDATED* |Calls every second once the stream url is being played|
|*Castify.MEDIA_STOPPED*      |Once the player is successfully stopped|
|*Castify.MEDIA_ERROR*        |Once the player is encounter an error. `lastError` can be used to retrieve the error|


So let's load a free mp4 video and play it on ChromeCast. Before doing that, we need to create media object. Media objects are created by `Castify.createMedia(options)` function. Once you created a media object you can load it by using `session.load(media)` method.

> **Note** The media stream is provided by one of the google examples. I  used `Google url shortener` to make it small enough so my script looks good.

Here's the full example

```js
function myApp() {
	var media;
	
	//create a session
	var session = Castify.createSession({
		policy: Castify.POLICY_SAME_URL
	});

	session.status = function (status) {
		Castify.log(status);
		switch(status) {
			//we are waiting until user select the device
			case Castify.SESSION_STARTED:
				//create a media object
				media = Castify.createMedia({
					//this is the stream url
                    url: "http://goo.gl/oCSFGZ",
                    type: "video/mp4",
                    cover: {
                        title: "Big Buck Bunny",
                        //this is the poster url
                        url: "http://goo.gl/E7f5KI"
                    }
                });	
                //load the media object
				session.load(media);		
				break;
				
			default:
				//do nothing
		}
	};
}

Castify.ready(function (ready, error) {
	if (ready) {
		myApp();
	} else {
		console.log(error);
	}
});
```


### Method References

#### Castify

Castify has 3 class methods

1. Castify.createSession(options) which creates a session object
2. Castify.createMedia(options) which creates a media object
3. Castify.log(status) which prints a proper message by using `console.log`


#### Session

The following are all public available methods for `session` object.

| Method name | Description |
|:--|:--|
|load(media)|Loads the media object. media object can be created by `Castify.createMedia`|
|play()|It plays a paused or loaded media|
|paused()|It pauses a playing media|
|stop()|It stops the playing or paused media|
|seek(value)|it sets a new value for forwarding or backwarding media content|
|mute(enable)|It mutes a volume by passing a boolean variable|
|end|It terminates session which cause ChromeCast to terminate the app|
|status(status)|It needs to be set and will be called by `Castify.Session` object directly |
