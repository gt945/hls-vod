var childProcess = require('child_process');
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

// 3rd party
var express = require('express');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser');
var socketIo = require('socket.io');
var srt2vtt = require('srt-to-vtt');
var ass2vtt = require('ass-to-vtt');
var dlnacasts = require('dlnacasts')({listenPort:3333})

// Parameters
var listenPort = 4040;
var audioBitrate = 128;
var targetWidth = 640;
var targetQuality = 23
var searchPaths = [];
var rootPath = null;
var transcoderPath = 'ffmpeg';
var thumbnailerPath = 'ffmpegthumbnailer';
var probePath = 'ffprobe';
var debug = false;
var cert = null;
var key = null;
var videoExtensions = ['.mp4','.3gp2','.3gp','.3gpp', '.3gp2','.amv','.asf','.avs','.dat','.dv', '.dvr-ms','.f4v','.m1v','.m2p','.m2ts','.m2v', '.m4v','.mkv','.mod','.mp4','.mpe','.mpeg1', '.mpeg2','.divx','.mpeg4','.mpv','.mts','.mxf', '.nsv','.ogg','.ogm','.mov','.qt','.rv','.tod', '.trp','.tp','.vob','.vro','.wmv','.web,', '.rmvb', '.rm','.ogv','.mpg', '.avi', '.mkv', '.wmv', '.asf', '.m4v', '.flv', '.mpg', '.mpeg', '.mov', '.vob', '.ts', '.webm', '.iso'];
var audioExtensions = ['.mp3', '.aac', '.m4a'];
var imageExtensions = ['.jpg', '.png', '.bmp', '.jpeg', '.gif'];
var subtitleExtensions = ['.srt', '.ass', '.vtt'];
var io = null;
var isHttps = false;
var tsDuration = 10;

function convertSecToTime(sec){
	var date = new Date(null);
	date.setSeconds(sec);
	var result = date.toISOString().substr(11, 8);
	var tmp=(sec+"").split('.');
	if(tmp.length == 2){
		result+='.' + tmp[1];
	}
	return result;
}

