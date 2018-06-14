var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var fs = require('fs');
var execSync = require('child_process').execSync;
var uuid = require('uuid/v4');


app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

var max_timeout = 1000;
var timeout_interval = 0.01;
var files = {};

function parse_results(file) {
    var f = files[file]
    var results_file = 'tasks/' + f.model + '/.' + file + '-results'
    if (!fs.existsSync(results_file)) {
    	f.retries++;
        if (f.retries * timeout_interval > max_timeout) {
            try {
		f.socket.emit('response', { success: false, results: 'Server took too long to respond!' });
		fs.unlinkSync('tasks/' + f.model + '/' + f.file);
		fs.unlinkSync(results_file);
	    } catch(e) {console.log(e)}
            delete(files[file])
            return;
        }
	return setTimeout(function() { parse_results(file) }, timeout_interval);
    }
    try {
    	results = fs.readFileSync(results_file);
	json = JSON.parse(results);
	files[file].socket.emit('response', { success: true, results: json, model: files[file].model });
    } catch(e) {
    	console.log(e);
    	files[file].socket.emit('response', { success: false, results: e });
    }
    delete(files[file])
    // XXX should probably clean all these up on server boot
    fs.unlinkSync(results_file);
}

io.on('connection', function(socket){
    socket.on('code', function(msg){
        msg = JSON.parse(msg);
        file =  uuid() + '.c';
        files[file] = {'socket': socket, 'retries': 0, 'model': msg.model, 'uuid': file}
        fs.writeFileSync('tasks/' + msg.model + '/' + file, msg.code);
        setTimeout(function() { parse_results(file) }, timeout_interval);
    });
});
