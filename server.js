const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');
const uuid = require('uuid/v4');

const { spawn } = require('child_process');

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket){
  console.log('a user connected');
});

http.listen(12345, function(){
  console.log('listening on *:12345');
});

// TODO: on disconnect, delete child process?
// TODO: if shim dies, we seem to, too
io.on('connection', function(socket){

    var child;

    socket.on('cmd', function(msg){
    	child.stdin.write(msg + '\n')
    });

    socket.on('code', function(msg){

        child = spawn('python3', ['shim.py'], {stdio: 'pipe'});
        child.stdin.write(msg + '\n')

        //child.stdout.setEncoding('utf8')
	child.stdout.on('data', function(data) {
	    console.log(data.toString())
	    socket.emit('info', data.toString())
        })
	child.stderr.on('data', function(data) {
	    console.log(data.toString())
        })
	child.on('close', function(code) {
	    console.log('closing code: ' + code)
        })

	//child = exec('python3 shim.py')
	//files[socket] = {'socket': socket, 'retries': 0, 'model': msg.model}
	//setTimeout(function() { parse_results(file) }, timeout_interval);
    });
});