function startWSTranscoding(file, offset, speed, info, socket){
	var atempo = [];
	var setpts = 1.0;
	var fps = 30;
	switch(speed) {
		case 16:
			atempo.push('atempo=2');
			setpts = setpts / 2;
		case 8:
			atempo.push('atempo=2');
			setpts = setpts / 2;
		case 4:
			atempo.push('atempo=2');
			setpts = setpts / 2;
		case 2:
			atempo.push('atempo=2');
			setpts = setpts / 2;
			fps = 50;
			break;
		case 1:
			break;
		case 1.25:
			setpts = setpts / speed;
			atempo.push('atempo=' + speed);
			break;
		case 1.56:
			setpts = 0.64;
			atempo.push('atempo=' + 1.5625);
		default:
			break;
	}

	switch(targetWidth) {
	case 240:
		audioBitrate = 32;
		fps = 25;
		break;
	case 320:
		audioBitrate = 64;
		break;
	default:
		audioBitrate = 128;
		break;
	}
	var atempo_opt = atempo.length ? atempo.join(',') : 'anull';
	var setpts_opt = setpts.toFixed(4);
	var startTime = convertSecToTime(offset);
	var gop = fps;
	var seq = 0;
	var ack = 0;
	var pause = false;
	var queue = [];
	var args = [
		'-ss', startTime,
		'-i', file, '-sn', '-async', '0',
		'-af', atempo_opt,
		'-acodec', 'aac', '-b:a', audioBitrate + 'k', '-ar', '44100', '-ac', '2',
		'-vf', 'scale=min(' + targetWidth + '\\, iw):-2,setpts=' + setpts_opt + '*PTS', '-r',  fps,
		'-vcodec', 'libx264', '-profile:v', 'high', '-preset:v', 'veryfast', '-tune', 'zerolatency', '-crf', targetQuality, '-g', gop,
		'-x264opts', 'level=3.0', '-pix_fmt', 'yuv420p',
		'-threads', '0', '-flags', '+global_header', /*'-v', 'error', '-map', '0',*/
		'-f', 'mp4', '-reset_timestamps', '1', '-movflags', 'empty_moov+frag_keyframe+default_base_moof', 'pipe:1'
	];
	var encoderChild = childProcess.spawn(transcoderPath, args, {env: process.env});

	console.log('[' + socket.id + '] Spawned encoder instance');

	if (debug)
		console.log(transcoderPath + ' ' + args.join(' '));

	var stop = function(){
		if (!pause) {
			pause = true;
			if (debug)
				console.log('[' + socket.id + '] Pause');
			encoderChild.kill('SIGSTOP');
		}
	}

	var start = function(){
		if (pause) {
			pause = false;
			if (debug)
				console.log('[' + socket.id + '] Continue');
			encoderChild.kill('SIGCONT');
		}
	}

	var quit = function(){
		if (debug)
			console.log('[' + socket.id + '] ' + 'Quit');
		start();
		encoderChild.kill();
		setTimeout(function() {
			encoderChild.kill('SIGKILL');
		}, 5000);
	}

	var check_ack = function(){
		var wait = seq - ack > 2048 ? true : false;
		if (wait && !pause) {
			stop();
		} else if (!wait) {
			if (pause) {
				start();
			}
			if (queue.length) {
				socket.emit('data', queue.shift());
			}
		}
	}

	var re = /frame=\s*(\d*).*fps=(\d*).*q=([\d\.]*).*size=\s*(\d*kB).*time=([\d\.\:]*).*bitrate=\s*([\d\.]*\S*).*speed=([\d\.x]*)/i;
	encoderChild.stderr.on('data', function(data) {
		if (debug)
			console.log(data.toString());
		var match = data.toString().match(re);
		if (match && match.length == 8) {
			var verbose = {};
			verbose['frame'] = match[1];
			verbose['fps'] = match[2];
			verbose['q'] = match[3];
			verbose['size'] = match[4];
			verbose['time'] = match[5];
			verbose['bitrate'] = match[6];
			verbose['speed'] = match[7];
			socket.emit('verbose', verbose);
			if (debug)
				console.log('[' + socket.id + '] seq: ' + seq + ' ack: ' + ack);
		} else {
			console.log(data.toString());
		}
	});

	encoderChild.stdout.on('data', function(data) {
		queue.push({seq : seq++, buffer : data});
		//socket.emit('data', {seq : seq++, buffer : data});
		check_ack();
	});

	encoderChild.on('exit', function(code) {
		if (code == 0) {
			socket.emit('eos');
			console.log('[' + socket.id + '] Encoder completed');
		} else {
			console.log('[' + socket.id + '] Encoder exited with code ' + code);
		}
	});

	socket.on('ack',function(data){
		ack = data;
		check_ack();
	});

	socket.on('disconnect', function(reason){
		console.log('[' + socket.id + '] Disconnect, ' + reason);
		quit();
	});

	socket.on('error', function(){
		console.log('[' + socket.id + '] Error');
		quit();
	});

	socket.on('pause', function(){
		stop();
	});

	socket.on('continue', function(){
		start();
	});

}

function probeMediainfo(file) {
	var args = [
		'-v', '0', '-print_format', 'json', '-show_format', '-show_streams', file
	];
	var probeChild = childProcess.spawnSync(probePath, args);
	return probeChild.stdout.toString();
}


function handleWSMp4Request(requestPath, offset, speed, socket) {
	var filePath = Buffer.from(decodeURIComponent(requestPath), 'base64').toString('utf8');
	if (debug)
		console.log('WS MP4 request: ' + requestPath);

	if (filePath) {
		filePath = path.join('/', filePath);
		filePath = path.join(rootPath, filePath);
		startWSTranscoding(filePath, offset, speed, info, socket);
		var json = probeMediainfo(filePath);
		try {
			var info = JSON.parse(json);
			socket.emit('mediainfo', info);
		} catch (err) {
			console.log('[' + socket.id + '] ' + json);
		}
	}
}

