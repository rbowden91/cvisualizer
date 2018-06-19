var message_handlers = {
    node_visit: function(args) {
        if (args.coords.right_left === null) {
            args.coords.right_left = args.coords.right_most;
        }
        highlight(args.coords.left_most, args.coords.right_left);
    },

    // TODO: need to get main's stackframe
    push_scope: function(_) {
        $('.stackframe').last().append($('<div>').addClass('scope'));
    },

    pop_scope: function(_) {
        $('.stackframe').last().find('.scope').last().remove();
    },

    memory_update: function(args) {
        var name = args[0];
        var offset = args[1];
        var value = args[2];

        array = $('#memory').find(`div[data-name="${name}"]`)
        type = array.attr('data-type');
        array.find('.value').eq(offset).text(get_value(value, type));
    },

    memory_init: function(args) {
        var mem = args[0];
        var mem_div = $('<div>').addClass('memdiv').attr('data-name', mem.name);
        var name_str = get_type_and_name(mem.type, mem.name) + '[] of length ' + mem.len;
        mem_div.append($('<div>').text(name_str));
        mem_div.attr('data-type', mem.expanded_type);
        for (var i = 0; i < mem['array'].length; i++) {
            var spanvalue = $('<span>').addClass('value').text(get_value(mem['array'][i], mem.expanded_type, false))
            mem_div.append($('<div>').addClass('membox').append(spanvalue));
        }
        $('#memory').append(mem_div);
    },

    update_scope: function(args) {
        var arg = args[0];
        var frame = $('.stackframe').last().find('.scope').eq(arg.scope);
        if (arg.old_var === true) {
            // TODO: value can be a pointer
            frame.find(`div[data-name="${arg.name}"]`).find('.value').text(get_value(arg.value.value, arg.value.expanded_type, true));
            return;
        }
        // TODO: fix this. pointers/arrays won't quite look right.
        var span_type_and_name = $('<span>').text(get_type_and_name(arg.value.type, arg.name));
        var spanvalue = $('<span>').addClass('value').text(get_value(arg.value.value, arg.value.expanded_type, true));

        var divid = $('<div>').attr('data-name', arg.name);
        divid.append(span_type_and_name).append(spanvalue);
        frame.append(divid);
    },

    exit: function(args) {
        alert("Program exited with code " + args.code + ' and stdout ' + args.stdout);
    }
};

// annoying handling of the fact that arrays and variable names and types go in weird order
// TODO
function get_type_and_name(type, name) {
    var pre_name = [];
    var post_name = [];
    // TODO: may need to add parens if it's a complicated array type/function pointer type
    // TODO: reversing isn't quite right, but need to fix interpreter
    // TODO: hover over for expanded type?
    var type = type.reverse();
    for (var i = 0; i < type.length; i++) {
        if (type[i][0] == '[') {
            post_name.push(type[i])
        } else {
            pre_name.push(type[i]);
        }
    }
    if (pre_name[pre_name.length-1] !== '*') {
        name = ' ' + name;
    }
    return pre_name.join(' ') + name + post_name.join('');
}

var char_map = {
    0: "\\0",
    7: "\\a",
    8: "\\b",
    9: "\\t",
    10: "\\n",
    11: "\\v",
    12: "\\f",
    13: "\\r"
}

function get_value(value, type, include_wrappers) {
    if (value === null) {
        return include_wrappers ? ';' : '';
    }
    if (typeof value === 'object' && typeof value.base !== 'undefined') {
        // TODO: this is not quite what it is...
        var val = 'Pointer to ' + value.base + '[' + value.offset + ']';
    } else if (type.length == 1 && type[0] == "char") {
        if (value >= 32 && value <= 127) {
            var val = `${value} ('${String.fromCharCode(value)}')`
        } else if (typeof char_map[value] !== 'undefined') {
            var val = `${value} ('${char_map[value]}')`;
        } else {
            var val = value;
        }
    } else {
        var val = value;
    }
    return include_wrappers ? ' = ' + val + ';' : val;
}

function skip_comments_and_whitespace(code, coord, end_coord) {
    while (true) {
        if (coord[1] >= code.length) {
            coord[1] -= 1;
            coord[2] = code[coord[1]].length;
            if (coord[2] !== 0)
		coord[2] -= 1;
            break;
        } else if (end_coord !== null && coord[1] == end_coord[1] && coord[2] >= end_coord[2]) {
            break;
        } else if (coord[2] >= code[coord[1]].length) {
            coord[1] += 1;
            coord[2] = 0;
        } else if (in_comment) {
            if (code[coord[1]][coord[2]] === '*' && code[coord[1]][coord[2]] === '/') {
                coord[2] += 2;
                in_comment = false;
            } else {
                coord[2] += 1;
            }
        } else if (coord[2] === code[coord[1]].length) {
            coord[1] += 1;
            coord[2] = 0;
        } else if (code[coord[1]][coord[2]] === ' ') {
            coord[2] += 1;
        } else if (code[coord[1]][coord[2]] === '/' && code[coord[1]][coord[2]] === '/') {
            coord[1] += 1;
            coord[2] = 0;
        } else if (code[coord[1]][coord[2]] === '/' && code[coord[1]][coord[2]] === '*') {
            in_comment = true;
        } else {
            if (end_coord !== null) {
                var last_valid = [coord[1], coord[2]];
                coord[2] += 1;
            } else {
                break;
            }
        }
        //console.log(coord[1], coord[2], end_coord, code[coord[1]][coord[2]], last_valid);
    }
    if (end_coord !== null && typeof last_valid !== 'undefined') {
        end_coord[1] = last_valid[0];
        end_coord[2] = last_valid[1];
    }
}

