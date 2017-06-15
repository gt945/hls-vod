$(function() {
	var $videoContainer = $('#video-container');
	var $audioPlayer = $('audio');
	var $audioContainer = $('#audio-container');
	var $previewImage = $('#preview-image');
	var $playerLoading = $('#player-loading');

	// State
	var mediaElement;
	var loading = false;
	var activeTranscodings = [];

	function audioStop() {
		$audioPlayer.prop('controls', false);
		$audioPlayer[0].pause();
		$audioContainer.hide();
	}

	function videoStop() {
		if (mediaElement) {
			mediaElement.pause();
			$videoContainer.hide();
		}
	}
	
	function imageShow(path, name) {
		window.open(path);
	}

	function audioPlay(path, name) {
		$('#audio-song-name').text(name);
		
		videoStop();
		audioStop();
		hidePreviewImage();

		$audioPlayer.prop('controls', true);
		$audioContainer.show();

		$audioPlayer[0].src = path;
		$audioPlayer[0].load();
		$audioPlayer[0].play();
	}

	function videoPlay(path) {
		audioStop();
		hidePreviewImage();

		$videoContainer.show();

		if (mediaElement) {
			mediaElement.pause();
			
			mediaElement.setSrc(path);
			mediaElement.play();
		}
		else {
			var $video = $('#video');
			$video[0].src = path;
			$video.mediaelementplayer({
				features: ['playpause', 'gesture', 'current', 'progress', 'duration', 'volume', 'fullscreen'],
				clickToPlayPause: false,
				hls: {
					path : 'hls.js/dist/hls.js',
					startPosition : 0,
					debug: false,
					autoStartLoad: true
				},
				success: function (mediaElement2, domObject) {
					mediaElement = mediaElement2;
					mediaElement.play();
				},
				error: function (mediaeElement, err) { 
					console.log('Error loading media element');
				}
			});
		}
	}

	function hidePreviewImage() {
		$playerLoading.fadeOut(200);
		$previewImage.hide();
	}

	function showPreviewImage(relPath) {
		var path = '/thumbnail' + relPath;
		$previewImage.attr('src', path).fadeIn(200);
		$playerLoading.fadeIn(200);
		$previewImage.on('load', function() {
			$playerLoading.fadeOut(200);
		});
		videoStop();
		audioStop();
	}
	
	function updateActiveTranscodings() {
		$('#transcoders').text('Active transcoders: ' + activeTranscodings.length).fadeIn(200);
		setTimeout(function() {
			$('#transcoders').fadeOut(200);
		}, 5000);
	}
	

	function browseTo(path) {
		if (loading) return;
		loading = true;

		var $fileList = $('#file-list');
		
		if (window.history && window.history.pushState) {
			window.history.pushState('forward', null, './#view');
			$(window).on('popstate', function() {
				$("#back").click();
			});
		}
	
		$.ajax('/browse' + path, {
			success: function(data) {
				loading = false;

				$('#dir-header').text(data.cwd);

				$fileList.empty();

				var back = $('<li id="back"/>');
				back.html('..');
				back.click(function() {
					browseTo(data.cwd != '/' ? path + '/..' : path);
				});
				$fileList.append(back);

				$.each(data.files, function(index, file) {
					var elem = $('<li/>');
					elem.text(file.name);

					switch(file.type) {
					case 'video':
						elem.click(function() {
							if (activeTranscodings.length == 0 || confirm('Play video? (Will delete any previous encoding)')) {
								videoPlay(file.path);
							}
						});
						break;

					case 'audio':
						elem.click(function() {
							audioPlay(file.path, file.name);
						});
						break;
					case 'image':
						elem.click(function() {
							imageShow(file.path, file.name);
						});
						break;
					case 'directory':
						elem.click(function() {
							browseTo(file.path);
						});
						break;
					
						default:
					}

					if (file.error) {
						elem.attr('title', file.errorMsg);
					}

					if (file.type == 'video' || file.type == 'audio') {
						var rawLink = $('<a style="color: inherit; margin-left: 1em; padding: 1em" />').attr('href', '/raw' + file.relPath).text('RAW');
						rawLink.click(function(event) {
							event.stopPropagation();
						});
						elem.append(rawLink);
						var delLink = $('<a style="color: inherit; margin-left: 1em; padding: 1em" />').attr('href', '/del' + file.relPath).text('DEL');
						delLink.click(function(event) {
							if (window.confirm("Are you sure?")) {
								$.get(this.href);
							}
							return false;
						});
						elem.append(delLink);
					}

					if (file.type == 'video') {
						var thumbLink = $('<span style="padding: 1em" />').text('Preview');
						thumbLink.click(function(event) {
							event.stopPropagation();
							showPreviewImage(file.relPath);
						});
						elem.append(thumbLink);
					}

					$('#file-list').append(elem);
				});
			}
		});
	}
	

	$('#settings-btn').click(function() {
		$('#settings-container').fadeToggle();
	});

	$('#settings-container select[name=videoWidth]').change(function() {
		$.ajax('/settings', {
			data: {
				videoWidth: $(this).val()
			},
			type: 'POST',
			error: function() {
				alert('Failed');
			}
		});
	});

        $('#settings-container select[name=videoQuality]').change(function() {
		$.ajax('/settings', {
			data: {
				videoQuality: $(this).val()
			},
			type: 'POST',
			error: function() {
				alert('Failed');
			}
		});
	});

	$.get('/settings', function(data) {
		$('#settings-container select[name=videoWidth]').val(data.videoWidth);
		$('#settings-container select[name=videoQuality]').val(data.videoQuality);
	});
	
	var url = $(location).attr('href');
	var param = url.split('?path=');
	if (param.length == 2) {
		browseTo(param[1]);
	} else {
		browseTo('/');
	}
	
	$videoContainer.hide();
	$audioContainer.hide();
	$previewImage.hide();
	$playerLoading.hide();
});