function handleM3U8Request(request, response)
{
	var filePath = Buffer.from(decodeURIComponent(request.params[0]), 'base64').toString('utf8');
	var fsPath = path.join(rootPath, filePath);
	if (fs.existsSync(fsPath)) {
		response.writeHead(200);
		var json = probeMediainfo(fsPath);
		try {
			var info = JSON.parse(json);
			if (info && info.format && info.format.duration) {
				response.write('#EXTM3U\n');
				response.write('#EXT-X-VERSION:3\n');
				response.write('#EXT-X-MEDIA-SEQUENCE:0\n');
				response.write('#EXT-X-ALLOW-CACHE:YES\n');
				response.write('#EXT-X-PLAYLIST-TYPE:VOD\n');
				response.write('#EXT-X-TARGETDURATION: '+ tsDuration + '\n');
				for ( var t = 0; t < info.format.duration; t += tsDuration) {
					var currDuration = Math.min(tsDuration , info.format.duration - t);
					response.write('#EXTINF:' + currDuration + '\n');
					response.write( '/'+ request.params[0] + '.ts?start=' + t + '&duration=' + currDuration +'\n');
				}
				response.write('#EXT-X-ENDLIST\n');
			}
		} catch (err) {
			console.log('error');
		}
		response.end();
	} else {
		response.writeHead(404);
		response.end();
	}
}

function handleTsSegmentRequest(request, response)
{
	var filePath = Buffer.from(decodeURIComponent(request.params[0]), 'base64').toString('utf8');
	var fsPath = path.join(rootPath, filePath);
	if (fs.existsSync(fsPath) && request.query.start && request.query.duration) {
		var startTime = convertSecToTime(request.query.start);
		var durationTime = convertSecToTime(request.query.duration);
		var fps = 30;
		var args = [
			'-ss', startTime, '-t', durationTime,
			'-i', fsPath, '-sn', '-async', '0',
			'-acodec', 'aac', '-b:a', audioBitrate + 'k', '-ar', '44100', '-ac', '2',
			'-vf', 'scale=min(' + targetWidth + '\\, iw):-2', '-r', fps,
			'-vcodec', 'libx264', '-profile:v', 'baseline', '-preset:v' ,'veryfast', '-tune', 'zerolatency', '-crf', targetQuality, '-g', fps,
			'-x264opts', 'level=3.0', '-pix_fmt', 'yuv420p',
			'-threads', '0', '-v', '0', '-flags', '-global_header', /*'-map', '0', '-v', 'error',*/
			'-f', 'mpegts', '-muxdelay', '0', 'pipe:1'
		];

		var encoderChild = childProcess.spawn(transcoderPath, args, {env: process.env});

		console.log('Spawned encoder instance');

		if (debug)
			console.log(transcoderPath + ' ' + args.join(' '));

		response.writeHead(200);

		if (debug) {
			encoderChild.stderr.on('data', function(data) {
				console.log(data.toString());
			});
		}

		encoderChild.stdout.on('data', function(data) {
			response.write(data);
		});

		encoderChild.on('exit', function(code) {
			if (code == 0) {
				console.log('Encoder completed');
			}
			else {
				console.log('Encoder exited with code ' + code);
			}
			response.end();
		});

		request.on('close', function() {
			encoderChild.kill();
			setTimeout(function() {
				encoderChild.kill('SIGKILL');
			}, 5000);
		});
	} else {
		response.writeHead(404);
		response.end();
	}
}

function findSubtitles(filepath)
{
	var dir = path.dirname(filepath);
	var videofile = path.basename(filepath).replace(/\.[^/.]+$/, '')+'.';
	files = fs.readdirSync(dir);
	for (i in files) {
		var file = files[i];
		var extName = path.extname(file).toLowerCase();
		if (subtitleExtensions.indexOf(extName) != -1) {
			if (file.startsWith(videofile)) {
				return path.join(dir, file);
			}
		}
	}
	return null;
}