function highlight(start_coord, end_coord) {
    if (start_coord === null || end_coord === null || (start_coord[1] == end_coord[1] && start_coord[2] == end_coord[2])) {
        return;
    }
    if (typeof currentMarker !== 'undefined') {
        editor.session.removeMarker(currentMarker);
    }
    // TODO: are all the coords 1 indexed or something? why is this necessary??
    start_coord[1] -= 1;
    end_coord[1] -= 1
    start_coord[2] -= 1;
    end_coord[2] -= 1

    in_comment = false;
    code = editor.getValue().split("\n");
    skip_comments_and_whitespace(code, start_coord, null);
    skip_comments_and_whitespace(code, start_coord.slice(), end_coord);
    //console.log(start_coord, end_coord);

    currentMarker = editor.session.addMarker(new Range(start_coord[1],start_coord[2],end_coord[1],end_coord[2]), "highlight", "marked", false)
}

// TODO: allow for reconnection by sending along info about what continuation we were at?
$(document).ready(function() {
    $('#editor').text(start);
    // for some reason, initial highlighting is weird doing things this way
    //editor.setValue(start);

    // globals
    Range = ace.require('ace/range').Range;
    editor = ace.edit('editor');

    editor.setTheme('ace/theme/monokai');
    editor.session.setMode('ace/mode/c_cpp');

    //editor.getSession().addMarker(new Range(0,0,10,10), "warning", "line", true);

    var socket = io();
    // TODO: freeze code or something after submit?
    $('#submit').on('click', function(){
        msg = {
	    'code': editor.getValue(),
	    'argv': $('#argv').val(),
	    'stdin': $('#stdin').val()
        };

        msg['argv'] = JSON.parse(msg['argv'])
        msg['stdin'] += '\n';
        socket.emit('code', msg);
        return false;
    });

    $('#finish').on('click', function() {
        msg = {
	    'cmd': 'finish',
        };
        socket.emit('cmd', msg);
        return false;
    });

    // TODO: should make a "stop"
    $('#play').on('click', function() {
        msg = {
	    'cmd': 'play',
        };
        socket.emit('cmd', msg);
        return false;
    });

    $('#step').on('click', function() {
        msg = {
	    'cmd': 'step',
        };
        socket.emit('cmd', msg);
        return false;
    });

    $('#next').on('click', function() {
        msg = {
	    'cmd': 'next',
        };
        socket.emit('cmd', msg);
        return false;
    });

    socket.on('shim-exit', function(msg) {
        console.log(msg.return_code);
    });

    socket.on('shim-not-running', function(msg) {
        console.log(msg);
    });

    socket.on('info', function(msg) {
        // TODO try/catch
        // messages from the shim don't come pre-parsed
        msg = JSON.parse(msg);
        console.log(msg);
        if (msg.type === 'cmd') {
            //$("#output").text(JSON.stringify(msg.output));
            if (typeof message_handlers[msg.output.type] === 'undefined') {
                alert('Unimplemented output type ' + msg.output.type);
            } else {
                message_handlers[msg.output.type](msg.output.args);
            }
        }
    });
});

var start = `
#include <cs50.h> //adds GetString(), which basically renames char to string
#include <stdio.h> //allows things like printftouch
#include <stdlib.h> //adds the atoi() function
#include <string.h> //doin stuff with strings like strlen
#include <ctype.h> //adds isupper(), islower(), and isalpha()

int main(int argc, string argv[])
{
    //defining all my variables
    string keyword;
    string inputtext;
    int j = 0;
    int kwl;

    //test for an argument
    if (argc != 2)
    {
        printf("Try again, gimme one argument of only aplha characters.");
        return 1;
    }

    keyword = argv[1];
    kwl = strlen(keyword);

    //test that argument is all alpha
    for (int i = 0, n = kwl; i < n; i++)
    {
        if (!isalpha(argv[1][i]))
        {
            printf("Try again, gimme letters only.");
            return 1;
        }
        else
        {
            if (isupper(keyword[i]))
            {
                keyword[i] -= 'A';
            }
            else
            {
                keyword[i] -= 'a';
            }
        }
    }

    inputtext = GetString();

    for (int i = 0, n = strlen(inputtext); i < n; i++)
    {
        if (isalpha(inputtext[i]))
        {

            if (isupper(inputtext[i]))
            {
                inputtext[i] = ((((inputtext[i] - 'A') + (keyword[j % kwl])) % 26) +'A');
                j++;
            }
            else
            {
                inputtext[i] = ((((inputtext[i] - 'a') + (keyword[j % kwl])) % 26) + 'a');
                j++;
            }

        }
    }
    printf("%s\\n", inputtext);
}`.trim();