function handleSubtitlesRequest(request, response) {
	var filePath = Buffer.from(decodeURIComponent(request.params[0]), 'base64').toString('utf8');
	var fsPath = path.join(rootPath, filePath);
	var find = false;
	response.writeHead(200, {'Content-Type': 'text/vtt'});
	var subtitlePath = findSubtitles(fsPath);
	if (subtitlePath) {
		find = true;
		var ext = path.extname(subtitlePath);
		switch(ext) {
			case '.ass':
				fs.createReadStream(subtitlePath)
				.pipe(ass2vtt())
				.pipe(response);
				break;
			case '.srt':
				fs.createReadStream(subtitlePath)
				.pipe(srt2vtt())
				.pipe(response);
				break;
			case '.vtt':
				response.sendFile(subtitlePath);
				break;
			default:
				console.log('Wrong Subtitles' + ext);
				break;
		}
	}
	if (!find) {
		console.log('No Subtitles');
		response.end();
	}
}

function handleRawRequest(request, response) {
	var requestPath = Buffer.from(decodeURIComponent(request.params[0]), 'base64').toString('utf8');
	var browsePath = path.join('/', requestPath);
	var fsPath = path.join(rootPath, browsePath);
	if (fs.existsSync(fsPath)) {
		response.sendFile(fsPath);
	} else {
		response.writeHead(404);
		response.end();
	}
}

function decodeThumbnailFrame(request, response, file, offset) {
	var startTime = convertSecToTime(offset);

	var args = [
		'-ss', startTime,
		'-i', file,
		'-vf', 'scale=min(' + '480' + '\\, iw):-2', '-vframes', '1',
		'-f', 'mjpeg', 'pipe:1'
	];
	var encoderChild = childProcess.spawn(transcoderPath, args, {env: process.env});
	encoderChild.stdout.on('data', function(data) {
		response.write(data);
	});
	encoderChild.on('exit', function(code) {
		response.end();
	});
	response.on('error', function(){
		console.log('response error');
		encoderChild.kill();
		setTimeout(function() {
			encoderChild.kill('SIGKILL');
		}, 5000);
	})

	request.on('close', function() {
		console.log('request close');
		encoderChild.kill();
		setTimeout(function() {
			encoderChild.kill('SIGKILL');
		}, 5000);
	});
}

function decodeThumbnailFrame2(request, response, file, offset) {
	var startTime = convertSecToTime(offset);

	var args = [
		'-t', startTime,
		'-i', file,
		'-s', '240',
		'-c', 'jpg',
		'-o', '-'
	];
	var encoderChild = childProcess.spawn(thumbnailerPath, args, {env: process.env});
	encoderChild.stdout.on('data', function(data) {
		response.write(data);
	});
	encoderChild.on('exit', function(code) {
		response.end();
	});
	response.on('error', function(){
		console.log('response error');
		encoderChild.kill();
		setTimeout(function() {
			encoderChild.kill('SIGKILL');
		}, 5000);
	})

	request.on('close', function() {
		console.log('request close');
		encoderChild.kill();
		setTimeout(function() {
			encoderChild.kill('SIGKILL');
		}, 5000);
	});
}

function handleThumbRequest(request, response) {
	var filePath = Buffer.from(decodeURIComponent(request.params[0]), 'base64').toString('utf8');
	var fsPath = path.join(rootPath, filePath);
	var offset = parseFloat(request.params[1]);
	if (fs.existsSync(fsPath)) {
		decodeThumbnailFrame(request, response, fsPath, offset);
	} else {
		response.writeHead(404);
		response.end();
	}
}

function cutVideo(request, response, fsPath, start, stop) {
	var fname = path.basename(fsPath);
	var dname = path.dirname(fsPath);
	var tname = path.parse(fname).name + '_cutter_' + start + '_' + stop + path.parse(fname).ext;
	var output = path.join(dname, tname);
	if (!fs.existsSync(output)) {
		var args = [
			'-ss', start,
			'-i', fsPath,
			'-to', stop,
			'-c', 'copy',
			output
		];
		var encoderChild = childProcess.spawn(transcoderPath, args, {env: process.env});
		encoderChild.stderr.on('data', function(data){
			console.log(data.toString());
		});
		encoderChild.stdout.on('data', function(data) {
			//response.write(data);
		});
		encoderChild.on('exit', function(code) {
			response.writeHead(200);
			response.end();
		});
		response.on('error', function(){
			console.log('response error');
			encoderChild.kill();
			setTimeout(function() {
				encoderChild.kill('SIGKILL');
			}, 5000);
		})
	} else {
		response.writeHead(400);
		response.end();
	}

}

function handleCutterRequest(request, response) {
	var filePath = Buffer.from(decodeURIComponent(request.params[0]), 'base64').toString('utf8');
	var fsPath = path.join(rootPath, filePath);
	var start = request.params[1];
	var stop = request.params[2];
	if (fs.existsSync(fsPath)) {
		cutVideo(request, response, fsPath, start, stop)
	} else {
		response.writeHead(404);
		response.end();
	}

}
function xuiResponse(request, response, data) {
	if (request.body.callback) {
		var json = JSON.stringify(data);
		response.writeHead(200, {"Content-Type" : "text/html; charset=UTF-8"});
		response.write('<script type="text" id="json">' + json + '</script>' +
						'<script type="text/javascript">' +
						request.body.callback + '=document.getElementById("json").innerHTML;' +
						'</script>');
	} else {
		response.json(data);
	}
	response.end();
}

function xuiStop(request, response) {
	var players = dlnacasts.players;
	var find = false;
	for (i in players) {
		var player = players[i];
		if (player.xml == request.body.player) {
			if (player.client) {
				player.stop(function(){
					xuiResponse(request, response, {msg:"success"});
				});
				find = true;
				break;
			}
		}
	}
	if (!find) {
		xuiResponse(request, response, {msg:"fail"});
	}
}

function xuiPlay(request, response) {
	var file = path.join('/', request.body.path);
	var players = dlnacasts.players;
	var find = false;
	console.log(path.basename(file));
	for (i in players) {
		var player = players[i];
		if (player.xml == request.body.player) {
			var play = function() {
				var opts = {
					title : encodeURIComponent(path.basename(file))
				};
				var subtitles = findSubtitles(file);
				if (subtitles) {
					subtitles = (isHttps ? 'https://' : 'http://')
					+ request.headers.host
					+ '/raw/'
					+ encodeURIComponent(subtitles);
					opts.subtitles = [ subtitles ];
				}
				var url = (isHttps ? 'https://' : 'http://')
					+ request.headers.host
					+ '/raw2/'
					+ encodeURIComponent(Buffer.from(file).toString('base64'))
					+ '/' + encodeURIComponent(path.basename(file));
				player.play(url, opts, function(){
					xuiResponse(request, response, {msg:"success"});
				});
			}

			if (player.client) {
				player.stop(play);
			} else {
				play();
			}
			find = true;
			break;
		}
	}
	if (!find) {
		xuiResponse(request, response, {msg:"fail"});
	}

}

function xuiDiscovery(request, response) {
	dlnacasts.update();
	var players = dlnacasts.players;
	var items = [];
	for (i in players) {
		var player = players[i];
		items.push({
			id : i,
			caption: player.name,
			xml: player.xml
		});
	}

	xuiResponse(request, response, {msg:"success",items:items});
}

function listDir(reqPath, success, fail) {
	var browsePath = path.join('/', reqPath); // Remove ".." etc
	var fsBrowsePath = path.join(rootPath, browsePath);
	var fileList = [];

	if (fsBrowsePath != '/') {
		fileList.push({
			caption:"..",
			type:"directory",
			path: path.join('/', reqPath + '/..')
		});
	}

	fs.readdir(fsBrowsePath, function(err, files) {
		if (err) {
			fail();
			return;
		}

		files.forEach(function(file) {
			var fileObj = {};
			var fsPath = path.join(fsBrowsePath, file);
			stats = fs.lstatSync(fsPath);
			fileObj.caption = file;
			fileObj.value = file;

			if (stats.isFile()) {
				var extName = path.extname(file).toLowerCase();
				if (videoExtensions.indexOf(extName) != -1) {
					fileObj.type = 'video';
					fileObj.image = '@xui_ini.appPath@image/movie_blue_film_strip.png'
				} else if (audioExtensions.indexOf(extName) != -1) {
					fileObj.type = 'audio';
					fileObj.image = '@xui_ini.appPath@image/music.png'
				} else if (imageExtensions.indexOf(extName) != -1) {
					fileObj.type = 'image';
					fileObj.image = '@xui_ini.appPath@image/image_cultured.png'
				} else {
					fileObj.type = 'other';
					fileObj.image = '@xui_ini.appPath@image/file.png'
				}
				fileObj.path = path.join(browsePath, file);
				fileObj.base64 = Buffer.from(fileObj.path).toString('base64');
			} else if (stats.isDirectory()) {
				fileObj.type = 'directory';
				fileObj.path = path.join(browsePath, file);
				fileObj.image = '@xui_ini.appPath@image/folder.png'
			}

			fileList.push(fileObj);
		});
		fileList.sort(function(a, b) {
			if (a.type == 'directory') {
				if (a.type == b.type)
					return a.caption.localeCompare(b.caption);
				else
					return -1;
			} else if (b.type == 'directory') {
				return 1;
			} else {
				return a.caption.localeCompare(b.caption);
			}
		});
		var data = {
			msg : 'success',
			cwd : browsePath,
			list : fileList,
			prev : null,
			next : null,
			caption : path.basename(fsBrowsePath)
		}
		success(data);

	});
}

function xuiList(request, response) {
	var reqPath = request.body.path;
	var parentPath = reqPath + '/..';
	listDir(parentPath, function(pdata) {
		listDir(reqPath, function(data) {

			if (data.cwd != pdata.cwd) {
				var i;
				for (i = 0; i < pdata.list.length; i++) {
					if (pdata.list[i].caption == data.caption) {
						if (pdata.list[i - 1] && pdata.list[i - 1].caption != '..') {
							data.prev = pdata.list[i - 1].path;
						}

						if (pdata.list[i + 1] && pdata.list[i + 1].type == 'directory') {
							data.next = pdata.list[i + 1].path;
						}
						break;
					}
				}
			}
			xuiResponse(request, response, data);
		}, function(){
			xuiResponse(request, response, {msg:'fail'});
		});
	}, function(){
		xuiResponse(request, response, {msg:'fail'});
	});
}

function xuiDel(request, response) {
	var file = path.join('/', request.body.path);
	var fsPath = path.join(rootPath, file);

	if (fs.existsSync(fsPath)) {
		stats = fs.lstatSync(fsPath);
		if (stats.isFile()) {
			fs.unlinkSync(fsPath);
			xuiResponse(request, response, {msg: 'success'});
		} else if (stats.isDirectory()) {
			var candel = true;
			fs.readdirSync(fsPath).forEach(function(f,index){
				if(fs.lstatSync(path.join(fsPath, f)).isDirectory()) {
					candel = false;
				}
			});

			if (candel) {
				fs.readdirSync(fsPath).forEach(function(f,index){
					fs.unlinkSync(path.join(fsPath, f));
				});
				fs.rmdirSync(fsPath);
				xuiResponse(request, response, {msg: 'success'});
			} else {
				xuiResponse(request, response, {msg: 'notempty'});
			}
		} else {
			xuiResponse(request, response, {msg: 'unknown'});
		}
	} else {
		xuiResponse(request, response, {msg: 'notexist'});
	}
}

function xuiInfo(request, response) {
	var file = path.join('/', request.body.path);
	var fsPath = path.join(rootPath, file);
	var json = probeMediainfo(fsPath);
	var text = "";
	try {
		var info = JSON.parse(json);
		xuiResponse(request, response, {msg:'success', info:info});
	} catch (err) {
		xuiResponse(request, response, {msg:'fail'});
	}
}

function xuiGetConf(request, response) {
	xuiResponse(request, response, {msg:'success', width:targetWidth, crf:targetQuality});
}

function xuiSetConf(request, response) {
	targetWidth = request.body.width;
	targetQuality = request.body.crf;
	xuiResponse(request, response, {msg:'success'});
}

function handleXUIRequest(request, response) {
	if (debug)
		console.log(request.body);
	switch(request.body.action){
		case "list":
			xuiList(request, response);
			break;
		case "del":
			xuiDel(request, response);
			break;
		case "info":
			xuiInfo(request, response);
			break;
		case "get_conf":
			xuiGetConf(request, response);
			break;
		case "set_conf":
			xuiSetConf(request, response);
			break;
		case "discovery":
			xuiDiscovery(request, response);
			break;
		case "play":
			xuiPlay(request, response);
			break;
		case "stop":
			xuiStop(request, response);
			break;
		default:
			response.writeHead(404);
			response.end();
			break;
	}

}

function init() {
	function exitWithUsage(argv) {
		console.log(
			'Usage: ' + argv[0] + ' ' + argv[1]
			+ ' --root-path PATH'
			+ ' [--search-path PATH1 [--search-path PATH2 [...]]]'
			+ ' [--port PORT]'
			+ ' [--transcoder-path PATH]'
			+ ' [--cert PATH]'
			+ ' [--key PATH]'
			+ ' [--debug]'
		);
		process.exit();
	}

	for (var i=2; i<process.argv.length; i++) {
		switch (process.argv[i]) {
			case '--transcoder-path':
			if (process.argv.length <= i+1) {
				exitWithUsage(process.argv);
			}
			transcoderPath = process.argv[++i];
			console.log('Transcoder path ' + transcoderPath);
			break;

			case '--root-path':
			if (process.argv.length <= i+1) {
				exitWithUsage(process.argv);
			}
			rootPath = process.argv[++i];
			break;

			case '--search-path':
			if (process.argv.length <= i+1) {
				exitWithUsage(process.argv);
			}
			searchPaths.push(process.argv[++i]);
			break;

			case '--port':
			if (process.argv.length <= i+1) {
				exitWithUsage(process.argv);
			}
			listenPort = parseInt(process.argv[++i]);
			break;

			case '--cert':
			if (process.argv.length <= i+1) {
				exitWithUsage(process.argv);
			}
			cert = process.argv[++i];
			break;

			case '--key':
			if (process.argv.length <= i+1) {
				exitWithUsage(process.argv);
			}
			key = process.argv[++i];
			break;

			case '--debug':
				debug = true;
			break;

			default:
			console.log(process.argv[i]);
			exitWithUsage(process.argv);
			break;
		}
	}

	console.log(rootPath + ' ' + searchPaths);

	if (!rootPath) {
		exitWithUsage(process.argv);
	}

	initExpress();
}

function initExpress() {
	var app = express();
	var server;
	if (cert && key)
	{
		var options = {
			key: fs.readFileSync(key),
			cert: fs.readFileSync(cert)
		};
		server = https.createServer(options, app);
		isHttps = true;
	} else {
		server = http.createServer(app);
	}

	io = socketIo(server);

	app.use(bodyParser.urlencoded({extended: false}));

	app.all('*', function(request, response, next) {
		console.log(request.url);
		next();
	});

	app.use('/', serveStatic(__dirname + '/static'));

	app.use('/raw/', serveStatic(rootPath));

	app.use(/^\/raw2\/([^/]*)\/.*/, handleRawRequest);

	app.use(/^\/thumb\/([^/]*)\/(.*)$/, handleThumbRequest);

	app.use(/^\/cutter\/([^/]*)\/([^/]*)\/(.*)$/, handleCutterRequest);

	app.get(/^\/(.+).m3u8$/, handleM3U8Request);

	app.get(/^\/(.+).ts$/, handleTsSegmentRequest);

	app.post('/xui', handleXUIRequest);

	app.use(/^\/sub\/(.*)$/, handleSubtitlesRequest);

	io.on('connection', function (socket) {
		socket.on('start', function (data) {
			if (debug)
				console.log(socket.id);
			var match = /^\/(.+)\.ws/.exec(data.file);
			if (match) {
				handleWSMp4Request(match[1], data.offset, data.speed, socket);
			}
		});
	});

	dlnacasts.on('update', function(player){
		player.on('error', function(err){
			console.log(player.name + ' error ' + err);
		});
		player.on('status', function(status){
			console.log(player.name + ' status ' + status.playerState);
		});
		player.on('loading', function(err){
			console.log(player.name + ' loading ' + err);
		});
	});
	server.listen(listenPort);
}


init();
